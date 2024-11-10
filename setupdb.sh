#!/usr/bin/env bash
# JS185 Todo App
# Convenience script to:
# - drop and re-create the todo-lists database
# - create the necessary tables from sql/schema.sql
# - create the necessary roles from sql/schema-(local|cloud).sql
# - insert the seed data from sql/seed-data.sql
# - insert the seed data from sql/users.sql, if it exists

export PGDATABASE="todo-lists"
export PGUSER="postgres"

LOCAL=0
USERS="sql/users.sql"
SCHEMA="sql/schema.sql"
SCHEMA_LOCAL="sql/schema-local.sql"
SHEMA_CLOUD="sql/schema-cloud.sql"
SEED_DATA="sql/seed-data.sql"

SQL_STATEMENTS=$(mktemp)

help() {
  echo "USAGE: $0 [-h|-help] [-c|--cloud]"
  exit 1
}

# Arg parsing modified from:
# https://medium.com/@Drew_Stokes/bash-argument-parsing-54f3b81a6a8f
while (( "$#" )); do
  case "$1" in
    -h|--help)
      help
      ;;
    -c|--cloud)
      unset LOCAL
      export PGHOST="localhost"
      shift
      ;;
    -*|--*=) # unsupported flags
      echo "Error: Unsupported flag: $1" >&2
      help
      ;;
    *) # there are no positional arguments
      echo "Error: Unsupported position arg: $1" >&2
      help
      ;;
  esac
done

if [ $LOCAL ]; then
  dropdb "$PGDATABASE"
  createdb "$PGDATABASE"
fi

cat $SCHEMA >> "$SQL_STATEMENTS"

if [ $LOCAL ]; then
  cat $SCHEMA_LOCAL >> "$SQL_STATEMENTS"
else
  cat $SHEMA_CLOUD >> "$SQL_STATEMENTS"
fi

if [ -f "$USERS" ]; then
  cat "$USERS" >> "$SQL_STATEMENTS"
else
  echo "No $USERS file. Skipping users table INSERTS"
fi

cat $SEED_DATA >> "$SQL_STATEMENTS"

psql < "$SQL_STATEMENTS"
