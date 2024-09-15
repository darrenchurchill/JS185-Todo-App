/**
 * JS185 Todo App
 * TodoLists class Tests
 */
/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
"use strict";

/** @typedef { import("../lib/todolist").TodoList } TodoList */
/** @typedef { import("../lib/todolists") } TodoLists */

describe("TodoList", () => {
  let
    /** @type {TodoList} */          todoList1,
    /** @type {TodoList} */          todoList2,
    /** @type {TodoList} */          todoList3,
    /** @type {TodoList} */          todoList4,
    /** @type {TodoLists} */         todoLists,
    /** @type {Array.<TodoList>} */  asArray;

  beforeEach(() => {
    todoLists = require("../lib/seed-data");
    asArray = todoLists.lists;
    [
      todoList1,
      todoList2,
      todoList3,
      todoList4,
    ] = asArray;
  });

  describe("TodoLists.find()", () => {
    it("should return undefined when an integer ID isn't found", () => {
      for (let count = -100; count < 100; count += 1) {
        if (asArray.some((list) => list.getID() === count)) continue;
        expect(todoLists.find(count)).toBeUndefined();
      }
    });

    it("should return undefined when a non-integer ID is given", () => {
      expect(todoLists.find("a string ID")).toBeUndefined();
      expect(todoLists.find([])).toBeUndefined();
      expect(todoLists.find({})).toBeUndefined();
      expect(todoLists.find(NaN)).toBeUndefined();
      expect(todoLists.find(undefined)).toBeUndefined();
    });

    it("should return the found TodoList when an ID is found", () => {
      expect(todoLists.find(todoList1.getID())).toEqual(todoList1);
      expect(todoLists.find(todoList2.getID())).toEqual(todoList2);
      expect(todoLists.find(todoList3.getID())).toEqual(todoList3);
      expect(todoLists.find(todoList4.getID())).toEqual(todoList4);
    });
  });

  describe("TodoLists.sort()", () => {
    test("all lists done -> lists sorted by title, case-insensitive", () => {
      asArray.forEach((list) => list.markAllDone());
      expect(todoLists.sort().lists).toEqual([
        todoList3,
        todoList2,
        todoList4,
        todoList1,
      ]);
    });

    test("no lists done -> lists sorted by title, case-insensitive", () => {
      asArray.forEach((list) => list.markAllUndone());
      expect(todoLists.sort().lists).toEqual([
        todoList3,
        todoList2,
        todoList4,
        todoList1,
      ]);
    });

    test("some lists done, some not done -> done lists AFTER not done lists", () => {
      asArray.forEach((list) => list.markAllUndone());
      todoList2.markAllUndone();
      todoList3.markAllDone();
      expect(todoLists.sort().lists).toEqual([
        todoList4,
        todoList1,
        todoList3,
        todoList2,
      ]);
    });
  });
});
