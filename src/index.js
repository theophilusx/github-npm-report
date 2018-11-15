"use strict";

const config = require("./config");
const github = require("./github");

const rc = config.getConfig(".github-npm-report.json");
const orgUnit = process.argv[2];

github.init(rc);

github.getOrganizationRepos(orgUnit)
  .then(repos => {
    console.dir(repos);
    return github.findPackageJson("SheepCRC", "weatherdb", "master");
  })
  .then(files => {
    console.dir(files);
  })
  .catch(err => {
    console.error(err.message);
  });





