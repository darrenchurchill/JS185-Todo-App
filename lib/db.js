/**
 * JS185 Todo App
 * db.js
 *
 * This module provides a single location to do node-postgres related
 * operations.
 */
"use strict";

const { Pool } = require("pg");

const pool = new Pool({ database: "todo-lists" });

function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  query
};
