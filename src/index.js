"use strict";

const config = require("./config");
const github = require("./github");

const rc = config.getConfig(".github-npm-report.json");
const orgUnit = process.argv[2];

github.init(rc);

github.getOrganizationRepos(orgUnit)
  .then(repos => {
    console.dir(repos);
  })
  .catch(err => {
    console.error(err.message);
  });





