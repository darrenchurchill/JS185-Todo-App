/**
 * JS185 Todo App
 * queries.sql
 *
 * This file includes some queries to view data in the todo-lists database. I
 * find it easier to develop more complex queries directly in SQL and move them
 * to JavaScript after they're complete.
 */
-- @block
-- @conn todo-lists
-- @label view all todolists and metadata, sorted by done-ness and title
SELECT
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
;

-- @block
-- @conn todo-lists
-- @label view a single todolist and metadata sorted by todo done-ness and title
WITH
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
          tl.id = 3
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
  RIGHT JOIN list_metadata lm ON t.todolist_id = lm."listID"
ORDER BY
  t.done,
  lower(t.title)
;

-- @block
-- @conn todo-lists
-- @label view a single todo and its list title
SELECT
  t.id,
  t.title,
  t.done,
  t.todolist_id "listID",
  tl.title "listTitle"
FROM
  todos t
  JOIN todolists tl ON t.todolist_id = tl.id
WHERE
  t.id = 1
  AND tl.id = 1
;

-- @block
-- @conn todo-lists
-- @label toggle a single todo's done-ness; view todo's new state w/ list title
WITH
  toggled_todo AS (
    UPDATE todos
    SET
      done = NOT done
    WHERE
      id = 1
      AND todolist_id = 1
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
;
