import { expect, test } from "bun:test";
import { cn } from "../../../core/admin/lib/utils";

test("cn merges class names", () => {
  const merged = cn("px-2", "px-4", "text-sm");
  expect(merged).toContain("px-4");
  expect(merged).toContain("text-sm");
});
