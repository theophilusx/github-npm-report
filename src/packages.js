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

async function parsePackageJSON(pkgObj, packages, pkgName) {
  const logName = `${moduleName}.parsePackageJSON`;

  try {
    let versionInfo = await getVersionInfo(pkgObj.name, pkgObj.version);
    let name = pkgObj.name.toLowerCase();
    let version = versionInfo.current;
    let coords = `pkg:npm/${name}@${version}`.toLowerCase();
    if (!packages.has(coords)) {
      packages.set(coords, {
        name: pkgObj.name.toLowerCase(),
        paths: new Set([pkgName]),
        current: versionInfo.current,
        next: versionInfo.next,
        latest: versionInfo.latest,
        description: pkgObj.description || "Unknown",
        usedBy: new Set(),
        vulnerabilities: []
      });
    } else {
      if (pkgObj.description) {
        packages.get(coords).description = pkgObj.description;
      }
      packages.get(coords).paths.add(pkgName);
    }
    for (let d of ["dependencies", "devDependencies"]) {
      let dep = pkgObj[d];
      if (!dep) {
        continue;
      }
      for (let k of Object.keys(dep)) {
        if (dep[k].match(/^(file|http|https):/)) {
          // relative packages - skip
          continue;
        }
        versionInfo = await getVersionInfo(k, dep[k]);
        coords = `pkg:npm/${k}@${versionInfo.current}`.toLowerCase();
        if (packages.has(coords)) {
          packages.get(coords).usedBy.add([name, version]);
          packages.get(coords).paths.add(pkgName);
        } else {
          packages.set(coords, {
            name: k.toLowerCase(),
            paths: new Set([pkgName]),
            current: versionInfo.current,
            next: versionInfo.next,
            latest: versionInfo.latest,
            description: "Unknown",
            usedBy: new Set([[name, version]]),
            vulnerabilities: []
          });
        }
      }
    }
    return packages;
  } catch (err) {
    throw new VError(
      err,
      `${logName} Failed to process package ${pkgObj.name} from ${pkgName}`
    );
  }
}

module.exports = {
  getVersionInfo,
  parsePackageJSON
};
