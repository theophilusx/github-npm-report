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
      module.current,
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

async function knownDependency(parentId, childId) {
  const logName = `${moduleName}.knownDependencies`;
  const sql =
    "SELECT count(*) cnt FROM npmjs.module_dependencies " +
    "WHERE parent_id = $1 and child_id = $2";

  try {
    let rslt = sqlExec(sql, [parentId, childId]);
    if (rslt.rowCount) {
      return true;
    }
    return false;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

async function updateDependencies(name, version, module) {
  const logName = `${moduleName}.updateDependencies`;

  try {
    let pkgId = await getModuleId(name, version);
    for (let [userName, userVersion] of module.usedBy) {
      let userId = await getModuleId(userName, userVersion);
      if (userId === undefined) {
        console.log(
          `${moduleName} Used By module not known ${userName}@${userVersion}`
        );
      } else {
        let known = await knownDependency(userId, pkgId);
        if (known) {
          let sql =
            "UPDATE npmjs.module_dependencies " +
            "SET last_seen = current_timestamp " +
            "WHERE parent_id = $1 AND child_id = $2";
          await sqlExec(sql, [userId, pkgId]);
        } else {
          let sql =
            "INSERT INTO npmjs.module_dependencies (" +
            "parent_id, child_id) VALUES ($1, $2)";
          await sqlExec(sql, [userId, pkgId]);
        }
      }
    }
    return true;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

async function knownVulnerability(vId) {
  const logName = `${moduleName}.knownVulnerability`;
  const sql = "SELECT v_id FROM npmjs.vulnerabilities WHERE v_id = $1";

  try {
    let rslt = await sqlExec(sql, [vId]);
    if (rslt.rowCount) {
      return true;
    }
    return false;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

async function insertVulnerability(vData) {
  const logName = `${moduleName}.insertvulnerability`;
  const sql =
    "INSERT INTO npmjs.vulnerabilities (" +
    "v_id, title, description, cvss_score, cvss_vector, cve, reference) " +
    "VALUES ($1, $2, $3, $4, $5, $6, $7)";

  try {
    let rslt = sqlExec(sql, [
      vData.id,
      vData.title,
      vData.description,
      vData.cvssScore,
      vData.cvssVector,
      vData.cve,
      vData.reference
    ]);
    return rslt;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

async function knownVulnerabilityMapping(mId, vId) {
  const logName = `${moduleName}.knownVulnerabilityMapping`;
  const sql =
    "SELECT module_id FROM npmjs.vulnerability_map " +
    "WHERE module_id = $1 AND vulnerability_id = $2";

  try {
    let rslt = await sqlExec(sql, [mId, vId]);
    if (rslt.rowCount) {
      return true;
    }
    return false;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

async function insertVulnerabilityMapping(mId, vId) {
  const logName = `${moduleName}.insertVulnerabiityMapping`;
  const sql =
    "INSERT INTO npmjs.vulnerability_map (module_id, vulnerability_id)" +
    " VALUES ($1, $2)";

  try {
    let rslt = await sqlExec(sql, [mId, vId]);
    return rslt;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

module.exports = {
  getModuleId,
  insertModule,
  updateModule,
  knownDependency,
  updateDependencies,
  knownVulnerability,
  insertVulnerability,
  knownVulnerabilityMapping,
  insertVulnerabilityMapping
};
