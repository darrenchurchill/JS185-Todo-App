"use strict";

const nextID = require("../lib/next-id");

describe("next-id", () => {
  test("should return a number", () => {
    expect(nextID()).toEqual(expect.any(Number));
  });

  test("should return unique numbers", () => {
    let IDs = new Set();

    for (let count = 0; count <= 10_000; count += 1) {
      let id = nextID();
      expect(IDs.has(id)).toBe(false);
      IDs.add(id);
    }
  });
});
