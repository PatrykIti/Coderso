import { expect, test } from "vitest";

import {
  buildCustomScreenWorkspaceHref,
  buildCustomScreenWorkspacePath,
  resolveCustomScreenEntryParams,
  resolveCustomScreenWorkspacePrefetchTarget,
} from "../../../core/admin/ui/custom-screens/routeParams";

test("custom screen workspace route helpers encode and decode entry paths", () => {
  expect(
    buildCustomScreenWorkspacePath({
      screenId: "screen 1",
      entryId: "new",
    })
  ).toBe("/advanced/custom-screens/screen%201/entries/new");

  expect(
    resolveCustomScreenEntryParams("/admin/advanced/custom-screens/screen%201/entries/entry%201")
  ).toEqual({
    screenId: "screen 1",
    entryId: "entry 1",
  });
});

test("custom screen workspace helpers resolve admin hrefs and prefetch targets", () => {
  expect(
    buildCustomScreenWorkspaceHref("/admin", {
      screenId: "screen-1",
      entryId: "entry-1",
    })
  ).toBe("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  expect(
    resolveCustomScreenWorkspacePrefetchTarget(
      "/advanced/custom-screens/screen-1/entries/entry-1?panel=preview"
    )
  ).toEqual({
    screenId: "screen-1",
    entryId: "entry-1",
  });

  expect(
    resolveCustomScreenWorkspacePrefetchTarget("/advanced/custom-screens/screen-1")
  ).toBeNull();
});
