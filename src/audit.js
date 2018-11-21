"use strict";

const VError = require("verror");
const fetch = require("node-fetch");

const apiPath = "/api/v3/component-report";

const apiOptions = {
  method: "POST",
  headers: {
    "Content-Type": "application/vnd.ossindex.component-report-request.v1+json"
  }
};

function getCoordinates(pkgInfo) {
  let coordinates = [];
  for (let c of pkgInfo.keys()) {
    coordinates.push(c);
  }
  return {
    coordinates: coordinates.sort()
  };
}

function getAuditReport(config, pkgInfo) {
  let auth = Buffer.from(`${config.ossUser}:${config.ossToken}`).toString("base64");
  let options = {
    method: "POST",
    body: JSON.stringify(getCoordinates(pkgInfo)),
    headers: {
      "Content-Type": "application/vnd.ossindex.component-report-request.v1+json",
      "Authorization": "Basic " + auth
    }
  };
  let url = "https://" + config.ossHost + apiPath;
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
          pkgInfo.get(coord).description = r.description;
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

module.exports = {
  getAuditReport
};
