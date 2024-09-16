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
}

module.exports = {
  TodoSessionStore,
};
