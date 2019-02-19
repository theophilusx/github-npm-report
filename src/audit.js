"use strict";

const VError = require("verror");
const fetch = require("node-fetch");

const apiPath = "/api/v3/component-report";

// const apiOptions = {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/vnd.ossindex.component-report-request.v1+json"
//   }
// };

function getCoordinates(pkgInfo) {
  let coordinates = [];
  for (let c of pkgInfo.keys()) {
    coordinates.push(c);
  }
  return {
    coordinates: coordinates.sort()
  };
}

function getAuditReport(pkgInfo) {
  let ossUser = process.env.OSSUSER;
  let ossToken = process.env.OSSTOKEN;
  let auth = Buffer.from(`${ossUser}:${ossToken}`).toString("base64");
  let options = {
    method: "POST",
    body: JSON.stringify(getCoordinates(pkgInfo)),
    headers: {
      "Content-Type":
        "application/vnd.ossindex.component-report-request.v1+json",
      Authorization: "Basic " + auth
    }
  };
  let ossHost = process.env.OSSHOST;
  let url = "https://" + ossHost + apiPath;
  return fetch(url, options)
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      } else {
        throw new Error(`Response Error: ${resp.statusText}`);
      }
    })
    .then(data => {
      for (let r of data) {
        let coord = r.coordinates.toLowerCase();
        if (pkgInfo.has(coord)) {
          if (r.description) {
            pkgInfo.get(coord).description = r.description;
          }
          pkgInfo.get(coord).vulnerabilities = r.vulnerabilities;
        } else {
          console.log(`${r.coordinates} not found in package info map`);
        }
      }
      return pkgInfo;
    })
    .catch(err => {
      throw new VError(err, "Failed to retireve audit report");
    });
}

function doLargeAuditReport(pkgInfo) {
  let maxSize = 60;
  let cnt = 0;
  let pkgs = [];
  let newPkg = new Map();
  for (let p of pkgInfo.keys()) {
    newPkg.set(p, pkgInfo.get(p));
    cnt++;
    if (cnt % maxSize === 0) {
      pkgs.push(newPkg);
      newPkg = new Map();
    }
  }
  if (newPkg.size) {
    pkgs.push(newPkg);
  }
  let promises = [];
  for (let p of pkgs) {
    promises.push(getAuditReport(p));
  }
  return Promise.all(promises)
    .then(rpts => {
      let newPkgInfo = new Map();
      for (let r of rpts) {
        for (let p of r.keys()) {
          newPkgInfo.set(p, r.get(p));
        }
      }
      return newPkgInfo;
    })
    .catch(err => {
      throw new VError(err, "doLargeAuditReport Error");
    });
}

module.exports = {
  getAuditReport,
  doLargeAuditReport
};
