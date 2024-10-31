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
    isUniqueListTitle: async (title, { req }) => {
      if (req.res.locals.todoList && title === req.res.locals.todoList.title) {
        // Allow "updating" a list's title to its current title, since
        // TodoPGStore.setListTitle() allows this.
        return true;
      }

      if (await req.res.locals.todoStore.listTitleExists(title)) {
        throw new Error(
          "You're already using that list title. List titles must be unique."
        );
      }
      return true;
    },
  },
  {},
  {
    errorFormatter: (err) => err.msg,
  }
);

/**
 * Given an Error, return a new Error, wrapping the original Error, using
 * `err.cause.code` and the set of `expectedErrCodes` to determine the new
 * Error's `message`. Return the original `err` if it doesn't have a `cause` or
 * if its `cause.code` isn't in `expectedErrCodes`'s set of codes.
 * @param {Error} err the given Error
 * @param {Object.<string, string>} expectedErrCodes an object mapping expected
 * string error `code`s to string error messages to use in the wrapped Error
 * result.
 * @returns {Error} the new wrapped Error, with the original Error as its
 * `cause`, or the original `err` if it represents an unexpected Error.
 */
function wrapIfExpected(err, expectedErrCodes = {}) {
  if (err.cause && Object.keys(expectedErrCodes).includes(err.cause.code)) {
    return new Error(expectedErrCodes[err.cause.code], { cause: err });
  }
  return err;
}

/**
 * Return a new middleware function that, when invoked, attempts to execute the
 * provided `callback`, catching any thrown Errors and passing them to the
 * `next` function to be handled. `callback()` is expected to invoke `next()`
 * within its body if there is more middleware to execute.
 *
 * This function is intended for use in express prior to v5.*, where
 * asynchronous middleware needs to be explicitly passed to `next()`.
 * @param {function} callback the callback to attempt, following the standard
 * express middleware signature
 * @param {object} options the set of additional options
 * @param {object.<string, string>} expectedErrCodes the set of string Error
 * code keys and new Error message string values to wrap any expected Error with
 * @param {boolean} flashExpectedErrs whether to flash any expected Error
 * message to the application user
 * @returns {function} the new wrapped middleware function
 */
