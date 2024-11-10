/**
 * JS185 Todo App
 * config.js
 *
 * Export the current environment configuration.
 */
"use strict";

const dotenv = require("dotenv");
const { expand } = require("dotenv-expand");

const config = expand(dotenv.config({ override: true }));

module.exports = {
  env: config.parsed,
};
