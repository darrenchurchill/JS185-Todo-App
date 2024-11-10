/**
 * JS185 Todo App
 * db-pool-cloud.js
 *
 * Create a pool instance connecting to Google Cloud SQL.
 */
"use strict";

const { Connector } = require("@google-cloud/cloud-sql-connector");
const { Pool} = require("pg");

const { env } = require("./config");

async function createPool() {
  const {
    INSTANCE_CONNECTION_NAME,
    DB_NAME,
    DB_USER,
  } = env;

  const connector = new Connector();

  const clientOpts = await connector.getOptions({
    instanceConnectionName: INSTANCE_CONNECTION_NAME,
    authType: "IAM",
  });

  return new Pool({
    ...clientOpts,
    database: DB_NAME,
    user: DB_USER,
  });
}

module.exports = {
  createPool
};
