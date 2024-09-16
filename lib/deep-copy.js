/**
 * JS185 Todo App
 * Deep Copy Utility
 * deep-copy.js
 */
"use strict";

function deepCopy(object) {
  if (typeof object !== "object") return object;
  return JSON.parse(JSON.stringify(object));
}

module.exports = {
  deepCopy,
};