// eslint-disable-next-line max-lines-per-function
function withAttemptAsync(
  callback,
  options = {
    expectedErrCodes: {},
    flashExpectedErrs: false,
  }
) {
  return async function (req, res, next) {
    try {
      await callback(req, res, next);
    } catch (err) {
      const newErr = wrapIfExpected(err, options.expectedErrCodes);
      const isExpected = err !== newErr; // the Error has been wrapped
      if (isExpected && options.flashExpectedErrs) {
        req.flash("error", newErr.message);
      }
      next(newErr);
    }
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
function createFormValidationChain(
  fieldName,
  fieldDesc,
  options = { trim: true }
) {
  let chain = body(fieldName);
  if (options.trim) {
    chain
      .trim()
      .notEmpty()
      .withMessage(`${fieldDesc} is required.`)
      .bail();
  } else {
    chain
      .not()
      .custom((value) => /^\s+|\s+$/.test(value))
      .withMessage(`${fieldDesc} may not start or end with whitespace characters.`)
      .bail();
  }
  return chain
    .isLength({ max: 100 })
    .withMessage(`Max ${fieldDesc} length is 100 characters.`);
}

function createPathParamValidationChain(paramName, paramDesc) {
  return param(paramName)
    .isInt()
    .withMessage(`That isn't a ${paramDesc} ID; ${paramDesc} IDs are integers.`)
    .bail()
    .toInt();
}

function ifInvalid(callback, options = { flashErrs: false }) {
  return function(req, res, next) {
    attachRequestValidationResult(options)(req);
    if (req.validationResult.isEmpty()) {
      next();
      return;
    }
    callback(req, res, next);
  };
}

function attachRequestValidationResult(
  options = { throw: false, flashErrs: false }
) {
  return function (req, _res, next = () => {}) {
    req.validationResult = validationResult(req);
    if (options.flashErrs) flashValidationErrors(req);
    if (options.throw) req.validationResult.throw();
    next();
  };
}

function flashValidationErrors(req, _res, next = () => {}) {
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
  displayLists: withAttemptAsync(async (_req, res) => {
    res.render("lists", {
      todoLists: await res.locals.todoStore.sortedTodoLists(),
    });
  }),

  get newList() {
    return [
      createFormValidationChain("todoListTitle", "List Title")
        .isUniqueListTitle(),
      ifInvalid(this.reRenderNewListForm, { flashErrs: true }),
      withAttemptAsync(async (req, res) => {
        const { todoListTitle: title } = matchedData(req);
        await res.locals.todoStore.addList(title, { throw: true });
        req.flash("success", `Todo List created: "${title}"`);
        res.redirect("/lists");
      }),
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
  completeAll: withAttemptAsync(async (req, res) => {
    const { listID } = matchedData(req);
    if (await res.locals.todoStore.markAllDone(listID)) {
      req.flash("success", "All todos marked completed.");
    }
    res.redirect(`/lists/${listID}`);
  }),

  get editListForm() {
    return this.renderEditListForm;
  },

  get editList() {
    return [
      createFormValidationChain("todoListTitle", "List Title")
        .isUniqueListTitle(),
      ifInvalid(this.reRenderEditListForm, { flashErrs: true }),
      withAttemptAsync(async (req, res) => {
        const { todoListTitle: title, listID } = matchedData(req);
        await res.locals.todoStore.setListTitle(listID, title, { throw: true });
        req.flash("success", "Todo List title updated.");
        res.redirect(`/lists/${listID}`);
      }),
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

      (_req, res) => {
        res.render("list", {
          todoList: res.locals.todoList,
          todoTitle: res.locals.todoTitle,
        });
      },
    ];
  },

  get newTodo() {
    return [
      createFormValidationChain("todoTitle", "Todo Title"),

      ifInvalid(
        (req, res) => {
          req.session.todoTitle = req.body.todoTitle;
          const data = matchedData(req);
          res.redirect(`/lists/${data.listID}`);
        },
        { flashErrs: true }
      ),

      withAttemptAsync(async (req, res) => {
        const { listID, todoTitle } = matchedData(req);
        await res.locals.todoStore.addTodo(listID, todoTitle);
        req.flash("success", `${todoTitle} added.`);
        res.redirect(`/lists/${listID}`);
      }),
    ];
  },

  removeList: withAttemptAsync(
    async (req, res) => {
      const todoList = await res.locals.todoStore.removeList(
        matchedData(req).listID,
        { throw: true }
      );
      req.flash("success", `${todoList.title} deleted.`);
      res.redirect("/lists");
    },
    {
      expectedErrCodes: {
        [TodoPGStore.ERROR_CODE_INVALID_LIST_ID]:
          "Unable to delete that list. Are you sure it hasn't already been deleted?",
      },
      flashExpectedErrs: true,
    }
  ),

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
  toggle: withAttemptAsync(async (req, res) => {
    const { todoID, listID } = matchedData(req);
    const todo = await res.locals.todoStore.toggleDone(todoID, listID, {
      throw: true,
    });
    if (todo.done) {
      req.flash("success", `"${todo.title}" marked done.`);
    } else {
      req.flash("success", `"${todo.title}" marked not done.`);
    }
    res.redirect(`/lists/${listID}`);
  }),

  removeTodo: withAttemptAsync(async (req, res) => {
    const { todoID, listID } = matchedData(req);
    const todo = await res.locals.todoStore.removeTodo(todoID, listID, {
      throw: true,
    });
    req.flash("success", `"${todo.title}" deleted.`);
    res.redirect(`/lists/${listID}`);
  }),
};

/**
 * Object defining user-related middleware functions.
 */
const users = {
  setSessionUser(req, _res, next) {
    req.session.user = {
      username: req.body.username,
    };
    next();
  },

  signInForm(req, res) {
    if (Object.hasOwn(req.session, "user")) {
      res.redirect("/lists");
      return;
    }
    req.flash("info", "Please sign in.");
    res.render("sign-in");
  },

  // eslint-disable-next-line max-lines-per-function
  get signIn() {
    return [
      createFormValidationChain("username", "Username"),
      createFormValidationChain("password", "Password", { trim: false }),

      ifInvalid(
        (req, res) => {
          req.flash("error", "Invalid credentials");
          res.render("sign-in", {
            username: req.body.username,
          });
        },
      ),

      this.setSessionUser,

      (req, res) => {
        // TODO: Add sign-in procedure that queries the database
        req.flash("success", "Welcome!");
        res.redirect("/lists");
      },
    ];
  },

  signOut(req, res) {
    req.session.destroy();
    res.redirect("/users/signin");
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
  saveUninitialized: false,  // Only save sessions containing data we've set in this app
  secret: "this is not secure",
  store: new LokiStore({}),
}));
app.use(flash());

app.use((req, res, next) => {
  // Define any res.locals properties here, so a property doesn't seemingly
  // show up out of nowhere in some other middleware.
  if (Object.hasOwn(req.session, "user")) {
    res.locals.user = req.session.user;
  }

  // TODO: res.locals (and app.locals) properties are available to templates
  // during rendering. Most of the properties below are unrelated to template
  // content. Move them to a different place (res.custom) perhaps?
  // Non-standard, but more obvious
  res.locals.todoStore = new TodoPGStore();
  res.locals.todoList = null;
  res.locals.requiresTransactionCommit = false;
  res.locals.beginTransaction = async function(options) {
    await this.todoStore.beginTransaction(options);
    this.requiresTransactionCommit = true;
  };
  res.locals.commitTransaction = async function() {
    if (this.requiresTransactionCommit) {
      await this.todoStore.commitTransaction();
    }
    this.requiresTransactionCommit = false;
  };
  next();
});

app.use((_req, res, next) => {
  // It's common for a middleware function _not_ to call next() once it's
  // finished processing the request and has sent or begun sending a response.
  // Therefore, it's difficult to define an operation you want to run after most
  // (or all) successful responses (for example, committing a database
  // transaction).
  //
  // One strategy would be forcing _all_ middleware to always call next() and
  // continue delegating to any further matched routes, including the route
  // where the "always run" code lives. However, this can cause other route
  // paths to unexpectedly match and execute, as happens in
  // `app.param("listID", ...)` below if the `/lists/new` middleware calls
  // next(): the `/lists/new` route looks identical to a `/lists/:listID` route,
  // so the param handler gets invoked unexpectedly.
  //
  // Another strategy would be to define multiple routers, where one or two of
  // them have the exclusive responsibility to handle beginning, committing, and
  // rolling back transactions. This would require the routers to share a number
  // of routes in common, and depend on the app middleware to explicitly call
  // next("router") when they've successfully processed a request.
  //
  // Instead, I'll register this event handler for each request/response pair
  // to piggyback on the response's "finish" event. You can do this because
  // express's objects build upon standard Node `http` objects, which can emit
  // and respond to events:
  // https://nodejs.org/api/http.html#class-httpserverresponse
  res.once("finish", () => {
    res.locals.commitTransaction();
  });
  next();
});

// eslint-disable-next-line max-lines-per-function
app.param("listID", async (req, res, next) => {
  await createPathParamValidationChain("listID", "list").run(req);

  await withAttemptAsync(
    async (req, res, next) => {
      const readOnly = req.method !== "POST";
      attachRequestValidationResult({ throw: true })(req);
      await res.locals.beginTransaction({ readOnly });
      res.locals.requiresTransactionCommit = true;
      res.locals.todoList = await res.locals.todoStore.findList(
        req.params.listID,
        { throw: true }
      );
      next();
    },
    {
      expectedErrCodes: {
        [TodoPGStore.ERROR_CODE_INVALID_LIST_ID]: "That list doesn't exist.",
      },
    }
  )(req, res, next);
});

app.param("todoID", async (req, res, next) => {
  await createPathParamValidationChain("todoID", "todo").run(req);

  await withAttemptAsync(
    async (req, _res, next) => {
      attachRequestValidationResult({ throw: true })(req);
      const { listID, todoID } = matchedData(req);
      await req.res.locals.todoStore.findTodo(todoID, listID, { throw: true });
      next();
    },
    {
      expectedErrCodes: {
        [TodoPGStore.ERROR_CODE_INVALID_TODO_ID]: "That todo doesn't exist.",
      },
    }
  )(req, res, next);
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
  "/users": {
    "/signin": {
      get: users.signInForm,
      post: users.signIn,
    },
    "/signout": {
      post: users.signOut,
    },
  },
});

// Register final error-generating middleware for all unused methods and paths
app.all("*", (_req, res, next) => {
  if (!res.headersSent) {
    next(new Error(`The route: ${_req.method} ${_req.path} doesn't exist`));
  }
});

app.use(async (err, _req, res, next) => {
  try {
    await res.locals.todoStore.rollbackTransaction();
  } catch (newErr) {
    console.log(new Error(
      "Caught new error attempting to rollback transaction",
      { cause: newErr }
    ));
  }
  next(err);
});

app.use((err, _req, res, _next) => {
  console.log(err);
  res.status(404).render("404");
});

app.listen(PORT, HOST, () => {
  console.log(`Todos server listening on ${HOST}:${PORT}...`);
});
