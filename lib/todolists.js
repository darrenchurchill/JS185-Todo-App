/**
 * JS175 Todo App
 * TodoLists Class
 * todolists.js
 *
 * `TodoLists` contains a collection (an array) of `TodoList` objects.
 */
"use strict";

/** @typedef { import("./todolist").TodoList } TodoList */

class TodoLists {

  /**
   * Create a list of `TodoList`s.
   * @param {Array.<TodoList>} lists the `TodoList`s
   */
  constructor(lists = []) {
    /** @type {Array.<TodoList>} */
    this.lists = lists;
  }

  /**
   * Return the list with a given `id`.
   * @param {number} id the list ID to find
   * @returns {TodoList|undefined} the found `TodoList`, or `undefined` if no
   * list is found with the given `id`
   */
  find(id) {
    return this.lists.find((list) => list.getID() === id);
  }

  /**
   * @callback TodoListsSortCb
   * @param {TodoList} todoListA the first `TodoList`
   * @param {TodoList} todoListB the second `TodoList`
   * @returns {-1|0|1} the sort order
   * - `-1` if `TodoListA` comes BEFORE `TodoListB`
   * - `0` if `TodoListA` and `TodoListB` have the SAME sort order
   * - `1` if `TodoListA` comes AFTER `TodoListB`
   */

  /**
   * Sort this list's `TodoList`s in-place. "Done" lists come before "not done"
   * lists, and lists are ordered case-insensitively by title.
   * @param {TodoListsSortCb} callback the optional callback to use when sorting
   * the `TodoList`s. If `undefined`, the default
   * {@link TodoList#compare} method is used.
   * @returns {TodoLists} a reference to this `TodoLists` object
   * `Array`
   */
  sort(callback = (listA, listB) => listA.compare(listB)) {
    this.lists.sort(callback);
    return this;
  }
}

module.exports = TodoLists;
