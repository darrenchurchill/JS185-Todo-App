/* eslint-disable quote-props */
/**
 * JS185 Todo App
 * todos.js
 */
"use strict";

const store = require("connect-loki");
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

const { TodoPGStore } = require("./lib/todo-pg-store");

const app = express();
const LokiStore = store(session);
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

/* eslint-disable max-lines-per-function */
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
    .custom(async (value, { req, location, path, pathValues }) => {
      let isValid = false;
      try {
        isValid = await finalCallback(value, {
          req,
          location,
          path,
          pathValues,
        });
      } catch (err) {
        console.log(err);
        throw new Error(
          `Unable to validate this ${fieldDesc}. ` +
          "Contact administrator if this problem persists."
        );
      }

      if (isValid) return true;
      throw new Error(
        `You're already using that ${fieldDesc}. ${fieldDesc}s must be unique.`
      );
    });
}
/* eslint-enable max-lines-per-function */

function createPathParamValidationChain(paramName, paramDesc, finalCallback) {
  return param(paramName)
    .isInt()
    .withMessage(`That isn't a ${paramDesc} ID; ${paramDesc} IDs are integers.`)
    .bail()
    .toInt()
    .custom(finalCallback)
    .withMessage(`That ${paramDesc} doesn't exist.`);
}

// eslint-disable-next-line max-lines-per-function
function createListTitleValidationChain(onErrorRenderer) {
  return [
    createFormValidationChain(
      "todoListTitle",
      "List Title",
      async (title, { req }) => {
        return !(await req.res.locals.todoStore.listTitleExists(title));
      }
    ),

    (req, res, next) => {
      let result = validationResultMsgOnly(req);
      if (result.isEmpty()) {
        next();
        return;
      }
      result.array().forEach((errMsg) => req.flash("error", errMsg));

      onErrorRenderer(req, res, next);
    },
  ];
}

/**
 * Object defining lists-related middleware functions.
 * Middleware functions are "lists-related" if they DON'T require a listID; they
 * either operate on the entire group of `TodoList`s, or create a new
 * `TodoList`.
 */
const lists = {
  validationChain: createListTitleValidationChain((req, res) => {
    res.render("new-list", {
      todoListTitle: req.body.todoListTitle,
    });
  }),

  async displayLists(_req, res, next) {
    try {
      res.render("lists", {
        todoLists: await res.locals.todoStore.sortedTodoLists(),
      });
    } catch (err) {
      next(err);
    }
  },

  get newList() {
    return [
      ...this.validationChain,
      async (req, res, next) => {
        const title = matchedData(req).todoListTitle;
        try {
          await res.locals.todoStore.addList(title);
        } catch (err) {
          next(err);
          return;
        }
        req.flash("success", `Todo List created: "${title}"`);
        res.redirect("/lists");
      }
    ];
  },

  newListForm(_req, res) {
    res.render("new-list");
  },
};

/**
 * Object defining list-related middleware functions.
 * A function is "list-related" if it requires a listID path parameter.
 */
