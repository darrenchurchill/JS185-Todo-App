/**
 * JS175 Todo App
 * TodoList Class
 * Mostly reused from JS130
 * todolist.js
 *
 * `TodoList` contains a collection (an array) of `Todo` objects.
 */
"use strict";

const nextID = require("./next-id");
const Todo = require("./todo");

/**
 * The `TodoList` class represents a collection of Todo objects.
 * You can perform typical collection-oriented actions on a `TodoList` object,
 * including iteration and selection.
 */
class TodoList {

  /** @type {number} */        #id;
  /** @type {string} */        #title;
  /** @type {Array.<Todo>} */  #todos;

  /**
   * Create a new `TodoList`
   * @param {string} title the list title
   */
  constructor(title) {
    this.#id = nextID();
    this.setTitle(title);

    this.#todos = [];
  }

  toString() {
    let result = `---- ${this.#title} ----\n`;

    this.#todos.forEach((todo) => {
      result += `${todo}\n`;
    });

    return result;
  }

  /**
   * Return this `TodoList`'s unique integer ID.
   * @returns {number} this `TodoList`'s unique ID
   */
  getID() {
    return this.#id;
  }

  /**
   * Return this `TodoList`'s title as a string.
   * @returns {string} this `TodoList`'s title
   */
  getTitle() {
    return this.#title;
  }

  /**
   * Given a string `title`, set this `TodoList`'s title.
   * @param {string} title the `TodoList`'s title
   * @returns {TodoList} a reference to this `TodoList`, for method chaining
   */
  setTitle(title) {
    this.#title = String(title);
    return this;
  }
  /**
   * Add a `Todo` item to this list.
   * @param {Todo} todo the `Todo` item to add
   * @throws {TypeError} if `todo` is not a `Todo` value
   */
  add(todo) {
    if (!(todo instanceof Todo)) {
      throw new TypeError("todo must be a Todo object");
    }
    this.#todos.push(todo);
  }

  /**
   * Get the size of this list.
   * @returns the number of `Todo`s in this list
   */
  size() {
    return this.#todos.length;
  }

  /**
   * Get the first item in this list.
   * @returns {Todo} the first `Todo` item in this list, or `undefined` if the
   * list is empty.
   */
  first() {
    return this.#todos[0];
  }

  /**
   * Get the last item in this list.
   * @returns {Todo} the last `Todo` item in this list, or `undefined` if the
   * list is empty.
   */
  last() {
    return this.#todos[this.size() - 1];
  }

  /**
   * Get the list item at a given index.
   * @param {number} index the zero-based list index to access
   * @returns {Todo} the `Todo` item at the given index
   * @throws {ReferenceError} if the index is not valid
   */
  itemAt(index) {
    this._validateIndex(index);
    return this.#todos[index];
  }

  /**
   * Validate whether the given index is both:
   * - a number
   * - in bounds for this list.
   * @param {number} index the index to validate
   * @throws {ReferenceError} if the index is not valid
   */
  _validateIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.size()) {
      throw new ReferenceError(`Invalid index: ${index}`);
    }
  }

  /**
   * Mark the item at `index` as done.
   * @param {number} index the item's index in the list
   * @throws {ReferenceError} if the index is not valid
   */
  markDoneAt(index) {
    this.itemAt(index).markDone();
  }

  /**
   * Mark the item at `index` as undone.
   * @param {number} index the item's index in the list
   * @throws {ReferenceError} if the index is not valid
   */
  markUndoneAt(index) {
    this.itemAt(index).markUndone();
  }

  /**
   * Return `true` if this list has items (not empty) and every item in this
   * list is done.
   * @returns {boolean} `true` if list is not empty and every item in this list
   * is done
   */
  isDone() {
    return this.size() > 0 && this.#todos.every((todo) => todo.isDone());
  }

  /**
   * Remove and return the first item in this list.
   * @returns {Todo} the first item in this list, or `undefined` if the list is
   * empty.
   */
  shift() {
    return this.#todos.shift();
  }

  /**
   * Remove and return the last item in this list.
   * @returns {Todo} the last item in this list, or `undefined` if the list is
   * empty.
   */
  pop() {
    return this.#todos.pop();
  }

  /**
   * Remove and return a list item at the given index.
   * @param {number} index the item's index in the list
   * @returns {Todo} the item removed
   * @throws {ReferenceError} if the index is not valid
   */
  removeAt(index) {
    this._validateIndex(index);
    return this.#todos.splice(index, 1)[0];
  }

  /**
   * @callback TodoListForEachCb a function to execute once for each item in
   * the list. The function is called as `callback(todoItem, index)`.
   * @param {Todo} todo the current `Todo` being processed
   * @param {number} index the current index in the list
   * @returns {undefined}
   */

  /**
   * Execute the provided function once for each todo list item.
   * @param {TodoListForEachCb} callback the function to execute for each item
   * in the todo list.
   */
  forEach(callback) {
    this.#todos.forEach((todo, index) => callback(todo, index));
  }

  /**
   * @callback TodoListFilterCb
   * @param {Todo} todo {@link TodoListForEachCb}
   * @param {number} index {@link TodoListForEachCb}
   * @returns {any} a truthy value to consider the `todo` "passing"
   */

  /**
   * Return a shallow copy of this list, containing only the `Todo` items that
   * pass the test implemented in `callback`.
   * @param {TodoListFilterCb} callback the filtering function to execute once
   * for each item in the list
   * @returns {TodoList} a shallow copy of this list containing only the items
   * that passed `callback`'s test.
   */
  filter(callback) {
    let result = new TodoList(this.#title);

    this.forEach((todo, index) => {
      if (callback(todo, index)) result.add(todo);
    });

    return result;
  }

  /**
   * Given a callback function to execute for each item in this list, return
   * the first item found satisfying the testing function. Return `undefined` if
   * no item satisfies the function.
   * @param {TodoListFilterCb} callback the callback to execute for each item in
   * this list
   * @returns {Todo|undefined} the `Todo` found, or `undefined` if no items
   * satisfy the provided function
   */
  find(callback) {
    return this.#todos.find((todo, index) => callback(todo, index));
  }

  /**
   * Given a `Todo`, return its index in this list. Returns `-1` if the `Todo`
   * isn't in this list.
   * @param {Todo} todo the `Todo` item to find
   * @returns {number|-1} `todo`'s index in this list, or `-1` if it isn't found
   */
  indexOf(todo) {
    return this.#todos.findIndex((curTodo) => curTodo.getID() === todo.getID());
  }

  /**
   * Return the first `Todo` whose ID matches the given `id`.
   * @param {number|string} id the `Todo` ID to search for
   * @returns {Todo|undefined} the first `Todo` with the given ID, or
   * `undefined` if no `Todo` is found.
   */
  findByID(id) {
    return this.find((todo) => todo.getID() === id);
  }

  /**
   * Return the first `Todo` whose title matches the given string title.
   * @param {string} title the `Todo` title to search for
   * @returns {Todo|undefined} the first `Todo` with the given title, or
   * `undefined` if no `Todo` is found.
   */
  findByTitle(title) {
    return this.find((todo) => todo.getTitle() === title);
  }

  /**
   * Return a shallow copy of this list containing only the "done" items.
   * @returns {TodoList} a shallow copy of this list containing only the "done"
   * `Todo`s
   */
  allDone() {
    return this.filter((todo) => todo.isDone());
  }

  /**
   * Return a shallow cope of this list containing only the "not done" items.
   * @returns {TodoList} a shallow copy of this list containing only the "not
   * done" `Todo`s
   */
  allNotDone() {
    return this.filter((todo) => !todo.isDone());
  }

  /**
   * Mark the first `Todo` whose title matches the given string title as "done".
   * Do nothing if there are no matching `Todo`s in this list.
   * @param {string} title the title of the `Todo` to mark as "done"
   */
  markDone(title) {
    let found = this.findByTitle(title);
    if (found !== undefined) found.markDone();
  }

  /**
   * Mark all items in this list as "done".
   */
  markAllDone() {
    this.forEach((todo) => todo.markDone());
  }

  /**
   * Mark all items in this list as "not done".
   */
  markAllUndone() {
    this.forEach((todo) => todo.markUndone());
  }

  /**
   * Return a shallow copy of this list as an `Array`.
   * @returns {Array.<Todo>} a shallow copy of this list's `Todo`s as an `Array`
   */
  toArray() {
    let result = [];
    this.forEach((todo) => result.push(todo));
    return result;
  }
}

module.exports = {
  Todo,
  TodoList,
};
