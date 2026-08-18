import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { db } from "../../../core/db/client";
import { users } from "../../../core/db/schema";
import {
  mapCustomScreenError,
  registerCustomScreenRoutes,
} from "../../../core/server/routes/customScreenRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";
import { createEntry } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import {
  createCustomScreen,
  getCustomScreen,
} from "../../../core/services/customScreens/customScreenService";
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenSchemas";
import { canConnect } from "../../utils/db";
import {
  buildDefinition,
  createCustomScreenRouteHarness,
  findRoute,
  makeRouter,
  runRoute,
} from "./support/customScreensRouteHarness";

const harness = createCustomScreenRouteHarness();
const {
  cleanup,
  patchScreen,
  patchScreenDefinition,
  seedBoundScreen,
  trackContentTypeId,
  trackEntryId,
  trackOverrideScope,
  trackScreenId,
  trackUserId,
} = harness;

afterEach(cleanup);

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
  expect(mapCustomScreenError(new Error("custom_screen_revision_required"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_conflict"))?.status).toBe(409);
  expect(mapCustomScreenError(new Error("other_error"))).toBeNull();
});

// TASK-503 — DB-backed persistence of the block style channel via the existing
// PATCH /custom-screens/:id path (no new route). Skips when no DATABASE_URL.
const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

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
  trackUserId(actor.id);

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
  trackContentTypeId(contentType.id);

  const screen = await createCustomScreen({
    name: `Direct Image Screen ${randomUUID()}`,
    contentTypeId: contentType.id,
    definition: buildDirectImageDefinition(),
  });
  trackScreenId(screen.id);

  const entry = await createEntry(contentType.id, {
    title: `Direct Image Entry ${randomUUID()}`,
    slug: `direct-image-entry-${randomUUID()}`,
    data: { name: "Direct image entry" },
    authorId: actor.id,
  });
  trackEntryId(entry.id);
  trackOverrideScope(screen.id, entry.id);

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

// TASK-569 — optimistic-concurrency revision precondition on definition PATCHes.
testIfDb(
  "TASK-569 PATCH /custom-screens/:id definition requires expectedRevision and a stale revision maps to 409",
  async () => {
    const screen = await seedBoundScreen();

    // Definition without expectedRevision → 400 custom_screen_revision_required.
    await expect(patchScreen(screen.id, { definition: buildDefinition() })).rejects.toMatchObject({
      code: "custom_screen_revision_required",
      status: 400,
    });

    // A stale expectedRevision → 409 custom_screen_conflict; store untouched.
    await expect(patchScreenDefinition(screen.id, buildDefinition(), 999)).rejects.toMatchObject({
      code: "custom_screen_conflict",
      status: 409,
    });
    const reread = await getCustomScreen(screen.id);
    expect(reread?.revision).toBe(1);
  }
);

testIfDb(
  "TASK-569 metadata-only PATCH proceeds without expectedRevision and does not bump the revision",
  async () => {
    const screen = await seedBoundScreen();

    const updated = (await patchScreen(screen.id, { status: "active" })) as Awaited<
      ReturnType<typeof getCustomScreen>
    >;
    expect(updated?.status).toBe("active");
    expect(updated?.revision).toBe(1);

    const reread = await getCustomScreen(screen.id);
    expect(reread?.status).toBe("active");
    expect(reread?.revision).toBe(1);
  }
);

testIfDb(
  "TASK-569 two concurrent definition PATCHes: exactly one commits, the other maps to 409",
  async () => {
    const screen = await seedBoundScreen();
    const current = (await getCustomScreen(screen.id)) as NonNullable<
      Awaited<ReturnType<typeof getCustomScreen>>
    >;
    const expectedRevision = current.revision;

    const [first, second] = await Promise.allSettled([
      patchScreenDefinition(screen.id, buildDefinition({ width: "half" }), expectedRevision),
      patchScreenDefinition(screen.id, buildDefinition({ width: "full" }), expectedRevision),
    ]);

    const winners = [first, second].filter((result) => result.status === "fulfilled");
    const losers = [first, second].filter((result) => result.status === "rejected");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    const loser = losers[0] as PromiseRejectedResult;
    expect(loser.reason).toMatchObject({ code: "custom_screen_conflict", status: 409 });

    // Exactly one writer committed: the revision advanced exactly once and the
    // winning definition is present verbatim.
    const reread = await getCustomScreen(screen.id);
    expect(reread?.revision).toBe(expectedRevision + 1);
    const storedStyle = reread?.definition.editorView.document.sections[0]?.blocks[0]?.style;
    expect(["half", "full"]).toContain((storedStyle as { width: string })?.width);
  }
);
