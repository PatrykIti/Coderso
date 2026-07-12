import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { menuItems, menus } from "../../../core/db/schema";
import { createMenu } from "../../../core/services/menus/menuService";
import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";
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

const boundaryTerminal = "transparent";
const boundaryPaddingLength = CSS_COLOR_VALUE_MAX_LENGTH - boundaryTerminal.length;
const rawAtCapColor = `${" ".repeat(Math.floor(boundaryPaddingLength / 2))}${boundaryTerminal}${" ".repeat(
  Math.ceil(boundaryPaddingLength / 2)
)}`;
const rawOverCapColor = `${rawAtCapColor} `;
const rawRouteColorCases = [
  { id: "exact cap", input: rawAtCapColor, expected: "transparent" },
  { id: "cap plus one", input: rawOverCapColor, expected: null },
  { id: "C0 control", input: `\u001f${boundaryTerminal}`, expected: null },
  { id: "C1 control", input: `\u0085${boundaryTerminal}`, expected: null },
  { id: "NBSP", input: `\u00a0${boundaryTerminal}`, expected: null },
  { id: "EM SPACE", input: `\u2003${boundaryTerminal}`, expected: null },
  { id: "inherited currentColor", input: "currentColor", expected: null },
  { id: "inherited inherit", input: "inherit", expected: null },
  { id: "out-of-range function", input: "rgb(256,0,0)", expected: null },
] as const;

const shadowColorPrefix = "rgba(";
const shadowColorTerminal = "0,0,0,.5)";
const shadowColorAtCap = `${shadowColorPrefix}${" ".repeat(
  CSS_COLOR_VALUE_MAX_LENGTH - shadowColorPrefix.length - shadowColorTerminal.length
)}${shadowColorTerminal}`;
const shadowColorOverCap = `${shadowColorPrefix} ${shadowColorAtCap.slice(shadowColorPrefix.length)}`;
const rawRouteShadowColorCases = [
  { id: "exact cap", input: shadowColorAtCap, expected: "rgba(0, 0, 0, 0.5)" },
  { id: "cap plus one", input: shadowColorOverCap, expected: null },
  { id: "C0 control", input: "rgba(\u001f0,0,0,.5)", expected: null },
  { id: "C1 control", input: "rgba(\u00850,0,0,.5)", expected: null },
  { id: "NBSP", input: "rgba(\u00a00,0,0,.5)", expected: null },
  { id: "EM SPACE", input: "rgba(\u20030,0,0,.5)", expected: null },
] as const;

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

const getGetHandler = () => {
  const { router, routes } = makeRouter();
  registerMenuRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const route = routes.find((entry) => entry.method === "GET" && entry.path === "/menus/:id");
  if (!route) throw new Error("get_route_missing");
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
  "PATCH /menus/:id sends untouched raw colors through strict canonical persistence",
  async () => {
    expect(rawAtCapColor).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(rawOverCapColor).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);

    const acceptedMenu = await createMenu({
      name: `Route Color Exact Cap ${randomUUID()}`,
      location: `route-color-cap-${randomUUID()}`,
    });
    createdMenuIds.push(acceptedMenu.id);
    const patch = getPatchHandler();
    const get = getGetHandler();
    const accepted = (await patch({
      params: { id: acceptedMenu.id },
      query: {},
      body: { appearance: { surfaceColor: rawAtCapColor, itemGap: 12 } },
    })) as typeof menus.$inferSelect;
    expect(accepted.settings).toEqual({
      appearance: { surfaceColor: "transparent", itemGap: 12 },
    });
    const acceptedRead = (await get({
      params: { id: acceptedMenu.id },
      query: {},
      body: undefined,
    })) as { menu: typeof menus.$inferSelect };
    expect(acceptedRead.menu.settings).toEqual(accepted.settings);

    const rejectedMenu = await createMenu({
      name: `Route Color Rejections ${randomUUID()}`,
      location: `route-color-reject-${randomUUID()}`,
    });
    createdMenuIds.push(rejectedMenu.id);
    await patch({
      params: { id: rejectedMenu.id },
      query: {},
      body: { appearance: { itemGap: 12 } },
    });

    for (const colorCase of rawRouteColorCases.filter((entry) => entry.expected === null)) {
      try {
        await patch({
          params: { id: rejectedMenu.id },
          query: {},
          body: { appearance: { surfaceColor: colorCase.input, itemGap: 24 } },
        });
        throw new Error(`expected ${colorCase.id} to reject`);
      } catch (error) {
        expect(error, colorCase.id).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.code, colorCase.id).toBe("menu_appearance_invalid");
        expect(apiError.status, colorCase.id).toBe(400);
        expect(apiError.details, colorCase.id).toEqual({ field: "surfaceColor" });
      }
    }

    const rejectedRead = (await get({
      params: { id: rejectedMenu.id },
      query: {},
      body: undefined,
    })) as { menu: typeof menus.$inferSelect };
    expect(rejectedRead.menu.settings).toEqual({ appearance: { itemGap: 12 } });
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

