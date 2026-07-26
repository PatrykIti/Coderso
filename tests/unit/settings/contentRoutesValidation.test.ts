import { expect, test } from "bun:test";

import { normalizeContentRoutes } from "../../../core/services/settings/settingsContracts";

test("normalizeContentRoutes normalizes paths and defaults enabled", () => {
  const routes = normalizeContentRoutes([
    {
      type: "blog",
      listPath: "blog/",
      detailPath: "/blog/:slug/",
      detailPageId: "4DD7F4D4-48D8-53F7-A9E6-0D01F6B89E6C",
    },
  ]);

  expect(routes).toHaveLength(1);
  expect(routes[0]?.listPath).toBe("/blog");
  expect(routes[0]?.detailPath).toBe("/blog/:slug");
  expect(routes[0]?.enabled).toBe(true);
  expect(routes[0]?.detailPageId).toBe("4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");
});

test.each(["unexpected", "__proto__", "prototype", "constructor"])(
  "normalizeContentRoutes rejects exact unknown own key %s",
  (key) => {
    const route = JSON.parse(
      `{"type":"blog","listPath":"/blog","detailPath":"/blog/:slug","${key}":true}`
    );
    expect(Object.prototype.hasOwnProperty.call(route, key)).toBe(true);
    expect(() => normalizeContentRoutes([route])).toThrow("settings_value_invalid");
  }
);

const validRoute = (): Record<PropertyKey, unknown> => ({
  type: "blog",
  listPath: "/blog",
  detailPath: "/blog/:slug",
});

test("normalizeContentRoutes rejects a custom object prototype", () => {
  const route = Object.assign(
    Object.create({ inherited: true }) as Record<PropertyKey, unknown>,
    validRoute()
  );

  expect(() => normalizeContentRoutes([route])).toThrow("settings_value_invalid");
});

test("normalizeContentRoutes rejects a non-enumerable unknown own key", () => {
  const route = validRoute();
  Object.defineProperty(route, "unexpected", { value: true, enumerable: false });

  expect(() => normalizeContentRoutes([route])).toThrow("settings_value_invalid");
});

test("normalizeContentRoutes rejects a symbol own key", () => {
  const route = validRoute();
  Object.defineProperty(route, Symbol("unexpected"), { value: true, enumerable: true });

  expect(() => normalizeContentRoutes([route])).toThrow("settings_value_invalid");
});

test("normalizeContentRoutes rejects duplicate types", () => {
  expect(() =>
    normalizeContentRoutes([
      { type: "blog", listPath: "/blog", detailPath: "/blog/:slug" },
      { type: "blog", listPath: "/news", detailPath: "/news/:slug" },
    ])
  ).toThrow();
});

test("normalizeContentRoutes rejects invalid detailPageId values", () => {
  expect(() =>
    normalizeContentRoutes([
      {
        type: "blog",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        detailPageId: "not-a-uuid",
      },
    ])
  ).toThrow();
});

test("normalizeContentRoutes rejects unsupported detail path parameter names", () => {
  expect(() =>
    normalizeContentRoutes([
      {
        type: "blog",
        listPath: "/blog",
        detailPath: "/blog/:record",
      },
    ])
  ).toThrow();
});

test("normalizeContentRoutes rejects mixed or non-terminal detail params", () => {
  expect(() =>
    normalizeContentRoutes([
      {
        type: "blog",
        listPath: "/blog",
        detailPath: "/blog/:slug-:id",
      },
    ])
  ).toThrow();

  expect(() =>
    normalizeContentRoutes([
      {
        type: "blog",
        listPath: "/blog",
        detailPath: "/:slug/blog",
      },
    ])
  ).toThrow();
});
