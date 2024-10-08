/* eslint-disable quote-props */
/**
 * JS185 Todo App
 * todos.js
 */
"use strict";

const store = require("connect-loki");
const express = require("express");
const {
  matchedData,
  ExpressValidator,
} = require("express-validator");
const flash = require("express-flash");
const morgan = require("morgan");
const session = require("express-session");

const { TodoPGStore } = require("./lib/todo-pg-store");

const app = express();
const LokiStore = store(session);
const HOST = "localhost";
const PORT = 3000;

const {
  body,
  param,
  validationResult,
} = new ExpressValidator(
  {
    attemptAddList: attempt(
      (title, { req }) => req.res.locals.todoStore.addList(title),
      "You're already using that list title. List titles must be unique."
    ),

    attemptSetListTitle: attempt(
      (title, { req }) => req.res.locals.todoStore.setListTitle(
        matchedData(req).listID,
        title
      ),
      "You're already using that list title. List titles must be unique."
    ),
  },
  {},
  {
    errorFormatter: (err) => err.msg,
  }
);

/**
 * Create a new custom validator function that, when invoked, attempts to
 * execute the provided `callback`, using the given `errMsg` if the callback
 * fails.
 * @param {function} callback the callback to attempt, following the
 * `express-validator` custom validator signature: return a boolean indicating
 * validity/success and optionally throw an Error given an invalid value
 * @param {string} errMsg the error message to use if the callback fails
 * @returns {true} return `true` if callback succeeds
 * @throws {Error} throw an Error if the callback fails
 */
function attempt(callback, errMsg) {
  return async function(value, { req, location, path, pathValues }) {
    try {
      if (await callback(value, { req, location, path, pathValues })) {
        return true;
      }
    } catch (err) {
      const wrapped = new Error(
        "Unable to execute this operation. Contact admin if this problem persists.",
        {
          cause: err,
        }
      );
      console.log(wrapped);
      throw wrapped;
    }
    throw new Error(errMsg);
  };
}

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

/**
 * Middleware functions
 */

/* eslint-disable max-lines-per-function */
function createFormValidationChain(fieldName, fieldDesc) {
  return body(fieldName)
    .trim()
    .notEmpty()
    .withMessage(`${fieldDesc} is required.`)
    .bail()
    .isLength({ max: 100 })
    .withMessage(`Max ${fieldDesc} length is 100 characters.`);
}

function createPathParamValidationChain(paramName, paramDesc, finalCallback) {
  return param(paramName)
    .isInt()
    .withMessage(`That isn't a ${paramDesc} ID; ${paramDesc} IDs are integers.`)
    .bail()
    .toInt()
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
          `That ${paramDesc} might not exist. ` +
          "Contact administrator if this problem persists."
        );
      }

      if (isValid) return true;
      throw new Error(`That ${paramDesc} doesn't exist.`);
    });
}

function ifInvalid(callback) {
  return function(req, res, next) {
    if (req.validationResult.isEmpty()) {
      next();
      return;
    }
    callback(req, res, next);
  };
}

function attachRequestValidationResult(req, _res, next = () => {}) {
  req.validationResult = validationResult(req);
  next();
}

function flashValidationErrors(req, _res, next) {
  let result = req.validationResult || validationResult(req);
  result.array().forEach((errMsg) => req.flash("error", errMsg));
  next();
}
/* eslint-enable max-lines-per-function */

/**
 * Object defining lists-related middleware functions.
 * Middleware functions are "lists-related" if they DON'T require a listID; they
 * either operate on the entire group of `TodoList`s, or create a new
 * `TodoList`.
 */
const lists = {
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
      createFormValidationChain("todoListTitle", "List Title")
        .attemptAddList(),
      attachRequestValidationResult,
      flashValidationErrors,
      ifInvalid(this.reRenderNewListForm),
      (req, res) => {
        const title = matchedData(req).todoListTitle;
        req.flash("success", `Todo List created: "${title}"`);
        res.redirect("/lists");
      }
    ];
  },

  newListForm(_req, res) {
    res.render("new-list");
  },

  reRenderNewListForm(req, res) {
    res.render("new-list", {
      todoListTitle: req.body.todoListTitle,
    });
  },
};

/**
 * Object defining list-related middleware functions.
 * A function is "list-related" if it requires a listID path parameter.
 */
