/**
 * JS185 Todo App
 * schema-cloud.sql
 *
 * This file includes the DDL statements to setup the todo-lists database.
 */
-- @block
-- @conn todo-lists
-- @label grant roles to Cloud SQL users
GRANT app_owner TO "darrenmchurchill@gmail.com"
;

GRANT app_read,
app_write TO "cloud-run-service-account@js185-todo-app.iam"
;
