"use strict";

const GitHub = require("github-api");
const VError = require("verror");

let gh;

function getGithubConfig(rc) {
  let ghConf = {
    username: rc.username
  };
  if (rc.oauthToken) {
    ghConf.token = rc.oauthToken;
  } else if (rc.pasword) {
    ghConf.password = rc.password;
  }
  return ghConf;
}

function init(rc) {
  const conf = getGithubConfig(rc);
  gh = new GitHub(conf);
  return gh;
}

function getOrganizationRepos(orgName) {
  const org = gh.getOrganization(orgName);

  return org.getRepos()
    .then(({data}) => {
      let repoList = [];
      for (let r of data) {
        repoList.push(r.name);
      }
      return repoList;
    })
    .catch(err => {
      throw new VError(err, `Failed to retrieve repo list for ${orgName}`);
    });
}

module.exports = {
  getGithubConfig,
  init,
  getOrganizationRepos
};
