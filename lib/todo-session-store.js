/**
 * JS185 Todo App
 * TodoSessionStore Class
 * todo-session-store.js
 *
 * A TodoSessionStore provides an interface to perform Todo and Todo List CRUD
 * operations on a Loki.js-backed Express Session datastore.
 *
 * I intend this class to serve as an intermediate step on the way to removing
 * the todo app routing logic's direct dependency on the Todo, TodoList, and
 * TodoLists classes. This should make swapping in a PostgreSQL-based data store
 * simpler: the postgres client will need to provide the same interface as the
 * TodoSessionStore here.
 */
"use strict";

const SEED_DATA = require("./seed-data");
const { TodoList } = require("./todolist");
const TodoLists = require("./todolists");
const { deepCopy } = require("./deep-copy");

/** @typedef { import("./typedefs").TodoListLike } TodoListLike */
/** @typedef { import("./typedefs").TodoQueryResult } TodoQueryResult */
/** @typedef { import("./typedefs").TodoListMetadataQueryResult } TodoListMetadataQueryResult */
/** @typedef { import("./typedefs").TodoListQueryResult } TodoListQueryResult */

/**
 * An object defining the optional additional parameters for querying methods.
 * @typedef {object} TodoSessionStoreQueryOpts
 * @property {boolean} [throw = false] whether the querying method should throw
 * an Error if any of the provided query arguments are invalid. Regardless of
 * this option's value, the method will still re-throw Errors raised for other
 * unexpected reasons (like database connectivity issues, for example).
 */

class TodoSessionStore {
  static ERROR_CODE_INVALID_LIST_ID = "InvalidListID";
  static ERROR_CODE_INVALID_TODO_ID = "InvalidTodoID";
  static ERROR_CODE_NON_UNIQUE_LIST_TITLE = "NonUniqueListTitle";

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