const routeNestedColorDocument = (color: string) => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "sec-route-color-nested",
      type: "menu-bar" as const,
      name: "Menu bar",
      layout: { surfaceColorScrolled: color, radius: 6 },
      blocks: [
        {
          id: "blk-route-color-brand",
          type: "brand" as const,
          props: {
            mode: "text" as const,
            href: "/",
            style: { color, height: 40 },
          },
        },
        {
          id: "blk-route-color-nav",
          type: "nav-items" as const,
          props: {
            levelStyles: { 1: { linkColor: color, fontSize: 16 } },
            navChrome: { navPillBackground: color, navPillRadius: 8 },
          },
        },
      ],
    },
  ],
});

const routeShadowColorDocument = (color: string) => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "sec-route-shadow-color",
      type: "menu-bar" as const,
      name: "Menu bar",
      layout: { shadowCustom: `0 0 ${color}`, radius: 6 },
      blocks: [{ id: "blk-route-shadow-nav", type: "nav-items" as const, props: {} }],
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

testIfDb(
  "PATCH /menus/:id canonicalizes valid nested colors and fail-soft drops invalid raw colors",
  async () => {
    const menu = await createMenu({
      name: `Route Nested Colors ${randomUUID()}`,
      location: `route-nested-colors-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const patch = getPatchHandler();
    const get = getGetHandler();
    let lastSettings: unknown;
    for (const colorCase of rawRouteColorCases) {
      const updated = (await patch({
        params: { id: menu.id },
        query: {},
        body: { document: routeNestedColorDocument(colorCase.input) },
      })) as typeof menus.$inferSelect;
      const settings = updated.settings as {
        document: {
          sections: Array<{
            layout: Record<string, unknown>;
            blocks: Array<{ props: Record<string, unknown> }>;
          }>;
        };
      };
      const section = settings.document.sections[0]!;
      const brandStyle = section.blocks[0]!.props.style as Record<string, unknown>;
      const levelOne = (
        section.blocks[1]!.props.levelStyles as Record<string, Record<string, unknown>>
      )["1"]!;
      const navChrome = section.blocks[1]!.props.navChrome as Record<string, unknown>;

      expect(section.layout.surfaceColorScrolled, colorCase.id).toBe(
        colorCase.expected ?? undefined
      );
      expect(brandStyle.color, colorCase.id).toBe(colorCase.expected ?? undefined);
      expect(levelOne.linkColor, colorCase.id).toBe(colorCase.expected ?? undefined);
      expect(navChrome.navPillBackground, colorCase.id).toBe(colorCase.expected ?? undefined);
      expect(section.layout.radius, colorCase.id).toBe(6);
      expect(brandStyle.height, colorCase.id).toBe(40);
      expect(levelOne.fontSize, colorCase.id).toBe(16);
      expect(navChrome.navPillRadius, colorCase.id).toBe(8);
      lastSettings = updated.settings;
    }

    const fetched = (await get({
      params: { id: menu.id },
      query: {},
      body: undefined,
    })) as { menu: typeof menus.$inferSelect };
    expect(fetched.menu.settings).toEqual(lastSettings);
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id canonicalizes embedded shadow colors and drops invalid raw colors per key",
  async () => {
    expect(shadowColorAtCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(shadowColorOverCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);

    const menu = await createMenu({
      name: `Route Shadow Colors ${randomUUID()}`,
      location: `route-shadow-colors-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const patch = getPatchHandler();
    const get = getGetHandler();
    let lastSettings: unknown;
    for (const colorCase of rawRouteShadowColorCases) {
      const updated = (await patch({
        params: { id: menu.id },
        query: {},
        body: { document: routeShadowColorDocument(colorCase.input) },
      })) as typeof menus.$inferSelect;
      const settings = updated.settings as {
        document: { sections: Array<{ layout: Record<string, unknown> }> };
      };
      const layout = settings.document.sections[0]!.layout;
      expect(layout.shadowCustom, colorCase.id).toBe(
        colorCase.expected == null ? undefined : `0 0 ${colorCase.expected}`
      );
      expect(layout.radius, colorCase.id).toBe(6);
      lastSettings = updated.settings;
    }

    const fetched = (await get({
      params: { id: menu.id },
      query: {},
      body: undefined,
    })) as { menu: typeof menus.$inferSelect };
    expect(fetched.menu.settings).toEqual(lastSettings);
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
                // "wide" is NOT a responsive breakpoint (tablet + mobile only as
                // of TASK-502-01): reject-unknown must fire.
                responsive: { wide: { layout: { paddingY: 4 } } },
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
      expect(apiError.details).toEqual({ path: "document.sections[0].responsive.wide" });
    }
  },
  dbTestTimeoutMs
);

// --- TASK-502-05 §2.1: the two headline new keys (brand.text + responsive.tablet)
// proven at the route/persistence boundary (service-layer coverage lives in
// menu-document-v2.test.ts; the route is a thin delegate, so these assert the
// verbatim round-trip and the ApiError-400 mapping actually reach the wire). ---

const routeBrandTabletMenuDocument = () => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "sec-route-menu-bar",
      type: "menu-bar" as const,
      name: "Menu bar",
      layout: { surfaceColor: "#0f172a" },
      // responsive.tablet is a NEW breakpoint (TASK-502-01) — its OWN sparse
      // record must ride the envelope verbatim, base untouched.
      responsive: {
        tablet: {
          layout: { paddingY: 6 },
          navProps: { orientation: "vertical" as const, itemGap: 20 },
        },
      },
      blocks: [
        {
          id: "blk-route-brand",
          type: "brand" as const,
          // brand.text is the OTHER new key (TASK-502-01): a clean string
          // persists verbatim (no trim needed here).
          props: { mode: "text" as const, href: "/", text: "Acme Co" },
        },
        { id: "blk-route-nav", type: "nav-items" as const, props: { itemGap: 12 } },
      ],
    },
  ],
});

