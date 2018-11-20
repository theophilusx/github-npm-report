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

function allDependencies(depInfo, devDepInfo) {
  let coordinates = [];
  for (let c of depInfo.keys()) {
    coordinates.push(c);
  }
  // for (let c of devDepInfo.keys()) {
  //   coordinates.push(c);
  // }
  return {
    coordinates: coordinates.sort()
  };
}

function getAuditReport(config, data) {
  let auth = Buffer.from(`${config.ossUser}:${config.ossToken}`).toString("base64");
  let options = {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/vnd.ossindex.component-report-request.v1+json",
      "Authorization": "Basic " + auth
    }
  };
  //apiOptions.headers.Authorization = "Basic " + auth;
  //apiOptions.body = JSON.stringify(data);
  let url = "https://" + config.ossHost + apiPath;
  return fetch(url, options)
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      } else {
        throw new VError(`Error: ${resp.statusText}`);
      }
    })
    .catch(err => {
      throw new VError(err, "Failed to retireve audit report");
    });
}

module.exports = {
  allDependencies,
  getAuditReport
};
