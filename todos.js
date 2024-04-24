/**
 * JS175 Todo App
 * todos.js
 */
"use strict";

const express = require("express");
const morgan = require("morgan");

const app = express();
const HOST = "localhost";
const PORT = 3000;

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));

app.get("/", (_req, res) => {
  res.render("lists");
});

app.listen(PORT, HOST, () => {
  console.log(`Todos server listening on ${HOST}:${PORT}...`);
});
