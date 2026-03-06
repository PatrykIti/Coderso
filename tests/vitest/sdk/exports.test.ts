import { expect, test } from "vitest";

import { defineAdmin } from "../../../packages/sdk/src/client";
import { definePlugin } from "../../../packages/sdk/src/server";
import { API_VERSION } from "../../../packages/sdk/src/shared";

test("sdk exports are available", () => {
  expect(typeof definePlugin).toBe("function");
  expect(typeof defineAdmin).toBe("function");
  expect(API_VERSION).toBe("1");
});
