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
/** @typedef { import("./typedefs").TodoListQueryResult } TodoListQueryResult */

class TodoPGStore {
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

  /**
   * Given an integer `todoID` and an optional integer `listID`, find the todo
   * with the `todoID` in either: the list with the `listID`; or, the entire set
   * of todo lists in this store.
   * @param {number} todoID the todo ID to find
   * @param {number|undefined} listID the optional list ID to look for the todo
   * in
   * @returns {TodoQueryResult|undefined} the found todo, or `undefined` if a
   * todo with the given ID isn't found.
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
   * @param {number} listID the list's ID
   */
  async markAllDone(listID) {
    await query(
      "UPDATE todos SET done = TRUE WHERE todolist_id = $1",
      [listID]
    );
  }

  /**
   * Given an integer `todoID` and `listID`, toggle the todo with the given ID
   * as "done" or "not done".
   * @param {number} todoID the ID of the todo to modify
   * @param {number} listID the list's ID containing the todo
   * @returns {TodoQueryResult} the toggled todo, in its post-toggled state
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
   * Given a string `title`, add a new todo list to this store. The `title`
   * should be unique among all lists, but this method doesn't directly enforce
   * this requirement. An error will be thrown if the title violates the
   * database's internal `UNIQUE` constraint.
   * @param {string} title the new list's title
   */
  async addList(title) {
    await query("INSERT INTO todolists (title) VALUES ($1)", [title]);
  }

  /**
   * Given an integer `listID` and string `todoTitle` add a new todo to the
   * list with the given ID.
   * @param {number} listID the ID of the list to add the new todo to
   * @param {string} todoTitle the new todo's title
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
   * @returns {TodoQueryResult} the removed todo
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
   * @returns {TodoListQueryResult} the removed list and all its todos
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
      todos: resultRows,
    };
  }

  /**
   * Given an integer `listID` and string `title`, set the list's title to the
   * provided value.
   * @param {number} listID the ID of the list to modify
   * @param {string} title the new list title
   */
  async setListTitle(listID, title) {
    await query(
      "UPDATE todolists SET title = $2 WHERE id = $1",
      [listID, title]
    );
  }
}

module.exports = {
  TodoPGStore,
};
