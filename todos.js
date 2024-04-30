/* eslint-disable quote-props */
/**
 * JS175 Todo App
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

const { TodoList } = require("./lib/todolist");
const TodoLists = require("./lib/todolists");

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
      (title, { req }) => {
        return req.session.todoLists.lists.every(
          (todoList) => todoList.getTitle() !== title
        );
      }
    ),

    (req, res, next) => {
      let result = validationResultMsgOnly(req);
      if (result.isEmpty()) {
        next();
        return;
      }
      result.array().forEach((errMsg) => req.flash("error", errMsg));

      onErrorRenderer(req, res);
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

  displayLists(req, res) {
    req.session.todoLists.sort();

    res.render("lists", {
      todoLists: req.session.todoLists.lists,
    });
  },

  get newList() {
    return [
      ...this.validationChain,
      (req, res) => {
        const title = matchedData(req).todoListTitle;
        req.session.todoLists.lists.push(new TodoList(title));
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
    createPathParamValidationChain("listID", "list", (listID, { req }) => {
      return req.session.todoLists.find(listID) !== undefined;
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
        req.session.todoLists.find(data.listID).markAllDone();
        req.flash("success", "All todos marked completed.");
        res.redirect(`/lists/${data.listID}`);
      },
    ];
  },

  get editListForm() {
    return [
      ...this.validationChain,
      (req, res) => {
        const data = matchedData(req);
        const todoList = req.session.todoLists.find(data.listID);
        res.render("edit-list", {
          todoList,
          todoListTitle: todoList.getTitle(),
        });
      },
    ];
  },

  get editList() {
    return [
      ...this.validationChain,
      createListTitleValidationChain((req, res) => {
        const data = matchedData(req);
        res.render("edit-list", {
          todoList: req.session.todoLists.find(data.listID),
          todoListTitle: req.body.todoListTitle,
        });
      }),

      (req, res) => {
        const data = matchedData(req);
        req.session.todoLists.find(data.listID).setTitle(data.todoListTitle);
        req.flash("success", "Todo List title updated.");
        res.redirect(`/lists/${data.listID}`);
      },
    ];
  },

  get displayTodos() {
    return [
      ...this.validationChain,

      (req, res, next) => {
        // Check session data stored upon invalid "new todo" form submission.
        res.locals.todoTitle = req.session.todoTitle;
        delete req.session.todoTitle;
        next();
      },

      (req, res) => {
        const data = matchedData(req);
        res.render("list", {
          todoList: req.session.todoLists.find(data.listID),
          todoTitle: res.locals.todoTitle,
        });
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
        req.session.todoLists.find(data.listID).add(data.todoTitle);
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
        const todoList = req.session.todoLists.find(data.listID);
        req.session.todoLists.lists.splice(
          req.session.todoLists.lists.findIndex(
            (list) => list.getID() === todoList.getID()
          ),
          1
        );
        req.flash("success", `${todoList.getTitle()} deleted.`);
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
      return req.session.todoLists.find(listID) !== undefined;
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
      return req.session.todoLists.find(listID).findByID(todoID) !== undefined;
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
        const todo = req.session.todoLists
          .find(data.listID)
          .findByID(data.todoID);
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
        const list = req.session.todoLists.find(data.listID);
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

app.use((req, _res, next) => {
  console.log({ todoLists: req.session.todoLists });

  if (req.session.todoLists instanceof TodoLists) {
    next();
    return;
  }
  req.session.todoLists = new TodoLists(
    (req.session.todoLists && req.session.todoLists.lists) || []
  );
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
