/**
 * JS185 Todo App
 * Todo Class
 * Mostly reused from JS130
 * todo.js
 */
"use strict";

const nextID = require("./next-id");

/** @typedef { import("./typedefs").TodoLike } TodoLike */

/**
 * The `Todo` class represents a todo item and its associated data:
 * - the todo title
 * - a flag representing the todo's "done" state (done or not done)
 */
class Todo {
  static DONE_MARKER = "X";
  static UNDONE_MARKER = " ";

  /** @type {number} */   #id;
  /** @type {string} */   #title;
  /** @type {boolean} */  #done;

  /**
   * Create a new `Todo`.
   * @param {string|TodoLike} initialVal this Todo's title, or a `Todo`-like
   * object, containing the properties in {@link TodoLike}
   */
  constructor(initialVal) {
    if (!Todo.#isTodoLike(initialVal)) {
      this.#id = nextID();
      this.setTitle(initialVal);
      this.#done = false;
      return;
    }

    this.#id = initialVal.id;
    this.setTitle(initialVal.title);
    this.#done = initialVal.done;
  }

  /**
   * Return `true` if `value` is a `Todo`-like object, containing the properties
   * in {@link TodoLike}.
   * @param {any} value the value to evaluate
   * @returns {boolean} `true` if `value` is `Todo`-like
   */
  static #isTodoLike(value) {
    return (
      typeof value === "object" &&
      "id" in value &&
      "title" in value &&
      "done" in value
    );
  }

  /**
   * Return a JSON value representing this `Todo`'s core properties.
   * @returns {TodoLike} the JSON-ified object
   */
  toJSON() {
    return {
      id: this.getID(),
      title: this.getTitle(),
      done: this.isDone(),
    };
  }

  toString() {
    let marker = this.isDone() ? Todo.DONE_MARKER : Todo.UNDONE_MARKER;
    return `[${marker}] ${this.#title}`;
  }

  /**
   * Return a number indicating whether this `Todo` comes before, after, or is
   * the same as the given `Todo` in sort order. This function can be used as
   * a callback to `Array.prototype.sort()`, or methods with similar interfaces.
   *
   * "Done" `Todo`s come after "not done" `Todo`'s, and `Todo`'s are further
   * sorted case-insensitively by title.
   * @param {Todo} otherTodo the other `Todo` to compare this one to
   * @returns {-1|0|1} this `Todo`'s sort order, compared to `otherTodo`
   */
  compare(otherTodo) {
    if (this.isDone() === otherTodo.isDone()) {
      return this.getTitle().toLowerCase().localeCompare(
        otherTodo.getTitle().toLowerCase()
      );
    }
    if (this.isDone()) return 1;
    return -1;
  }

  /**
   * Mark this `Todo` as "done".
   */
  markDone() {
    this.#done = true;
  }

  /**
   * Mark this `Todo` as "not done".
   */
  markUndone() {
    this.#done = false;
  }

  /**
   * Return `true` if this `Todo` is "done".
   * @returns {boolean} `true` if this `Todo` is "done", `false` otherwise
   */
  isDone() {
    return this.#done;
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
    return this.#title;
  }

  /**
   * Given a string `title`, set this `Todo`'s title.
   * @param {string} title the `Todo`'s title
   * @returns {Todo} a reference to this `Todo', for method chaining
   */
  setTitle(title) {
    this.#title = String(title);
    return this;
  }
}

module.exports = Todo;
