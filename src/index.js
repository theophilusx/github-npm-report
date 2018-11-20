"use strict";

const config = require("./config");
const github = require("./github");
const packages = require("./packages");
const audit = require("./audit");

const rc = config.getConfig(".github-npm-report.json");
const orgUnit = process.argv[2];
const repoName = process.argv[3];
const branch = process.argv[4];

async function buildPackageLists(orgName, repoName, packageFiles) {
  let depSet = new Set();
  let devDepSet = new Set();
  
  for (let [name, sha] of packageFiles) {
    if (name.match(/package.json/)) {
      console.log(`Processing ${name}`);
      let pkgObj = await github.getBlob(orgName, repoName, sha);
      let [dep, dev] = packages.parsePackageJsonObj(pkgObj);
      for (let i of dep.values()) {
        depSet.add(i);
      }
      for (let i of dev.values()) {
        devDepSet.add(i);
      }
    }
  }
  return [depSet, devDepSet];
}

github.init(rc);

github.findPackageJson(orgUnit,repoName, branch)
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
    console.log("Core Dependencies");
    for (let p of dep.keys()) {
      console.log(p);
      let info = dep.get(p);
      console.log(`Current: ${info.current} Next: ${info.next} Latest: ${info.latest}`);
    }
    console.log("Developemnt Dependencies");
    for (let p of dev.keys()) {
      console.log(p);
      let info = dev.get(p);
      console.log(`Current: ${info.current} Next: ${info.next} Latest: ${info.latest}`);
    }
    return audit.allDependencies(dep, dev);
  })
  .then(dep => {
    console.dir(dep);
    return audit.getAuditReport(rc, dep);
  })
  .then(data => {
    console.log(data);
  })
  .catch(err => {
    console.error(err.message);
  });



