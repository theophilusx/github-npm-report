"use strict";

require("dotenv").config();

const VError = require("verror");
const github = require("./github");
const packages = require("./packages");
const audit = require("./audit");
const db = require("./db");

const orgUnit = process.argv[2];
const repoName = process.argv[3];
const branch = process.argv[4];

async function buildPackageLists(orgName, repoName, packageFiles) {
  let packageMap = new Map();

  for (let [name, sha] of packageFiles) {
    if (name.match(/package.json/)) {
      let pkgObj = await github.getBlob(orgName, repoName, sha);
      packageMap = await packages.parsePackageJSON(pkgObj, packageMap);
    }
  }
  return packageMap;
}

// package keys in format pkg:npm/name@version

async function updateDatabase(pkgInfo) {
  const logName = "updateDatabase";

  try {
    for (let pName of pkgInfo.keys()) {
      let [name, version] = pName.split("/")[1].split("@");
      let pkg = pkgInfo.get(pName);
      let moduleId = await db.getModuleId(name, version);
      if (moduleId !== undefined) {
        await db.updateModule(moduleId, pkg);
      } else {
        await db.insertModule(name, version, pkg);
      }
      if (pkg.usedBy.length) {
        await db.updateDependencies(name, version, pkg);
      }
    }
    return true;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

async function updateVulnerabilities(pkgInfo) {
  const logName = "updatevulnerabilities";

  try {
    for (let p of pkgInfo.values()) {
      let pId = await db.getModuleId(p.name, p.current);
      if (!pId) {
        console.log(`${logName} Unknown module ${p.name}/${p.current}`);
        continue;
      }
      for (let v of p.vulnerabilities) {
        let known = await db.knownVulnerability(v.id);
        if (!known) {
          await db.insertVulnerability(v);
        }
        let knownMapping = await db.knownVulnerabilityMapping(pId, v.id);
        if (!knownMapping) {
          await db.insertVulnerabilityMapping(pId, v.id);
        }
      }
    }
    return true;
  } catch (err) {
    throw new VError(err, `${logName}`);
  }
}

github.init();

github
  .findPackageJson(orgUnit, repoName, branch)
  .then(files => {
    return buildPackageLists(orgUnit, repoName, files);
  })
  .then(pkgInfo => {
    console.log(`Pakcage count: ${pkgInfo.size}`);
    return audit.doLargeAuditReport(pkgInfo);
  })
  .then(async pkgInfo => {
    await updateDatabase(pkgInfo);
    await updateVulnerabilities(pkgInfo);
    return true;
  })
  .catch(err => {
    console.error(err.message);
  });
