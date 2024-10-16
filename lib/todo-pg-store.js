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

/**
 * An object defining the optional additional parameters for querying methods.
 * @typedef {object} TodoPGStoreQueryOpts
 * @property {boolean} [throw = false] whether the querying method should throw
 * an Error if any of the provided query arguments are invalid. Regardless of
 * this option's value, the method will still re-throw Errors raised for other
 * unexpected reasons (like database connectivity issues, for example).
 */

class TodoPGStore {
  static ERROR_CODE_INVALID_LIST_ID = "InvalidListID";
  static ERROR_CODE_INVALID_TODO_ID = "InvalidTodoID";
  static ERROR_CODE_NON_UNIQUE_LIST_TITLE = "NonUniqueListTitle";

  /**
   * Return `true` if the given Error represents a database FOREIGN KEY
   * constraint violation.
   * @param {Error} err the Error to inspect
   * @returns {boolean} `true` if the Error represents a database FOREIGN KEY
   * constraint violation
   */
  static #isForeignKeyConstraintViolation(err) {
    return /violates foreign key constraint/.test(err.message);
  }

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
   * Given an Error object, throw or return the Error according to the
   * `options.throw` parameter.
   * @param {Error} err the Error to consider
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
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
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Error} the resulting Error object
   * @throws {Error} the resulting Error object
   */
  #errInvalidListID(listID, options = { throw: false }) {
    return this.#err(
      new Error("The given list ID doesn't exist", {
        code: TodoPGStore.ERROR_CODE_INVALID_LIST_ID,
        values: [listID],
      }),
      options
    );
  }

  /**
   * Throw or return an Error representing an invalid todoID.
   * @param {number} todoID the invalid todo ID
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Error} the resulting Error object
   * @throws {Error} the resulting Error object
   */
  #errInvalidTodoID(todoID, options = { throw: false }) {
    return this.#err(
      new Error("The given todo ID doesn't exist", {
        code: TodoPGStore.ERROR_CODE_INVALID_TODO_ID,
        values: [todoID],
      }),
      options
    );
  }

  /**
   * Throw or return an Error representing an invalid list title.
   * @param {string} title the invalid list title
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Error} the resulting Error object
   * @throws {Error} the resulting Error object
   */
  #errNonUniqueListTitle(title, options = { throw: false }) {
    return this.#err(
      new Error("List titles must be unique.", {
        cause: {
          code: TodoPGStore.ERROR_CODE_NON_UNIQUE_LIST_TITLE,
          values: [title],
        },
      }),
      options
    );
  }

  /**
   * Return `true`if this database client is already inside a transaction.
   * @returns {boolean} `true` if this database client is already inside a
   * transaction
   */
  async #isInTransaction() {
    return (await query(
      'SELECT statement_timestamp() != transaction_timestamp() AS "isTrans"'
    )).rows[0].isTrans;
  }

  /**
   * Begin a transaction, ensuring all operations executed from this call until
   * a commit or rollback operation behave as a single atomic operation.
   *
   * During a read-only transaction, an attempted write operation will:
   * 1. throw an error
   * 2. prevent any subsequent operation (read or write), also throwing an error
   *    on their failure
   * 3. require an explicit rollback operation to reset this store into an
   *    active state, allowing future operations to execute successfully
   * @param {Object} options the set of additional options to begin the
   * transaction with
   * @param {boolean} options.readOnly whether to enter a read-only transaction
   */
  async beginTransaction(options = { readOnly: false }) {
    if (await this.#isInTransaction()) return;
    // The PostgreSQL default is READ WRITE, but we'll be explicit here.
    const mode = options.readOnly ? "READ ONLY" : "READ WRITE";
    console.log(`BEGIN ${mode} transaction`);
    await query(`BEGIN ${mode}`);
  }

  /**
   * Commit the current transaction, if there is one. Do nothing if there is no
   * active transaction.
   */
  async commitTransaction() {
    if (!(await this.#isInTransaction())) return;
    console.log("COMMIT transaction");
    await query("COMMIT");
  }

  /**
   * Rollback the current transaction, if there if one. Do nothing if there is
   * no active transaction.
   */
  async rollbackTransaction() {
    if (!(await this.#isInTransaction())) return;
    console.log("ROLLBACK transaction");
    await query("ROLLBACK");
  }

  /**
   * Execute the provided `callback` function, which takes `0` arguments, inside
   * a transaction, committing or rolling back if the transaction succeeds
   * (doesn't throw an Error) or fails (throws an Error). Return the
   * `callback`'s return value upon successfully committing.
   *
   * This method is useful if `callback` contains multiple operations that must
   * behave as a single all-or-nothing operation.
   * @param {function} callback the function to execute
   * @returns {*} `callback`'s return value, if the operation completes
   * successfully
   * @throws {Error} re-throws any `Error` thrown within `callback`, after
   * rolling back the transaction
   */
  async withTransaction(callback) {
    if (this.#isInTransaction()) return callback();

    let result;
    try {
      await this.beginTransaction();
      result = await callback();
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
    await this.commitTransaction();
    return result;
  }

  /**
   * Return a sorted array of this store's current todo lists, as an array of
   * generic objects.
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
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<TodoListQueryResult|undefined>} a Promise, containing
   * when fulfilled: the `TodoListQueryResult` or `undefined` if the list
   * doesn't exist
   */
  // eslint-disable-next-line max-lines-per-function
  async sortedTodoList(listID, options = { throw: false }) {
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

    const { rows: queryRows, rowCount: queryRowCount } = await query(text, [
      listID,
    ]);
    if (queryRowCount === 0) this.#errInvalidListID(listID, options);

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
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<boolean>} a Promise, containing when fulfilled: `true` if
   * the list exists
   */
  async listExists(listID, options = { throw: false }) {
    if (
      (await query("SELECT id FROM todolists WHERE id = $1", [listID]))
        .rowCount === 0
    ) {
      this.#errInvalidListID(listID, options);
      return false;
    }
    return true;
  }

  /**
   * Return `true` if a todo with ID `todoID` exists in this store's list of
   * todo lists.
   * @param {number} todoID the integer ID to search for
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<boolean>} a Promise, containing when fulfilled: `true` if
   * the todo exists
   */
  async todoExists(todoID, options = { throw: false }) {
    if (
      (await query("SELECT id FROM todos WHERE id = $1", [todoID])).rowCount === 0
    ) {
      this.#errInvalidTodoID(todoID, options);
      return false;
    }
    return true;
  }

  /**
   * Return the list with a given `listID`.
   * @param {number} listID the list ID to find
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<TodoListQueryResult|undefined>} a Promise, containing
   * when fulfilled: the found list, as a generic object, or `undefined` if no
   * list is found with the given `listID`
   */
  findList(listID, options = { throw: false }) {
    return this.sortedTodoList(listID, options);
  }

  /**
   * Given an integer `todoID` and an optional integer `listID`, find the todo
   * with the `todoID` in either: the list with the `listID`; or, the entire set
   * of todo lists in this store.
   * @param {number} todoID the todo ID to find
   * @param {number|undefined} listID the optional list ID to look for the todo
   * in
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<TodoQueryResult|undefined>} a Promise, containing when
   * fulfilled: the found todo, or `undefined` if a todo with the given ID isn't
   * found.
   */
  // eslint-disable-next-line max-lines-per-function
  findTodo(todoID, listID, options = { throw: false }) {
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

    return this.withTransaction(async () => {
      if (
        (listID && !(await this.listExists(listID, options))) ||
        !(await this.todoExists(todoID, options))
      ) {
        return undefined;
      }
      return (await query(text, params)).rows[0];
    });
  }

  /**
   * Given an integer `listID`, mark the all of that list's todos as "done".
   * Return `true` if the ID exists and the operation was successful.
   * @param {number} listID the list's ID
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<boolean>} a Promise, containing when fulfilled:
   * `true` if the list exists and the operation completed successfully
   */
  async markAllDone(listID, options = { throw: false }) {
    const result = await query(
      "UPDATE todos SET done = TRUE WHERE todolist_id = $1",
      [listID]
    );
    if (result.rowCount === 0) {
      this.#errInvalidListID(listID, options);
      return false;
    }
    return true;
  }

  /**
   * Given an integer `todoID` and `listID`, toggle the todo with the given ID
   * as "done" or "not done".
   * @param {number} todoID the ID of the todo to modify
   * @param {number} listID the list's ID containing the todo
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<TodoQueryResult>} a Promise, containing when fulfilled:
   * the toggled todo, in its post-toggled state
   */
  // eslint-disable-next-line max-lines-per-function
  toggleDone(todoID, listID, options = { throw: false }) {
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
    return this.withTransaction(async () => {
      if (
        !(await this.listExists(listID, options)) ||
        !(await this.todoExists(todoID, options))
      ) {
        return undefined;
      }
      return (await query(text, [todoID, listID])).rows[0];
    });
  }

  /**
   * Given a string `title`, add a new todo list to this store and return a
   * `true` if the new list was added successfully. The `title` must be unique
   * among all lists.
   * @param {string} title the new list's title
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<boolean>} a Promise, containing when fulfilled: `true` if
   * the new list was successfully added
   */
  async addList(title, options = { throw: false }) {
    try {
      await query("INSERT INTO todolists (title) VALUES ($1)", [title]);
    } catch (err) {
      if (TodoPGStore.#isUniqueConstraintViolation(err)) {
        this.#errNonUniqueListTitle(title, options);
        return false;
      }
      throw err;
    }
    return true;
  }

  /**
   * Given an integer `listID` and string `todoTitle` add a new todo to the
   * list with the given ID.
   * @param {number} listID the ID of the list to add the new todo to
   * @param {string} todoTitle the new todo's title
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<boolean>} a Promise, containing when fulfilled: `true` if
   * the todo was added successfully
   */
  async addTodo(listID, todoTitle, options = { throw: false }) {
    try {
      await query("INSERT INTO todos (title, todolist_id) VALUES ($2, $1)", [
        listID,
        todoTitle,
      ]);
    } catch (err) {
      if (TodoPGStore.#isForeignKeyConstraintViolation(err)) {
        this.#errInvalidListID(listID, options);
        return false;
      }
      throw err;
    }
    return true;
  }

  /**
   * Given an integer `todoID` and `listID`, remove and return the todo with the
   * given ID in the list with the given ID.
   * @param {number} todoID the ID of the todo to remove
   * @param {number} listID the list's ID containing the todo
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<TodoQueryResult>} a Promise, containing when fulfilled:
   * the removed todo
   */
  // eslint-disable-next-line max-lines-per-function
  removeTodo(todoID, listID, options = { throw: false }) {
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
    return this.withTransaction(async () => {
      if (
        !(await this.listExists(listID, options)) ||
        !(await this.todoExists(todoID, options))
      ) {
        return undefined;
      }
      return (await query(text, [todoID, listID])).rows[0];
    });
  }

  /**
   * Given an integer `listID`, remove and return the list with that ID from
   * this store's list of todo lists. Return `undefined` if the list ID doesn't
   * exist.
   * @param {number} listID the ID of the list to remove
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<TodoListQueryResult|undefined>} a Promise, containing
   * when fulfilled: the removed list and all its todos, or `undefined` if the
   * given `listID` doesn't exist
   */
  // eslint-disable-next-line max-lines-per-function
  async removeList(listID, options = { throw: false }) {
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
    const queryResult = await query(text, [listID]);
    if (queryResult.rowCount === 0) {
      this.#errInvalidListID(listID, options);
      return undefined;
    }

    const queryRows = queryResult.rows;
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
   * @param {TodoPGStoreQueryOpts} options the set of additional query options
   * @returns {Promise<boolean>} a Promise, containing when fulfilled: `true` if
   * the list `title` was successfully set.
   */
  async setListTitle(listID, title, options = { throw: false }) {
    let result;

    try {
      result = await query("UPDATE todolists SET title = $2 WHERE id = $1", [
        listID,
        title,
      ]);
    } catch (err) {
      if (TodoPGStore.#isUniqueConstraintViolation(err)) {
        this.#errNonUniqueListTitle(title, options);
      }
      throw err;
    }

    if (result.rowCount === 0) this.#errInvalidListID(listID, options);
    return result;
  }
}

module.exports = {
  TodoPGStore,
};
