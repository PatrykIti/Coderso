import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  customScreenEntryPresentationOverrides,
  customScreens,
  users,
} from "../../../core/db/schema";
import {
  mapCustomScreenError,
  registerCustomScreenRoutes,
} from "../../../core/server/routes/customScreenRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";
import { createEntry } from "../../../core/services/content/entryService";
import { createContentType, deleteContentType } from "../../../core/services/content/typeService";
import {
  createCustomScreen,
  getCustomScreen,
} from "../../../core/services/customScreens/customScreenService";
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenSchemas";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
      patch: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
      delete: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Missing route ${method} ${path}`);
  return route;
};

const runRoute = async (route: Route, ctx: Partial<RouteContext>) => {
  let result: unknown;
  for (const handler of route.handlers) {
    const output = await handler({
      params: {},
      query: {},
      body: undefined,
      ...ctx,
    });
    if (output !== undefined) result = output;
  }
  return result;
};

test("registerCustomScreenRoutes wires custom screen endpoints", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerCustomScreenRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /custom-screens",
      "GET /custom-screens/:id",
      "POST /custom-screens",
      "PATCH /custom-screens/:id",
      "DELETE /custom-screens/:id",
      "GET /custom-screens/:screenId/entries/:entryId/overrides",
      "PATCH /custom-screens/:screenId/entries/:entryId/overrides",
    ])
  );
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:read",
    "content:write",
    "content:write",
    "content:read",
    "content:write",
    "content:write",
  ]);
});

test("mapCustomScreenError maps domain errors to API errors", () => {
  expect(mapCustomScreenError(new Error("custom_screen_not_found"))?.status).toBe(404);
  expect(mapCustomScreenError(new Error("custom_screen_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_status_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_definition_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_legacy_write_unsupported"))?.status).toBe(
    400
  );
  expect(mapCustomScreenError(new Error("custom_screen_override_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_override_not_found"))?.status).toBe(404);
  expect(mapCustomScreenError(new Error("custom_screen_override_conflict"))?.status).toBe(409);
  expect(mapCustomScreenError(new Error("other_error"))).toBeNull();
});

// TASK-503 — DB-backed persistence of the block style channel via the existing
// PATCH /custom-screens/:id path (no new route). Skips when no DATABASE_URL.
const canConnect = async () => {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
};
const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const trackedScreenIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();
const trackedEntryIds = new Set<string>();
const trackedUserIds = new Set<string>();
const trackedOverrideScopes = new Map<string, { screenId: string; entryId: string }>();

afterEach(async () => {
  if (!hasDb) return;
  for (const { screenId, entryId } of trackedOverrideScopes.values()) {
    await db
      .delete(customScreenEntryPresentationOverrides)
      .where(
        and(
          eq(customScreenEntryPresentationOverrides.screenId, screenId),
          eq(customScreenEntryPresentationOverrides.entryId, entryId)
        )
      );
  }
  const screenIds = [...trackedScreenIds];
  const entryIds = [...trackedEntryIds];
  const contentTypeIds = [...trackedContentTypeIds];
  const userIds = [...trackedUserIds];
  if (screenIds.length > 0) {
    await db.delete(customScreens).where(inArray(customScreens.id, screenIds));
  }
  if (entryIds.length > 0) {
    await db.delete(contentEntries).where(inArray(contentEntries.id, entryIds));
  }
  for (const contentTypeId of contentTypeIds) {
    await deleteContentType(contentTypeId).catch(() => undefined);
    await db
      .delete(contentTypes)
      .where(inArray(contentTypes.id, [contentTypeId]))
      .catch(() => undefined);
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
  trackedOverrideScopes.clear();
  trackedScreenIds.clear();
  trackedEntryIds.clear();
  trackedContentTypeIds.clear();
  trackedUserIds.clear();
});

const seedBoundScreen = async () => {
  const contentType = await createContentType({
    name: `Style Screen ${randomUUID()}`,
    slug: `style-screen-${randomUUID()}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string", xFieldType: "text" },
      },
    },
  });
  trackedContentTypeIds.add(contentType.id);

  const screen = await createCustomScreen({
    name: `Style Screen ${randomUUID()}`,
    contentTypeId: contentType.id,
    definition: buildDefinition(),
  });
  trackedScreenIds.add(screen.id);
  return screen;
};

