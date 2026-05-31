import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import {
  registerEntryTeaserPreviewRoutes,
  type EntryTeaserPreviewRouteHandler,
} from "../../../core/server/routes/entryTeaserPreviewRoutes";

type Route = { method: string; path: string; handlers: EntryTeaserPreviewRouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      post: (path: string, ...handlers: EntryTeaserPreviewRouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
    },
  };
};

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`missing route ${method} ${path}`);
  return route;
};

const runRoute = async (routes: Route[], ctx: { body?: unknown } = {}) => {
  const route = findRoute(routes, "POST", "/widgets/entry-teaser/preview");
  let result: unknown;
  for (const handler of route.handlers) {
    const output = await handler({
      params: {},
      query: {},
      body: {},
      ...ctx,
    });
    if (output !== undefined) result = output;
  }
  return result;
};

test("entry teaser preview route resolves with server-owned content routes", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];
  const validatedPayloads: unknown[] = [];
  const resolvedCalls: Array<{ input: unknown; contentRoutes: unknown }> = [];

  registerEntryTeaserPreviewRoutes(router, {
    requirePermission: (permission) => async () => {
      requestedPermissions.push(permission);
    },
    validate: (_schema, payload) => {
      validatedPayloads.push(payload);
    },
    getContentRoutes: async () => [
      {
        type: "articles",
        enabled: true,
        listPath: "/articles",
        detailPath: "/articles/:slug",
      },
    ],
    resolvePreview: async (input, options) => {
      resolvedCalls.push({ input, contentRoutes: options.contentRoutes });
      return {
        item: {
          id: "entry-1",
          title: "Launch note",
          href: "/articles/launch-note",
        },
        sourceTypeId: "articles",
        sourceTypeSlug: "articles",
        resolvedAt: "2026-05-17T10:00:00.000Z",
      };
    },
  });

  const result = await runRoute(routes, {
    body: {
      data: {
        sourceMode: "latest",
        source: {
          mode: "legacy",
          contentTypeId: "articles",
        },
      },
    },
  });

  expect(requestedPermissions).toEqual(["content:read"]);
  expect(validatedPayloads).toHaveLength(1);
  expect(resolvedCalls).toHaveLength(1);
  expect(resolvedCalls[0]?.contentRoutes).toEqual([
    {
      type: "articles",
      enabled: true,
      listPath: "/articles",
      detailPath: "/articles/:slug",
    },
  ]);
  expect(result).toEqual({
    item: {
      id: "entry-1",
      title: "Launch note",
      href: "/articles/launch-note",
    },
    sourceTypeId: "articles",
    sourceTypeSlug: "articles",
    resolvedAt: "2026-05-17T10:00:00.000Z",
  });
});

test("entry teaser preview route maps domain errors", async () => {
  const { router, routes } = makeRouter();

  registerEntryTeaserPreviewRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    resolvePreview: async () => {
      throw new Error("entry_teaser_preview_invalid");
    },
  });

  await expect(
    runRoute(routes, {
      body: {
        data: {
          sourceMode: "latest",
        },
      },
    })
  ).rejects.toBeInstanceOf(ApiError);
});
