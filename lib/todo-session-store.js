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
const { TodoList } = require("./todolist");
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
   * array of generic `TodoListLike` objects. Each todo list in the result has
   * all metadata assigned by {@link assignMetadata}
   * @returns {Array.<TodoListLike>} a sorted deep copy `this.#todoLists`
   */
  sortedTodoLists() {
    this.#todoLists.sort();
    return this.#todoListsDeepCopy().map((list) =>
      TodoSessionStore.assignMetadata(list)
    );
  }

  /**
   * Return a number indicating whether `todoA` comes before, after, or is
   * the same as `todoB` in sort order. This function can be used as
   * a callback to `Array.prototype.sort()`, or methods with similar interfaces.
   *
   * "Done" `Todo`s come after "not done" `Todo`'s, and `Todo`'s are further
   * sorted case-insensitively by title.
   * @param {Todo} todoA the first `Todo` to compare
   * @param {Todo} todoB the second `Todo` to compare
   * @returns {-1|0|1} `todoA`'s sort order, compared to `todoB`
   */
  static #compareTodos(todoA, todoB) {
    if (todoA.done === todoB.done) {
      return todoA.title.toLowerCase().localeCompare(
        todoB.title.toLowerCase()
      );
    }
    if (todoA.done) return 1;
    return -1;
  }

  /**
   * Given a `TodoListLike` `todoList` object, sort its list of todos in-place
   * by name and "done-ness". "Done" todos come after "not-done" todos in sort
   * order.
   * @param {TodoListLike} todoList the todo list to sort
   * @returns
   */
  static sortedTodoList(todoList) {
    if (TodoList.isTodoListLike(todoList)) {
      let result = deepCopy(todoList);
      result.todos.sort(TodoSessionStore.#compareTodos);
      return TodoSessionStore.assignMetadata(result);
    }

    throw new Error(`The given todoList is not "todo list-like": ${todoList}`);
  }

  /**
   * Given a `TodoList` or `TodoListLike` `todoList` object, return the count
   * of "done" todos in the list.
   * @param {TodoList|TodoListLike} todoList the todo list to count from
   * @returns {number} how many todos are "done" in the given list
   */
  static countDone(todoList) {
    if (todoList instanceof TodoList) return todoList.allDone().size();

    if (TodoList.isTodoListLike(todoList)) {
      return todoList.todos.filter((todo) => todo.done).length;
    }

    throw new Error(`The given todoList is not "todo list-like": ${todoList}`);
  }

  /**
   * Given a `TodoList` or `TodoListLike` `todoList` object, return `true` if
   * the list is "done". "Done" todo lists have at least 1 todo and every todo
   * in the list is itself "done".
   * @param {TodoList|TodoListLike} todoList the todo list to evaluate
   * @returns {boolean} whether the `todoList` is considered "done"
   */
  static isDoneTodoList(todoList) {
    if (todoList instanceof TodoList) return todoList.isDone();

    if (TodoList.isTodoListLike(todoList)) {
      return (
        todoList.todos.length > 0 &&
        this.countDone(todoList) === todoList.todos.length
      );
    }

    throw new Error(`The given todoList is not "todo list-like": ${todoList}`);
  }

  /**
   * Given a `TodoListLike` `todoList` object, calculate summary metadata and
   * assign them to properties on the object. Return the modified object.
   * @param {TodoListLike} todoList the todo list to calculate and assign
   * metadata to
   * @returns {TodoListLike} the modified `todoList` object
   */
  static assignMetadata(todoList) {
    Object.assign(todoList, {
      countDone: TodoSessionStore.countDone(todoList),
      done: TodoSessionStore.isDoneTodoList(todoList),
    });
    console.log({todoList});
    todoList.todos.forEach((todo) => console.log({todo}));
    return todoList;
  }

  /**
   * Return the list with a given `id`.
   * @param {number} id the list ID to find
   * @returns {TodoListLike|undefined} the found `TodoList`, as a deep-copied
   * generic `TodoListLike` object, or `undefined` if no list is found with the
   * given `id`
   */
  findList(listID) {
    return deepCopy(this.#todoLists.find(listID));
  }
}

module.exports = {
  TodoSessionStore,
};