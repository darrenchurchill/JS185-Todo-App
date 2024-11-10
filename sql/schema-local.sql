/**
 * JS185 Todo App
 * schema-local.sql
 *
 * This file includes the DDL statements to setup the todo-lists database.
 */
-- @block
-- @conn todo-lists
-- @label reset -- drop app_user if exists
DROP ROLE IF EXISTS app_user
;

-- @label create role to local SQL users
CREATE ROLE app_user
WITH
  LOGIN
;

-- @block
-- @conn todo-lists
-- @label grant roles to local SQL users
GRANT app_owner TO darren
;

GRANT app_read,
app_write TO app_user
;
