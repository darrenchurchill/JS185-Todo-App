#!/usr/bin/env bash
# JS185 Todo App
# Convenience script to:
# - drop and re-create the todo-lists database
# - create the necessary tables from sql/schema.sql
# - insert the seed data from sql/seed-data.sql

DATABASE="todo-lists"

dropdb "$DATABASE"
createdb "$DATABASE"
psql "$DATABASE" < sql/schema.sql
psql "$DATABASE" < sql/seed-data.sql
