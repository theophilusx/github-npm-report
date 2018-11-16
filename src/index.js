"use strict";

const config = require("./config");
const github = require("./github");
const packages = require("./packages");

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
    return packages.packageVersions(dep);
  })
  .then(pInfo => {
    console.dir(pInfo);
  })
  .catch(err => {
    console.error(err.message);
  });



