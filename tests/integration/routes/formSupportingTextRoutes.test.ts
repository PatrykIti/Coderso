import { expect, test } from "bun:test";

import { registerFormActionsRoutes } from "../../../core/server/routes/formActionsRoutes";
import { mapFormError, registerFormsRoutes } from "../../../core/server/routes/formsRoutes";
import { ApiError } from "../../../core/server/errorHandler";
import { formActionsUpdateSchema } from "../../../core/server/validation/formActionSchemas";
import { formCreateSchema, formUpdateSchema } from "../../../core/server/validation/formSchemas";
import { validate as validateSchema } from "../../../core/server/validation/schemaValidator";
import { PROJECT_BRIEF_SUCCESS_MESSAGE } from "../../../scripts/projekty-domow/content/projectForm";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string; email?: string; name?: string | null };
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;
type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  const addRoute =
    (method: string) =>
    (path: string, ...handlers: RouteHandler[]) => {
      routes.push({ method, path, handlers });
    };

  return {
    routes,
    router: {
      get: addRoute("GET"),
      post: addRoute("POST"),
      patch: addRoute("PATCH"),
      put: addRoute("PUT"),
      delete: addRoute("DELETE"),
    },
  };
};

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((entry) => entry.method === method && entry.path === path);
  if (!route) throw new Error(`route_missing:${method}:${path}`);
  return route;
};

const executeRoute = async (route: Route, body: unknown) => {
  let result: unknown;
  for (const handler of route.handlers) {
    result = await handler({ params: { id: "form-id" }, query: {}, body });
  }
  return result;
};

const BOUNDARY_REACHED = Object.freeze(new Error("schema_boundary_reached"));

test("Form create, update and action updates retain exact write routes and schema identities", async () => {
  const { router, routes } = makeRouter();
  const permissionByHandler = new Map<RouteHandler, string>();
  const schemaCalls: Array<{ schema: unknown; payload: unknown }> = [];
  const deps = {
    requirePermission: (permission: string) => {
      const handler: RouteHandler = () => undefined;
      permissionByHandler.set(handler, permission);
      return handler;
    },
    validate: (schema: unknown, payload: unknown) => {
      validateSchema(schema, payload);
      schemaCalls.push({ schema, payload });
      throw BOUNDARY_REACHED;
    },
  };

  registerFormsRoutes(router, deps);
  registerFormActionsRoutes(router, deps);

  const cases = [
    {
      route: findRoute(routes, "POST", "/forms"),
      schema: formCreateSchema,
      payload: {
        name: "Zacznij projekt",
        settings: { theme: { submit: { supportingText: "x" } } },
      },
    },
    {
      route: findRoute(routes, "PATCH", "/forms/:id"),
      schema: formUpdateSchema,
      payload: {
        settings: { theme: { submit: { supportingText: "x".repeat(2_000) } } },
      },
    },
    {
      route: findRoute(routes, "PUT", "/forms/:id/actions"),
      schema: formActionsUpdateSchema,
      payload: [
        {
          type: "success_message",
          label: "Potwierdzenie wysłania",
          enabled: true,
          continueOnError: false,
          condition: { operator: "always" },
          config: { message: PROJECT_BRIEF_SUCCESS_MESSAGE },
          orderIndex: 0,
        },
      ],
    },
  ] as const;

  for (const entry of cases) {
    expect(permissionByHandler.get(entry.route.handlers[0]!)).toBe("forms:write");
    await expect(executeRoute(entry.route, entry.payload)).rejects.toBe(BOUNDARY_REACHED);
    expect(schemaCalls.at(-1)).toEqual({ schema: entry.schema, payload: entry.payload });
    expect(schemaCalls.at(-1)?.schema).toBe(entry.schema);
  }
});

test("Form create and update boundaries accept 1/2,000 and reject blank/2,001/unknown values", async () => {
  const { router, routes } = makeRouter();
  const seenSchemas: unknown[] = [];
  registerFormsRoutes(router, {
    requirePermission: () => () => undefined,
    validate: (schema, payload) => {
      seenSchemas.push(schema);
      validateSchema(schema, payload);
      throw BOUNDARY_REACHED;
    },
  });

  const cases = [
    {
      route: findRoute(routes, "POST", "/forms"),
      schema: formCreateSchema,
      create: true,
    },
    {
      route: findRoute(routes, "PATCH", "/forms/:id"),
      schema: formUpdateSchema,
      create: false,
    },
  ] as const;

  const payload = (supportingText: string, create: boolean, extraSubmit = {}) => ({
    ...(create ? { name: "Zacznij projekt" } : {}),
    settings: { theme: { submit: { supportingText, ...extraSubmit } } },
  });

  for (const entry of cases) {
    for (const value of ["x", "x".repeat(2_000)]) {
      await expect(executeRoute(entry.route, payload(value, entry.create))).rejects.toBe(
        BOUNDARY_REACHED
      );
      expect(seenSchemas.at(-1)).toBe(entry.schema);
    }

    for (const invalidPayload of [
      payload("   ", entry.create),
      payload("x".repeat(2_001), entry.create),
      payload("valid", entry.create, { unexpected: true }),
    ]) {
      try {
        await executeRoute(entry.route, invalidPayload);
        throw new Error("invalid_payload_accepted");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe("validation_error");
        expect((error as ApiError).status).toBe(400);
      }
      expect(seenSchemas.at(-1)).toBe(entry.schema);
    }
  }
});

test("mapFormError exposes stable invalid and not-found route responses", () => {
  const invalid = mapFormError(new Error("form_invalid"));
  expect(invalid).toBeInstanceOf(ApiError);
  expect(invalid).toMatchObject({ code: "form_invalid", status: 400 });

  const notFound = mapFormError(new Error("form_not_found"));
  expect(notFound).toBeInstanceOf(ApiError);
  expect(notFound).toMatchObject({ code: "form_not_found", status: 404 });
});
