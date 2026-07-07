import { ApiError } from "../errorHandler";
import type { RouteContext, Router } from "../router";
import {
  createFirstAdmin,
  isFirstRun,
  type CreateFirstAdminInput,
} from "../../services/admin/firstRunService";
import { logAudit } from "../../services/audit/auditService";
import { installAdminSchema } from "../validation/installSchemas";

/**
 * `auth.install.*` audit taxonomy. Registered in code here so the whole Phase-1
 * installer stream shares one canonical set of action strings; the write
 * emitters live in 02-L02 (`POST /auth/install/admin`). `GET
 * /auth/install/status` emits NO audit entry, so there is deliberately no
 * `auth.install.status` action. The prose doc write in `_docs/AUDIT_SPEC.md` is
 * owned solely by TASK-482-09-L02.
 */
export const INSTALL_AUDIT_ACTIONS = {
  adminCreated: "auth.install.admin.created",
  blocked: "auth.install.blocked",
} as const;

export type InstallRouteDeps = {
  validate: (schema: unknown, payload: unknown) => void;
  isFirstRun?: typeof isFirstRun; // injectable for tests
  createFirstAdmin?: typeof createFirstAdmin; // injectable create seam (02-L02)
  logAudit?: typeof logAudit;
};

function assertNoInstallStatusQuery(query: RouteContext["query"]) {
  const unsupported = Object.entries(query ?? {}).filter(([, value]) => value !== undefined);
  if (unsupported.length === 0) return;
  throw new ApiError(
    "install_query_invalid",
    "Unsupported auth/install/status query parameter",
    400,
    { fields: unsupported.map(([field]) => field) }
  );
}

// Returns `ApiError | null` to match the repo convention (see
// `emailSettingsRoutes.ts` / `pageRoutes.ts` map*Error helpers): a mapped
// domain error is returned, anything unexpected returns `null` so the route
// re-throws the original for the top-level handler. 02-L02 EXTENDS this same
// helper for the admin POST route and MUST keep the null-returning contract.
export const mapInstallRouteError = (error: unknown): ApiError | null => {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    // Post-install / no-users gate rejection (both the pre-check and the
    // in-transaction TOCTOU re-check from 02-L01 raise this).
    if (error.message === "first_run_unavailable") {
      return new ApiError("install_unavailable", "Installation is not available", 409);
    }
    if (error.message === "first_admin_invalid") {
      return new ApiError("install_admin_invalid", "Invalid first admin details", 400);
    }
  }
  // Unmapped/unexpected errors return null so the route re-throws the original
  // and it surfaces as a real 500 (never `throw null`).
  return null;
};

export function registerInstallRoutes(router: Router, deps: InstallRouteDeps) {
  const firstRun = deps.isFirstRun ?? isFirstRun;
  const create = deps.createFirstAdmin ?? createFirstAdmin;
  const audit = deps.logAudit ?? logAudit;

  router.get("/auth/install/status", async (ctx: RouteContext) => {
    assertNoInstallStatusQuery(ctx.query);
    try {
      return { available: await firstRun() };
    } catch (error) {
      const mapped = mapInstallRouteError(error);
      if (mapped) throw mapped;
      throw error;
    }
  });

  // Pre-auth write — the ONLY surface that can create a privileged account
  // without a session. It is fail-closed by the no-users gate (checked here AND
  // re-checked inside the create transaction under pg_advisory_xact_lock in
  // 02-L01), the `auth` rate-limit bucket, strict-schema password validation,
  // and an audit trail. CSRF is exempt by absence (no session ⇒ csrf.ts skips).
  router.post("/auth/install/admin", async (ctx: RouteContext) => {
    deps.validate(installAdminSchema, ctx.body);

    try {
      const admin = await create(ctx.body as CreateFirstAdminInput);

      await audit({
        actorId: admin.id,
        action: INSTALL_AUDIT_ACTIONS.adminCreated,
        targetType: "user",
        targetId: admin.id,
        metadata: { email: admin.email }, // AUDIT_SPEC PII redaction seam applies
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return { ok: true, user: { id: admin.id, email: admin.email, name: admin.name } };
    } catch (error) {
      // A rejected post-install attempt is a security-relevant event: record it
      // before mapping the domain error.
      if (error instanceof Error && error.message === "first_run_unavailable") {
        await audit({
          actorId: null,
          action: INSTALL_AUDIT_ACTIONS.blocked,
          targetType: "install",
          targetId: "auth.install.admin",
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
      }
      const mapped = mapInstallRouteError(error);
      if (mapped) throw mapped;
      throw error;
    }
  });
}
