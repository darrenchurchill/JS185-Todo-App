/**
 * JS175 Todo App
 * todos.js
 */
"use strict";

const express = require("express");
const { body, matchedData, validationResult } = require("express-validator");
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
  body("todoListTitle")
    .trim()
    .notEmpty()
    .withMessage("List Title is required.")
    .bail()
    .isLength({ max: 100 })
    .withMessage("Max List Title length is 100 characters.")
    .custom((title) => {
      return todoLists.lists.every((todoList) => todoList.getTitle() !== title);
    })
    .withMessage("You're already using that List Title. Titles must be unique."),

  (req, res, next) => {
    let result = (
      validationResult.withDefaults({
        formatter: (err) => err.msg,
      })
    )(req);

    if (result.isEmpty()) {
      next();
      return;
    }

    res.locals.messages = {
      error: [],
    };
    result.array().forEach((errMsg) => res.locals.messages.error.push(errMsg));

    res.render("new-list", {
      todoListTitle: req.body.todoListTitle,
    });
  },

  (req, res) => {
    const title = matchedData(req).todoListTitle;
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
