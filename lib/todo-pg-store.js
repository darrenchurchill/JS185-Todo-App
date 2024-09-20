/**
 * JS185 Todo App
 * TodoPGStore Class
 * todo-pg-store.js
 *
 * A TodoPGStore provides an interface to perform Todo and Todo List CRUD
 * operations on a PostgreSQL database.
 */
"use strict";

const { query } = require("./db");
const SEED_DATA = require("./seed-data");
const { TodoList } = require("./todolist");
const TodoLists = require("./todolists");
const { deepCopy } = require("./deep-copy");

/** @typedef { import("./typedefs").TodoListQueryResult } TodoListQueryResult */

class TodoPGStore {
  /** @type {TodoLists} */  #todoLists;

  /**
   * Create a new `TodoPGStore`
   */
  constructor() {
    // TODO: does the constructor need to do anything?
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
   * Return a sorted of this store's current todo lists, as an array of generic
   * objects.
   * @returns {Array.<TodoListQueryResult>} the array of todo lists
   */
  // eslint-disable-next-line max-lines-per-function
  async sortedTodoLists() {
    const text =
`SELECT
  *,
  "length" > 0
  AND "countDone" = "length" AS done
FROM
  (
    SELECT
      tl.*,
      count(t.id)::integer "length",
      coalesce(sum(t.done::integer), 0)::integer "countDone"
    FROM
      todolists tl
      LEFT JOIN todos t ON tl.id = t.todolist_id
    GROUP BY
      tl.id
  )
ORDER BY
  done,
  lower(title)
`;
    return (await query(text)).rows;
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
   * Given an integer `listID` return an object containing the list's summary
   * metadata, and an array of all the list's todos, sorted by todo name and
   * "done-ness". "Done" todos come after "not-done" todos in sort order.
   * @param {number} listID the list's ID to find todos for
   * @returns
   */
  // eslint-disable-next-line max-lines-per-function
  async sortedTodoList(listID) {
    const text =
`WITH
  list_metadata AS (
    SELECT
      *,
      "length" > 0
      AND "countDone" = "length" AS done
    FROM
      (
        SELECT
          tl.id "listID",
          tl.title,
          count(t.id)::integer "length",
          coalesce(sum(t.done::integer), 0)::integer "countDone"
        FROM
          todolists tl
          LEFT JOIN todos t ON tl.id = t.todolist_id
        GROUP BY
          tl.id
        HAVING
          tl.id = $1
      )
  )
SELECT
  t.id,
  t.title,
  t.done,
  lm."listID",
  lm.title "listTitle",
  lm.length "listLength",
  lm."countDone"
FROM
  todos t
  RIGHT JOIN list_metadata lm ON t.todolist_id = "listID"
ORDER BY
  t.done,
  lower(t.title)
`;

    const queryRows = (await query(text, [listID])).rows;
    const resultRows = queryRows[0].listLength === 0 ? [] : queryRows;

    return {
      id: queryRows[0].listID,
      title: queryRows[0].listTitle,
      length: queryRows[0].listLength,
      countDone: queryRows[0].countDone,
      todos: resultRows,
    };
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
      countDone: TodoPGStore.countDone(todoList),
      done: TodoPGStore.isDoneTodoList(todoList),
    });
    console.log({todoList});
    todoList.todos.forEach((todo) => console.log({todo}));
    return todoList;
  }

  /**
   * Return `true` if the given list `title` already exists in this store's list
   * of todo lists.
   * @param {string} title the list title to search for
   * @returns {boolean} `true` if the `title` already exists in this store's
   * list of todo lists
   */
  async listTitleExists(title) {
    return (await query(
      "SELECT id, title FROM todolists WHERE title = $1",
      [title]
    )).rowCount > 0;
  }

  /**
   * Return the list with a given `id`.
   * @param {number} id the list ID to find
   * @returns {TodoListQueryResult|undefined} the found list, as a generic
   * object, or `undefined` if no list is found with the given `id`
   */
  async findList(listID) {
    return (await query(
      "SELECT id, title FROM todolists WHERE id = $1",
      [listID]
    )).rows[0];
  }

  #findTodo(todoID, listID) {
    const todoLists =
      listID === undefined
        ? this.#todoLists.lists
        : [this.#todoLists.find(listID)];

    for (let todoList of todoLists) {
      const todo = todoList.findByID(todoID);
      if (todo !== undefined) return todo;
    }

    return undefined;
  }

  /**
   * Given an integer `todoID` and an optional integer `listID`, find the todo
   * with the `todoID` in either: the list with the `listID`; or, the entire set
   * of todo lists in this store.
   * @param {number} todoID the todo ID to find
   * @param {number|undefined} listID the optional list ID to look for the todo
   * in
   * @returns {TodoLike|undefined} a deep copy of the found todo, or `undefined`
   * if a todo with the given ID isn't found.
   */
  findTodo(todoID, listID) {
    return deepCopy(this.#findTodo(todoID, listID));
  }

  /**
   * Given an integer `todoID` and `listID`, mark the todo with the given ID
   * as "done".
   * @param {number} todoID the ID of the todo to modify
   * @param {number} listID the list's ID containing the todo
   */
  markDone(todoID, listID) {
    this.#findTodo(todoID, listID).markDone();
  }

  /**
   * Given an integer `listID`, mark the all of that list's todos as "done".
   * @param {number} listID the list's ID
   */
  markAllDone(listID) {
    this.#todoLists.find(listID).markAllDone();
  }

  /**
   * Given an integer `todoID` and `listID`, mark the todo with the given ID
   * as "not done".
   * @param {number} todoID the ID of the todo to modify
   * @param {number} listID the list's ID containing the todo
   */
  markUndone(todoID, listID) {
    this.#findTodo(todoID, listID).markUndone();
  }


  /**
   * Given a string `title`, add a new todo list to this store. The `title`
   * should be unique among all lists, but this method doesn't enforce this
   * requirement.
   * @param {string} title the new list's title
   */
  addList(title) {
    this.#todoLists.lists.push(new TodoList(title));
  }


  /**
   * Given an integer `listID` and string `todoTitle` add a new todo to the
   * list with the given ID.
   * @param {number} listID the ID of the list to add the new todo to
   * @param {string} todoTitle the new todo's title
   */
  addTodo(listID, todoTitle) {
    this.#todoLists.find(listID).add(todoTitle);
  }

  /**
   * Given an integer `todoID` and `listID`, remove the todo with the given ID
   * and return a deep copy of the removed todo as a generic
   * {@link TodoListLike}.
   * @param {number} todoID the ID of the todo to remove
   * @param {number} listID the list's ID containing the todo
   */
  removeTodo(todoID, listID) {
    const todoList = this.#todoLists.find(listID);
    return deepCopy(
      todoList.removeAt(todoList.indexOf(this.#findTodo(todoID, listID)))
    );
  }

  /**
   * Given an integer `listID`, remove the list with that ID from this store's
   * list of todo lists. Return a deep copy of the removed list.
   * @param {number} listID the ID of the list to remove
   * @returns {TodoListLike} a deep copy of the removed list
   */
  removeList(listID) {
    return deepCopy(
      this.#todoLists.lists.splice(
        this.#todoLists.lists.findIndex((list) => list.getID() === listID),
        1
      )[0]
    );
  }

  /**
   * Given an integer `listID` and string `title`, set the list's title to the
   * provided value.
   * @param {number} listID the ID of the list to modify
   * @param {string} title the new list title
   */
  setListTitle(listID, title) {
    this.#todoLists.find(listID).setTitle(title);
  }
}

module.exports = {
  TodoPGStore,
};
