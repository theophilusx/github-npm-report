"use strict";

const moduleName = "db";

const VError = require("verror");
const assert = require("assert");
const {Pool} = require("pg");
const packages = require("./packages");

const pool = new Pool();

async function sqlExec(sql, params) {
  const logName = `${moduleName}.sqlExec`;
  let client, rslt;

  try {
    client = await pool.connect();
    if (params !== undefined) {
      assert.ok(Array.isArray(params), "params argument must be an array");
      rslt = await client.query(sql, params);
    } else {
      rslt = await client.query(sql);
    }
    await client.release();
    client = undefined;
    return rslt;
  } catch (err) {
    if (client !== undefined) {
      client.release();
    }
    throw new VError(err, `${logName}`);
  }
}

async function getModuleId(name, version) {
  const logName = `${moduleName}.getModuleId`;
  const sql =
    "SELECT module_id FROM npmjs.modules " +
    "where module_name = $1 AND module_version = $2";

  try {
    let rslt = await sqlExec(sql, [name, version]);
    if (rslt.rowCount) {
      return rslt.rows[0].module_id;
    }
    return undefined;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

async function insertModule(name, version, module) {
  const logName = `${moduleName}.insertModule`;
  const sql =
    "INSERT INTO npmjs.modules (" +
    "module_name, module_version, description, latest_minor_version, " +
    "latest_major_version) VALUES ($1, $2, $3, $4, $5) " +
    "RETURNING module_id";

  try {
    let rslt = await sqlExec(sql, [
      name,
      version,
      module.description,
      module.next,
      module.latest
    ]);
    return rslt;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

async function updateModule(moduleId, module) {
  const logName = `${moduleName}.updateModule`;
  const sql =
    "UPDATE npmjs.modules " +
    "SET description = $1, " +
    "latest_minor_version = $2, " +
    "latest_major_version = $3, " +
    "last_seen = current_timestamp " +
    "WHERE module_id = $4";

  try {
    let rslt = await sqlExec(sql, [
      module.description,
      module.next,
      module.latest,
      moduleId
    ]);
    return rslt;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

async function updateDependencies(name, version, module) {
  const logName = `${moduleName}.updateDependencies`;

  try {
    let parentId = await getModuleId(name, version);
    for (let m of module.usedBy) {
      let name = m.name;
      let version = m.version;
      let childId = await getModuleId(name, version);
      if (childId === undefined) {
        let versionInfo = await packages.getVersionInfo(name, version);
        let rslt = await insertModule(name, version, {
          name: m.name,
          version: m.version,
          description: m.description,
          next: versionInfo.next,
          latest: versionInfo.latest
        });
        childId = rslt.rows[0].module_id;
        let sql =
          "INSERT INTO npmjs.module_dependencies (" +
          "parent_id, child_id) VALUES ($1, $2)";
        await sqlExec(sql, [parentId, childId]);
      } else {
        let sql =
          "UPDATE npmjs.module_dependencies " +
          "SET last_seen = current_timestamp " +
          "WHERE parent_id = $1 AND child_id = $2";
        await sqlExec(sql, [parentId, childId]);
      }
    }
    return true;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

module.exports = {
  getModuleId,
  insertModule,
  updateModule,
  updateDependencies
};
