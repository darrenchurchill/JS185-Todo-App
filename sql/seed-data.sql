/**
 * JS185 Todo App
 * seed-data.sql
 *
 * This file includes some initial data to populate the todo-lists database.
 */
-- @block
-- @conn todo-lists
-- @label add data
-- @label reset -- delete from todos
DELETE FROM todos
;

-- @label reset -- delete from todolists
DELETE FROM todolists
;

-- @label insert todo lists
INSERT INTO
  todolists (title, user_id)
VALUES
  ('Work Todos', 1),
  ('Home Todos', 1),
  ('Additional Todos', 1),
  ('social todos', 1)
;

-- @label create temp todos table
CREATE TABLE todos_temp (title text, done boolean, todolist_title text)
;

-- @label insert todos into temp table
INSERT INTO
  todos_temp (title, done, todolist_title)
VALUES
  ('Get Coffee', TRUE, 'Work Todos'),
  ('Chat with co-workers', TRUE, 'Work Todos'),
  ('Duck out of meeting', FALSE, 'Work Todos'),
  ('Feed the cats', TRUE, 'Home Todos'),
  ('Go to bed', TRUE, 'Home Todos'),
  ('Buy milk', TRUE, 'Home Todos'),
  ('Study for Launch School', TRUE, 'Home Todos'),
  (
    'Go to Libby''s birthday party',
    FALSE,
    'social todos'
  )
;

-- @label insert todos from temp table
INSERT INTO
  todos (title, done, todolist_id)
SELECT
  t.title,
  t.done,
  tl.id
FROM
  todos_temp t
  JOIN todolists tl ON t.todolist_title = tl.title
;

-- @label drop temp todos table
DROP TABLE todos_temp
;
