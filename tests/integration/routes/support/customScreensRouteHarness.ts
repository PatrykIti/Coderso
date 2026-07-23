import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "../../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  customScreenEntryPresentationOverrides,
  customScreens,
  users,
} from "../../../../core/db/schema";
import { registerCustomScreenRoutes } from "../../../../core/server/routes/customScreenRoutes";
import { validate } from "../../../../core/server/validation/schemaValidator";
import {
  createContentType,
  deleteContentType,
} from "../../../../core/services/content/typeService";
import {
  createCustomScreen,
  type CustomScreenRecord,
} from "../../../../core/services/customScreens/customScreenService";
import type { CustomScreenDefinition } from "../../../../core/services/customScreens/customScreenSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Route = { method: string; path: string; handlers: RouteHandler[] };

type OverrideScope = Readonly<{ screenId: string; entryId: string }>;

type CleanupDependencies = Readonly<{
  deleteOverride: (scope: OverrideScope) => Promise<void>;
  deleteScreen: (screenId: string) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  deleteContentType: (contentTypeId: string) => Promise<void>;
  deleteContentTypeFallback: (contentTypeId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}>;

type CleanupDependencyOverrides = Partial<CleanupDependencies>;

const TEST_ACTOR_ID = "44444444-4444-4444-8444-444444444444";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const assertUuid = (value: string, label: string): string => {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be an exact UUID`);
  }
  return value;
};

export const makeRouter = () => {
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

export const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Missing route ${method} ${path}`);
  return route;
};

export const runRoute = async (route: Route, ctx: Partial<RouteContext>) => {
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

export const buildDefinition = (style?: Record<string, unknown>): CustomScreenDefinition =>
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

const defaultCleanupDependencies: CleanupDependencies = {
  deleteOverride: async ({ screenId, entryId }) => {
    await db
      .delete(customScreenEntryPresentationOverrides)
      .where(
        and(
          eq(customScreenEntryPresentationOverrides.screenId, screenId),
          eq(customScreenEntryPresentationOverrides.entryId, entryId)
        )
      );
  },
  deleteScreen: async (screenId) => {
    await db.delete(customScreens).where(eq(customScreens.id, screenId));
  },
  deleteEntry: async (entryId) => {
    await db.delete(contentEntries).where(eq(contentEntries.id, entryId));
  },
  deleteContentType: async (contentTypeId) => {
    await deleteContentType(contentTypeId);
  },
  deleteContentTypeFallback: async (contentTypeId) => {
    await db.delete(contentTypes).where(eq(contentTypes.id, contentTypeId));
  },
  deleteUser: async (userId) => {
    await db.delete(users).where(eq(users.id, userId));
  },
};

export const createCustomScreenRouteHarness = (
  cleanupOverrides: CleanupDependencyOverrides = {}
) => {
  const cleanupDependencies: CleanupDependencies = {
    ...defaultCleanupDependencies,
    ...cleanupOverrides,
  };
  const trackedScreenIds = new Set<string>();
  const trackedContentTypeIds = new Set<string>();
  const trackedEntryIds = new Set<string>();
  const trackedUserIds = new Set<string>();
  const trackedOverrideScopes = new Map<string, OverrideScope>();

  const trackScreenId = (screenId: string) => {
    trackedScreenIds.add(assertUuid(screenId, "screenId"));
    return screenId;
  };

  const trackContentTypeId = (contentTypeId: string) => {
    trackedContentTypeIds.add(assertUuid(contentTypeId, "contentTypeId"));
    return contentTypeId;
  };

  const trackEntryId = (entryId: string) => {
    trackedEntryIds.add(assertUuid(entryId, "entryId"));
    return entryId;
  };

  const trackUserId = (userId: string) => {
    trackedUserIds.add(assertUuid(userId, "userId"));
    return userId;
  };

  const trackOverrideScope = (screenId: string, entryId: string) => {
    const scope = {
      screenId: assertUuid(screenId, "override screenId"),
      entryId: assertUuid(entryId, "override entryId"),
    };
    trackedOverrideScopes.set(JSON.stringify([scope.screenId, scope.entryId]), scope);
    return scope;
  };

  const cleanup = async () => {
    const errors: unknown[] = [];
    const attempt = async (operation: () => Promise<void>) => {
      try {
        await operation();
      } catch (error) {
        errors.push(error);
      }
    };

    try {
      for (const scope of trackedOverrideScopes.values()) {
        await attempt(() => cleanupDependencies.deleteOverride(scope));
      }
      for (const screenId of trackedScreenIds) {
        await attempt(() => cleanupDependencies.deleteScreen(screenId));
      }
      for (const entryId of trackedEntryIds) {
        await attempt(() => cleanupDependencies.deleteEntry(entryId));
      }
      for (const contentTypeId of trackedContentTypeIds) {
        try {
          await cleanupDependencies.deleteContentType(contentTypeId);
        } catch (primaryError) {
          try {
            await cleanupDependencies.deleteContentTypeFallback(contentTypeId);
          } catch (fallbackError) {
            errors.push(
              new AggregateError(
                [primaryError, fallbackError],
                `Failed to delete exact content type ${contentTypeId}`
              )
            );
          }
        }
      }
      for (const userId of trackedUserIds) {
        await attempt(() => cleanupDependencies.deleteUser(userId));
      }
    } finally {
      trackedOverrideScopes.clear();
      trackedScreenIds.clear();
      trackedEntryIds.clear();
      trackedContentTypeIds.clear();
      trackedUserIds.clear();
    }

    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(errors, "Custom Screen route fixture cleanup failed");
    }
  };

  const seedBoundScreen = async (): Promise<CustomScreenRecord> => {
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
    trackContentTypeId(contentType.id);

    const screen = await createCustomScreen({
      name: `Style Screen ${randomUUID()}`,
      contentTypeId: contentType.id,
      definition: buildDefinition(),
    });
    trackScreenId(screen.id);
    return screen;
  };

  const patchScreen = async (screenId: string, body: unknown) => {
    const { router, routes } = makeRouter();
    registerCustomScreenRoutes(router, {
      requirePermission: () => async () => undefined,
      validate,
    });
    return runRoute(findRoute(routes, "PATCH", "/custom-screens/:id"), {
      params: { id: screenId },
      body,
      user: { id: TEST_ACTOR_ID },
    });
  };

  const patchScreenDefinition = (screenId: string, definition: CustomScreenDefinition) =>
    patchScreen(screenId, { definition });

  const postScreen = async (body: unknown) => {
    const { router, routes } = makeRouter();
    registerCustomScreenRoutes(router, {
      requirePermission: () => async () => undefined,
      validate,
    });
    return runRoute(findRoute(routes, "POST", "/custom-screens"), {
      body,
      user: { id: TEST_ACTOR_ID },
    });
  };

  return {
    cleanup,
    seedBoundScreen,
    patchScreen,
    patchScreenDefinition,
    postScreen,
    trackScreenId,
    trackContentTypeId,
    trackEntryId,
    trackUserId,
    trackOverrideScope,
  };
};
