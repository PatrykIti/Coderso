import { expect, test } from "vitest";

import {
  buildCustomScreenEditorPath,
  buildCustomScreenWorkspaceHref,
  buildCustomScreenWorkspacePath,
  resolveCustomScreenId,
  resolveCustomScreenEntryParams,
  resolveCustomScreenWorkspacePrefetchTarget,
} from "../../../core/admin/ui/custom-screens/routeParams";

test("custom screen editor paths encode IDs without entering the records workspace", () => {
  expect(buildCustomScreenEditorPath({ screenId: "screen / 1" })).toBe(
    "/advanced/custom-screens/screen%20%2F%201"
  );
  expect(buildCustomScreenEditorPath({ screenId: "screen-1" })).toBe(
    "/advanced/custom-screens/screen-1"
  );
  expect(buildCustomScreenEditorPath({ screenId: "screen-1" })).not.toContain("/entries");
});

test("custom screen ID resolution strips query and hash before decoding", () => {
  const variants = [
    "/admin/advanced/custom-screens/screen%20one",
    "/admin/advanced/custom-screens/screen%20one?panel=settings",
    "/admin/advanced/custom-screens/screen%20one#binding",
    "/admin/advanced/custom-screens/screen%20one?panel=settings#binding",
  ];

  expect(variants.map(resolveCustomScreenId)).toEqual([
    "screen one",
    "screen one",
    "screen one",
    "screen one",
  ]);
});

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
