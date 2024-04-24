/**
 * JS175 Todo App
 * todos.js
 */
"use strict";

const express = require("express");
const morgan = require("morgan");

const lists = require("./lib/seed-data");
const { TodoList } = require("./lib/todolist");

const app = express();
const HOST = "localhost";
const PORT = 3000;

const todoLists = {
  /** @type {Array.<TodoList>} */
  lists,

  sort() {
    this.lists.sort((listA, listB) => {
      if (listA.isDone() === listB.isDone()) {
        return listA.getTitle().toLowerCase().localeCompare(
          listB.getTitle().toLowerCase()
        );
      }
      if (listA.isDone()) return 1;
      return -1;
    });
  },
};

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

app.get("/", (_req, res) => {
  res.redirect("/lists");
});

app.get("/lists", (_req, res) => {
  todoLists.sort();

  res.render("lists", {
    todoLists: todoLists.lists
  });
});

app.post("/lists",
  (req, res) => {
    const title = req.body.todoListTitle.trim();
    todoLists.lists.push(new TodoList(title));
    res.redirect("/lists");
  }
);

app.get("/lists/new", (_req, res) => {
  res.render("new-list");
});

app.listen(PORT, HOST, () => {
  console.log(`Todos server listening on ${HOST}:${PORT}...`);
});
