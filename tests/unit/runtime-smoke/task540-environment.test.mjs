import { expect, test } from "bun:test";

import { ownString } from "../../../_docs/_workflows/task-540-smoke/executor/environment.mjs";

test("TASK-540 accepts only Bun's native process environment accessors", () => {
  const timezone = ownString(process.env, "TZ");
  expect(timezone === null || typeof timezone === "string").toBe(true);

  const accessorEnvironment = Object.create(null);
  Object.defineProperty(accessorEnvironment, "TZ", {
    configurable: true,
    enumerable: true,
    get: () => "Etc/UTC",
  });
  expect(() => ownString(accessorEnvironment, "TZ")).toThrow("environment value is invalid");
});
