import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapRedirectError,
  registerRedirectRoutes,
} from "../../../core/server/routes/redirectRoutes";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

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

test("registerRedirectRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerRedirectRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /redirects",
      "POST /redirects",
      "PATCH /redirects/:id",
      "DELETE /redirects/:id",
    ])
  );
});

test("mapRedirectError maps redirect domain failures", () => {
  const duplicate = mapRedirectError(new Error("redirect_exists"));
  expect(duplicate).toBeInstanceOf(ApiError);
  expect(duplicate).toMatchObject({ code: "redirect_exists", status: 409 });

  const missing = mapRedirectError(new Error("redirect_not_found"));
  expect(missing).toBeInstanceOf(ApiError);
  expect(missing).toMatchObject({ code: "redirect_not_found", status: 404 });

  const external = mapRedirectError(new Error("redirect_target_external"));
  expect(external).toBeInstanceOf(ApiError);
  expect(external).toMatchObject({ code: "redirect_target_external", status: 400 });
});

testIfDb("redirect route handlers map create/update/delete service errors", async () => {
  const { router, routes } = makeRouter();

  registerRedirectRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const createHandler = routes.find((route) => route.method === "POST")?.handlers.at(-1);
  const updateHandler = routes.find((route) => route.method === "PATCH")?.handlers.at(-1);
  const deleteHandler = routes.find((route) => route.method === "DELETE")?.handlers.at(-1);
  if (!createHandler || !updateHandler || !deleteHandler) {
    throw new Error("missing_redirect_handler");
  }

  await expect(
    createHandler({
      params: {},
      query: {},
      body: {
        fromPath: "/external",
        toPath: "https://evil.example.com",
        statusCode: 301,
        enabled: true,
      },
    })
  ).rejects.toMatchObject({ code: "redirect_target_external", status: 400 });

  await expect(
    updateHandler({
      params: { id: "00000000-0000-4000-8000-000000000000" },
      query: {},
      body: {
        fromPath: "/same",
        toPath: "/same",
        statusCode: 301,
        enabled: true,
      },
    })
  ).rejects.toMatchObject({ code: "redirect_not_found", status: 404 });

  await expect(
    deleteHandler({
      params: { id: "00000000-0000-4000-8000-000000000000" },
      query: {},
      body: undefined,
    })
  ).rejects.toMatchObject({ code: "redirect_not_found", status: 404 });
});
