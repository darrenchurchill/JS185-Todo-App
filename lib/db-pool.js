/**
 * JS185 Todo App
 * db-pool.js
 *
 * Create a database connection pool depending on the current execution
 * environment.
 */
"use strict";

const { env } = require("./config");
const { createPool: poolLocal } = require("./db-pool-local");
const { createPool: poolCloud } = require("./db-pool-cloud");

let createPool = poolLocal;

if (env.NODE_ENV === "production") {
  console.log({ NODE_ENV: env.NODE_ENV });
  createPool = poolCloud;
}

module.exports = {
  createPool
};
