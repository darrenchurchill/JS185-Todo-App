/**
 * JS175 Todo App
 * todos.js
 */
"use strict";

const express = require("express");
const { body, matchedData, validationResult } = require("express-validator");
const flash = require("express-flash");
const morgan = require("morgan");
const session = require("express-session");

const lists = require("./lib/seed-data");
const { TodoList } = require("./lib/todolist");

const app = express();
const HOST = "localhost";
const PORT = 3000;

const validationResultMsgOnly = validationResult.withDefaults({
  formatter: (err) => err.msg,
});

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

  find(id) {
    return this.lists.find((list) => list.getID() === id);
  },
};

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  name: "launch-school-todo-tracker-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not secure",
}));
app.use(flash());

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
    let result = validationResultMsgOnly(req);
    if (result.isEmpty()) {
      next();
      return;
    }
    result.array().forEach((errMsg) => req.flash("error", errMsg));

    res.render("new-list", {
      todoListTitle: req.body.todoListTitle,
    });
  },

  (req, res) => {
    const title = matchedData(req).todoListTitle;
    todoLists.lists.push(new TodoList(title));
    req.flash("success", `Todo List created: "${title}"`);
    res.redirect("/lists");
  }
);

app.get("/lists/new", (_req, res) => {
  res.render("new-list");
});

app.use((err, _req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

app.listen(PORT, HOST, () => {
  console.log(`Todos server listening on ${HOST}:${PORT}...`);
});
