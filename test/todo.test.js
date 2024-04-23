/**
 * JS175 Todo App
 * Todo class Tests
 * Mostly reused from JS130
 */
/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
"use strict";

const Todo = require("../lib/todo");

describe("Todo", () => {
  /** @type {Todo} */
  let todo;

  beforeEach(() => {
    todo = new Todo("Buy milk");
  });

  describe("Todo.toString()", () => {
    test('a "not done" Todo returns the correct string representation', () => {
      expect(todo.toString()).toBe("[ ] Buy milk");
    });

    test('a "done" Todo returns the correct string representation', () => {
      todo.markDone();
      expect(todo.toString()).toBe("[X] Buy milk");
    });
  });

  describe("Todo.isDone()", () => {
    test('a Todo is created as "not done"', () => {
      expect(todo.isDone()).toBe(false);
    });
  });

  describe("Todo.getID()", () => {
    test("a Todo's ID is a number", () => {
      expect((new Todo()).getID()).toEqual(expect.any(Number));
      expect((new Todo()).getID()).toEqual(expect.any(Number));
      expect((new Todo()).getID()).toEqual(expect.any(Number));
      expect((new Todo()).getID()).toEqual(expect.any(Number));
    });
  });

  describe("Todo.getTitle()", () => {
    test("a Todo's title is the string value it's constructed with", () => {
      expect((new Todo("title")).getTitle()).toBe("title");
      expect((new Todo()).getTitle()).toBe("undefined");
      expect((new Todo(1)).getTitle()).toBe("1");
      expect((new Todo({})).getTitle()).toBe(String({}));
    });
  });

  describe("Todo.markDone()", () => {
    test('marking a Todo "done" changes its isDone() state', () => {
      todo.markDone();
      expect(todo.isDone()).toBe(true);
    });
  });

  describe("Todo.markUndone()", () => {
    test('marking a Todo "not done" changes its isDone() state', () => {
      todo.markDone();
      expect(todo.isDone()).toBe(true);
      todo.markUndone();
      expect(todo.isDone()).toBe(false);
    });
  });
});
