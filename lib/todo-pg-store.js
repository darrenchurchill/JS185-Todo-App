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

/** @typedef { import("./typedefs").TodoQueryResult } TodoQueryResult */
/** @typedef { import("./typedefs").TodoListMetadataQueryResult } TodoListMetadataQueryResult */
/** @typedef { import("./typedefs").TodoListQueryResult } TodoListQueryResult */

class TodoPGStore {
  /**
   * Return `true` if the given Error represents a database UNIQUE constraint
   * violation.
   * @param {Error} err the Error to inspect
   * @returns {boolean} `true` if the Error represents a database UNIQUE
   * constraint violation
   */
  static #isUniqueConstraintViolation(err) {
    return /violates unique constraint/.test(err.message);
  }

  /**
   * Return a sorted of this store's current todo lists, as an array of generic
   * objects.
   * @returns {Promise<Array.<TodoListMetadataQueryResult>>} a Promise
   * containing the array of todo lists when fulfilled
   */
  // eslint-disable-next-line max-lines-per-function
  async sortedTodoLists() {
    const text =
`SELECT
  id,
  title,
  "length",
  "countDone",
  "length" > 0
  AND "countDone" = "length" AS done
FROM
  (
    SELECT
      tl.id,
      tl.title,
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
   * Given an integer `listID`, return an object containing the list's summary
   * metadata and an array of all the list's todos, sorted by todo name and
   * "done-ness". "Done" todos come after "not-done" todos in sort order.
   * Returns `undefined` if a list with the given ID doesn't exist in this
   * store.
   * @param {number} listID the list's ID to find todos for
   * @returns {Promise<TodoListQueryResult|undefined>} a Promise, containing
   * when fulfilled: the `TodoListQueryResult` or `undefined` if the list
   * doesn't exist
   */
  // eslint-disable-next-line max-lines-per-function
  async sortedTodoList(listID) {
    const text =
`WITH
  list_metadata AS (
    SELECT
      id,
      title,
      "length",
      "countDone",
      "length" > 0
      AND "countDone" = "length" AS done
    FROM
      (
        SELECT
          tl.id,
          tl.title,
          count(t.id)::integer "length",
          coalesce(sum(t.done::integer), 0)::integer "countDone"
        FROM
          todolists tl
          LEFT JOIN todos t ON tl.id = t.todolist_id
        GROUP BY
          tl.id,
          tl.title
        HAVING
          tl.id = $1
      )
  )
SELECT
  t.id,
  t.title,
  t.done,
  lm.id "listID",
  lm.title "listTitle",
  lm.length "listLength",
  lm."countDone",
  lm.done "listDone"
FROM
  todos t
  RIGHT JOIN list_metadata lm ON t.todolist_id = lm.id
ORDER BY
  t.done,
  lower(t.title)
`;

    const { rows: queryRows, rowCount: queryRowCount } = await query(text,
      [listID]
    );
    if (queryRowCount === 0) return undefined;

    const resultRows = queryRows[0].listLength === 0 ? [] : queryRows;

    return {
      id: queryRows[0].listID,
      title: queryRows[0].listTitle,
      length: queryRows[0].listLength,
      countDone: queryRows[0].countDone,
      done: queryRows[0].listDone,
      todos: resultRows.map((row) => {
        return {
          id: row.id,
          title: row.title,
          done: row.done,
          listID: row.listID,
          listTitle: row.listTitle,
        };
      }),
    };
  }

  /**
   * Return `true` if the given list `title` already exists in this store's list
   * of todo lists.
   * @param {string} title the list title to search for
   * @returns {Promise<boolean>} a Promise, containing when fulfilled: `true` if
   * the `title` already exists in this store's list of todo lists
   */
  async listTitleExists(title) {
    return (await query(
      "SELECT id, title FROM todolists WHERE title = $1",
      [title]
    )).rowCount > 0;
  }

  /**
   * Return `true` if a list with ID `listID` exists in this store's list of
   * todo lists.
   * @param {number} listID the integer ID to search for
   * @returns {Promise<boolean>} a Promise, containing when fulfilled: `true` if
   * the list exists
   */
  async listExists(listID) {
    return (await query(
      "SELECT id FROM todolists WHERE id = $1",
      [listID]
    )).rowCount > 0;
  }

  /**
   * Return the list with a given `listID`.
   * @param {number} listID the list ID to find
   * @returns {Promise<TodoListQueryResult|undefined>} a Promise, containing
   * when fulfilled: the found list, as a generic object, or `undefined` if no
   * list is found with the given `listID`
   */
  findList(listID) {
    return this.sortedTodoList(listID);
  }

  /**
   * Given an integer `todoID` and an optional integer `listID`, find the todo
   * with the `todoID` in either: the list with the `listID`; or, the entire set
   * of todo lists in this store.
   * @param {number} todoID the todo ID to find
   * @param {number|undefined} listID the optional list ID to look for the todo
   * in
   * @returns {Promise<TodoQueryResult|undefined>} a Promise, containing when
   * fulfilled: the found todo, or `undefined` if a todo with the given ID isn't
   * found.
   */
  // eslint-disable-next-line max-lines-per-function
  async findTodo(todoID, listID) {
    let text =
`SELECT
  t.id,
  t.title,
  t.done,
  t.todolist_id "listID",
  tl.title "listTitle"
FROM
  todos t
  JOIN todolists tl ON t.todolist_id = tl.id
WHERE
  t.id = $1
`;
    let params = [todoID];
    if (listID) {
      text += "AND tl.id = $2";
      params.push(listID);
    }
    return (await query(text, params)).rows[0];
  }

  /**
   * Given an integer `listID`, mark the all of that list's todos as "done".
   * Return `true` if the ID exists and the operation was successful.
   * @param {number} listID the list's ID
   * @returns {Promise<boolean>} a Promise, containing when fulfilled:
   * `true` if the list exists and the operation completed successfully
   */
  async markAllDone(listID) {
    return (await query(
      "UPDATE todos SET done = TRUE WHERE todolist_id = $1",
      [listID]
    )).rowCount > 0;
  }

  /**
   * Given an integer `todoID` and `listID`, toggle the todo with the given ID
   * as "done" or "not done".
   * @param {number} todoID the ID of the todo to modify
   * @param {number} listID the list's ID containing the todo
   * @returns {Promise<TodoQueryResult>} a Promise, containing when fulfilled:
   * the toggled todo, in its post-toggled state
   */
  // eslint-disable-next-line max-lines-per-function
  async toggleDone(todoID, listID) {
    const text =
`WITH
  toggled_todo AS (
    UPDATE todos
    SET
      done = NOT done
    WHERE
      id = $1
      AND todolist_id = $2
    RETURNING
      id,
      title,
      done,
      todolist_id
  )
SELECT
  tt.id,
  tt.title,
  tt.done,
  tt.todolist_id "listID",
  tl.title "listTitle"
FROM
  toggled_todo tt
  JOIN todolists tl ON tt.todolist_id = tl.id
`;
    return (await query(text, [todoID, listID])).rows[0];
  }

  /**
   * Given a string `title`, add a new todo list to this store and return a
   * `true` if the new list was added successfully. The `title` must be unique
   * among all lists.
   * @param {string} title the new list's title
   * @returns {Promise<boolean>} a Promise, containing when fulfilled: `true` if
   * the new list was successfully added
   */
  async addList(title) {
    try {
      await query("INSERT INTO todolists (title) VALUES ($1)", [title]);
      return true;
    } catch (err) {
      if (TodoPGStore.#isUniqueConstraintViolation(err)) return false;
      throw err;
    }
  }

  /**
   * Given an integer `listID` and string `todoTitle` add a new todo to the
   * list with the given ID.
   * @param {number} listID the ID of the list to add the new todo to
   * @param {string} todoTitle the new todo's title
   * @returns {Promise<undefined>} a Promise, containing when fulfilled:
   * `undefined`
   */
  async addTodo(listID, todoTitle) {
    await query(
      "INSERT INTO todos (title, todolist_id) VALUES ($2, $1)",
      [listID, todoTitle]
    );
  }

  /**
   * Given an integer `todoID` and `listID`, remove and return the todo with the
   * given ID in the list with the given ID.
   * @param {number} todoID the ID of the todo to remove
   * @param {number} listID the list's ID containing the todo
   * @returns {Promise<TodoQueryResult>} a Promise, containing when fulfilled:
   * the removed todo
   */
  // eslint-disable-next-line max-lines-per-function
  async removeTodo(todoID, listID) {
    const text =
`WITH
  removed_todo AS (
    DELETE FROM todos
    WHERE
      id = $1
      AND todolist_id = $2
    RETURNING
      id,
      title,
      done,
      todolist_id
  )
SELECT
  rt.id,
  rt.title,
  rt.done,
  rt.todolist_id "listID",
  tl.title "listTitle"
FROM
  removed_todo rt
  JOIN todolists tl ON rt.todolist_id = tl.id
`;
    return (await query(text, [todoID, listID])).rows[0];
  }

  /**
   * Given an integer `listID`, remove and return the list with that ID from
   * this store's list of todo lists.
   * @param {number} listID the ID of the list to remove
   * @returns {Promise<TodoListQueryResult>} a Promise, containing when
   * fulfilled: the removed list and all its todos
   */
  // eslint-disable-next-line max-lines-per-function
  async removeList(listID) {
    const text =
`WITH
  removed_todos AS (
    DELETE FROM todos
    WHERE
      todolist_id = $1
    RETURNING
      id,
      title,
      done,
      todolist_id
  ),
  removed_list AS (
    DELETE FROM todolists
    WHERE
      id = $1
    RETURNING
      id,
      title
  ),
  list_metadata AS (
    SELECT
      *,
      "length" > 0
      AND "countDone" = "length" AS done
    FROM
      (
        SELECT
          rl.id "listID",
          rl.title,
          count(rt.id)::integer "length",
          coalesce(sum(rt.done::integer), 0)::integer "countDone"
        FROM
          removed_list rl
          LEFT JOIN removed_todos rt ON rl.id = rt.todolist_id
        GROUP BY
          rl.id,
          rl.title
      )
  )
SELECT
  rt.id,
  rt.title,
  rt.done,
  lm."listID",
  lm.title "listTitle",
  lm.length "listLength",
  lm."countDone"
FROM
  removed_todos rt
  RIGHT JOIN list_metadata lm ON rt.todolist_id = lm."listID"
ORDER BY
  rt.done,
  lower(rt.title)
`;
    const queryRows = (await query(text, [listID])).rows;
    const resultRows = queryRows[0].listLength === 0 ? [] : queryRows;

    return {
      id: queryRows[0].listID,
      title: queryRows[0].listTitle,
      length: queryRows[0].listLength,
      countDone: queryRows[0].countDone,
      done: queryRows[0].done,
      todos: resultRows,
    };
  }

  /**
   * Given an integer `listID` and string `title`, set the list's title to the
   * provided value. Return `true` if the list title was set successfully.
   * The `title` must be unique among all lists.
   * @param {number} listID the ID of the list to modify
   * @param {string} title the new list title
   * @returns {Promise<boolean>} a Promise, containing when fulfilled: `true` if
   * the list `title` was successfully set.
   */
  async setListTitle(listID, title) {
    try {
      return (await query(
        "UPDATE todolists SET title = $2 WHERE id = $1",
        [listID, title]
      )).rowCount > 0;
    } catch (err) {
      if (TodoPGStore.#isUniqueConstraintViolation(err)) return false;
      throw err;
    }
  }
}

module.exports = {
  TodoPGStore,
};
