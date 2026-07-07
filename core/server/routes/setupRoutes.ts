// TASK-482-06-L02: internal starter-content route module. Orchestration-only —
// it validates input, maps the client's id/key selector to a server choice, and
// delegates to `starterContentService` (06-L01); domain errors are mapped at the
// boundary via `mapSetupRouteError` (ApiError passthrough | null convention).
//
// Security (see 06-L02 Security Contract): internal admin writes. Preview and
// apply both require `solution-kits:write` (preview's dry-run persists a
// dry_run run + items + audit row, matching the only real dry-run-that-writes
// precedent `POST /solution-kits/:id/apply`); apply ALSO requires
// `settings:write` because it mutates the `site.*` shell refs. CSRF + the
// `admin_write` rate-limit bucket are applied by the shared HTTP layer.

import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import { logAudit } from "../../services/audit/auditService";
import {
  applyStarterContent,
  previewStarterContent,
  type StarterBlueprintKey,
  type StarterChoice,
} from "../../services/setup/starterContentService";
import { starterContentSchema } from "../validation/setupSchemas";

export type SetupRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type SetupRouteDeps = {
  requirePermission: (permission: string) => SetupRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  // Optional persistence seams (default = real services), same additive
  // injection pattern as InstallRouteDeps.{isFirstRun,createFirstAdmin,logAudit}.
  // Lets the onboarding E2E drive the REAL handler chain (validation, choice
  // enforcement, audit-action strings, error mapping) over an in-memory world
  // without touching the shared remote Postgres.
  previewStarterContent?: typeof previewStarterContent;
  applyStarterContent?: typeof applyStarterContent;
  logAudit?: typeof logAudit;
};

export type Router = {
  post: (path: string, ...handlers: SetupRouteHandler[]) => void;
};

export function mapSetupRouteError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error && error.message === "starter_kit_unknown") {
    return new ApiError("starter_kit_unknown", "Unknown starter kit", 400);
  }
  if (error instanceof Error && error.message === "starter_choice_invalid") {
    return new ApiError("starter_choice_invalid", "Provide exactly one of kitId/blueprintKey", 400);
  }
  return new ApiError("setup_error", "Could not complete starter-content request.", 500);
}

// Map the validated client body to a server StarterChoice. The schema already
// rejects unknown props; here we enforce EXACTLY ONE selector — both or neither
// is `starter_choice_invalid` (400).
export function toChoice(body: unknown): StarterChoice {
  const payload = (body ?? {}) as { kitId?: unknown; blueprintKey?: unknown };
  const hasKitId = typeof payload.kitId === "string";
  const hasBlueprintKey = typeof payload.blueprintKey === "string";
  if (hasKitId === hasBlueprintKey) {
    throw new Error("starter_choice_invalid");
  }
  if (hasKitId) {
    return { kitId: payload.kitId as string };
  }
  return { blueprintKey: payload.blueprintKey as StarterBlueprintKey };
}

export function registerSetupRoutes(router: Router, deps: SetupRouteDeps) {
  const { requirePermission, validate } = deps;
  const preview = deps.previewStarterContent ?? previewStarterContent;
  const apply = deps.applyStarterContent ?? applyStarterContent;
  const audit = deps.logAudit ?? logAudit;

  // Compose guards: apply is both a kit install (solution-kits:write — same
  // permission as POST /solution-kits/:id/apply) and a site-shell settings
  // mutation (settings:write). Every guard must pass.
  const requireAll =
    (...guards: SetupRouteHandler[]) =>
    async (ctx: RouteContext) => {
      for (const guard of guards) {
        await guard(ctx);
      }
    };

  // Preview requires solution-kits:write, NOT :read — previewStarterContent →
  // applyKitInstall({ dryRun: true }) → applySolutionKitInstall persists a
  // dry_run run + items + audit row (see Security Contract).
  router.post(
    "/setup/starter-content/preview",
    requirePermission("solution-kits:write"),
    async (ctx) => {
      validate(starterContentSchema, ctx.body);
      try {
        return { summary: await preview(toChoice(ctx.body)) };
      } catch (error) {
        throw mapSetupRouteError(error);
      }
    }
  );

  router.post(
    "/setup/starter-content/apply",
    requireAll(requirePermission("solution-kits:write"), requirePermission("settings:write")),
    async (ctx) => {
      validate(starterContentSchema, ctx.body);
      try {
        const result = await apply(toChoice(ctx.body), ctx.user!.id);
        await audit({
          actorId: ctx.user!.id,
          action: "setup.starter_content.applied",
          targetType: "settings",
          targetId: "starter_content",
          metadata: { runId: result.runId },
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        return result;
      } catch (error) {
        throw mapSetupRouteError(error);
      }
    }
  );
}
