import { expect, test } from "bun:test";

import {
  mapPageTemplateError,
  registerPageTemplateRoutes,
} from "../../../core/server/routes/pageTemplateRoutes";
import { registerAllRoutes } from "../../../core/server/routes";
import { PageDocumentError } from "../../../core/services/pages/pageDocumentV2";
import { PageTemplateError } from "../../../core/services/pages/pageTemplateLibrarySchema";

type Route = { method: string; path: string; permission?: string };

const makeRouter = (capturedPermissions?: Map<string, string>) => {
  const routes: Route[] = [];
  const register =
    (method: string) =>
    (path: string, ...handlers: unknown[]) => {
      routes.push({ method, path });
      if (capturedPermissions && typeof handlers[0] === "function") {
        // Permission middleware factories are tagged before registration.
        const tag = (handlers[0] as { __permission?: string }).__permission;
        if (tag) capturedPermissions.set(`${method} ${path}`, tag);
      }
    };
  return {
    routes,
    router: {
      get: register("GET"),
      post: register("POST"),
      put: register("PUT"),
      patch: register("PATCH"),
      delete: register("DELETE"),
    },
  };
};

const taggedRequirePermission = (permission: string) => {
  const handler = async () => undefined;
  (handler as { __permission?: string }).__permission = permission;
  return handler;
};

test("registerPageTemplateRoutes wires the single canonical route family", () => {
  const permissions = new Map<string, string>();
  const { router, routes } = makeRouter(permissions);

  registerPageTemplateRoutes(router, {
    requirePermission: taggedRequirePermission,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual([
    "GET /page-templates",
    "GET /page-templates/:id",
    "POST /page-templates",
    "PATCH /page-templates/:id",
    "DELETE /page-templates/:id",
    "POST /page-templates/:id/duplicate",
    "POST /page-templates/:id/preview",
  ]);

  // RBAC decision recorded by TASK-420-02: content:* family, preview issue
  // rides content:read like POST /pages/:id/preview.
  expect(permissions.get("GET /page-templates")).toBe("content:read");
  expect(permissions.get("GET /page-templates/:id")).toBe("content:read");
  expect(permissions.get("POST /page-templates")).toBe("content:write");
  expect(permissions.get("PATCH /page-templates/:id")).toBe("content:write");
  expect(permissions.get("DELETE /page-templates/:id")).toBe("content:write");
  expect(permissions.get("POST /page-templates/:id/duplicate")).toBe("content:write");
  expect(permissions.get("POST /page-templates/:id/preview")).toBe("content:read");
});

test("registerAllRoutes exposes page-templates and retires widget-template families", () => {
  const { router, routes } = makeRouter();

  registerAllRoutes(router as unknown as Parameters<typeof registerAllRoutes>[0], {
    requireAuth: async () => undefined,
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(expect.arrayContaining(["GET /page-templates", "POST /page-templates"]));
  expect(paths.some((path) => path.includes("/widget-templates"))).toBe(false);
  expect(paths.some((path) => path.includes("/widgets/templates"))).toBe(false);
  expect(paths.some((path) => path.includes("/widgets/template-categories"))).toBe(false);
});

test("mapPageTemplateError keeps domain sentinels machine-readable", () => {
  const cases = [
    ["page_template_not_found", 404],
    ["page_template_invalid", 400],
    ["page_template_slug_conflict", 409],
    ["page_template_status_invalid", 400],
    ["page_template_legacy_widget_blocks_invalid", 400],
  ] as const;

  for (const [code, status] of cases) {
    const mapped = mapPageTemplateError(new PageTemplateError(code));
    expect(mapped?.code).toBe(code);
    expect(mapped?.status).toBe(status);
  }
});

test("mapPageTemplateError passes document failures through as template invalid with path", () => {
  const invalid = mapPageTemplateError(
    new PageDocumentError("page_document_invalid", "Page document is invalid.", "sections.0.type")
  );
  expect(invalid?.code).toBe("page_template_invalid");
  expect(invalid?.status).toBe(400);
  expect(invalid?.message).toContain("sections.0.type");

  const unknownField = mapPageTemplateError(
    new PageDocumentError(
      "page_document_unknown_field",
      "Page document contains an unknown field.",
      "sections.0.rogue"
    )
  );
  expect(unknownField?.code).toBe("page_template_invalid");
  expect(unknownField?.status).toBe(400);
  expect(unknownField?.message).toContain("sections.0.rogue");
});

test("mapPageTemplateError leaves unknown errors unmapped", () => {
  expect(mapPageTemplateError(new Error("something_else"))).toBeNull();
  expect(mapPageTemplateError("page_template_invalid")).toBeNull();
});
