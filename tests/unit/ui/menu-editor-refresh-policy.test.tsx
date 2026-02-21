import { expect, test } from "bun:test";

import {
  resolveMenuMountRefreshOptions,
  shouldLoadActiveMenuAfterRefresh,
} from "../../../core/admin/ui/menus/MenuEditorPage";

test("menu editor mount hydrates from cache without forced reload", () => {
  expect(resolveMenuMountRefreshOptions(true)).toEqual({
    force: false,
    background: true,
    reloadActive: false,
  });
});

test("menu editor mount keeps foreground loading when cache is missing", () => {
  expect(resolveMenuMountRefreshOptions(false)).toEqual({
    force: false,
    background: false,
    reloadActive: false,
  });
});

test("menu editor reloads active detail only when policy requires it", () => {
  expect(
    shouldLoadActiveMenuAfterRefresh({
      currentActiveId: "menu-1",
      nextActiveId: "menu-1",
      reloadActive: false,
    })
  ).toBe(false);

  expect(
    shouldLoadActiveMenuAfterRefresh({
      currentActiveId: "menu-1",
      nextActiveId: "menu-1",
      reloadActive: true,
    })
  ).toBe(true);

  expect(
    shouldLoadActiveMenuAfterRefresh({
      currentActiveId: "menu-1",
      nextActiveId: "menu-2",
      reloadActive: false,
    })
  ).toBe(true);
});
