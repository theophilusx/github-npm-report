"use strict";

const VError = require("verror");

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

module.exports = {
  parsePackageJsonObj
};
