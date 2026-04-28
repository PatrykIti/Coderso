import { expect, test } from "vitest";

import { shouldReturnFocus } from "../../../core/admin/ui/posts/editor/hooks/useFocusReturn";

test("shouldReturnFocus returns true only when panel transitions from open to closed", () => {
  expect(shouldReturnFocus(true, false)).toBe(true);
  expect(shouldReturnFocus(false, true)).toBe(false);
  expect(shouldReturnFocus(false, false)).toBe(false);
  expect(shouldReturnFocus(true, true)).toBe(false);
});