const buildDefinition = (style?: Record<string, unknown>): CustomScreenDefinition =>
  ({
    schemaVersion: 4,
    listView: {
      columns: [
        {
          id: "system-title",
          source: "system",
          field: "title",
          label: "Record",
          formatter: "text",
          visible: true,
        },
      ],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: "section-1",
            type: "section",
            label: "Details",
            data: { title: "Details" },
            blocks: [
              {
                id: "field-1",
                type: "field",
                data: { label: "Name", value: "" },
                ...(style ? { style } : {}),
              },
            ],
          },
        ],
      },
      bindings: [
        {
          id: "field-1-value",
          blockId: "field-1",
          propPath: "value",
          source: "entry",
          field: "name",
          mode: "readwrite",
        },
      ],
      saveMode: "entry",
      interactionMode: "inline",
    },
  }) as CustomScreenDefinition;

const patchScreen = async (screenId: string, body: unknown) => {
  const { router, routes } = makeRouter();
  registerCustomScreenRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const route = findRoute(routes, "PATCH", "/custom-screens/:id");
  return runRoute(route, {
    params: { id: screenId },
    body,
    user: { id: "44444444-4444-4444-8444-444444444444" },
  });
};

const patchScreenDefinition = async (screenId: string, definition: CustomScreenDefinition) =>
  patchScreen(screenId, { definition });

const postScreen = async (body: unknown) => {
  const { router, routes } = makeRouter();
  registerCustomScreenRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  return runRoute(findRoute(routes, "POST", "/custom-screens"), {
    body,
    user: { id: "44444444-4444-4444-8444-444444444444" },
  });
};

const buildDirectImageDefinition = (): CustomScreenDefinition => {
  const base = buildDefinition();
  return {
    ...base,
    editorView: {
      ...base.editorView,
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: "direct-image-section",
            type: "section",
            label: "Media",
            data: { title: "Media" },
            blocks: [
              {
                id: "direct-image",
                type: "image",
                data: { label: "Cover", src: "/static/direct-image-cover.jpg" },
              },
            ],
          },
        ],
      },
      bindings: [],
    },
  } as CustomScreenDefinition;
};

