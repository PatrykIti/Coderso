import React from "react";
import { expect, test } from "vitest";

import { shouldWarnOnNavigate } from "../../../core/admin/ui/pages/builder/blockUtils";

test("shouldWarnOnNavigate returns true when unsaved changes", () => {
  expect(shouldWarnOnNavigate(true)).toBe(true);
  expect(shouldWarnOnNavigate(false)).toBe(false);
});
