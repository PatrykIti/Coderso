import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { menuItems, menus } from "../../../core/db/schema";
import { createMenu } from "../../../core/services/menus/menuService";
import { registerMenuRoutes } from "../../../core/server/routes/menuRoutes";
import { ApiError } from "../../../core/server/errorHandler";
import {
  menuItemsSchema,
  menuCreateSchema,
  menuUpdateSchema,
} from "../../../core/server/validation/menuSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import { canConnect, hasTable } from "../../utils/db";

type Route = { method: string; path: string; handler: Handler };
type Handler = (ctx: {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
}) => Promise<unknown> | unknown;

const makeRouter = () => {
  const routes: Route[] = [];
  const register =
    (method: string) =>
    (path: string, ...handlers: Handler[]) =>
      routes.push({ method, path, handler: handlers[handlers.length - 1] });
  return {
    routes,
    router: {
      get: register("GET"),
      post: register("POST"),
      patch: register("PATCH"),
      put: register("PUT"),
      delete: register("DELETE"),
    },
  };
};

test("registerMenuRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerMenuRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /menus",
      "POST /menus",
      "GET /menus/:id",
      "PATCH /menus/:id",
      "PUT /menus/:id/items",
      "DELETE /menus/:id",
    ])
  );
});

test("menu schemas accept the appearance field on update only", () => {
  expect(() =>
    validate(menuUpdateSchema, { appearance: { surfaceColor: "#0f172a" } })
  ).not.toThrow();
  expect(() => validate(menuUpdateSchema, { appearance: null })).not.toThrow();
  expect(() =>
    validate(menuCreateSchema, {
      name: "Primary",
      location: null,
      appearance: { surfaceColor: "#0f172a" },
    })
  ).toThrow("Invalid payload");
  expect(() => validate(menuItemsSchema, { items: [], appearance: {} })).toThrow("Invalid payload");
});

// --- DB-backed appearance flow through the PATCH /menus/:id handler ---

const hasDb =
  Boolean(process.env.DATABASE_URL) && (await canConnect()) && (await hasTable("menus"));
const testIfDb = hasDb ? test : test.skip;
const dbTestTimeoutMs = 15_000;

const createdMenuIds: string[] = [];

afterAll(async () => {
  if (!hasDb) return;
  for (const menuId of createdMenuIds) {
    await db.delete(menuItems).where(eq(menuItems.menuId, menuId));
    await db.delete(menus).where(eq(menus.id, menuId));
  }
}, dbTestTimeoutMs);

const getPatchHandler = () => {
  const { router, routes } = makeRouter();
  registerMenuRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const route = routes.find((entry) => entry.method === "PATCH" && entry.path === "/menus/:id");
  if (!route) throw new Error("patch_route_missing");
  return route.handler;
};

testIfDb(
  "PATCH /menus/:id persists a valid appearance through the menus.settings envelope",
  async () => {
    const menu = await createMenu({
      name: `Route Appearance ${randomUUID()}`,
      location: `route-appearance-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const handler = getPatchHandler();
    const updated = (await handler({
      params: { id: menu.id },
      query: {},
      body: { appearance: { surfaceColor: "#0f172a", itemGap: 12, mobileMode: "inline" } },
    })) as typeof menus.$inferSelect;

    expect(updated.settings).toEqual({
      appearance: { surfaceColor: "#0f172a", itemGap: 12, mobileMode: "inline" },
    });
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id maps invalid appearance to a 400 menu_appearance_invalid ApiError",
  async () => {
    const menu = await createMenu({
      name: `Route Appearance Invalid ${randomUUID()}`,
      location: `route-appearance-invalid-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const handler = getPatchHandler();
    try {
      await handler({
        params: { id: menu.id },
        query: {},
        body: { appearance: { linkColor: "javascript:alert(1)" } },
      });
      throw new Error("expected menu_appearance_invalid");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe("menu_appearance_invalid");
      expect(apiError.status).toBe(400);
      expect(apiError.details).toEqual({ field: "linkColor" });
    }

    // Unknown appearance keys are rejected by the owner normalizer.
    try {
      await handler({
        params: { id: menu.id },
        query: {},
        body: { appearance: { logoColor: "#fff" } },
      });
      throw new Error("expected menu_appearance_invalid");
    } catch (error) {
      expect((error as ApiError).code).toBe("menu_appearance_invalid");
      expect((error as ApiError).details).toEqual({ field: "logoColor" });
    }
  },
  dbTestTimeoutMs
);
