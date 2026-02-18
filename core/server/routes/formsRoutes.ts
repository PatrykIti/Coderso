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
import { assertFormSubmissionNonce } from "../../services/forms/submissionNonce";
import {
  listSubmissions,
  submitForm,
} from "../../services/forms/submissionService";
import { runFormAutomation } from "../../services/forms/formAutomationRunner";
import { normalizeFormSettings } from "../../services/forms/formSettings";
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

type SubmissionBody = {
  data: Record<string, unknown>;
  captchaToken?: string;
  formNonce?: string;
};

const normalizeSubmissionBody = (body: unknown): SubmissionBody => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { data: {} };
  }

  const payload = body as Record<string, unknown>;
  const resolveToken = (value: unknown) =>
    typeof value === "string" && value.trim().length > 0 ? value : undefined;

  if ("data" in payload && typeof payload.data === "object" && payload.data !== null) {
    const captchaToken = resolveToken(payload.captchaToken);
    const formNonce = resolveToken(payload.formNonce);
    return {
      data: payload.data as Record<string, unknown>,
      ...(captchaToken ? { captchaToken } : {}),
      ...(formNonce ? { formNonce } : {}),
    };
  }

  const { captchaToken, formNonce, __nl_form_nonce, ...rest } = payload;
  const resolvedCaptcha = resolveToken(captchaToken);
  const resolvedFormNonce = resolveToken(formNonce) ?? resolveToken(__nl_form_nonce);

  return {
    data: rest,
    ...(resolvedCaptcha ? { captchaToken: resolvedCaptcha } : {}),
    ...(resolvedFormNonce ? { formNonce: resolvedFormNonce } : {}),
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
      assertFormSubmissionNonce(form.id, body.formNonce);
      const securitySettings = await getSecuritySettings();
      await enforceBotProtection({
        token: body.captchaToken,
        action: "public_write",
        ip: ctx.ip,
        settings: securitySettings.botProtection,
      });
    }

    const submission = await submitForm(ctx.params.id, body.data, {
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    if (!submission) {
      throw new ApiError("form_submission_failed", "Submission failed", 500);
    }

    let automationResult: Awaited<ReturnType<typeof runFormAutomation>> | null = null;
    try {
      automationResult = await runFormAutomation({
        formId: form.id,
        submissionId: submission.id,
        submissionPayload: body.data,
        submittedAt: submission.createdAt,
        settings: normalizeFormSettings(form.settings),
      });
    } catch {
      // Submission persistence must not fail when action pipeline has unexpected runtime issues.
      automationResult = null;
    }

    return {
      ...submission,
      runtime: {
        successMessage: automationResult?.successMessage ?? form.successMessage ?? null,
        redirectUrl: automationResult?.redirectUrl ?? form.successRedirectUrl ?? null,
      },
    };
  });
}
