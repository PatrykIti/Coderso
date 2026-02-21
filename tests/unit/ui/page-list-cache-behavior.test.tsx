import { expect, test } from "bun:test";

import { resolvePageListMountRefreshOptions } from "../../../core/admin/ui/pages/PageListPage";

test("page list mount uses cached hydration without force refresh", () => {
  expect(resolvePageListMountRefreshOptions(true)).toEqual({
    force: false,
    background: true,
  });
});

test("page list mount forces initial fetch only when cache is missing", () => {
  expect(resolvePageListMountRefreshOptions(false)).toEqual({
    force: true,
    background: false,
  });
});
