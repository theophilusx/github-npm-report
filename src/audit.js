"use strict";

const zlib = require("zlib");
const os = require("os");
const VError = require("verror");
const semver = require("semver");
const fetch = require("node-fetch");

const apiPath = "/api/v3/component-report";

const apiOptions = {
  method: "POST",
  headers: {
    "Content-Type": "application/vnd.ossindex.component-report-request.v1+json"
  }
};

function allDependencies(depSet, devDepSet) {
  let coordinates = [];
  for (let v of depSet.values()) {
    let [name, version] = v.split("|");
    coordinates.push(`pkg:npm/${name}@${semver.valid(semver.coerce(version))}`);
  }
  for (let v of devDepSet.values()) {
    let [name, version] = v.split("|");
    coordinates.push(`pkg:npm/${name}@${semver.valid(semver.coerce(version))}`);
  }
  return {
    coordinates: coordinates.sort()
  };
}

function getAuditReport(config, data) {
  let auth = Buffer.from(`${config.ossUser}:${config.ossToken}`, "utf-8").toString("base64");
  apiOptions.headers.Authorization = "Basic " + auth;
  apiOptions.body = JSON.stringify(data);
  let url = "https://" + config.ossHost + apiPath;
  return fetch(url, apiOptions)
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
