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
  let depInfo = new Map();
  let devDepInfo = new Map();

  for (let [name, sha] of packageFiles) {
    if (name.match(/package.json/)) {
      let pkgObj = await github.getBlob(orgName, repoName, sha);
      depInfo = packages.parsePackageJsonObj(pkgObj, depInfo, "dependencies");
      devDepInfo = packages.parsePackageJsonObj(
        pkgObj,
        devDepInfo,
        "devDependencies"
      );
    }
  }
  return [depInfo, devDepInfo];
}

// package keys in format pkg:npm/name@version

function dumpToOrg(pkgInfo) {
  let packageKeys = [];
  for (let i of pkgInfo.keys()) {
    packageKeys.push(i);
  }
  packageKeys = packageKeys.sort();
  for (let p of packageKeys) {
    let info = pkgInfo.get(p);
    console.dir(info);
    let name = p.split("/")[1];
    console.log(`** ${name} - ${info.description}`);
    console.log(`| Current | ${info.current} |`);
    console.log(`| Next | ${info.next} |`);
    console.log(`| Latest | ${info.latest} |`);
    if (info.usedBy && info.usedBy.length) {
      console.log("*** Used by");
      for (let u of info.usedBy) {
        console.log(`| ${u.name}@${u.version} | ${u.description} |`);
      }
    }
    if (info.vulnerabilities && info.vulnerabilities.length) {
      console.log("*** Vulnerabilities");
      for (let v of info.vulnerabilities) {
        console.log(`**** Title: ${v.title}`);
        console.log(`${v.description}`);
        console.log(`| ID | ${v.id} |`);
        console.log(`| CVSS Score | ${v.cvssScore} |`);
        console.log(`| CVSS Vector | ${v.cvssVector} |`);
        console.log(`| CWE: | ${v.cwe} |`);
        console.log(`| References | ${v.reference} |`);
      }
    }
    console.log("");
  }
}

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
      await db.updateDependencies(name, version, pkg);
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
  .then(([dep, dev]) => {
    return Promise.all([
      packages.packageVersions(dep),
      packages.packageVersions(dev)
    ]);
  })
  .then(([dep, dev]) => {
    console.log(`dep size ${dep.size} dev size ${dev.size}`);
    return Promise.all([
      audit.doLargeAuditReport(dep),
      audit.getAuditReport(dev)
    ]);
  })
  // .then(([depRpt, devRpt]) => {
  //   console.log(`#+TITLE: ${repoName} (${branch})`);
  //   console.log("#+OPTIONS: ^:nil num:nil toc:2 tags:nil |:t");
  //   console.log("");
  //   console.log("* Core Dependencies");
  //   dumpToOrg(depRpt);
  //   console.log("* Development Dependencies");
  //   dumpToOrg(devRpt);
  // })
  .then(async ([depRpt, devRpt]) => {
    await updateDatabase(depRpt);
    await updateDatabase(devRpt);
    return true;
  })
  .catch(err => {
    console.error(err.message);
  });
