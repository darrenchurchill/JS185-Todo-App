/**
 * JS185 Todo App
 * TodoPGStore Class
 * user-auth.js
 *
 * A class to provide user authentication functionality.
 */
"use strict";

const bcrypt = require("bcrypt");

const { query } = require("./db");

// Set the work factor to slow the hashing function to something you deem
// acceptable for validating user passwords. Incrementing/decrementing the value
// by 1 can change the time required significantly.
const BCRYPT_WORK_FACTOR = 12;

class AuthClient {
  constructor(options = { bcryptWorkFactor: BCRYPT_WORK_FACTOR }) {
    this.workFactor = options.bcryptWorkFactor;
  }

  /**
   * A function to ensure authentication attempts where the username is invalid
   * take constant time, rather than short-circuiting and returning because the
   * username doesn't exist.
   * @returns {false}
   */
  async #compareDummy() {
    const dummyPassword = "dummyPassword";
    const dummyHash = await bcrypt.hash(dummyPassword, this.workFactor);
    await bcrypt.compare(dummyPassword, dummyHash);
    return false;
  }

  /**
   * Given a string `username` and string `password`, return `true` if they
   * are a valid combination.
   * @param {string} username the username
   * @param {string} password the password
   * @returns {Promise.<boolean>} a Promise, containing when fulfilled: `true`
   * if the `username` and `password` combination is valid
   */
  async authenticate(username, password) {
    const text =
`SELECT
  password_hash AS "passwordHash"
FROM
  users
WHERE
  username = $1
`;

    const { rowCount, rows } = await query(text, [username]);
    if (rowCount > 1) {
      throw new Error(
        "Cannot authenticate: there are multiple username matches."
      );
    }
    if (rowCount === 0) return this.#compareDummy();
    return bcrypt.compare(password, rows[0].passwordHash);
  }
}

module.exports = {
  AuthClient,
};
