import { expect, test } from "bun:test";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapAdminRoleError,
  registerAdminRolesRoutes,
  type RouteContext,
  type RouteHandler,
} from "../../../core/server/routes/adminRolesRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";
import { listPermissionIds } from "../../../core/services/admin/permissionsCatalog";
import type { AuditEvent, AuditRecord } from "../../../core/services/audit/auditService";

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
  const routeContext = {
    params: {},
    query: {},
    body: undefined,
    ...ctx,
  } as RouteContext;
  for (const handler of route.handlers) {
    result = await handler(routeContext);
  }
  return result;
};

const makeAuditRecord = (event: AuditEvent): AuditRecord => ({
  id: `audit-${event.action}`,
  actorId: event.actorId ?? null,
  action: event.action,
  targetType: event.targetType,
  targetId: event.targetId,
  metadata: event.metadata ?? {},
  createdAt: new Date("2026-06-01T10:00:00.000Z"),
});

test("registerAdminRolesRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();
  const requiredPermissions: string[] = [];

  registerAdminRolesRoutes(router, {
    requirePermission: (permission) => {
      requiredPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /admin-roles",
      "GET /admin-roles/permissions",
      "POST /admin-roles",
      "PATCH /admin-roles/:id",
      "DELETE /admin-roles/:id",
    ])
  );
  expect(requiredPermissions).toEqual([
    "roles:read",
    "roles:read",
    "roles:write",
    "roles:write",
    "roles:write",
  ]);
});

test("admin role duplicate strips source metadata from create and audits source context", async () => {
  const { router, routes } = makeRouter();
  const auditEvents: AuditEvent[] = [];
  const createdPayloads: unknown[] = [];

  registerAdminRolesRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    createRole: async (payload) => {
      createdPayloads.push(payload);
      return {
        id: "role-copy",
        name: payload.name,
        description: payload.description ?? undefined,
        permissions: payload.permissions,
        system: false,
      };
    },
    logAudit: async (entry) => {
      auditEvents.push(entry);
      return makeAuditRecord(entry);
    },
  });

  const result = await runRoute(findRoute(routes, "POST", "/admin-roles"), {
    user: { id: "admin-1" },
    body: {
      name: "Admin copy",
      description: "Copied role",
      permissions: ["*"],
      sourceRoleId: "admin",
      sourceRoleName: "Admin",
    },
  });

  expect(result).toEqual(
    expect.objectContaining({
      id: "role-copy",
      permissions: ["*"],
    })
  );
  expect(createdPayloads).toEqual([
    {
      name: "Admin copy",
      description: "Copied role",
      permissions: ["*"],
    },
  ]);
  expect(auditEvents).toEqual([
    expect.objectContaining({
      actorId: "admin-1",
      action: "admin.role.duplicate",
      targetId: "role-copy",
      metadata: expect.objectContaining({
        roleId: "role-copy",
        permissions: ["*"],
        fullAccess: true,
        sourceRoleId: "admin",
        sourceRoleName: "Admin",
      }),
    }),
  ]);
});

test("admin role update audits deterministic permission diffs", async () => {
  const { router, routes } = makeRouter();
  const auditEvents: AuditEvent[] = [];

  registerAdminRolesRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    updateRoleWithTransition: async (id, payload) => ({
      before: {
        id,
        name: "Editor",
        description: "Content team",
        permissions: ["content:read", "roles:read"],
        system: false,
      },
      after: {
        id,
        name: payload.name ?? "Editor",
        description: payload.description ?? "Content team",
        permissions: payload.permissions ?? ["content:read", "roles:read"],
        system: false,
      },
    }),
    logAudit: async (entry) => {
      auditEvents.push(entry);
      return makeAuditRecord(entry);
    },
  });

  await runRoute(findRoute(routes, "PATCH", "/admin-roles/:id"), {
    params: { id: "editor" },
    user: { id: "admin-1" },
    body: {
      permissions: ["roles:write", "content:write", "content:read"],
    },
  });

  expect(auditEvents).toEqual([
    expect.objectContaining({
      actorId: "admin-1",
      action: "admin.role.update",
      targetId: "editor",
      metadata: expect.objectContaining({
        roleId: "editor",
        name: "Editor",
        permissions: ["content:read", "content:write", "roles:write"],
        fullAccess: false,
        addedPermissions: ["content:write", "roles:write"],
        removedPermissions: ["roles:read"],
      }),
    }),
  ]);
});

test("admin role update audits full-access grants with expanded diff", async () => {
  const { router, routes } = makeRouter();
  const auditEvents: AuditEvent[] = [];

  registerAdminRolesRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    updateRoleWithTransition: async (id) => ({
      before: {
        id,
        name: "Editor",
        description: "Content team",
        permissions: ["content:read"],
        system: false,
      },
      after: {
        id,
        name: "Editor",
        description: "Content team",
        permissions: ["*"],
        system: true,
      },
    }),
    logAudit: async (entry) => {
      auditEvents.push(entry);
      return makeAuditRecord(entry);
    },
  });

  await runRoute(findRoute(routes, "PATCH", "/admin-roles/:id"), {
    params: { id: "editor" },
    user: { id: "admin-1" },
    body: {
      permissions: ["*"],
    },
  });

  const metadata = auditEvents[0]?.metadata as Record<string, unknown>;
  expect(metadata.roleId).toBe("editor");
  expect(metadata.permissions).toEqual(["*"]);
  expect(metadata.fullAccess).toBe(true);
  expect(metadata.removedPermissions).toEqual([]);
  expect(metadata.addedPermissions).toEqual(
    listPermissionIds()
      .filter((permission) => permission !== "content:read")
      .sort()
  );
});

test("admin role delete audits and maps domain errors", async () => {
  const { router, routes } = makeRouter();
  const auditEvents: AuditEvent[] = [];

  registerAdminRolesRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    deleteRole: async (id) => ({
      id,
      name: "Editor",
      description: "Content team",
      permissions: ["content:read"],
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    }),
    logAudit: async (entry) => {
      auditEvents.push(entry);
      return makeAuditRecord(entry);
    },
  });

  await runRoute(findRoute(routes, "DELETE", "/admin-roles/:id"), {
    params: { id: "editor" },
    user: { id: "admin-1" },
  });

  expect(auditEvents).toEqual([
    expect.objectContaining({
      actorId: "admin-1",
      action: "admin.role.delete",
      targetId: "editor",
      metadata: expect.objectContaining({
        roleId: "editor",
        name: "Editor",
        permissions: ["content:read"],
        fullAccess: false,
      }),
    }),
  ]);

  const mapped = mapAdminRoleError(new Error("last_admin"));
  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped?.code).toBe("last_admin");
  expect(mapped?.status).toBe(409);
});
