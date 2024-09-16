/**
 * JS185 Todo App
 * TodoSessionStore Class
 * todo-session-store.js
 *
 * A TodoSessionStore provides an interface to perform Todo and Todo List CRUD
 * operations on a Loki.js-backed Express Session datastore.
 */
"use strict";

const SEED_DATA = require("./seed-data");
const TodoLists = require("./todolists");
const { deepCopy } = require("./deep-copy");

/** @typedef { import("./typedefs").TodoListLike } TodoListLike */

class TodoSessionStore {
  /** @type {TodoLists} */  #todoLists;

  /**
   * Create a new `TodoSessionStore`
   * @param {*} session the `express-session` Session object
   */
  constructor(session) {
    if (session.todoLists instanceof TodoLists) {
      this.#todoLists = session.todoLists;
      return;
    }

    this.#todoLists = new TodoLists(deepCopy(SEED_DATA));

    // TODO: remove session.todoLists reassignment when this class is built out.
    session.todoLists = this.#todoLists;
  }

  /**
   * Return a deep copy of this store's internal `TodoLists`, as an array of
   * generic `TodoListLike` objects.
   * @returns {Array.<TodoListLike>} a deep copy of `this.#todoLists`
   */
  #todoListsDeepCopy() {
    return deepCopy(this.#todoLists.lists);
  }

  /**
   * Return a sorted deep copy of this session's current `TodoLists`, as an
   * array of generic `TodoListLike` objects.
   * @returns {Array.<TodoListLike>} a sorted deep copy `this.#todoLists`
   */
  sortedTodoLists() {
    this.#todoLists.sort();
    return this.#todoListsDeepCopy();
  }
}

module.exports = {
  TodoSessionStore,
};
