import { expect, test } from "bun:test";

import { shouldWarnOnNavigate } from "../../../core/admin/ui/pages/builder/blockUtils";

test("shouldWarnOnNavigate returns true when unsaved changes", () => {
  expect(shouldWarnOnNavigate(true)).toBe(true);
  expect(shouldWarnOnNavigate(false)).toBe(false);
});
