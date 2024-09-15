/**
 * JS185 Todo App
 * LS-Provided code to generate unique incrementing integer IDs.
 * next-id.js
 */
"use strict";

let currentID = 0;

/**
 * Generate and return the next incremented integer ID value.
 * @returns {number} the next unique integer ID
 */
module.exports = function() {
  currentID += 1;
  return currentID;
};