testIfDb(
  "PATCH /menus/:id persists brand.text + responsive.tablet verbatim, read back through GET",
  async () => {
    const menu = await createMenu({
      name: `Route Brand Tablet ${randomUUID()}`,
      location: `route-brand-tablet-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const patch = getPatchHandler();
    const document = routeBrandTabletMenuDocument();
    await patch({ params: { id: menu.id }, query: {}, body: { document } });

    // Round-trip through the GET handler: the persisted envelope carries the
    // new keys byte-for-byte (brand.text unmodified, responsive.tablet sparse).
    const get = getGetHandler();
    const fetched = (await get({ params: { id: menu.id }, query: {}, body: undefined })) as {
      menu: typeof menus.$inferSelect;
    };
    expect(fetched.menu.settings).toEqual({ document });
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id maps a non-string brand.text to a 400 menu_document_invalid ApiError with the brand text path",
  async () => {
    const menu = await createMenu({
      name: `Route Brand Text Invalid ${randomUUID()}`,
      location: `route-brand-text-invalid-${randomUUID()}`,
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
            sections: [
              {
                id: "sec-route-menu-bar",
                type: "menu-bar",
                name: "Menu bar",
                layout: {},
                // brand at blocks[0] so the normalizer path anchors on it; a
                // non-string text must be rejected (TASK-502-01 write guard).
                blocks: [
                  {
                    id: "blk-route-brand",
                    type: "brand",
                    props: { mode: "text", href: "/", text: 42 },
                  },
                ],
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
      expect(apiError.details).toEqual({
        path: "document.sections[0].blocks[0].props.text",
      });
    }
  },
  dbTestTimeoutMs
);

// --- TASK-504-05 §2.1: brand.props.style + navProps.levelStyles + per-device
// (responsive.{tablet,mobile}) brand/level overrides proven at the route boundary.
// Service-layer accept/reject/prune coverage lives in menu-document-v2.test.ts; the
// route is a thin delegate, so these assert the verbatim round-trip through the
// menus.settings envelope (without dropping co-present appearance/extras) and the
// path-tagged ApiError-400 mapping for the two new key families actually reach the wire.

const routeBrandLevelMenuDocument = () => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "sec-route-menu-bar",
      type: "menu-bar" as const,
      name: "Menu bar",
      layout: { surfaceColor: "#0f172a" },
      // Per-device LEVEL overrides on the SECTION responsive (navProps.levelStyles),
      // resolved vs DESKTOP (Pages cascade; mobile ≠ tablet) — each a sparse record.
      responsive: {
        tablet: { navProps: { levelStyles: { 1: { fontSize: 18 } } } },
        mobile: { navProps: { levelStyles: { 1: { fontSize: 12 } } } },
      },
      blocks: [
        {
          id: "blk-route-brand",
          type: "brand" as const,
          // brand.props.style (text-mode) + per-device BRAND style overrides on the
          // BLOCK responsive (responsive[bp].style) — the conscious BRAND_PROP_KEYS +
          // normalizeMenuBlockResponsive "style" widenings must round-trip verbatim.
          props: {
            mode: "text" as const,
            href: "/",
            text: "Acme",
            style: { fontSize: 22, color: "#111111" },
          },
          responsive: {
            tablet: { style: { fontSize: 18 } },
            mobile: { style: { fontSize: 14 } },
          },
        },
        {
          id: "blk-route-nav",
          type: "nav-items" as const,
          // navProps.levelStyles (split off the flat NAV_ITEMS_PROP_KEYS subset) with
          // level-1 link + CONTAINER chrome and a sparse level-2.
          props: {
            itemGap: 12,
            linkColor: "#111111",
            levelStyles: {
              1: {
                linkColor: "#111111",
                fontSize: 14,
                background: "#ffffff",
                borderWidth: 2,
                radius: 8,
                minWidth: 200,
                shadow: "md" as const,
              },
              2: { linkColor: "#222222" },
            },
          },
        },
      ],
    },
  ],
});

testIfDb(
  "PATCH /menus/:id round-trips brand.props.style + navProps.levelStyles + responsive.{tablet,mobile} brand/level overrides WITHOUT dropping appearance/extras",
  async () => {
    const menu = await createMenu({
      name: `Route Brand Level ${randomUUID()}`,
      location: `route-brand-level-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const patch = getPatchHandler();
    const extras = [createPageBlockV2("button", { id: "blk-route-extra" })];
    // Seed sibling envelope keys first, then PATCH the document ALONE.
    await patch({
      params: { id: menu.id },
      query: {},
      body: { appearance: { surfaceColor: "#0f172a" }, extras },
    });

    const document = routeBrandLevelMenuDocument();
    await patch({ params: { id: menu.id }, query: {}, body: { document } });

    // Round-trip through GET: brand style + levelStyles + both per-device records
    // ride verbatim (sparse, nothing injected) and the sibling keys survive untouched.
    const get = getGetHandler();
    const fetched = (await get({ params: { id: menu.id }, query: {}, body: undefined })) as {
      menu: typeof menus.$inferSelect;
    };
    expect(fetched.menu.settings).toEqual({
      appearance: { surfaceColor: "#0f172a" },
      extras,
      document,
    });
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id maps an invalid brand-style key to a 400 menu_document_invalid ApiError with the brand style path; store untouched",
  async () => {
    const menu = await createMenu({
      name: `Route Brand Style Invalid ${randomUUID()}`,
      location: `route-brand-style-invalid-${randomUUID()}`,
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
            sections: [
              {
                id: "sec-route-menu-bar",
                type: "menu-bar",
                name: "Menu bar",
                layout: {},
                // brand at blocks[0]; an unknown key INSIDE props.style rejects one
                // level deeper than the block props (reject-unknown at the style key).
                blocks: [
                  {
                    id: "blk-route-brand",
                    type: "brand",
                    props: { mode: "text", href: "/", style: { bogus: 1 } },
                  },
                ],
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
      expect(apiError.details).toEqual({
        path: "document.sections[0].blocks[0].props.style.bogus",
      });
    }

    // Store untouched: the pre-PATCH menu still carries no document.
    const get = getGetHandler();
    const fetched = (await get({ params: { id: menu.id }, query: {}, body: undefined })) as {
      menu: typeof menus.$inferSelect;
    };
    expect(fetched.menu.settings ?? {}).toEqual({});
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id maps an invalid level key (navProps.levelStyles.3) to a 400 menu_document_invalid ApiError with the level path; store untouched",
  async () => {
    const menu = await createMenu({
      name: `Route Level Invalid ${randomUUID()}`,
      location: `route-level-invalid-${randomUUID()}`,
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
            sections: [
              {
                id: "sec-route-menu-bar",
                type: "menu-bar",
                name: "Menu bar",
                layout: {},
                // nav at blocks[0]; level "3" is not a member of the {1,2} cap —
                // reject-unknown OUTER level key fires with the levelStyles path.
                blocks: [
                  {
                    id: "blk-route-nav",
                    type: "nav-items",
                    props: { levelStyles: { 3: { linkColor: "#111111" } } },
                  },
                ],
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
      expect(apiError.details).toEqual({
        path: "document.sections[0].blocks[0].props.levelStyles.3",
      });
    }

    const get = getGetHandler();
    const fetched = (await get({ params: { id: menu.id }, query: {}, body: undefined })) as {
      menu: typeof menus.$inferSelect;
    };
    expect(fetched.menu.settings ?? {}).toEqual({});
  },
  dbTestTimeoutMs
);

// --- TASK-506-05 §2.1: modern per-level (levelStyles B1–B5) + level-0 navChrome
// sub-record + per-device (responsive.mobile.navProps) deltas proven at the route
// boundary. Model-layer accept/reject/prune for every new key lives in
// menu-document-v2.test.ts; the route is a thin delegate, so these assert the
// verbatim round-trip through the menus.settings envelope (sibling appearance/extras
// + flat nav scalars never dropped) and that reject-unknown for the two NEW key
// families (levelStyles.<n>.<modern> + navChrome.<key>) reaches the wire as a
// path-tagged 400 menu_document_invalid with the store left untouched.

const routeModernMenuDocument = () => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "sec-route-menu-bar",
      type: "menu-bar" as const,
      name: "Menu bar",
      layout: { surfaceColor: "#0f172a" },
      // Per-device delta on the SECTION responsive carrying BOTH new sub-records
      // (navChrome + levelStyles modern key), resolved vs DESKTOP.
      responsive: {
        mobile: {
          navProps: {
            navChrome: { navPillRadius: 12 },
            levelStyles: { 1: { itemDividerShow: true } },
          },
        },
      },
      blocks: [
        {
          id: "blk-route-nav",
          type: "nav-items" as const,
          props: {
            // Flat scalar sibling that must survive alongside the sub-records.
            itemGap: 12,
            // Modern per-level keys (B1 divider, B2 indicator, B3 caret, B5 placement).
            levelStyles: {
              1: {
                fontSize: 14,
                itemDividerShow: true,
                itemDividerColor: "#abcdef",
                indicator: "underline" as const,
                showCaret: true,
              },
              2: { submenuPlacement: "bottom" as const },
            },
            // Level-0 navChrome sub-record (B4 pill + B2 indicator).
            navChrome: {
              navPillBackground: "#eeeeee",
              navPillRadius: 24,
              indicator: "overline" as const,
            },
          },
        },
      ],
    },
  ],
});

testIfDb(
  "PATCH /menus/:id round-trips modern per-level + navChrome + per-device deltas WITHOUT dropping siblings",
  async () => {
    const menu = await createMenu({
      name: `Route Modern ${randomUUID()}`,
      location: `route-modern-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const patch = getPatchHandler();
    const extras = [createPageBlockV2("button", { id: "blk-route-extra" })];
    // Seed sibling envelope keys first, then PATCH the document ALONE.
    await patch({
      params: { id: menu.id },
      query: {},
      body: { appearance: { surfaceColor: "#0f172a" }, extras },
    });

    const document = routeModernMenuDocument();
    await patch({ params: { id: menu.id }, query: {}, body: { document } });

    // Round-trip through GET: levelStyles modern keys + navChrome + the per-device
    // delta ride verbatim (sparse, nothing injected); sibling envelope keys survive.
    const get = getGetHandler();
    const fetched = (await get({ params: { id: menu.id }, query: {}, body: undefined })) as {
      menu: typeof menus.$inferSelect;
    };
    expect(fetched.menu.settings).toEqual({
      appearance: { surfaceColor: "#0f172a" },
      extras,
      document,
    });
  },
  dbTestTimeoutMs
);

// --- TASK-508-05 §2.1: linkAlign (per-level + per-device) + navChrome
// submenuDirection/submenuMode round-trip verbatim through the wire, per-key,
// without dropping co-present appearance/extras or the 506 sibling sub-records.
const routeNestingFormsDocument = () => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "sec-route-menu-bar",
      type: "menu-bar" as const,
      name: "Menu bar",
      layout: {},
      // Per-device linkAlign deltas (per-device cascade; mobile ≠ tablet).
      responsive: {
        tablet: { navProps: { levelStyles: { 1: { linkAlign: "right" as const } } } },
        mobile: { navProps: { levelStyles: { 1: { linkAlign: "left" as const } } } },
      },
      blocks: [
        {
          id: "blk-route-nav",
          type: "nav-items" as const,
          props: {
            itemGap: 12,
            // R1(b) per-level link alignment on BOTH dropdown levels.
            levelStyles: {
              1: { linkAlign: "center" as const, fontSize: 14 },
              2: { linkAlign: "right" as const },
            },
            // R3a/R3b nav-global base-only direction + mode.
            navChrome: {
              submenuDirection: "down" as const,
              submenuMode: "accordion" as const,
            },
          },
        },
      ],
    },
  ],
});

testIfDb(
  "PATCH /menus/:id round-trips linkAlign + navChrome.submenuDirection + submenuMode + per-device linkAlign deltas WITHOUT dropping appearance/extras (per-key merge)",
  async () => {
    const menu = await createMenu({
      name: `Route Nesting Forms ${randomUUID()}`,
      location: `route-nesting-forms-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const patch = getPatchHandler();
    const extras = [createPageBlockV2("button", { id: "blk-route-extra" })];
    await patch({
      params: { id: menu.id },
      query: {},
      body: { appearance: { surfaceColor: "#0f172a" }, extras },
    });

    const document = routeNestingFormsDocument();
    await patch({ params: { id: menu.id }, query: {}, body: { document } });

    const get = getGetHandler();
    const fetched = (await get({ params: { id: menu.id }, query: {}, body: undefined })) as {
      menu: typeof menus.$inferSelect;
    };
    expect(fetched.menu.settings).toEqual({
      appearance: { surfaceColor: "#0f172a" },
      extras,
      document,
    });
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id maps an invalid per-level modern key to a 400 menu_document_invalid ApiError with the levelStyles path; store untouched",
  async () => {
    const menu = await createMenu({
      name: `Route Level Modern Invalid ${randomUUID()}`,
      location: `route-level-modern-invalid-${randomUUID()}`,
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
            sections: [
              {
                id: "sec-route-menu-bar",
                type: "menu-bar",
                name: "Menu bar",
                layout: {},
                // Unknown key INSIDE levelStyles.1 rejects one level deeper than the
                // outer level key (reject-unknown at the modern-key position).
                blocks: [
                  {
                    id: "blk-route-nav",
                    type: "nav-items",
                    props: { levelStyles: { 1: { bogus: 1 } } },
                  },
                ],
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
      expect(apiError.details).toEqual({
        path: "document.sections[0].blocks[0].props.levelStyles.1.bogus",
      });
    }

    // Store untouched: the pre-PATCH menu still carries no document.
    const get = getGetHandler();
    const fetched = (await get({ params: { id: menu.id }, query: {}, body: undefined })) as {
      menu: typeof menus.$inferSelect;
    };
    expect(fetched.menu.settings ?? {}).toEqual({});
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id maps an invalid navChrome key to a 400 menu_document_invalid ApiError with the navChrome path; store untouched",
  async () => {
    const menu = await createMenu({
      name: `Route NavChrome Invalid ${randomUUID()}`,
      location: `route-navchrome-invalid-${randomUUID()}`,
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
            sections: [
              {
                id: "sec-route-menu-bar",
                type: "menu-bar",
                name: "Menu bar",
                layout: {},
                // Unknown key INSIDE the navChrome sub-record — its OWN allowlist
                // fires with the navChrome path (distinct family from levelStyles).
                blocks: [
                  {
                    id: "blk-route-nav",
                    type: "nav-items",
                    props: { navChrome: { bogus: 1 } },
                  },
                ],
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
      expect(apiError.details).toEqual({
        path: "document.sections[0].blocks[0].props.navChrome.bogus",
      });
    }

    const get = getGetHandler();
    const fetched = (await get({ params: { id: menu.id }, query: {}, body: undefined })) as {
      menu: typeof menus.$inferSelect;
    };
    expect(fetched.menu.settings ?? {}).toEqual({});
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

// --- TASK-520-05 §route lane: menu-bar scrolled-state colors + card radius +
// custom box-shadow (520-01/02) AND brand icon-mode + graphic-with-text combo
// (520-01/04) proven at the route/persistence boundary. Service-layer accept/
// reject/prune coverage lives in menu-document-v2.test.ts; the route is a thin
// delegate, so these assert the canonical round-trip through the menus.settings
// envelope (co-present appearance survives), the reject-unknown-KEY 400 mapping,
// and — critically — the SECURITY negatives (injection shadow / url() color /
// path-traversal icon) fail-soft DROP on write so the stored doc round-trips
// WITHOUT them (defence in depth reaches the wire).

const routeBarBrandV520Document = () => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "sec-route-menu-bar",
      type: "menu-bar" as const,
      name: "Menu bar",
      // G1 scrolled variants + G2 radius/custom-shadow (all present-only bar keys):
      layout: {
        surfaceColor: "#0812209e",
        borderColor: "#ffffff1f",
        sticky: true,
        radius: 18,
        shadow: "sm" as const,
        shadowCustom: "0 18px 50px rgba(0,0,0,.24)",
        surfaceColorScrolled: "rgba(8,17,31,.84)",
        borderColorScrolled: "rgba(255,255,255,.18)",
        borderWidthScrolled: 2,
        shadowScrolled: "md" as const,
        shadowCustomScrolled: "0 18px 50px rgba(0,0,0,.24)",
      },
      responsive: {
        mobile: { layout: { radius: 8 } },
      },
      blocks: [
        {
          id: "blk-route-brand",
          type: "brand" as const,
          // G3 icon-mode + graphic-with-text combo + icon color/size:
          props: {
            mode: "icon" as const,
            href: "/",
            text: "Acme Co",
            icon: "house",
            showText: true,
            style: { iconColor: "rgba(8,17,31,.84)", iconSize: 28 },
          },
        },
        { id: "blk-route-nav", type: "nav-items" as const, props: { itemGap: 12 } },
      ],
    },
  ],
});

testIfDb(
  "PATCH /menus/:id persists canonical bar and brand colors without dropping a co-present appearance",
  async () => {
    const menu = await createMenu({
      name: `Route Bar Brand V520 ${randomUUID()}`,
      location: `route-bar-brand-v520-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const patch = getPatchHandler();
    const document = routeBarBrandV520Document();
    const expectedDocument = {
      ...document,
      sections: [
        {
          ...document.sections[0]!,
          layout: {
            ...document.sections[0]!.layout,
            shadowCustom: "0 18px 50px rgba(0, 0, 0, 0.24)",
            surfaceColorScrolled: "rgba(8, 17, 31, 0.84)",
            borderColorScrolled: "rgba(255, 255, 255, 0.18)",
            shadowCustomScrolled: "0 18px 50px rgba(0, 0, 0, 0.24)",
          },
          blocks: document.sections[0]!.blocks.map((block, index) =>
            index === 0
              ? {
                  ...block,
                  props: {
                    ...block.props,
                    style: { iconColor: "rgba(8, 17, 31, 0.84)", iconSize: 28 },
                  },
                }
              : block
          ),
        },
      ],
    };
    const updated = (await patch({
      params: { id: menu.id },
      query: {},
      body: { appearance: { surfaceColor: "#0f172a" }, document },
    })) as typeof menus.$inferSelect;

    // Per-key merge: canonical color bytes ride the envelope and the sibling
    // appearance remains untouched.
    expect(updated.settings).toEqual({
      appearance: { surfaceColor: "#0f172a" },
      document: expectedDocument,
    });

    // Round-trip through GET: persistence keeps the canonical document bytes.
    const get = getGetHandler();
    const fetched = (await get({ params: { id: menu.id }, query: {}, body: undefined })) as {
      menu: typeof menus.$inferSelect;
    };
    expect(fetched.menu.settings).toEqual({
      appearance: { surfaceColor: "#0f172a" },
      document: expectedDocument,
    });
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id maps an unknown menu-bar layout key to a 400 menu_document_invalid ApiError with a path",
  async () => {
    const menu = await createMenu({
      name: `Route Bar Unknown Key ${randomUUID()}`,
      location: `route-bar-unknown-key-${randomUUID()}`,
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
            sections: [
              {
                id: "sec-route-menu-bar",
                type: "menu-bar",
                name: "Menu bar",
                // an unknown bar-layout key is in NEITHER MENU_BAR_LAYOUT_KEYS nor
                // MENU_BAR_EXTRA_KEYS — reject-unknown throws (fail-closed).
                layout: { surfaceColorScrolledXYZ: "#000" },
                blocks: [{ id: "blk-route-nav", type: "nav-items", props: {} }],
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
      expect(apiError.details).toEqual({
        path: "document.sections[0].layout.surfaceColorScrolledXYZ",
      });
    }
  },
  dbTestTimeoutMs
);

testIfDb(
  "PATCH /menus/:id fail-soft DROPS security-negative bar/brand values (injection shadow, url() color, path-traversal icon) — stored doc round-trips WITHOUT them",
  async () => {
    const menu = await createMenu({
      name: `Route V520 Security ${randomUUID()}`,
      location: `route-v520-security-${randomUUID()}`,
    });
    createdMenuIds.push(menu.id);

    const patch = getPatchHandler();
    const updated = (await patch({
      params: { id: menu.id },
      query: {},
      body: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "sec-route-menu-bar",
              type: "menu-bar",
              name: "Menu bar",
              layout: {
                surfaceColor: "#0f172a",
                // (2) injection box-shadow — the `;}` / stylesheet-escape must drop.
                shadowCustom: "0 0 10px red;} body{display:none",
                // (1) url() color — not a whitelisted color token, drops.
                surfaceColorScrolled: "url(x)",
                // a CLEAN scrolled color survives alongside the dropped ones.
                borderColorScrolled: "rgba(255,255,255,.18)",
              },
              blocks: [
                {
                  id: "blk-route-brand",
                  type: "brand",
                  props: {
                    mode: "icon",
                    href: "/",
                    text: "Acme Co",
                    // (3) path-traversal icon name — fails the allowlist pattern, drops
                    // (mode:"icon" falls through to the text/site-name chain at render).
                    icon: "../../etc/passwd",
                  },
                },
                { id: "blk-route-nav", type: "nav-items", props: {} },
              ],
            },
          ],
        },
      },
    })) as typeof menus.$inferSelect;

    const settings = updated.settings as {
      document: {
        sections: Array<{
          layout: Record<string, unknown>;
          blocks: Array<{ props?: Record<string, unknown> }>;
        }>;
      };
    };
    const storedLayout = settings.document.sections[0]!.layout;
    // The three attacker-influenceable values were dropped on write…
    expect(storedLayout).not.toHaveProperty("shadowCustom");
    expect(storedLayout).not.toHaveProperty("surfaceColorScrolled");
    const brandProps = settings.document.sections[0]!.blocks[0]!.props ?? {};
    expect(brandProps).not.toHaveProperty("icon");
    // …while the clean sibling values persisted (fail-soft is per-key, not all-or-nothing).
    expect(storedLayout.surfaceColor).toBe("#0f172a");
    expect(storedLayout.borderColorScrolled).toBe("rgba(255, 255, 255, 0.18)");
    expect(brandProps.mode).toBe("icon");
  },
  dbTestTimeoutMs
);
