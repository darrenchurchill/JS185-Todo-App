/**
 * JS185 Todo App
 * db.js
 *
 * This module provides a single location to do node-postgres related
 * operations.
 */
"use strict";

const { createPool } = require("./db-pool");

let pool;

async function query(text, params) {
  if (!pool) pool = await createPool();
  const result = await pool.query(text, params);
  return result;
}

module.exports = {
  query
};
