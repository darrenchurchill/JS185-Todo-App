/* eslint-disable quote-props */
/**
 * JS175 Todo App
 * todos.js
 */
"use strict";

const express = require("express");
const {
  body,
  param,
  matchedData,
  validationResult,
} = require("express-validator");
const flash = require("express-flash");
const morgan = require("morgan");
const session = require("express-session");

const todoLists = require("./lib/seed-data");
const { TodoList } = require("./lib/todolist");

const app = express();
const HOST = "localhost";
const PORT = 3000;

/**
 * Construct the application routes from a `routeMap` object.
 * Modified from
 * {@link https://github.com/expressjs/express/blob/2ac25098548f739c4f2b526b2a00aa60a74c8e75/examples/route-map/index.js#L52-L66 | expressjs example}.
 * @param {object} routeMap the object mapping application routes to operations
 * @param {string|undefined} route the current route prefix; used for recursive
 * calls
 */
app.map = function(routeMap, route) {
  route = route || '';
  for (let key in routeMap) {
    if (typeof routeMap[key] === "function" || Array.isArray(routeMap[key])) {
      // get: function(){ ... } or get: [ function(){}, ... ]
      console.log("Route map:", { key, route });
      app[key](route, [ routeMap[key] ].flat());
    } else if (typeof routeMap[key] === "object") {
      // { '/path': { ... }}
      app.map(routeMap[key], route + key);
    }
  }
};

const validationResultMsgOnly = validationResult.withDefaults({
  formatter: (err) => err.msg,
});

/**
 * Middleware functions
 */

function createFormValidationChain(
  fieldName,
  fieldDesc,
  finalCallback = () => true,
) {
  return body(fieldName)
    .trim()
    .notEmpty()
    .withMessage(`${fieldDesc} is required.`)
    .bail()
    .isLength({ max: 100 })
    .withMessage(`Max ${fieldDesc} length is 100 characters.`)
    .custom(finalCallback)
    .withMessage(
      `You're already using that ${fieldDesc}. ${fieldDesc}s must be unique.`
    );
}

/**
 * Object defining lists-related middleware functions.
 */
const lists = {
  validationChain: [
    createFormValidationChain("todoListTitle", "List Title", (title) => {
      return todoLists.lists.every(
        (todoList) => todoList.getTitle() !== title
      );
    }),

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
  ],

  get(_req, res) {
    todoLists.sort();

    res.render("lists", {
      todoLists: todoLists.lists
    });
  },

  get post() {
    return [
      ...this.validationChain,
      (req, res) => {
        const title = matchedData(req).todoListTitle;
        todoLists.lists.push(new TodoList(title));
        req.flash("success", `Todo List created: "${title}"`);
        res.redirect("/lists");
      }
    ];
  },

  new(_req, res) {
    res.render("new-list");
  },
};

function createPathParamValidationChain(paramName, paramDesc, finalCallback) {
  return param(paramName)
    .isInt()
    .withMessage(`That isn't a ${paramDesc} ID; ${paramDesc} IDs are integers.`)
    .bail()
    .toInt()
    .custom(finalCallback)
    .withMessage(`That ${paramDesc} doesn't exist.`);
}

/**
 * Object defining list-related middleware functions.
 */
const list = {
  validationChain: [
    createPathParamValidationChain("listID", "list", (listID) => {
      return todoLists.find(listID) !== undefined;
    }),

    (req, _res, next) => {
      const result = validationResultMsgOnly(req);
      if (result.isEmpty()) {
        next();
        return;
      }
      next(new Error(result.array()[0]));
    },
  ],

  get completeAll() {
    return [
      ...this.validationChain,
      (req, res) => {
        const data = matchedData(req);
        todoLists.find(data.listID).markAllDone();
        req.flash("success", "All todos marked completed.");
        res.redirect(`/lists/${data.listID}`);
      },
    ];
  },

  get get() {
    return [
      ...this.validationChain,
      (req, res) => {
        const data = matchedData(req);
        res.render("list", {
          todoList: todoLists.find(data.listID),
        });
      }
    ];
  },
};

/**
 * Object defining todo-related middleware functions.
 */
const todo = {
  validationChain: [
    createPathParamValidationChain("listID", "list", (listID) => {
      return todoLists.find(listID) !== undefined;
    }),

    (req, _res, next) => {
      const result = validationResultMsgOnly(req);
      if (result.isEmpty()) {
        next();
        return;
      }
      next(new Error(result.array()[0]));
    },

    createPathParamValidationChain("todoID", "todo", (todoID, { req }) => {
      const listID = matchedData(req).listID;
      return todoLists.find(listID).findByID(todoID) !== undefined;
    }),

    (req, _res, next) => {
      const result = validationResultMsgOnly(req);
      if (result.isEmpty()) {
        next();
        return;
      }
      next(new Error(result.array()[0]));
    },
  ],

  get toggle() {
    return [
      ...this.validationChain,
      (req, res) => {
        const data = matchedData(req);
        const todo = todoLists.find(data.listID).findByID(data.todoID);
        if (todo.isDone()) {
          req.flash("success", `"${todo.getTitle()}" marked not done.`);
          todo.markUndone();
        } else {
          req.flash("success", `"${todo.getTitle()}" marked done.`);
          todo.markDone();
        }
        res.redirect(`/lists/${data.listID}`);
      }
    ];
  },

  get removeTodo() {
    return [
      ...this.validationChain,
      (req, res) => {
        const data = matchedData(req);
        const list = todoLists.find(data.listID);
        let delIndex = 0;
        const todo = list.find((todo, index) => {
          if (todo.getID() === data.todoID) {
            delIndex = index;
            return true;
          }
          return false;
        });

        list.removeAt(delIndex);
        req.flash("success", `"${todo.getTitle()}" deleted.`);
        res.redirect(`/lists/${data.listID}`);
      },
    ];
  },
};

/**
 * Application setup
 */

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

app.map({
  "/": {
    get: (_req, res) => {
      res.redirect("/lists");
    },
  },
  "/lists": {
    get: lists.get,
    post: lists.post,
    "/new": {
      get: lists.new,
    },
    "/:listID": {
      get: list.get,
      "/complete_all": {
        post: list.completeAll,
      },
      "/todos": {
        "/:todoID": {
          "/toggle": {
            post: todo.toggle,
          },
          "/destroy": {
            post: todo.removeTodo,
          },
        },
      },
    },
  },
});

// Register final error-generating middleware for all unused methods and paths
app.all("*", (_req, _res, next) => {
  next(new Error(`The route: ${_req.method} ${_req.path} doesn't exist`));
});

app.use((err, _req, res, _next) => {
  console.log(err);
  res.status(404).render("404");
});

app.listen(PORT, HOST, () => {
  console.log(`Todos server listening on ${HOST}:${PORT}...`);
});
