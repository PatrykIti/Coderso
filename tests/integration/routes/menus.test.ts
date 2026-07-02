import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { menuItems, menus } from "../../../core/db/schema";
import { createMenu } from "../../../core/services/menus/menuService";
import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
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

test("menu schemas accept design fields on update only", () => {
  expect(() =>
    validate(menuUpdateSchema, { appearance: { surfaceColor: "#0f172a" } })
  ).not.toThrow();
  expect(() => validate(menuUpdateSchema, { appearance: null })).not.toThrow();
  expect(() => validate(menuUpdateSchema, { extras: [createPageBlockV2("button")] })).not.toThrow();
  expect(() => validate(menuUpdateSchema, { extras: null })).not.toThrow();
  expect(() =>
    validate(menuUpdateSchema, { document: { schemaVersion: 1, sections: [] } })
  ).not.toThrow();
  expect(() => validate(menuUpdateSchema, { document: null })).not.toThrow();
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
  "PATCH /menus/:id persists valid extras through the menus.settings envelope",
  async () => {
    const menu = await createMenu({
      name: `Route Extras ${randomUUID()}`,
      location: `route-extras-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const block = createPageBlockV2("button", { id: "blk-route-cta" });
    const handler = getPatchHandler();
    const updated = (await handler({
      params: { id: menu.id },
      query: {},
      body: { extras: [block] },
    })) as typeof menus.$inferSelect;

    expect(updated.settings).toEqual({
      extras: [block],
    });
  },
  dbTestTimeoutMs
);

const routeMenuDocument = () => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "sec-route-menu-bar",
      type: "menu-bar" as const,
      name: "Menu bar",
      layout: { surfaceColor: "#0f172a" },
      blocks: [{ id: "blk-route-nav", type: "nav-items" as const, props: { itemGap: 12 } }],
    },
  ],
});

testIfDb(
  "PATCH /menus/:id round-trips a document without dropping a co-present appearance",
  async () => {
    const menu = await createMenu({
      name: `Route Document ${randomUUID()}`,
      location: `route-document-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const handler = getPatchHandler();
    const document = routeMenuDocument();
    const updated = (await handler({
      params: { id: menu.id },
      query: {},
      body: { appearance: { surfaceColor: "#0f172a" }, document },
    })) as typeof menus.$inferSelect;

    // Per-key merge: both keys ride the envelope, neither is dropped.
    expect(updated.settings).toEqual({
      appearance: { surfaceColor: "#0f172a" },
      document,
    });
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id persists a document-ONLY body through the menus.settings envelope",
  async () => {
    const menu = await createMenu({
      name: `Route Document Only ${randomUUID()}`,
      location: `route-document-only-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const handler = getPatchHandler();
    const document = routeMenuDocument();
    const updated = (await handler({
      params: { id: menu.id },
      query: {},
      body: { document },
    })) as typeof menus.$inferSelect;

    expect(updated.settings).toEqual({ document });
  },
  dbTestTimeoutMs
);

// --- TASK-501-04: responsive document persistence through the same envelope ---

const routeResponsiveMenuDocument = () => {
  const document = routeMenuDocument();
  return {
    ...document,
    sections: [
      {
        ...document.sections[0]!,
        responsive: {
          mobile: {
            layout: { paddingY: 4 },
            navProps: { orientation: "vertical" as const, itemGap: 16 },
          },
        },
        blocks: [
          document.sections[0]!.blocks[0]!,
          {
            id: "blk-route-cta",
            type: "cta-button" as const,
            props: {
              label: "Go",
              href: "/go",
              target: "self" as const,
              variant: "primary" as const,
              size: "md" as const,
            },
            visibility: { visible: true },
            responsive: { mobile: { visibility: { visible: false } } },
          },
        ],
      },
    ],
  };
};

testIfDb(
  "PATCH /menus/:id document carrying responsive persists per-key without dropping appearance/extras",
  async () => {
    const menu = await createMenu({
      name: `Route Responsive ${randomUUID()}`,
      location: `route-responsive-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const handler = getPatchHandler();
    const extras = [createPageBlockV2("button", { id: "blk-route-extra" })];
    // Seed sibling envelope keys first, then PATCH the document ALONE.
    await handler({
      params: { id: menu.id },
      query: {},
      body: { appearance: { surfaceColor: "#0f172a" }, extras },
    });

    const document = routeResponsiveMenuDocument();
    const updated = (await handler({
      params: { id: menu.id },
      query: {},
      body: { document },
    })) as typeof menus.$inferSelect;

    // Per-key merge: the responsive document rides in verbatim (sparse records
    // preserved, nothing injected) and the sibling keys survive untouched.
    expect(updated.settings).toEqual({
      appearance: { surfaceColor: "#0f172a" },
      extras,
      document,
    });
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id maps an invalid responsive key to a 400 menu_document_invalid ApiError with a path",
  async () => {
    const menu = await createMenu({
      name: `Route Responsive Invalid ${randomUUID()}`,
      location: `route-responsive-invalid-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const handler = getPatchHandler();
    const document = routeMenuDocument();
    try {
      await handler({
        params: { id: menu.id },
        query: {},
        body: {
          document: {
            ...document,
            sections: [
              {
                ...document.sections[0]!,
                // Tablet is DEFERRED (mobile-only v1): reject-unknown must fire.
                responsive: { tablet: { layout: { paddingY: 4 } } },
              },
            ],
          },
        },
      });
      throw new Error("expected menu_document_invalid");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe("menu_document_invalid");
      expect(apiError.status).toBe(400);
      expect(apiError.details).toEqual({ path: "document.sections[0].responsive.tablet" });
    }
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id maps an invalid document to a 400 menu_document_invalid ApiError with a path",
  async () => {
    const menu = await createMenu({
      name: `Route Document Invalid ${randomUUID()}`,
      location: `route-document-invalid-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const handler = getPatchHandler();
    try {
      await handler({
        params: { id: menu.id },
        query: {},
        body: {
          document: {
            schemaVersion: 1,
            sections: [{ type: "footer", name: "x", layout: {}, blocks: [] }],
          },
        },
      });
      throw new Error("expected menu_document_invalid");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe("menu_document_invalid");
      expect(apiError.status).toBe(400);
      expect(apiError.details).toEqual({ path: "document.sections[0].type" });
    }
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

testIfDb(
  "PATCH /menus/:id maps invalid extras to a 400 menu_nav_extras_invalid ApiError",
  async () => {
    const menu = await createMenu({
      name: `Route Extras Invalid ${randomUUID()}`,
      location: `route-extras-invalid-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const handler = getPatchHandler();
    try {
      await handler({
        params: { id: menu.id },
        query: {},
        body: { extras: [createPageBlockV2("heading", { id: "blk-route-heading" })] },
      });
      throw new Error("expected menu_nav_extras_invalid");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe("menu_nav_extras_invalid");
      expect(apiError.status).toBe(400);
      expect(apiError.details).toEqual({ field: "extras[0].type" });
    }
  },
  dbTestTimeoutMs
);
