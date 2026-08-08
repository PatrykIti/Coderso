import { expect, test } from "bun:test";
import process from "node:process";

import { readOwnEnvironmentString } from "../../../scripts/runtime-smoke/server/supervised-server.ts";

test("shared smoke environment accepts only the runtime's native process accessors", () => {
  const timezone = readOwnEnvironmentString(process.env, "TZ");
  expect(timezone === null || typeof timezone === "string").toBe(true);

  const accessorEnvironment = Object.create(null);
  Object.defineProperty(accessorEnvironment, "TZ", {
    configurable: true,
    enumerable: true,
    get: () => "Etc/UTC",
  });
  expect(() => readOwnEnvironmentString(accessorEnvironment, "TZ")).toThrow(
    "server environment accessor is invalid"
  );
});
