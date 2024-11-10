/**
 * JS185 Todo App
 * schema.sql
 *
 * This file includes the DDL statements to setup the todo-lists database.
 */
-- @block
-- @conn todo-lists
-- @label revoke app_owner schema privileges
REVOKE ALL ON SCHEMA public
FROM
  app_owner
;

-- @label reset -- drop todos if exists
DROP TABLE IF EXISTS todos
;

-- @label reset -- drop todolists if exists
DROP TABLE IF EXISTS todolists
;

-- @label reset -- drop users if exists
DROP TABLE IF EXISTS users
;

-- @label reset -- drop roles if exists
DROP ROLE IF EXISTS app_owner,
app_read,
app_write
;

-- @block
-- @conn todo-lists
-- @label create roles
CREATE ROLE app_owner
;

CREATE ROLE app_read
;

CREATE ROLE app_write
;

-- @block
-- @conn todo-lists
-- @label revoke and grant schema privileges
REVOKE ALL ON SCHEMA public
FROM
  PUBLIC
;

GRANT USAGE ON SCHEMA public TO PUBLIC
;

GRANT ALL ON SCHEMA public TO app_owner
;

GRANT app_owner TO postgres
;

-- @block
-- @conn todo-lists
-- @label create tables
-- @label set role to app_owner
SET ROLE app_owner
;

-- @label create users
CREATE TABLE users (
  id serial PRIMARY KEY,
  user_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid (),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL
)
;

-- @label create todolists
CREATE TABLE todolists (
  id serial PRIMARY KEY,
  title text NOT NULL,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE (title, user_id)
)
;

-- @label create todos
CREATE TABLE todos (
  id serial PRIMARY KEY,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT FALSE,
  todolist_id integer NOT NULL REFERENCES todolists (id) ON DELETE CASCADE
)
;

-- @block
-- @conn todo-lists
-- @label grant table privileges
GRANT
SELECT
  ON TABLE todos,
  todolists,
  users TO app_read
;

GRANT INSERT,
UPDATE,
DELETE ON TABLE todos,
todolists,
users TO app_write
;

GRANT USAGE ON SEQUENCE todos_id_seq,
todolists_id_seq,
users_id_seq TO app_write
;

SET ROLE postgres
;
