"use strict";

const moduleName = "packages";

const VError = require("verror");
const latestVersion = require("latest-version");
const semver = require("semver");

function nextMajor(v) {
  let m = parseInt(v.split(".")[0]) + 1;
  return `${m}.0.0`;
}

async function getVersionInfo(name, ver) {
  const logName = "getVersionInfo";

  try {
    let version = semver.valid(semver.coerce(ver));
    let latest = await latestVersion(name);
    let majorVersion = `<${nextMajor(version)}`;
    let majorLatest = await latestVersion(name, {version: majorVersion});
    return {
      current: version,
      next: majorLatest,
      latest: latest
    };
  } catch (err) {
    return {
      current: ver,
      next: "Unknown",
      latest: "Unknon"
    };
  }
}

async function parsePackageJSON(pkgObj, packages) {
  const logName = `${moduleName}.parsePackageJSON`;

  try {
    let versionInfo = await getVersionInfo(pkgObj.name, pkgObj.version);
    let curPkg = {
      name: pkgObj.name,
      current: versionInfo.current,
      next: versionInfo.next,
      latest: versionInfo.latest,
      description: pkgObj.description || "Unknown",
      usedBy: []
    };
    let coords = `pkg:npm/${curPkg.name}@${curPkg.current}`.toLowerCase();
    if (!packages.has(coords)) {
      packages.set(coords, curPkg);
    } else {
      packages.get(coords).description = curPkg.description;
    }
    for (let d of ["dependencies", "devDependencies"]) {
      let dep = pkgObj[d];
      if (!dep) {
        continue;
      }
      for (let k of Object.keys(dep)) {
        versionInfo = await getVersionInfo(k, dep[k]);
        coords = `pkg:npm/${k}@${versionInfo.current}`.toLowerCase();
        if (packages.has(coords)) {
          packages.get(coords).usedBy.push([curPkg.name, curPkg.current]);
        } else {
          packages.set(coords, {
            name: k,
            current: versionInfo.current,
            next: versionInfo.next,
            latest: versionInfo.latest,
            usedBy: [[curPkg.name, curPkg.current]]
          });
        }
      }
    }
    return packages;
  } catch (err) {
    throw new VError(
      err,
      `${logName} Failed to process package ${pkgObj.name}`
    );
  }
}

module.exports = {
  getVersionInfo,
  parsePackageJSON
};
