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
