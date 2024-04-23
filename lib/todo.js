/**
 * JS175 Todo App
 * Todo Class
 * Mostly reused from JS130
 * todo.js
 */
"use strict";

const nextID = require("./next-id");

/**
 * The `Todo` class represents a todo item and its associated data:
 * - the todo title
 * - a flag representing the todo's "done" state (done or not done)
 */
class Todo {
  static DONE_MARKER = "X";
  static UNDONE_MARKER = " ";

  /** @type {number} */   #id;
  /**
   * Create a new `Todo`.
   * @param {string} title this Todo's title
   */
  constructor(title) {
    this.title = String(title);
    this.done = false;
    this.#id = nextID();
  }

  toString() {
    let marker = this.isDone() ? Todo.DONE_MARKER : Todo.UNDONE_MARKER;
    return `[${marker}] ${this.title}`;
  }

  /**
   * Mark this `Todo` as "done".
   */
  markDone() {
    this.done = true;
  }

  /**
   * Mark this `Todo` as "not done".
   */
  markUndone() {
    this.done = false;
  }

  /**
   * Return `true` if this `Todo` is "done".
   * @returns {boolean} `true` if this `Todo` is "done", `false` otherwise
   */
  isDone() {
    return this.done;
  }

  /**
   * Return this `Todo`'s ID.
   * @returns {number} this `Todo`'s ID
   */
  getID() {
    return this.#id;
  }

  /**
   * Return this `Todo`'s title as a string.
   * @returns {string} this `Todo`'s title
   */
  getTitle() {
    return this.title;
  }
}

module.exports = Todo;
