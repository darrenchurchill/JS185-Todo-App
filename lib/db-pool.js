/**
 * JS185 Todo App
 * db-pool.js
 *
 * Create a database connection pool depending on the current execution
 * environment.
 */
"use strict";

const { createPool } = require("./db-pool-local");

module.exports = {
  createPool
};
