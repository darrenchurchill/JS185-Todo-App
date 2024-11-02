/**
 * JS185 Todo App
 * schema.sql
 *
 * This file includes the DDL statements to setup the todo-lists database.
 */
-- @block
-- @conn todo-lists
-- @label create tables
-- @label reset -- drop todos if exists
DROP TABLE IF EXISTS todos
;

-- @label reset -- drop todolists if exists
DROP TABLE IF EXISTS todolists
;

-- @label reset -- drop users if exists
DROP TABLE IF EXISTS users
;

-- @label create todolists
CREATE TABLE todolists (id serial PRIMARY KEY, title text UNIQUE NOT NULL)
;

-- @label create todos
CREATE TABLE todos (
  id serial PRIMARY KEY,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT FALSE,
  todolist_id integer NOT NULL REFERENCES todolists (id) ON DELETE CASCADE
)
;

--@label create users
CREATE TABLE users (
  id serial PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL
)
;
