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
      depSet.add(`${k}|${deps[k]}`);
    }
    for (let k of Object.keys(devDeps)) {
      devDepSet.add(`${k}|${devDeps[k]}`);
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
    let [name, version] = e.split("|");
    let latest = await latestVersion(name);
    let ver = semver.valid(semver.coerce(version));
    let majorVer = `<${nextMajor(ver)}`;
    let majorLatest = await latestVersion(name, {version: majorVer});
    packageInfo.set(name, {
      version: version,
      next: majorLatest,
      latest: latest
    });
  }
  return packageInfo;
}

module.exports = {
  parsePackageJsonObj,
  packageVersions
};