const list = {
  validationChain: [
    createPathParamValidationChain(
      "listID",
      "list",
      async (listID, { req }) => {
        return (await req.res.locals.todoStore.findList(listID)) !== undefined;
      }
    ),

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
        res.locals.todoStore.markAllDone(data.listID);
        req.flash("success", "All todos marked completed.");
        res.redirect(`/lists/${data.listID}`);
      },
    ];
  },

  get editListForm() {
    return [
      ...this.validationChain,
      async (req, res, next) => {
        const data = matchedData(req);
        try {
          const todoList = await res.locals.todoStore.findList(data.listID);
          res.render("edit-list", {
            todoList,
            todoListTitle: todoList.title,
          });
        } catch (err) {
          next(err);
        }
      },
    ];
  },

  // eslint-disable-next-line max-lines-per-function
  get editList() {
    return [
      ...this.validationChain,
      createListTitleValidationChain(async (req, res, next) => {
        const data = matchedData(req);
        try {
          res.render("edit-list", {
            todoList: await res.locals.todoStore.findList(data.listID),
            todoListTitle: req.body.todoListTitle,
          });
        } catch (err) {
          next(err);
        }
      }),

      (req, res) => {
        const data = matchedData(req);
        res.locals.todoStore.setListTitle(data.listID, data.todoListTitle);
        req.flash("success", "Todo List title updated.");
        res.redirect(`/lists/${data.listID}`);
      },
    ];
  },

  // eslint-disable-next-line max-lines-per-function
  get displayTodos() {
    return [
      ...this.validationChain,

      (req, res, next) => {
        // Check session data stored upon invalid "new todo" form submission.
        res.locals.todoTitle = req.session.todoTitle;
        delete req.session.todoTitle;
        next();
      },

      async (req, res, next) => {
        const data = matchedData(req);
        try {
          res.render("list", {
            todoList: await res.locals.todoStore.sortedTodoList(data.listID),
            todoTitle: res.locals.todoTitle,
          });
        } catch (err) {
          next(err);
        }
      }
    ];
  },

  // eslint-disable-next-line max-lines-per-function
  get newTodo() {
    return [
      ...this.validationChain,
      createFormValidationChain("todoTitle", "Todo Title"),

      (req, res, next) => {
        const result = validationResultMsgOnly(req);
        if (result.isEmpty()) {
          next();
          return;
        }
        result.array().forEach((errMsg) => req.flash("error", errMsg));
        req.session.todoTitle = req.body.todoTitle;
        const data = matchedData(req);
        res.redirect(`/lists/${data.listID}`);
      },

      (req, res) => {
        const data = matchedData(req);
        res.locals.todoStore.addTodo(data.listID, data.todoTitle);
        req.flash("success", `${data.todoTitle} added.`);
        res.redirect(`/lists/${data.listID}`);
      }
    ];
  },

  get removeList() {
    return [
      ...this.validationChain,
      (req, res) => {
        const data = matchedData(req);
        const todoList = res.locals.todoStore.removeList(data.listID);
        req.flash("success", `${todoList.title} deleted.`);
        res.redirect("/lists");
      },
    ];
  },
};

/**
 * Object defining todo-related middleware functions.
 * A function is "todo-related" if it requires a `todoID` path parameter; it
 * will also require a `listID` path parameter, since `Todo`s belong to a
 * `TodoList`.
 */
const todo = {
  validationChain: [
    createPathParamValidationChain("listID", "list", (listID, { req }) => {
      return req.res.locals.todoStore.findList(listID) !== undefined;
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
      return req.res.locals.todoStore.findTodo(todoID, listID) !== undefined;
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
        const todo = res.locals.todoStore.findTodo(data.todoID, data.listID);
        if (todo.done) {
          req.flash("success", `"${todo.title}" marked not done.`);
          res.locals.todoStore.markUndone(data.todoID, data.listID);
        } else {
          req.flash("success", `"${todo.title}" marked done.`);
          res.locals.todoStore.markDone(data.todoID, data.listID);
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
        const todo = res.locals.todoStore.removeTodo(data.todoID, data.listID);
        req.flash("success", `"${todo.title}" deleted.`);
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
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days, in ms
    path: "/",
    secure: false,
  },
  name: "launch-school-todo-tracker-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not secure",
  store: new LokiStore({}),
}));
app.use(flash());

app.use((req, res, next) => {
  res.locals.todoStore = new TodoPGStore(req.session);
  next();
});

app.map({
  "/": {
    get: (_req, res) => {
      res.redirect("/lists");
    },
  },
  "/lists": {
    get: lists.displayLists,
    post: lists.newList,
    "/new": {
      get: lists.newListForm,
    },
    "/:listID": {
      get: list.displayTodos,
      "/complete_all": {
        post: list.completeAll,
      },
      "/destroy": {
        post: list.removeList,
      },
      "/edit": {
        get: list.editListForm,
        post: list.editList,
      },
      "/todos": {
        post: list.newTodo,
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
