import {
  createForm,
  deleteForm,
  getForm,
  listFormFields,
  listForms,
  setFormFields,
  updateForm,
} from "../../services/forms/formsService";
import {
  evaluateSubmissionAccess,
  normalizeSubmissionAccess,
} from "../../services/forms/submissionAccess";
import {
  listSubmissions,
  submitForm,
} from "../../services/forms/submissionService";
import { ApiError } from "../errorHandler";
import { authenticateApiKey } from "../../services/security/apiKeyAuth";
import { enforceBotProtection } from "../../services/security/botProtection";
import { getSecuritySettings } from "../../services/settings/securitySettings";
import {
  formCreateSchema,
  formFieldsSchema,
  formSubmissionSchema,
  formUpdateSchema,
} from "../validation/formSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  headers?: Record<string, string | undefined>;
  user?: { id: string; email?: string; name?: string | null };
  ip?: string;
  userAgent?: string;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
  put: (path: string, ...handlers: RouteHandler[]) => void;
};

export type FormsRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

type SubmissionBody = { data: Record<string, unknown>; captchaToken?: string };

const normalizeSubmissionBody = (body: unknown): SubmissionBody => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { data: {} };
  }

  const payload = body as Record<string, unknown>;
  if ("data" in payload && typeof payload.data === "object" && payload.data !== null) {
    return payload as SubmissionBody;
  }

  const { captchaToken, ...rest } = payload;
  return {
    data: rest,
    ...(captchaToken !== undefined ? { captchaToken: captchaToken as string } : {}),
  };
};

export function registerFormsRoutes(router: Router, deps: FormsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/forms", requirePermission("forms:read"), async () => {
    return listForms();
  });

  router.post("/forms", requirePermission("forms:write"), async (ctx) => {
    validate(formCreateSchema, ctx.body);
    return createForm(ctx.body as Parameters<typeof createForm>[0]);
  });

  router.get("/forms/:id", requirePermission("forms:read"), async (ctx) => {
    const form = await getForm(ctx.params.id);
    if (!form) throw new Error("form_not_found");
    return form;
  });

  router.patch("/forms/:id", requirePermission("forms:write"), async (ctx) => {
    validate(formUpdateSchema, ctx.body);
    const updated = await updateForm(ctx.params.id, ctx.body as Parameters<typeof updateForm>[1]);
    if (!updated) throw new Error("form_not_found");
    return updated;
  });

  router.delete("/forms/:id", requirePermission("forms:write"), async (ctx) => {
    const deleted = await deleteForm(ctx.params.id);
    if (!deleted) throw new Error("form_not_found");
    return { ok: true };
  });

  router.get("/forms/:id/fields", requirePermission("forms:read"), async (ctx) => {
    return listFormFields(ctx.params.id);
  });

  router.put("/forms/:id/fields", requirePermission("forms:write"), async (ctx) => {
    validate(formFieldsSchema, ctx.body);
    return setFormFields(ctx.params.id, ctx.body as Parameters<typeof setFormFields>[1]);
  });

  router.get(
    "/forms/:id/submissions",
    requirePermission("forms:read"),
    async (ctx) => {
      return listSubmissions(ctx.params.id);
    }
  );

  router.post("/forms/:id/submissions", async (ctx) => {
    const normalized = normalizeSubmissionBody(ctx.body);
    validate(formSubmissionSchema, normalized);
    const body = normalized as SubmissionBody;

    const form = await getForm(ctx.params.id);
    if (!form) throw new Error("form_not_found");

    const accessMode = normalizeSubmissionAccess(form.submissionAccess, "public");
    const apiKey =
      accessMode === "internal"
        ? await authenticateApiKey(ctx.headers?.authorization ?? null)
        : null;
    const access = evaluateSubmissionAccess({
      mode: accessMode,
      isAuthenticated: Boolean(ctx.user),
      apiKeyScopes: apiKey?.scopes,
    });

    if (!access.allow) {
      if (access.reason === "forbidden") {
        throw new ApiError("forbidden", "Forbidden", 403);
      }
      throw new ApiError("auth_required", "Not authenticated", 401);
    }

    if (accessMode === "internal" && ctx.user) {
      await requirePermission("forms:write")(ctx);
    }

    if (access.requireCaptcha) {
      const securitySettings = await getSecuritySettings();
      await enforceBotProtection({
        token: body.captchaToken,
        action: "public_write",
        ip: ctx.ip,
        settings: securitySettings.botProtection,
      });
    }

    return submitForm(ctx.params.id, body.data, {
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  });
}