/* eslint-disable max-lines-per-function */
const list = {
  async completeAll(req, res, next) {
    try {
      const data = matchedData(req);
      await res.locals.todoStore.markAllDone(data.listID);
      req.flash("success", "All todos marked completed.");
      res.redirect(`/lists/${data.listID}`);
    } catch (err) {
      next(err);
    }
  },

  get editListForm() {
    return this.renderEditListForm;
  },

  get editList() {
    return [
      createFormValidationChain("todoListTitle", "List Title")
        .attemptSetListTitle(),
      attachRequestValidationResult,
      flashValidationErrors,
      ifInvalid(this.reRenderEditListForm),
      (req, res) => {
        const data = matchedData(req);
        req.flash("success", "Todo List title updated.");
        res.redirect(`/lists/${data.listID}`);
      },
    ];
  },

  get displayTodos() {
    return [
      (req, res, next) => {
        // You can be redirected here from newTodo() below, if the "new todo"
        // form input is invalid. Check the session data to pre-populate the
        // "new todo" form with the previous invalid form input, if it exists.
        res.locals.todoTitle = req.session.todoTitle;
        delete req.session.todoTitle;
        next();
      },

      (_req, res, next) => {
        try {
          res.render("list", {
            todoList: res.locals.todoList,
            todoTitle: res.locals.todoTitle,
          });
        } catch (err) {
          next(err);
        }
      }
    ];
  },

  get newTodo() {
    return [
      createFormValidationChain("todoTitle", "Todo Title"),
      attachRequestValidationResult,
      flashValidationErrors,

      ifInvalid((req, res) => {
        req.session.todoTitle = req.body.todoTitle;
        const data = matchedData(req);
        res.redirect(`/lists/${data.listID}`);
      }),

      async (req, res, next) => {
        try {
          const data = matchedData(req);
          await res.locals.todoStore.addTodo(data.listID, data.todoTitle);
          req.flash("success", `${data.todoTitle} added.`);
          res.redirect(`/lists/${data.listID}`);
        } catch (err) {
          next(err);
        }
      }
    ];
  },

  async removeList(req, res, next) {
    try {
      const data = matchedData(req);
      const todoList = await res.locals.todoStore.removeList(data.listID);
      req.flash("success", `${todoList.title} deleted.`);
      res.redirect("/lists");
    } catch (err) {
      next(err);
    }
  },

  renderEditListForm(_req, res) {
    res.render("edit-list", {
      todoList: res.locals.todoList,
      todoListTitle: res.locals.todoList.title,
    });
  },

  reRenderEditListForm(req, res) {
    res.render("edit-list", {
      todoList: res.locals.todoList,
      todoListTitle: req.body.todoListTitle,
    });
  }
};
/* eslint-enable max-lines-per-function */

/**
 * Object defining todo-related middleware functions.
 * A function is "todo-related" if it requires a `todoID` path parameter; it
 * will also require a `listID` path parameter, since `Todo`s belong to a
 * `TodoList`.
 */
const todo = {
  async toggle(req, res, next) {
    try {
      const data = matchedData(req);
      const todo = await res.locals.todoStore.toggleDone(
        data.todoID,
        data.listID
      );
      if (todo.done) {
        req.flash("success", `"${todo.title}" marked done.`);
      } else {
        req.flash("success", `"${todo.title}" marked not done.`);
      }
      res.redirect(`/lists/${data.listID}`);
    } catch (err) {
      next(err);
    }
  },

  async removeTodo(req, res, next) {
    try {
      const data = matchedData(req);
      const todo = await res.locals.todoStore.removeTodo(
        data.todoID,
        data.listID
      );
      req.flash("success", `"${todo.title}" deleted.`);
      res.redirect(`/lists/${data.listID}`);
    } catch (err) {
      next(err);
    }
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

app.use((_req, res, next) => {
  res.locals.todoStore = new TodoPGStore();
  next();
});

app.param("listID", async (req, _res, next) => {
  await (createPathParamValidationChain(
    "listID",
    "list",
    async (listID, { req }) => {
      req.res.locals.todoList = await req.res.locals.todoStore.findList(
        listID
      );
      return req.res.locals.todoList !== undefined;
    }
  )).run(req);

  attachRequestValidationResult(req);
  if (!req.validationResult.isEmpty()) {
    next(new Error(req.validationResult.array()[0]));
    return;
  }
  next();
});

app.param("todoID", async (req, _res, next) => {
  await (createPathParamValidationChain(
    "todoID",
    "todo",
    async (todoID, { req }) => {
      const listID = matchedData(req).listID;
      return (
        (await req.res.locals.todoStore.findTodo(todoID, listID)) !==
        undefined
      );
    }
  )).run(req);

  attachRequestValidationResult(req);
  if (!req.validationResult.isEmpty()) {
    next(new Error(req.validationResult.array()[0]));
    return;
  }
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
