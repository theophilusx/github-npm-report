"use strict";

const VError = require("verror");
const latestVersion = require("latest-version");
const semver = require("semver");

function parsePackageJsonObj(pkgObj) {
  let depSet = new Set();
  let devDepSet = new Set();

  try {
    let deps = pkgObj.dependencies || {};
    let devDeps = pkgObj.devDependencies || {};
    for (let k of Object.keys(deps)) {
      let version = semver.valid(semver.coerce(deps[k]));
      if (version) {
        depSet.add(`pkg:npm/${k}@${version}`);        
      } else {
        console.log(`Core package with bad version: ${k}/${deps[k]}`);
      }
    }
    for (let k of Object.keys(devDeps)) {
      let version = semver.valid(semver.coerce(devDeps[k]));
      if (version) {
        devDepSet.add(`pkg:npm/${k}@${version}`);        
      } else {
        console.log(`Dev package with bad version ${k}/${devDeps[k]}`);
      }
    }
    return [depSet, devDepSet];
  } catch (err) {
    throw new VError(err, `Failed to process package ${pkgObj.name}`);
  }
}

function nextMajor(v) {
  let m = parseInt(v.split(".")[0]) + 1;
  return `${m}.0.0`;
}

async function packageVersions(packageList) {
  let packageInfo = new Map();

  for (let e of packageList.values()) {
    let [name, version] = e.split("/")[1].split("@");
    try {
      let latest = await latestVersion(name);
      let majorVer = `<${nextMajor(version)}`;
      let majorLatest = await latestVersion(name, {version: majorVer});
      packageInfo.set(e, {
        current: version,
        next: majorLatest,
        latest: latest
      });
    } catch (err) {
      packageInfo.set(e, {
        current: version,
        next: err.message,
        latest: err.message
      });
    }
  }
  return packageInfo;
}

module.exports = {
  parsePackageJsonObj,
  packageVersions
};
