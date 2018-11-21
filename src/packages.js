"use strict";

const VError = require("verror");
const latestVersion = require("latest-version");
const semver = require("semver");

function parsePackageJsonObj(pkgObj, pkgInfo, depType = "dependencies") {

  try {
    let pkgName = pkgObj.name || "Unknown";
    let pkgVersion = pkgObj.version || "0.0.0";
    let pkgDesc = pkgObj.description || "None";
    let deps = pkgObj[depType] || {};
    for (let k of Object.keys(deps)) {
      let version = semver.valid(semver.coerce(deps[k]));
      if (version) {
        let coordinate = `pkg:npm/${k}@${version}`.toLowerCase();
        if (pkgInfo.has(coordinate)) {
          pkgInfo.get(coordinate).usedBy.push({
            name: pkgName,
            version: pkgVersion,
            description: pkgDesc
          });
        } else {
          pkgInfo.set(coordinate, {
            usedBy: [{
              name: pkgName,
              version: pkgVersion,
              description: pkgDesc
            }]
          });
        }
      } else {
        console.log(`Core package with bad version: ${k}/${deps[k]}`);
      }
    }
    return pkgInfo;
  } catch (err) {
    throw new VError(err, `Failed to process package ${pkgObj.name}`);
  }
}

function nextMajor(v) {
  let m = parseInt(v.split(".")[0]) + 1;
  return `${m}.0.0`;
}

async function packageVersions(packageInfo) {

  for (let e of packageInfo.keys()) {
    let [name, version] = e.split("/")[1].split("@");
    try {
      let latest = await latestVersion(name);
      let majorVer = `<${nextMajor(version)}`;
      let majorLatest = await latestVersion(name, {version: majorVer});
      packageInfo.get(e).current = version;
      packageInfo.get(e).next = majorLatest,
      packageInfo.get(e).latest = latest;
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
