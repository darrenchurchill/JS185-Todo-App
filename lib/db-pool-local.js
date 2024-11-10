/**
 * JS185 Todo App
 * db-pool-local.js
 *
 * Create a pool instance connecting to a database on the localhost.
 */
"use strict";

const { Pool } = require("pg");
const { env } = require("./config");

function createPool() {
  const { DB_NAME, DB_USER } = env;
  return new Pool({ database: DB_NAME, user: DB_USER });
}

module.exports = {
  createPool
};
