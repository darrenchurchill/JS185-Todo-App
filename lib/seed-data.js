/**
 * JS175 Todo App
 * Static data for initial testing
 * seed-data.js
 */
"use strict";

const { TodoList } = require("./todolist");

let todoLists = [];

module.exports = todoLists;

let todoList1 = new TodoList("Work Todos");
todoList1.add("Get Coffee");
todoList1.add("Chat with co-workers");
todoList1.add("Duck out of meeting");
todoList1.markDone("Get Coffee");
todoList1.markDone("Chat with co-workers");

let todoList2 = new TodoList("Home Todos");
todoList2.add("Feed the cats");
todoList2.add("Go to bed");
todoList2.add("Buy milk");
todoList2.add("Study for Launch School");
todoList2.markDone("Feed the cats");
todoList2.markDone("Go to bed");
todoList2.markDone("Buy milk");
todoList2.markDone("Study for Launch School");

let todoList3 = new TodoList("Additional Todos");

let todoList4 = new TodoList("social todos");
todoList4.add("Go to Libby's birthday party");

todoLists.push(todoList1, todoList2, todoList3, todoList4);
