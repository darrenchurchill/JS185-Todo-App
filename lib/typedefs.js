/**
 * JS185 Todo App
 * typedefs.js
 *
 * Reusable JSDoc typedefs
 */

/**
 * @typedef TodoLike
 * @property {number} id
 * @property {string} title
 * @property {boolean} done
 */

/**
 * @typedef TodoListLike
 * @property {number} id
 * @property {string} title
 * @property {Array.<object>} todos
 */

/**
 * @typedef TodoQueryResult
 * @property {number} id
 * @property {string} title
 * @property {boolean} done
 * @property {number} listID
 * @property {string} listTitle
 */

/**
 * @typedef TodoListQueryResult
 * @property {number} id
 * @property {string} title
 * @property {number} length
 * @property {number} countDone
 * @property {boolean} done
 */

exports.unused = {};
