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
 * @typedef TodoMetadata
 * @property {number} listID
 * @property {string} listTitle
 */

/**
 * @typedef {TodoLike & TodoMetadata} TodoQueryResult
 */

/**
 * @typedef TodoArrayObj
 * @property {Array.<TodoLike|TodoQueryResult>} todos
 */

/**
 * @typedef TodoListCore
 * @property {number} id
 * @property {string} title
 */

/**
 * @typedef {TodoListCore & TodoArrayObj} TodoListLike
 */

/**
 * @typedef TodoListMetadata
 * @property {number} length
 * @property {number} countDone
 * @property {boolean} done
 */

/**
 * @typedef {TodoListCore & TodoListMetadata} TodoListMetadataQueryResult
 */

/**
 * @typedef {TodoListLike & TodoListMetadata} TodoListQueryResult
 */

exports.unused = {};
