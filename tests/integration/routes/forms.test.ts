import { expect, test } from "bun:test";

import {
  mapFormError,
  registerFormsRoutes,
} from "../../../core/server/routes/formsRoutes";
import {
  formCreateSchema,
  formFieldsSchema,
  formUpdateSchema,
} from "../../../core/server/validation/formSchemas";
import { ApiError } from "../../../core/server/errorHandler";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
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
      put: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PUT", path, handlers }),
      delete: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

test("registerFormsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerFormsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /forms",
      "POST /forms",
      "GET /forms/:id",
      "PATCH /forms/:id",
      "DELETE /forms/:id",
      "GET /forms/:id/fields",
      "PUT /forms/:id/fields",
      "GET /forms/:id/submissions",
      "POST /forms/:id/submissions",
    ])
  );
});

test("mapFormError returns stable API errors for known form domain failures", () => {
  const cases: Array<[string, string, number]> = [
    ["form_invalid", "form_invalid", 400],
    ["form_name_required", "form_name_required", 400],
    ["form_slug_exists", "form_slug_exists", 409],
    ["form_not_found", "form_not_found", 404],
    ["form_delete_restricted", "form_delete_restricted", 409],
    ["form_fields_invalid", "form_fields_invalid", 400],
    ["form_field_invalid", "form_field_invalid", 400],
    ["form_field_label_required", "form_field_label_required", 400],
    ["form_field_id_duplicate", "form_field_id_duplicate", 400],
    ["form_field_name_duplicate", "form_field_name_duplicate", 400],
    ["form_payload_invalid", "form_payload_invalid", 400],
    ["form_payload_unknown_field", "form_payload_unknown_field", 400],
    ["form_payload_required", "form_payload_required", 400],
  ];

  for (const [message, code, status] of cases) {
    const mapped = mapFormError(new Error(message));
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped?.code).toBe(code);
    expect(mapped?.status).toBe(status);
  }

  expect(mapFormError(new Error("unrelated"))).toBeNull();
});

test("forms schemas strictly own status enums and field top-level keys", () => {
  expect(formCreateSchema.properties.status).toEqual({
    enum: ["draft", "published", "archived"],
  });
  expect(formUpdateSchema.properties.status).toEqual({
    enum: ["draft", "published", "archived"],
  });
  expect(formFieldsSchema.items.additionalProperties).toBe(false);
  expect(formFieldsSchema.items.properties.settings).toEqual({ type: "object" });
});