    // NOTE: We have to assign the session.todoLists reference because the
    // express request session object still manages the server-local data store.
    // As a result, you could bypass this class's interface through the session
    // object's todoLists reference, but as I noted in the file header above,
    // the TodoSessionStore is helping to define the interface a Postgres client
    // will ultimately provide.
    session.todoLists = this.#todoLists;
  }

  #logNotImplemented(method) {
    console.log(
      `Warning: the method ${method.name} is not implemented and has no effect.`
    );
  }

  /**
   * Given an Error object, throw or return the Error according to the
   * `options.throw` parameter.
   * @param {Error} err the Error to consider
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {Error} the original Error
   * @throws {Error} the original Error
   */
  #err(err, options = { throw: false }) {
    if (options.throw) throw err;
    return err;
  }

  /**
   * Throw or return an Error representing an invalid list ID.
   * @param {number} listID the invalid list ID
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {Error} the resulting Error object
   * @throws {Error} the resulting Error object
   */
  #errInvalidListID(listID, options = { throw: false }) {
    return this.#err(
      new Error("The given list ID doesn't exist", {
        code: TodoSessionStore.ERROR_CODE_INVALID_LIST_ID,
        values: [listID],
      }),
      options
    );
  }

  /**
   * Throw or return an Error representing an invalid todoID.
   * @param {number} todoID the invalid todo ID
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {Error} the resulting Error object
   * @throws {Error} the resulting Error object
   */
  #errInvalidTodoID(todoID, options = { throw: false }) {
    return this.#err(
      new Error("The given todo ID doesn't exist", {
        code: TodoSessionStore.ERROR_CODE_INVALID_TODO_ID,
        values: [todoID],
      }),
      options
    );
  }

  /**
   * Throw or return an Error representing an invalid list title.
   * @param {string} title the invalid list title
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {Error} the resulting Error object
   * @throws {Error} the resulting Error object
   */
  #errNonUniqueListTitle(title, options = { throw: false }) {
    return this.#err(
      new Error("List titles must be unique.", {
        cause: {
          code: TodoSessionStore.ERROR_CODE_NON_UNIQUE_LIST_TITLE,
          values: [title],
        },
      }),
      options
    );
  }

  beginTransaction() {
    this.#logNotImplemented(this.beginTransaction);
  }

  commitTransaction() {
    this.#logNotImplemented(this.commitTransaction);
  }

  rollbackTransaction() {
    this.#logNotImplemented(this.rollbackTransaction);
  }

  withTransaction() {
    this.#logNotImplemented(this.withTransaction);
  }

  /**
   * Return a sorted deep copy of this session's current `TodoLists`, as an
   * array of objects, each containing `TodoListMetadataQueryResult`'s
   * properties.
   *
   * The individual `Todo`'s aren't included in this result, only
   * each list's defining properties and metadata properties describing the
   * list's current state.
   * @returns {Array.<TodoListMetadataQueryResult>} a sorted deep copy of the
   * list of todo lists
   */
  sortedTodoLists() {
    return deepCopy(this.#todoLists.sort().lists);
  }

  /**
   * Given an integer `listID`, return an object containing the list's summary
   * metadata and an array of the list's todos, sorted by name and "done-ness".
   * "Done" todos come after "not-done" todos in sort order.
   * @param {number} listID the list ID to find the todos for
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {TodoListQueryResult|undefined} the sorted todo list, or
   * `undefined` if the list doesn't exist
   */
  sortedTodoList(listID, options = { throw: false }) {
    return deepCopy(this.#findList(listID, options));
  }

  /**
   * Return `true` if the given list `title` already exists in this store's list
   * of todo lists.
   * @param {string} title the list title to search for
   * @returns {boolean} `true` if the `title` already exists in this store's
   * list of todo lists
   */
  listTitleExists(title) {
    return this.#todoLists.lists.some(
      (todoList) => todoList.getTitle() === title
    );
  }

  /**
   * Return `true` if a list with the ID `listID` exists in this store's list of
   * todo lists.
   * @param {number} listID the integer ID to search for
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {boolean} `true` if the list exists
   */
  listExists(listID, options = { throw: false }) {
    return this.#findList(listID, options) !== undefined;
  }

  /**
   * Return `true` if a todo with the ID `todoID` exists in this store's list of
   * todo lists.
   * @param {number} todoID the integer ID to search for
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {boolean} `true` if the todo exists
   */
  todoExists(todoID, options = { throw: false }) {
    return this.findTodo(todoID, undefined, options) !== undefined;
  }

  #findList(listID, options = { throw: false }) {
    const list = this.#todoLists.find(listID);
    if (!list) {
      this.#errInvalidListID(listID, options);
      return undefined;
    }
    return list;
  }

  /**
   * Return the list with a given `listID`.
   * @param {number} listID the list ID to find
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {TodoListQueryResult|undefined} the found `TodoList`, as a
   * deep-copied generic `TodoListQueryResult` object, or `undefined` if no list
   * is found with the given `listID`
   */
  findList(listID, options = { throw: false }) {
    return this.sortedTodoList(listID, options);
  }

  #findTodo(todoID, listID, options = { throw: false }) {
    const todoLists =
      listID === undefined
        ? this.#todoLists.lists
        : [this.#findList(listID, options)];

    for (let todoList of todoLists) {
      const todo = todoList.findByID(todoID);
      if (todo !== undefined) return todo;
    }

    this.#errInvalidTodoID(todoID, options);
    return undefined;
  }

  /**
   * Given an integer `todoID` and an optional integer `listID`, find the todo
   * with the `todoID` in either: the list with the `listID`; or, the entire set
   * of todo lists in this store.
   * @param {number} todoID the todo ID to find
   * @param {number|undefined} listID the optional list ID to look for the todo
   * in
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {TodoQueryResult|undefined} a deep copy of the found todo, or
   * `undefined` if a todo with the given ID isn't found.
   */
  findTodo(todoID, listID, options = { throw: false }) {
    return this.#findTodo(todoID, listID, options);
  }

  /**
   * Given an integer `listID`, mark the all of that list's todos as "done".
   * Return true if the list exists and the operation completed successfully.
   * @param {number} listID the list's ID
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {boolean} `true` if the list exists and the operation completed
   * successfully
   */
  markAllDone(listID, options = { throw: false }) {
    const list = this.#findList(listID, options);
    if (!list) return false;
    list.markAllDone();
    return true;
  }

  /**
   * Given an integer `todoID` and `listID`, toggle the todo with the given ID
   * as "done" or "not done".
   * @param {number} todoID the ID of the todo to modify
   * @param {number} listID the list's ID containing the todo
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {TodoQueryResult|undefined} the toggled todo, in its post-toggled
   * state, or `undefined` if the todo doesn't exist
   */
  toggleDone(todoID, listID, options = { throw: false }) {
    const list = this.#findList(listID, options);
    const todo = this.#findTodo(todoID, listID, options);
    if (!todo) return undefined;
    if (todo.isDone()) todo.markUndone();
    else todo.markDone();
    return {
      ...deepCopy(todo),
      listID: list.getID(),
      listTitle: list.getTitle(),
    };
  }

  /**
   * Given a string `title`, add a new todo list to this store, and return
   * `true` if the new list was successfully added. The `title` must be unique
   * among all lists.
   * @param {string} title the new list's title
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {boolean} `true` if the new list was successfully added
   */
  addList(title, options = { throw: false }) {
    if (this.listTitleExists(title)) {
      this.#errNonUniqueListTitle(title, options);
      return false;
    }
    this.#todoLists.lists.push(new TodoList(title));
    return true;
  }

  /**
   * Given an integer `listID` and string `todoTitle` add a new todo to the
   * list with the given ID.
   * @param {number} listID the ID of the list to add the new todo to
   * @param {string} todoTitle the new todo's title
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {boolean} `true` if the todo was added successfully
   */
  addTodo(listID, todoTitle, options = { throw: false }) {
    const list = this.#findList(listID, options);
    if (!list) return false;
    list.add(todoTitle);
    return true;
  }

  /**
   * Given an integer `todoID` and `listID`, remove the todo with the given ID
   * and return a deep copy of the removed todo as a generic
   * {@link TodoQueryResult}.
   * @param {number} todoID the ID of the todo to remove
   * @param {number} listID the list's ID containing the todo
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {TodoQueryResult|undefined} the removed todo, or `undefined` if
   * the todo doesn't exist
   */
  removeTodo(todoID, listID, options = { throw: false }) {
    const list = this.#findList(listID, options);
    const todo = this.#findTodo(todoID, listID, options);
    if (!todo) return undefined;
    return {
      ...deepCopy(list.removeAt(list.indexOf(todo))),
      listID: list.getID(),
      listTitle: list.getTitle(),
    };
  }

  /**
   * Given an integer `listID`, remove the list with that ID from this store's
   * list of todo lists. Return a deep copy of the removed list.
   * @param {number} listID the ID of the list to remove
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {TodoListQueryResult|undefined} a deep copy of the removed list,
   * or `undefined` if a list with the given ID doesn't exist
   */
  removeList(listID, options = { throw: false }) {
    const idx = this.#todoLists.lists.findIndex(
      (list) => list.getID() === listID
    );
    if (idx < 0) {
      this.#errInvalidListID(listID, options);
      return undefined;
    }
    return deepCopy(this.#todoLists.lists.splice(idx, 1)[0]);
  }

  /**
   * Given an integer `listID` and string `title`, set the list's title to the
   * provided value; return `true` if the list title was successfully set. The
   * `title` must be unique among all the lists.
   * @param {number} listID the ID of the list to modify
   * @param {string} title the new list title
   * @param {TodoSessionStoreQueryOpts} options the set of additional query
   * options
   * @returns {boolean} `true` if the list title was successfully set
   */
  setListTitle(listID, title, options = { throw: false }) {
    const list = this.#findList(listID, options);
    if (!list) return false;
    if (title === list.getTitle()) {
      // Setting the title in this case has no impact, but could if the class
      // maintained something like a "last updated" timestamp, so we'll call the
      // method anyway.
      list.setTitle(title);
      return true;
    }
    if (this.listTitleExists(title)) return false;
    list.setTitle(title);
    return true;
  }
}

module.exports = {
  TodoSessionStore,
};
