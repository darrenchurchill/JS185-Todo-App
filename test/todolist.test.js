/**
 * JS175 Todo App
 * TodoList class Tests
 * Mostly reused from JS130
 */
/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
"use strict";

const { Todo, TodoList } = require("../lib/todolist");

describe("TodoList", () => {
  let
    /** @type {Todo} */          todo1,
    /** @type {Todo} */          todo2,
    /** @type {Todo} */          todo3,
    /** @type {Array.<Todo>} */  todos,
    /** @type {TodoList} */      list;

  beforeEach(() => {
    todo1 = new Todo("Buy milk");
    todo2 = new Todo("Clean room");
    todo3 = new Todo("Go to the gym");

    todos = [todo1, todo2, todo3];

    list = new TodoList("Today's Todos");
    list.add(todo1);
    list.add(todo2);
    list.add(todo3);
  });

  describe("Todo.getID()", () => {
    test("a Todo's ID is a number", () => {
      expect((new TodoList()).getID()).toEqual(expect.any(Number));
      expect((new TodoList()).getID()).toEqual(expect.any(Number));
      expect((new TodoList()).getID()).toEqual(expect.any(Number));
      expect((new TodoList()).getID()).toEqual(expect.any(Number));
    });
  });

  describe("TodoList title methods", () => {
    describe("TodoList.getTitle()", () => {
      test("a TodoList's title is the string value it's constructed with", () => {
        expect((new TodoList("title")).getTitle()).toBe("title");
        expect((new TodoList()).getTitle()).toBe("undefined");
        expect((new TodoList(1)).getTitle()).toBe("1");
        expect((new TodoList({})).getTitle()).toBe(String({}));
      });
    });

    describe("TodoList.setTitle()", () => {
      test("a TodoList's new title is the string value it's constructed with", () => {
        expect((new TodoList()).setTitle("title").getTitle()).toBe("title");
        expect((new TodoList()).setTitle().getTitle()).toBe("undefined");
        expect((new TodoList()).setTitle(1).getTitle()).toBe("1");
        expect((new TodoList()).setTitle({}).getTitle()).toBe(String({}));
      });
    });
  });

  describe("TodoList.size()", () => {
    test("list has a size of 3", () => {
      expect(list.size()).toBe(3);
    });
  });

  describe("TodoList.toArray()", () => {
    test("empty TodoList returns empty array", () => {
      expect((new TodoList("Empty List").toArray())).toEqual([]);
    });

    test("3-Todo list returns array with 3 Todos", () => {
      expect(list.toArray()).toEqual(todos);
    });
  });

  describe("TodoList.toSortedArray()", () => {
    let
      /** @type {Todo} */  todo4,
      /** @type {Todo} */  todo5;

    beforeEach(() => {
      todo4 = new Todo("assemble legos");
      todo5 = new Todo("bake cookies");
      todos.push(todo4);
      todos.push(todo5);
      list.add(todo4);
      list.add(todo5);
    });

    test("empty TodoList returns empty array", () => {
      expect((new TodoList("Empty List").toSortedArray())).toEqual([]);
    });

    test("3-Todo list returns array with 3 Todos", () => {
      expect(list.toSortedArray().length).toBe(todos.length);
    });

    test("all todos done -> todos sorted by title, case-insensitive", () => {
      list.markAllDone();
      expect(list.toSortedArray()).toEqual([
        todo4,
        todo5,
        todo1,
        todo2,
        todo3,
      ]);
    });

    test("no todos done -> todos sorted by title, case-insensitive", () => {
      list.markAllUndone();
      expect(list.toSortedArray()).toEqual([
        todo4,
        todo5,
        todo1,
        todo2,
        todo3,
      ]);
    });

    test("some todos done, some not done -> done todos AFTER not done todos", () => {
      list.markAllUndone();
      todo4.markDone();
      todo5.markDone();
      expect(list.toSortedArray()).toEqual([
        todo1,
        todo2,
        todo3,
        todo4,
        todo5,
      ]);
    });
  });

  describe("TodoList.first()", () => {
    test("empty TodoList returns undefined", () => {
      expect((new TodoList("Empty List").first())).toBeUndefined();
    });

    test("3-Todo list returns first Todo", () => {
      expect(list.first()).toEqual(todo1);
    });
  });

  describe("TodoList.last()", () => {
    test("empty TodoList returns undefined", () => {
      expect((new TodoList("Empty List").last())).toBeUndefined();
    });

    test("3-Todo list returns last Todo", () => {
      expect(list.last()).toEqual(todo3);
    });
  });

  describe("TodoList.shift()", () => {
    test("empty TodoList returns undefined", () => {
      expect((new TodoList("Empty List").shift())).toBeUndefined();
    });

    test("3-Todo list -> no remaining Todos returns undefined", () => {
      const size = list.size();
      for (let _ = 0; _ < size; _ += 1) list.shift();
      expect(list.shift()).toBeUndefined();
    });

    test("3-Todo list -> always returns first Todo item", () => {
      expect(list.shift()).toEqual(todo1);
      expect(list.shift()).toEqual(todo2);
      expect(list.shift()).toEqual(todo3);
    });
  });

  describe("TodoList.pop()", () => {
    test("empty TodoList returns undefined", () => {
      expect((new TodoList("Empty List").pop())).toBeUndefined();
    });

    test("3-Todo list -> no remaining Todos returns undefined", () => {
      const size = list.size();
      for (let _ = 0; _ < size; _ += 1) list.pop();
      expect(list.pop()).toBeUndefined();
    });

    test("3-Todo list -> always returns last Todo item", () => {
      expect(list.pop()).toEqual(todo3);
      expect(list.pop()).toEqual(todo2);
      expect(list.pop()).toEqual(todo1);
    });
  });

  describe("TodoList.isDone()", () => {
    test("empty TodoList returns false", () => {
      expect((new TodoList("Empty List").isDone())).toBe(false);
    });

    describe("3-Todo list -> returns false if any Todos aren't done", () => {
      test("1 Todo not done; all others done", () => {
        todos.forEach((todo) => {
          todos.forEach((todo) => todo.markDone());
          todo.markUndone();
          expect(list.isDone()).toBe(false);
        });
      });

      test("1 Todo done; all others not done", () => {
        todos.forEach((todo) => {
          todos.forEach((todo) => todo.markUndone());
          todo.markDone();
          expect(list.isDone()).toBe(false);
        });
      });
    });

    test("3-Todo list -> returns true if all Todos are done", () => {
      todos.forEach((todo) => todo.markDone());
      expect(list.isDone()).toBe(true);
    });
  });

  describe("TodoList.add()", () => {
    test("throws TypeError if item is not a Todo or a string", () => {
      expect(() => list.add(new Todo("not a todo"))).not.toThrow(TypeError);
      expect(() => list.add("not a todo")).not.toThrow(TypeError);

      expect(() => list.add(1)).toThrow(TypeError);
      expect(() => list.add({})).toThrow(TypeError);
      expect(() => list.add(new TodoList("empty list"))).toThrow(TypeError);
    });
  });

  describe("TodoList.itemAt()", () => {
    test("throws ReferenceError if index is out of bounds", () => {
      expect(() => list.itemAt(-1)).toThrow(ReferenceError);
      expect(() => list.itemAt(list.size())).toThrow(ReferenceError);
      expect(() => list.itemAt(9)).toThrow(ReferenceError);
    });

    test("returns reference to Todo at given index", () => {
      todos.forEach((todo, index) => {
        expect(list.itemAt(index)).toBe(todo);
      });
    });
  });

  describe("TodoList.markDoneAt()", () => {
    test("throws ReferenceError if index is out of bounds", () => {
      expect(() => list.markDoneAt(-1)).toThrow(ReferenceError);
      expect(() => list.markDoneAt(list.size())).toThrow(ReferenceError);
      expect(() => list.markDoneAt(9)).toThrow(ReferenceError);
    });

    test('marks Todo at given index as "done"', () => {
      for (let index = 0; index < list.size(); index += 1) {
        list.markDoneAt(index);
        expect(list.itemAt(index).isDone()).toBe(true);
      }
    });

    test('marks only the Todo at given index as "done"', () => {
      todos.forEach((_, index) => {
        todos.forEach((todo) => todo.markUndone());
        list.markDoneAt(index);
        expect(list.toArray().filter((todo) => todo.isDone()).length).toBe(1);
      });
    });
  });

  describe("TodoList.markUndoneAt()", () => {
    test("throws ReferenceError if index is out of bounds", () => {
      expect(() => list.markUndoneAt(-1)).toThrow(ReferenceError);
      expect(() => list.markUndoneAt(list.size())).toThrow(ReferenceError);
      expect(() => list.markUndoneAt(9)).toThrow(ReferenceError);
    });

    test('marks Todo at given index as "undone"', () => {
      for (let index = 0; index < list.size(); index += 1) {
        todos.forEach((todo) => todo.markDone());
        list.markUndoneAt(index);
        expect(list.itemAt(index).isDone()).toBe(false);
      }
    });

    test('marks only the Todo at given index as "undone"', () => {
      todos.forEach((_, index) => {
        todos.forEach((todo) => todo.markDone());
        list.markUndoneAt(index);
        expect(list.toArray().filter((todo) => !todo.isDone()).length).toBe(1);
      });
    });
  });

  describe("TodoList.markDone()", () => {
    test('marks the Todo as "done" when there is one with the given title', () => {
      todos.forEach((todo) => {
        list.markDone(todo.getTitle());
        expect(todo.isDone()).toBe(true);
      });
    });

    test("does nothing when there is no Todo with the given title", () => {
      expect(() => (new TodoList("empty list")).markDone("doesn't exist")).not.toThrow();
      expect(() => list.markDone("doesn't exist")).not.toThrow();
      expect((new TodoList("empty list")).markDone("doesn't exist")).toBeUndefined();
      expect(list.markDone("doesn't exist")).toBeUndefined();
    });

    test("marks the first Todo found when there are > 1 with the given title", () => {
      let todo4 = new Todo(todo1.getTitle());
      list.add(todo4);
      list.markDone(todo1.getTitle());
      expect(todo1.isDone()).toBe(true);
      expect(todo4.isDone()).toBe(false);
    });
  });

  describe("TodoList.markAllDone()", () => {
    test("does nothing on empty TodoList", () => {
      expect(() => (new TodoList("empty list")).markAllDone()).not.toThrow();
      expect((new TodoList("empty list")).markAllDone()).toBeUndefined();
    });

    test('marks all Todo items as "done"', () => {
      list.markAllDone();
      expect(todos.every((todo) => todo.isDone())).toBe(true);
    });
  });

  describe("TodoList.markAllUndone()", () => {
    test("does nothing on empty TodoList", () => {
      expect(() => (new TodoList("empty list")).markAllUndone()).not.toThrow();
      expect((new TodoList("empty list")).markAllUndone()).toBeUndefined();
    });

    test('marks all Todo items as "not done"', () => {
      list.markAllUndone();
      expect(todos.every((todo) => !todo.isDone())).toBe(true);
    });
  });

  describe("TodoList.removeAt()", () => {
    test("throws ReferenceError if index is out of bounds", () => {
      expect(() => list.removeAt(-1)).toThrow(ReferenceError);
      expect(() => list.removeAt(list.size())).toThrow(ReferenceError);
      expect(() => list.removeAt(9)).toThrow(ReferenceError);
    });

    test("returns the Todo item at the given index", () => {
      const size = list.size();

      for (let index = 0; index < size; index += 1) {
        expect(list.removeAt(0)).toBe(todos[index]);
      }
    });

    test("removes the Todo item at the given index", () => {
      const size = list.size();

      for (let count = 1; count <= size; count += 1) {
        let todo = list.removeAt(0);
        expect(list.toArray()).not.toContain(todo);
      }
    });
  });

  describe("TodoList.toString()", () => {
    test("all Todos undone -> returns correct string representation", () => {
      expect(list.toString()).toBe(
      // eslint-disable-next-line indent
`---- Today's Todos ----
[ ] Buy milk
[ ] Clean room
[ ] Go to the gym
`
      );
    });

    test("first Todo done -> returns correct string representation", () => {
      list.markDoneAt(0);
      expect(list.toString()).toBe(
      // eslint-disable-next-line indent
`---- Today's Todos ----
[X] Buy milk
[ ] Clean room
[ ] Go to the gym
`
      );
    });

    test("second Todo done -> returns correct string representation", () => {
      list.markDoneAt(1);
      expect(list.toString()).toBe(
      // eslint-disable-next-line indent
`---- Today's Todos ----
[ ] Buy milk
[X] Clean room
[ ] Go to the gym
`
      );
    });

    test("all Todos done -> returns correct string representation", () => {
      list.markAllDone();
      expect(list.toString()).toBe(
      // eslint-disable-next-line indent
`---- Today's Todos ----
[X] Buy milk
[X] Clean room
[X] Go to the gym
`
      );
    });
  });

  describe("TodoList callback methods", () => {
    let alwaysTrueCb;
    let alwaysFalseCb;

    beforeEach(() => {
      alwaysTrueCb = jest.fn(() => true);
      alwaysFalseCb = jest.fn(() => false);
    });

    describe("TodoList.forEach()", () => {
      test("calls the provided callback exactly size() number of times", () => {
        const size = list.size();
        list.forEach(alwaysTrueCb);
        expect(alwaysTrueCb).toHaveBeenCalledTimes(size);
      });

      test("calls the provided callback with the correct arguments", () => {
        list.forEach(alwaysTrueCb);
        todos.forEach((todo, index) => {
          expect(alwaysTrueCb).toHaveBeenNthCalledWith(
            index + 1,
            todo,
            index,
          );
        });
      });
    });

    describe("TodoList.filter()", () => {
      test("returns a TodoList object", () => {
        expect(list.filter(alwaysTrueCb)).toEqual(expect.any(TodoList));
      });

      test("returns an equivalent TodoList, given a non-filtering callback", () => {
        expect(list.filter(alwaysTrueCb)).toEqual(list);
      });

      test("returns an empty TodoList, given an all-filtering callback", () => {
        expect(list.filter(() => false)).toEqual(new TodoList(list.getTitle()));
      });

      test("returns a filtered TodoList, given a conditionally filtering callback", () => {
        // use toString() so the id field isn't considered.
        todo2.markDone();
        let otherList = new TodoList(list.getTitle());
        expect(list
          .filter((todo) => todo.isDone())
          .toString()
        ).not.toBe(otherList
          .toString()
        );
        otherList.add(todo2);
        expect(list
          .filter((todo) => todo.isDone())
          .toString()
        ).toBe(otherList
          .toString()
        );
      });

      test("returns a TodoList with shallow copied Todo items", () => {
        list.filter(alwaysTrueCb).forEach((todo) => {
          expect(todos).toContain(todo);
        });
      });

      test("calls the provided callback exactly size() number of times", () => {
        const size = list.size();
        list.filter(alwaysTrueCb);
        expect(alwaysTrueCb).toHaveBeenCalledTimes(size);
        list.filter(alwaysFalseCb);
        expect(alwaysFalseCb).toHaveBeenCalledTimes(size);
      });

      test("calls the provided callback with the correct arguments", () => {
        list.filter(alwaysTrueCb);
        list.filter(alwaysFalseCb);
        todos.forEach((todo, index) => {
          // eslint-disable-next-line id-length
          let n = index + 1;
          expect(alwaysTrueCb).toHaveBeenNthCalledWith(
            n,
            todo,
            index,
          );
          expect(alwaysFalseCb).toHaveBeenNthCalledWith(
            n,
            todo,
            index,
          );
        });
      });
    });

    describe("TodoList.find()", () => {
      test("returns a Todo object when found", () => {
        expect(list.find(alwaysTrueCb)).toEqual(expect.any(Todo));
      });

      test("returns undefined when no item is found", () => {
        expect(list.find(() => false)).toBeUndefined();
      });

      test("returns Todo reference when one is found", () => {
        expect(list.find((todo) => todo === todo1)).toBe(todo1);
        expect(list.find((todo) => todo === todo2)).toBe(todo2);
        expect(list.find((todo) => todo === todo3)).toBe(todo3);
      });

      test("calls the provided callback with the correct arguments", () => {
        list.find(alwaysTrueCb);
        expect(alwaysTrueCb).toHaveBeenCalledWith(todo1, 0);

        list.find(alwaysFalseCb);
        todos.forEach((todo, index) => {
          expect(alwaysFalseCb).toHaveBeenNthCalledWith(
            index + 1,
            todo,
            index,
          );
        });
      });
    });

    describe("TodoList.indexOf()", () => {
      test("returns 0 when the first item is found", () => {
        expect(list.indexOf(todo1)).toBe(0);
      });

      test("returns -1 when no item is found", () => {
        expect(list.indexOf(new Todo("new todo"))).toBe(-1);
      });

      test("returns `list.size() - 1` when the last item is found", () => {
        expect(list.indexOf(todo3)).toBe(list.size() - 1);
      });
    });
  });

  describe("TodoList.findByID()", () => {
    test("returns the Todo when there is one with the given ID", () => {
      expect(list.findByID(todo1.getID())).toBe(todo1);
      expect(list.findByID(todo2.getID())).toBe(todo2);
      expect(list.findByID(todo3.getID())).toBe(todo3);
    });

    test("returns undefined when there is no Todo with the given ID", () => {
      expect((new TodoList("new list")).findByID(todo1.getID())).toBeUndefined();
      expect(list.findByTitle("doesn't exist")).toBeUndefined();
    });
  });

  describe("TodoList.findByTitle()", () => {
    test("returns the Todo when there is one with the given title", () => {
      expect(list.findByTitle(todo1.getTitle())).toBe(todo1);
      expect(list.findByTitle(todo2.getTitle())).toBe(todo2);
      expect(list.findByTitle(todo3.getTitle())).toBe(todo3);
    });

    test("returns undefined when there is no Todo with the given title", () => {
      expect((new TodoList("empty list")).findByTitle("doesn't exist")).toBeUndefined();
      expect(list.findByTitle("doesn't exist")).toBeUndefined();
    });

    test("returns the first Todo found when there are > 1 with the given title", () => {
      let todo4 = new Todo(todo1.getTitle());
      list.add(todo4);
      expect(list.findByTitle(todo1.getTitle())).toBe(todo1);
      expect(list.findByTitle(todo1.getTitle())).not.toBe(todo4);
    });
  });

  describe("TodoList.allTodos()", () => {
    test("returns an empty TodoList when list is empty", () => {
      expect((new TodoList("empty list")).allTodos()).toEqual(new TodoList("empty list"));

      while (list.size() > 0) list.pop();
      expect(list.allTodos()).toEqual(new TodoList(list.getTitle()));
    });

    test("returns a shallow copy", () => {
      let otherList = new TodoList(list.getTitle());
      todos.forEach((todo) => otherList.add(todo));
      expect(list.allTodos()).not.toBe(list);
      expect(list.allTodos()).toEqual(otherList);
    });
  });

  describe("TodoList.allDone()", () => {
    describe('when no Todos are "done"', () => {
      test("returns an empty TodoList", () => {
        expect((new TodoList("empty list")).allDone()).toEqual(new TodoList("empty list"));
        expect(list.allDone()).toEqual(new TodoList(list.getTitle()));
      });
    });

    describe('when all Todos are "done"', () => {
      beforeEach(() => list.markAllDone());

      test("returns an equivalent TodoList", () => {
        expect(list.allDone()).toEqual(list);
      });

      test("returns a shallow copy", () => {
        let otherList = new TodoList(list.getTitle());
        todos.forEach((todo) => otherList.add(todo));
        expect(list.allDone()).not.toBe(list);
        expect(list.allDone()).toEqual(otherList);
      });
    });

    describe('when some Todos are "done" and some "not done"', () => {
      test('returns a TodoList with only the "done" Todos', () => {
        let otherList = new TodoList(list.getTitle());
        todo2.markDone();
        todos
          .filter((todo) => todo.isDone())
          .forEach((todo) => otherList.add(todo));
        expect(list.allDone()).toEqual(otherList);
      });
    });
  });

  describe("TodoList.allNotDone()", () => {
    describe('when no Todos are "done"', () => {
      test("returns an equivalent TodoList", () => {
        expect((new TodoList("empty list")).allNotDone()).toEqual(new TodoList("empty list"));
        expect(list.allNotDone()).toEqual(list);
      });

      test("returns a shallow copy", () => {
        let otherList = new TodoList(list.getTitle());
        todos.forEach((todo) => otherList.add(todo));
        expect(list.allNotDone()).not.toBe(list);
        expect(list.allNotDone()).toEqual(otherList);
      });
    });

    describe('when all Todos are "done"', () => {
      test("returns an empty TodoList", () => {
        list.markAllDone();
        expect(list.allNotDone()).toEqual(new TodoList(list.getTitle()));
      });
    });

    describe('when some Todos are "done" and some "not done"', () => {
      test('returns a TodoList with only the "not done" Todos', () => {
        let otherList = new TodoList(list.getTitle());
        todo2.markDone();
        todos
          .filter((todo) => !todo.isDone())
          .forEach((todo) => otherList.add(todo));
        expect(list.allNotDone()).toEqual(otherList);
      });
    });
  });
});
