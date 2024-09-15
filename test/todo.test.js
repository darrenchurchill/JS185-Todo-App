/**
 * JS185 Todo App
 * Todo class Tests
 * Mostly reused from JS130
 */
/* eslint-disable max-statements */
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

  describe("Todo.compare()", () => {
    let
      /** @type {Todo} */          todo1,
      /** @type {Todo} */          todo2,
      /** @type {Todo} */          todo3,
      /** @type {Todo} */          todo4;

    beforeEach(() => {
      todo1 = new Todo("alpha");
      todo2 = new Todo("Alpha");
      todo3 = new Todo("beta");
      todo4 = new Todo("epsilon");
    });

    describe("Todo.compare()", () => {
      describe('when both Todos are "done"', () => {
        test("title comparison (case-insensitive) determines order", () => {
          todo1.markDone();
          todo2.markDone();
          todo3.markDone();
          todo4.markDone();
          expect(todo1.compare(todo2)).toBe(0);
          expect(todo2.compare(todo1)).toBe(0);
          expect(todo1.compare(todo3)).toBe(-1);
          expect(todo3.compare(todo1)).toBe(1);
          expect(todo3.compare(todo4)).toBe(-1);
          expect(todo4.compare(todo3)).toBe(1);
        });
      });

      describe('when both Todos are "not done"', () => {
        test("title comparison (case-insensitive) determines order", () => {
          todo1.markUndone();
          todo2.markUndone();
          todo3.markUndone();
          todo4.markUndone();
          expect(todo1.compare(todo2)).toBe(0);
          expect(todo2.compare(todo1)).toBe(0);
          expect(todo1.compare(todo3)).toBe(-1);
          expect(todo3.compare(todo1)).toBe(1);
          expect(todo3.compare(todo4)).toBe(-1);
          expect(todo4.compare(todo3)).toBe(1);
        });
      });

      describe('when one todo is "done" and the other is "not done"', () => {
        test('"done" todos come after "not done" todos', () => {
          todo1.markUndone();
          todo2.markDone();
          todo3.markDone();
          todo4.markDone();
          expect(todo1.compare(todo2)).toBe(-1);
          expect(todo1.compare(todo3)).toBe(-1);
          expect(todo1.compare(todo4)).toBe(-1);
          expect(todo2.compare(todo1)).toBe(1);
          expect(todo3.compare(todo1)).toBe(1);
          expect(todo4.compare(todo1)).toBe(1);

          todo1.markDone();
          todo2.markUndone();
          todo3.markDone();
          todo4.markDone();
          expect(todo2.compare(todo1)).toBe(-1);
          expect(todo2.compare(todo3)).toBe(-1);
          expect(todo2.compare(todo4)).toBe(-1);
          expect(todo1.compare(todo2)).toBe(1);
          expect(todo3.compare(todo2)).toBe(1);
          expect(todo4.compare(todo2)).toBe(1);

          todo1.markDone();
          todo2.markDone();
          todo3.markUndone();
          todo4.markDone();
          expect(todo3.compare(todo1)).toBe(-1);
          expect(todo3.compare(todo2)).toBe(-1);
          expect(todo3.compare(todo4)).toBe(-1);
          expect(todo1.compare(todo3)).toBe(1);
          expect(todo2.compare(todo3)).toBe(1);
          expect(todo4.compare(todo3)).toBe(1);

          todo1.markDone();
          todo2.markDone();
          todo3.markDone();
          todo4.markUndone();
          expect(todo4.compare(todo1)).toBe(-1);
          expect(todo4.compare(todo2)).toBe(-1);
          expect(todo4.compare(todo3)).toBe(-1);
          expect(todo1.compare(todo4)).toBe(1);
          expect(todo2.compare(todo4)).toBe(1);
          expect(todo3.compare(todo4)).toBe(1);
        });
      });
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

  describe("Todo.setTitle()", () => {
    test("a Todo's new title is the string value it's constructed with", () => {
      expect((new Todo()).setTitle("title").getTitle()).toBe("title");
      expect((new Todo()).setTitle().getTitle()).toBe("undefined");
      expect((new Todo()).setTitle(1).getTitle()).toBe("1");
      expect((new Todo()).setTitle({}).getTitle()).toBe(String({}));
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
