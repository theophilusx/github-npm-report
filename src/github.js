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

async function searchBranch(repository, tree, path = "root") {
  try {
    let files = [];
    let {data} = await repository.getTree(tree);
    for (let entry of data.tree) {
      if (entry.path.match(/^package.*\.json/) && entry.type === "blob") {
        console.log(`Adding ${path}/${entry.path}`);
        files.push([
          path + "/" + entry.path,
          entry.sha
        ]);
      } else if (entry.type === "tree") {
        let dirFiles = await searchBranch(repository, entry.sha, path + "/" + entry.path);
        if (dirFiles.length) {
          files = files.concat(dirFiles);
        }
      }
    }
    return files;
  } catch (err) {
    throw new VError(err, `Failed searching ${path}`);
  }
}

function findPackageJson(orgName, repoName, branch) {
  const repo = gh.getRepo(orgName, repoName);

  return repo.getBranch(branch)
    .then(({data}) => {
      let treeSha = data.commit.commit.tree.sha;
      return searchBranch(repo, treeSha);
    })
    .catch(err => {
      throw new VError(err, `Failed search for package.json in ${branch} branch of ${repoName}`);
    });
}

function getBlob(orgName, repoName, fileSha) {
  const repo = gh.getRepo(orgName, repoName);

  return repo.getBlob(fileSha)
    .then(resp => {
      return resp.data;
    })
    .catch(err => {
      throw new VError(err, `Failed to get blob for ${fileSha}`);
    });
}

module.exports = {
  getGithubConfig,
  init,
  getOrganizationRepos,
  findPackageJson,
  getBlob
};
