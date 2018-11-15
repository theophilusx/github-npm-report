"use strict";

const fs = require("fs");

function getConfig(configFile) {
  const rcFile = process.env.HOME + "/" + configFile;

  try {
    fs.accessSync(rcFile, fs.constants.F_OK | fs.constants.R_OK);
    return require(rcFile);
  } catch (err) {
    console.warn(`${rcFile} does not exist or cannot be read. Using defaults`);
    return {
      username: process.env.USER
    };
  }
}

module.exports = {
  getConfig  
};