const seedDirectImageOverrideScope = async () => {
  const actorId = randomUUID();
  const [actor] = await db
    .insert(users)
    .values({
      id: actorId,
      email: `task-540-l03-${randomUUID()}@example.test`,
      passwordHash: "task-540-l03-test-password-hash",
      name: "TASK-540 L03 route actor",
    })
    .returning({ id: users.id });
  if (!actor) throw new Error("custom screen override actor fixture was not created");
  trackedUserIds.add(actor.id);

  const contentType = await createContentType({
    name: `Direct Image Screen ${randomUUID()}`,
    slug: `direct-image-screen-${randomUUID()}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string", xFieldType: "text" },
      },
    },
  });
  trackedContentTypeIds.add(contentType.id);

  const screen = await createCustomScreen({
    name: `Direct Image Screen ${randomUUID()}`,
    contentTypeId: contentType.id,
    definition: buildDirectImageDefinition(),
  });
  trackedScreenIds.add(screen.id);

  const entry = await createEntry(contentType.id, {
    title: `Direct Image Entry ${randomUUID()}`,
    slug: `direct-image-entry-${randomUUID()}`,
    data: { name: "Direct image entry" },
    authorId: actor.id,
  });
  trackedEntryIds.add(entry.id);
  trackedOverrideScopes.set(`${screen.id}:${entry.id}`, {
    screenId: screen.id,
    entryId: entry.id,
  });

  return { actorId: actor.id, screenId: screen.id, entryId: entry.id };
};

const makeRegisteredOverrideRoutes = () => {
  const { router, routes } = makeRouter();
  registerCustomScreenRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  return {
    get: findRoute(routes, "GET", "/custom-screens/:screenId/entries/:entryId/overrides"),
    patch: findRoute(routes, "PATCH", "/custom-screens/:screenId/entries/:entryId/overrides"),
  };
};

testIfDb(
  "TASK-540-04-L03 direct-image override PATCH then GET round-trips through registered routes",
  async () => {
    const scope = await seedDirectImageOverrideScope();
    const routes = makeRegisteredOverrideRoutes();
    const mediaAssetId = randomUUID();
    const body = {
      overrides: [
        {
          blockId: "direct-image",
          propPath: "mediaAssetId",
          value: mediaAssetId,
        },
      ],
    };

    const patched = (await runRoute(routes.patch, {
      params: { screenId: scope.screenId, entryId: scope.entryId },
      body,
      user: { id: scope.actorId },
    })) as {
      overrides: Array<{
        screenId: string;
        entryId: string;
        blockId: string;
        propPath: string;
        value: unknown;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
    };

    expect(patched.overrides).toHaveLength(1);
    expect(patched.overrides[0]).toMatchObject({
      screenId: scope.screenId,
      entryId: scope.entryId,
      blockId: "direct-image",
      propPath: "mediaAssetId",
      value: mediaAssetId,
      updatedBy: scope.actorId,
    });
    expect(patched.overrides[0]?.createdAt).toBeInstanceOf(Date);
    expect(patched.overrides[0]?.updatedAt).toBeInstanceOf(Date);

    const reread = await runRoute(routes.get, {
      params: { screenId: scope.screenId, entryId: scope.entryId },
    });
    expect(reread).toEqual(patched);
  }
);

testIfDb(
  "TASK-540-04-L03 direct-image override route maps an inactive target without persistence",
  async () => {
    const scope = await seedDirectImageOverrideScope();
    const routes = makeRegisteredOverrideRoutes();
    const submittedBlockId = "submitted-inactive-image-target";

    try {
      await runRoute(routes.patch, {
        params: { screenId: scope.screenId, entryId: scope.entryId },
        body: {
          overrides: [
            {
              blockId: submittedBlockId,
              propPath: "mediaAssetId",
              value: randomUUID(),
            },
          ],
        },
        user: { id: scope.actorId },
      });
      throw new Error("expected inactive direct-image target rejection");
    } catch (error) {
      expect(error).toMatchObject({
        code: "custom_screen_override_invalid",
        message: "Custom screen presentation override payload is invalid",
        status: 400,
      });
      expect(JSON.stringify(error)).not.toContain(submittedBlockId);
    }

    await expect(
      runRoute(routes.get, {
        params: { screenId: scope.screenId, entryId: scope.entryId },
      })
    ).resolves.toEqual({ overrides: [] });
  }
);

testIfDb(
  "PATCH /custom-screens/:id persists a definition carrying a valid block style and round-trips byte-stable",
  async () => {
    const screen = await seedBoundScreen();
    const style = {
      width: "half",
      minHeight: 120,
      margin: { top: 24, left: 8 },
      padding: { top: 16 },
      align: "center",
    };

    const updated = (await patchScreenDefinition(screen.id, buildDefinition(style))) as Awaited<
      ReturnType<typeof getCustomScreen>
    >;

    const updatedBlock = updated?.definition.editorView.document.sections[0]?.blocks[0];
    expect(updatedBlock?.style).toEqual(style);

    // Independent read round-trips the same style verbatim (write → read identity).
    const reread = await getCustomScreen(screen.id);
    const rereadBlock = reread?.definition.editorView.document.sections[0]?.blocks[0];
    expect(rereadBlock?.style).toEqual(style);
  }
);

testIfDb(
  "PATCH /custom-screens/:id with an unknown block style key rejects 400 at the route edge",
  async () => {
    const screen = await seedBoundScreen();
    // 503-01's Ajv mirror (screenBlockStyleV1Schema, additionalProperties:false)
    // rejects an unknown style key at the route validate() layer BEFORE the service
    // normalizer runs, so the machine-readable rejection is validation_error/400
    // (the service-layer custom_screen_definition_invalid path is pinned in the
    // customScreenService mocked-db suite). Either way the store is never mutated.
    await expect(
      patchScreenDefinition(screen.id, buildDefinition({ width: "half", bogus: 1 }))
    ).rejects.toMatchObject({ status: 400 });

    // The stored definition is untouched — no style leaked through.
    const reread = await getCustomScreen(screen.id);
    const rereadBlock = reread?.definition.editorView.document.sections[0]?.blocks[0];
    expect(rereadBlock?.style).toBeUndefined();
  }
);

// TASK-505-01 Item A — section-style channel over the real PATCH write path.
const buildSectionStyleDefinition = (style?: Record<string, unknown>): CustomScreenDefinition => {
  const base = buildDefinition();
  const section = base.editorView.document.sections[0];
  return {
    ...base,
    editorView: {
      ...base.editorView,
      document: {
        ...base.editorView.document,
        sections: [{ ...section, ...(style ? { style } : {}) }],
      },
    },
  } as CustomScreenDefinition;
};

testIfDb(
  "TASK-505-01 PATCH /custom-screens/:id persists a valid section style and round-trips byte-stable",
  async () => {
    const screen = await seedBoundScreen();
    const style = { columns: "3-1", columnGap: 24 };

    const updated = (await patchScreenDefinition(
      screen.id,
      buildSectionStyleDefinition(style)
    )) as Awaited<ReturnType<typeof getCustomScreen>>;
    expect(updated?.definition.editorView.document.sections[0]?.style).toEqual(style);

    const reread = await getCustomScreen(screen.id);
    expect(reread?.definition.editorView.document.sections[0]?.style).toEqual(style);
  }
);

testIfDb(
  "TASK-505-01 PATCH /custom-screens/:id with an unknown section-style key rejects 400 (store untouched)",
  async () => {
    const screen = await seedBoundScreen();
    await expect(
      patchScreenDefinition(screen.id, buildSectionStyleDefinition({ columns: "2", rows: 3 }))
    ).rejects.toMatchObject({ status: 400 });

    const reread = await getCustomScreen(screen.id);
    expect(reread?.definition.editorView.document.sections[0]?.style).toBeUndefined();
  }
);

// TASK-505-01 Item B — binding-GC recovery: a binding to a field absent from the content
// type is PRUNED to a saveable 200 with the field name surfaced as a transient warning.
const buildOrphanBindingDefinition = (): CustomScreenDefinition => {
  const base = buildDefinition();
  return {
    ...base,
    editorView: {
      ...base.editorView,
      bindings: [
        ...base.editorView.bindings,
        {
          id: "field-1-orphan",
          blockId: "field-1",
          propPath: "sub",
          source: "entry",
          field: "bathrooms", // NOT in the content-type schema → orphan
          mode: "readwrite",
        },
      ],
    },
  } as CustomScreenDefinition;
};

testIfDb(
  "TASK-505-01 PATCH /custom-screens/:id prunes a field-orphan binding to a saveable 200 + surfaces the field name",
  async () => {
    const screen = await seedBoundScreen();

    const updated = (await patchScreenDefinition(
      screen.id,
      buildOrphanBindingDefinition()
    )) as Awaited<ReturnType<typeof getCustomScreen>> & {
      warnings?: { code: string; fields: string[] }[];
    };

    // Recoverable: saved (no 400); orphan pruned from the stored bytes; valid binding kept.
    const storedFields = updated?.definition.editorView.bindings.map((b) => b.field);
    expect(storedFields).toEqual(["name"]);
    expect(updated?.warnings).toEqual([{ code: "binding_field_removed", fields: ["bathrooms"] }]);

    // Independent read confirms the orphan is gone from the persisted definition.
    const reread = await getCustomScreen(screen.id);
    expect(reread?.definition.editorView.bindings.map((b) => b.field)).toEqual(["name"]);
  }
);

// TASK-505-01 Item B — the SECOND binding dead-end: a listView.rowTemplate carrying BOTH a
// block-orphan (blockId matching no live block in the row-template document) AND a since-deleted
// field-orphan must SAVE (pruned inline in normalizeCustomScreenListRowTemplate) rather than
// hard-400, with both removed field names surfaced on the transient warnings carry.
const buildListRowOrphanDefinition = (): CustomScreenDefinition => {
  const base = buildDefinition();
  return {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "row-section-1",
              type: "section",
              label: "Row",
              data: { title: "Row" },
              blocks: [
                {
                  id: "row-block-1",
                  type: "field",
                  data: { label: "Name", value: "" },
                },
              ],
            },
          ],
        },
        bindings: [
          // block-orphan: no "ghost" block in the row-template document → pruned (field "name")
          {
            id: "row-ghost",
            blockId: "ghost",
            propPath: "value",
            source: "entry",
            field: "name",
            mode: "readwrite",
          },
          // field-orphan: "bathrooms" absent from the content-type schema → pruned
          {
            id: "row-orphan-field",
            blockId: "row-block-1",
            propPath: "value",
            source: "entry",
            field: "bathrooms",
            mode: "readwrite",
          },
        ],
      },
    },
  } as CustomScreenDefinition;
};

testIfDb(
  "TASK-505-01 PATCH /custom-screens/:id prunes list-row block- AND field-orphans to a saveable 200 + surfaces the field names",
  async () => {
    const screen = await seedBoundScreen();

    const updated = (await patchScreenDefinition(
      screen.id,
      buildListRowOrphanDefinition()
    )) as Awaited<ReturnType<typeof getCustomScreen>> & {
      warnings?: { code: string; fields: string[] }[];
    };

    // The list-row template SAVED (no residual hard-400 dead-end) with BOTH orphans pruned.
    expect(updated?.definition.listView.rowTemplate?.bindings ?? []).toEqual([]);
    expect(updated?.warnings).toEqual([
      { code: "binding_field_removed", fields: ["bathrooms"] },
      { code: "binding_block_removed", fields: ["name"] },
    ]);

    // Independent read confirms the pruned row-template persisted.
    const reread = await getCustomScreen(screen.id);
    expect(reread?.definition.listView.rowTemplate?.bindings ?? []).toEqual([]);
  }
);

testIfDb(
  "TASK-505-01 PATCH /custom-screens/:id still 400s a genuinely-malformed binding (recovery is orphan-scoped only)",
  async () => {
    const screen = await seedBoundScreen();
    const malformed = buildDefinition();
    (malformed.editorView.bindings as Array<Record<string, unknown>>).push({
      id: "malformed",
      blockId: "field-1",
      propPath: "value",
      source: "remote", // not "entry" → structurally invalid, never pruned to a warning
      field: "name",
      mode: "readwrite",
    });

    await expect(patchScreenDefinition(screen.id, malformed)).rejects.toMatchObject({
      status: 400,
    });

    // The store is untouched — only the seeded valid binding survives.
    const reread = await getCustomScreen(screen.id);
    expect(reread?.definition.editorView.bindings.map((b) => b.field)).toEqual(["name"]);
  }
);

testIfDb(
  "TASK-505-01 stored-V4 no-style + orphan-free definition round-trips byte-stable (no style key, no warnings)",
  async () => {
    const screen = await seedBoundScreen();

    const updated = (await patchScreenDefinition(screen.id, buildDefinition())) as Awaited<
      ReturnType<typeof getCustomScreen>
    > & { warnings?: unknown };

    // Absent section.style stays absent (no grid channel injected) and no GC warnings fire.
    expect("style" in (updated?.definition.editorView.document.sections[0] ?? {})).toBe(false);
    expect(updated?.warnings).toBeUndefined();
    expect(updated?.definition.editorView.bindings.map((b) => b.field)).toEqual(["name"]);

    const reread = await getCustomScreen(screen.id);
    expect("style" in (reread?.definition.editorView.document.sections[0] ?? {})).toBe(false);
    expect(reread?.definition.editorView.bindings.map((b) => b.field)).toEqual(["name"]);
  }
);

const definitionWithEditorBlocks = (blocks: unknown[]): CustomScreenDefinition => {
  const base = buildDefinition();
  return {
    ...base,
    editorView: {
      ...base.editorView,
      document: {
        schemaVersion: 1,
        sections: [{ id: "section-1", type: "section", data: {}, blocks }],
      },
      bindings: [],
    },
  } as CustomScreenDefinition;
};

testIfDb(
  "TASK-540-01 metadata-only registered PATCH persists local Tabs and overlong-ID read repair without document loss",
  async () => {
    const screen = await seedBoundScreen();
    const base = buildDefinition();
    const overviewContent = [
      { id: "overview-copy", type: "text", data: { content: "Keep overview" } },
    ];
    const detailsContent = [
      { id: "details-copy", type: "text", data: { content: "Keep details" } },
    ];
    const longSectionId = `section-${"s".repeat(170)}`;
    const longBlockPrefix = `block-${"b".repeat(170)}`;
    const longTabsId = `${longBlockPrefix}-tabs`;
    const longSiblingId = `${longBlockPrefix}-sibling`;
    const longPropPath = `value.${"p".repeat(170)}`;
    const sibling = { id: longSiblingId, type: "field", data: { label: "Keep sibling" } };
    const malformedDefinition = {
      ...base,
      editorView: {
        ...base.editorView,
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: longSectionId,
              type: "section",
              data: {},
              blocks: [
                {
                  id: longTabsId,
                  type: "tabs",
                  data: "malformed-stored-data",
                  slots: { overview: overviewContent, details: detailsContent },
                },
                sibling,
              ],
            },
          ],
        },
        bindings: [
          {
            id: "sibling-binding",
            blockId: longSiblingId,
            propPath: longPropPath,
            source: "entry",
            field: "name",
            mode: "read",
          },
        ],
      },
    } as unknown as CustomScreenDefinition;
    await db
      .update(customScreens)
      .set({ definition: malformedDefinition })
      .where(eq(customScreens.id, screen.id));

    const response = (await patchScreen(screen.id, { name: "Repaired metadata name" })) as {
      name: string;
      definition: CustomScreenDefinition;
    };
    const responseSection = response.definition.editorView.document.sections[0]!;
    const responseBlocks = responseSection.blocks;
    expect(response.name).toBe("Repaired metadata name");
    expect(responseSection.id.length).toBeLessThanOrEqual(160);
    expect(responseBlocks[0]?.id.length).toBeLessThanOrEqual(160);
    expect(responseBlocks[1]?.id.length).toBeLessThanOrEqual(160);
    expect(responseBlocks[0]?.id).not.toBe(responseBlocks[1]?.id);
    expect(responseBlocks[1]).toMatchObject({ type: "field", data: { label: "Keep sibling" } });
    expect(responseBlocks[0]?.data.tabs).toEqual([
      { id: "details", label: "Tab 1" },
      { id: "overview", label: "Tab 2" },
    ]);
    expect(responseBlocks[0]?.slots?.overview).toEqual(overviewContent);
    expect(responseBlocks[0]?.slots?.details).toEqual(detailsContent);
    expect(response.definition.editorView.bindings).toEqual([
      {
        id: "sibling-binding",
        blockId: responseBlocks[1]?.id,
        propPath: expect.stringMatching(/^[a-zA-Z0-9_.-]{1,160}$/),
        source: "entry",
        field: "name",
        mode: "read",
      },
    ]);

    const [persisted] = await db
      .select({ name: customScreens.name, definition: customScreens.definition })
      .from(customScreens)
      .where(eq(customScreens.id, screen.id));
    const persistedDefinition = persisted?.definition as CustomScreenDefinition | undefined;
    expect(persisted?.name).toBe("Repaired metadata name");
    expect(persistedDefinition).toEqual(response.definition);
  }
);

testIfDb(
  "TASK-540-01 registered PATCH rejects fresh publish and custom Button actions before persistence",
  async () => {
    const screen = await seedBoundScreen();
    const before = JSON.stringify((await getCustomScreen(screen.id))?.definition);

    for (const action of ["publish", "custom"] as const) {
      const definition = definitionWithEditorBlocks([
        {
          id: `unsupported-${action}`,
          type: "button",
          data: { label: "Unsupported", action, href: "/must-not-persist" },
        },
      ]);
      try {
        await patchScreenDefinition(screen.id, definition);
        throw new Error(`expected ${action} action rejection`);
      } catch (error) {
        expect(error).toMatchObject({
          code: "validation_error",
          message: "Invalid payload",
          status: 400,
        });
      }
      expect(JSON.stringify((await getCustomScreen(screen.id))?.definition)).toBe(before);
    }
  }
);

testIfDb(
  "TASK-540-01 PATCH rejects fixed-kind unknown keys recursively in children and slots without mutating storage",
  async () => {
    const screen = await seedBoundScreen();
    const before = JSON.stringify((await getCustomScreen(screen.id))?.definition);
    const submittedUnknownKey = "submittedUnknownKeyMustNotEcho";
    const invalidDefinitions = [
      definitionWithEditorBlocks([
        {
          id: "child-parent",
          type: "field-group",
          data: {},
          children: [
            {
              id: "child-middle",
              type: "field-group",
              data: {},
              children: [
                {
                  id: "bad-heading-child",
                  type: "heading",
                  data: { text: "Nested", [submittedUnknownKey]: true },
                },
              ],
            },
          ],
        },
      ]),
      definitionWithEditorBlocks([
        {
          id: "slot-parent",
          type: "columns",
          data: {},
          slots: {
            left: [
              {
                id: "slot-middle",
                type: "columns",
                data: {},
                slots: {
                  right: [
                    {
                      id: "bad-heading-slot",
                      type: "heading",
                      data: { text: "Nested", [submittedUnknownKey]: true },
                    },
                  ],
                },
              },
            ],
          },
        },
      ]),
    ];

    for (const definition of invalidDefinitions) {
      try {
        await patchScreenDefinition(screen.id, definition);
        throw new Error("expected recursive schema rejection");
      } catch (error) {
        expect(error).toMatchObject({
          code: "validation_error",
          message: "Invalid payload",
          status: 400,
        });
        expect(JSON.stringify((error as { details?: unknown }).details)).not.toContain(
          submittedUnknownKey
        );
      }
      expect(JSON.stringify((await getCustomScreen(screen.id))?.definition)).toBe(before);
    }
  }
);

testIfDb(
  "TASK-540-01 PATCH rejects unsupported block types at root, child, and slot boundaries without mutating storage",
  async () => {
    const screen = await seedBoundScreen();
    const before = JSON.stringify((await getCustomScreen(screen.id))?.definition);
    const submittedType = "submitted-plugin-type-must-not-echo";
    const invalidDefinitions = [
      definitionWithEditorBlocks([{ id: "unsupported-root", type: submittedType, data: {} }]),
      definitionWithEditorBlocks([
        {
          id: "child-parent",
          type: "field-group",
          data: {},
          children: [{ id: "unsupported-child", type: submittedType, data: {} }],
        },
      ]),
      definitionWithEditorBlocks([
        {
          id: "slot-parent",
          type: "columns",
          data: {},
          slots: {
            content: [{ id: "unsupported-slot", type: submittedType, data: {} }],
          },
        },
      ]),
    ];

    for (const definition of invalidDefinitions) {
      try {
        await patchScreenDefinition(screen.id, definition);
        throw new Error("expected unsupported block type rejection");
      } catch (error) {
        expect(error).toMatchObject({
          code: "validation_error",
          message: "Invalid payload",
          status: 400,
        });
        expect(JSON.stringify((error as { details?: unknown }).details)).not.toContain(
          submittedType
        );
      }
      expect(JSON.stringify((await getCustomScreen(screen.id))?.definition)).toBe(before);
    }
  }
);

testIfDb(
  "TASK-540-01 PATCH maps unsafe URLs, duplicate Tabs, and tab-slot mismatch to bounded non-echo domain errors",
  async () => {
    const screen = await seedBoundScreen();
    const before = JSON.stringify((await getCustomScreen(screen.id))?.definition);
    const rejectedUrl = "javascript:submitted-value-must-not-echo";
    const semanticFailures = [
      definitionWithEditorBlocks([
        { id: "unsafe-image", type: "image", data: { src: rejectedUrl } },
      ]),
      definitionWithEditorBlocks([
        {
          id: "unsafe-button",
          type: "button",
          data: { action: "link", href: rejectedUrl },
        },
      ]),
      definitionWithEditorBlocks([
        {
          id: "duplicate-tabs",
          type: "tabs",
          data: {
            tabs: [
              { id: "same", label: "First" },
              { id: "same", label: "Second" },
            ],
          },
          slots: { same: [] },
        },
      ]),
      definitionWithEditorBlocks([
        {
          id: "mismatched-tabs",
          type: "tabs",
          data: { tabs: [{ id: "expected", label: "Expected" }] },
          slots: { other: [] },
        },
      ]),
    ];

    for (const definition of semanticFailures) {
      try {
        await patchScreenDefinition(screen.id, definition);
        throw new Error("expected semantic definition rejection");
      } catch (error) {
        expect(error).toMatchObject({
          code: "custom_screen_definition_invalid",
          message: "Custom screen definition is invalid",
          status: 400,
        });
        const fields =
          ((error as { details?: { fields?: unknown } }).details?.fields as string[] | undefined) ??
          [];
        expect(fields.length).toBeLessThanOrEqual(8);
        expect(fields.every((field) => field.length <= 240)).toBe(true);
        expect(fields.join(" ")).not.toContain(rejectedUrl);
        expect(fields.join(" ")).not.toContain("same");
        expect(fields.join(" ")).not.toContain("other");
      }
      expect(JSON.stringify((await getCustomScreen(screen.id))?.definition)).toBe(before);
    }
  }
);

testIfDb(
  "TASK-540-01 POST prunes empty-document block ghosts, returns de-duplicated warnings, and GET stays warning-free",
  async () => {
    const contentType = await createContentType({
      name: `Empty Screen ${randomUUID()}`,
      slug: `empty-screen-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { name: { type: "string", xFieldType: "text" } },
      },
    });
    trackedContentTypeIds.add(contentType.id);
    const base = buildDefinition();
    const ghostBinding = (id: string) => ({
      id,
      blockId: "missing-block",
      propPath: "value",
      source: "entry" as const,
      field: "name",
      mode: "read" as const,
    });
    const definition: CustomScreenDefinition = {
      ...base,
      listView: {
        ...base.listView,
        rowTemplate: {
          document: { schemaVersion: 1, sections: [] },
          bindings: [ghostBinding("row-ghost")],
        },
      },
      editorView: {
        ...base.editorView,
        document: { schemaVersion: 1, sections: [] },
        bindings: [ghostBinding("editor-ghost-a"), ghostBinding("editor-ghost-b")],
      },
    };

    const created = (await postScreen({
      name: `Empty Screen ${randomUUID()}`,
      contentTypeId: contentType.id,
      definition,
    })) as Awaited<ReturnType<typeof getCustomScreen>> & {
      warnings?: { code: string; fields: string[] }[];
    };
    if (!created) throw new Error("custom screen create did not return a record");
    trackedScreenIds.add(created.id);
    expect(created.definition.listView.rowTemplate?.bindings).toEqual([]);
    expect(created.definition.editorView.bindings).toEqual([]);
    expect(created.warnings).toEqual([{ code: "binding_block_removed", fields: ["name"] }]);

    const reread = await getCustomScreen(created.id);
    expect(reread?.definition.listView.rowTemplate?.bindings).toEqual([]);
    expect(reread?.definition.editorView.bindings).toEqual([]);
    expect(reread?.warnings).toBeUndefined();
  }
);

test("PATCH custom screen entry overrides rejects unknown envelope keys before service work", async () => {
  const { router, routes } = makeRouter();

  registerCustomScreenRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const route = findRoute(routes, "PATCH", "/custom-screens/:screenId/entries/:entryId/overrides");

  await expect(
    runRoute(route, {
      params: { screenId: "screen-1", entryId: "entry-1" },
      body: { overrides: [], extra: true },
      user: { id: "44444444-4444-4444-8444-444444444444" },
    })
  ).rejects.toMatchObject({
    code: "validation_error",
    status: 400,
  });
});
