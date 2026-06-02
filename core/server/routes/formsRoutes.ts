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
import { listSubmissions, submitForm } from "../../services/forms/submissionService";
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
  cookies?: Record<string, string | undefined>;
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

export const mapFormError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  if (!(error instanceof Error)) return null;

  switch (error.message) {
    case "form_invalid":
      return new ApiError("form_invalid", "Invalid form payload.", 400);
    case "form_name_required":
      return new ApiError("form_name_required", "Form name is required.", 400);
    case "form_slug_required":
      return new ApiError("form_slug_required", "Form slug is required.", 400);
    case "form_slug_exists":
      return new ApiError("form_slug_exists", "Form slug already exists.", 409);
    case "form_not_found":
      return new ApiError("form_not_found", "Form not found.", 404);
    case "form_delete_restricted":
      return new ApiError(
        "form_delete_restricted",
        "Form has retained submissions or action diagnostics. Archive it instead of deleting.",
        409
      );
    case "form_fields_invalid":
      return new ApiError("form_fields_invalid", "Form fields payload is invalid.", 400);
    case "form_field_invalid":
      return new ApiError("form_field_invalid", "Form field payload is invalid.", 400);
    case "form_field_label_required":
      return new ApiError("form_field_label_required", "Form field label is required.", 400);
    case "form_field_id_duplicate":
      return new ApiError("form_field_id_duplicate", "Form field id must be unique.", 400);
    case "form_field_name_duplicate":
      return new ApiError("form_field_name_duplicate", "Form field name must be unique.", 400);
    case "form_payload_invalid":
      return new ApiError("form_payload_invalid", "Form submission payload is invalid.", 400);
    case "form_payload_unknown_field":
      return new ApiError(
        "form_payload_unknown_field",
        "Form submission contains an unknown field.",
        400
      );
    case "form_payload_required":
      return new ApiError(
        "form_payload_required",
        "Required form submission field is missing.",
        400
      );
    case "form_success_redirect_url_invalid":
      return new ApiError(
        "form_success_redirect_url_invalid",
        "Form success redirect URL must be a same-origin relative path.",
        400
      );
    default:
      return null;
  }
};

const throwMappedFormError = (error: unknown): never => {
  const mapped = mapFormError(error);
  if (mapped) throw mapped;
  throw error;
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

export type FormSubmissionRouteDeps = {
  requirePermission: FormsRouteDeps["requirePermission"];
  validate: FormsRouteDeps["validate"];
};

export async function handleFormSubmissionRoute(ctx: RouteContext, deps: FormSubmissionRouteDeps) {
  const { requirePermission, validate } = deps;
  const normalized = normalizeSubmissionBody(ctx.body);
  validate(formSubmissionSchema, normalized);
  const body = normalized as SubmissionBody;

  let form: Awaited<ReturnType<typeof getForm>> | null = null;
  try {
    form = await getForm(ctx.params.id);
  } catch (error) {
    throwMappedFormError(error);
  }
  if (!form) {
    throw new ApiError("form_not_found", "Form not found.", 404);
  }
  const resolvedForm = form;

  const accessMode = normalizeSubmissionAccess(resolvedForm.submissionAccess, "public");
  const apiKey =
    accessMode === "internal" ? await authenticateApiKey(ctx.headers?.authorization ?? null) : null;
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
    assertFormSubmissionNonce(resolvedForm.id, body.formNonce);
    const securitySettings = await getSecuritySettings();
    await enforceBotProtection({
      token: body.captchaToken,
      action: "public_write",
      ip: ctx.ip,
      settings: securitySettings.botProtection,
    });
  }

  let submission: Awaited<ReturnType<typeof submitForm>> | null = null;
  try {
    submission = await submitForm(ctx.params.id, body.data, {
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  } catch (error) {
    throwMappedFormError(error);
  }
  if (!submission) {
    throw new ApiError("form_submission_failed", "Submission failed", 500);
  }

  let automationResult: Awaited<ReturnType<typeof runFormAutomation>> | null = null;
  try {
    automationResult = await runFormAutomation({
      formId: resolvedForm.id,
      submissionId: submission.id,
      submissionPayload: body.data,
      submittedAt: submission.createdAt,
      settings: normalizeFormSettings(resolvedForm.settings),
    });
  } catch {
    // Submission persistence must not fail when action pipeline has unexpected runtime issues.
    automationResult = null;
  }

  return {
    ...submission,
    runtime: {
      successMessage: automationResult?.successMessage ?? resolvedForm.successMessage ?? null,
      redirectUrl: automationResult?.redirectUrl ?? resolvedForm.successRedirectUrl ?? null,
    },
  };
}

export function registerFormsRoutes(router: Router, deps: FormsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/forms", requirePermission("forms:read"), async () => {
    return listForms();
  });

  router.post("/forms", requirePermission("forms:write"), async (ctx) => {
    validate(formCreateSchema, ctx.body);
    try {
      return await createForm(ctx.body as Parameters<typeof createForm>[0]);
    } catch (error) {
      throwMappedFormError(error);
    }
  });

  router.get("/forms/:id", requirePermission("forms:read"), async (ctx) => {
    try {
      const form = await getForm(ctx.params.id);
      if (!form) throw new Error("form_not_found");
      return form;
    } catch (error) {
      throwMappedFormError(error);
    }
  });

  router.patch("/forms/:id", requirePermission("forms:write"), async (ctx) => {
    validate(formUpdateSchema, ctx.body);
    try {
      const updated = await updateForm(ctx.params.id, ctx.body as Parameters<typeof updateForm>[1]);
      if (!updated) throw new Error("form_not_found");
      return updated;
    } catch (error) {
      throwMappedFormError(error);
    }
  });

  router.delete("/forms/:id", requirePermission("forms:write"), async (ctx) => {
    try {
      const deleted = await deleteForm(ctx.params.id);
      if (!deleted) throw new Error("form_not_found");
      return { ok: true };
    } catch (error) {
      throwMappedFormError(error);
    }
  });

  router.get("/forms/:id/fields", requirePermission("forms:read"), async (ctx) => {
    return listFormFields(ctx.params.id);
  });

  router.put("/forms/:id/fields", requirePermission("forms:write"), async (ctx) => {
    validate(formFieldsSchema, ctx.body);
    try {
      return await setFormFields(ctx.params.id, ctx.body as Parameters<typeof setFormFields>[1]);
    } catch (error) {
      throwMappedFormError(error);
    }
  });

  router.get("/forms/:id/submissions", requirePermission("forms:read"), async (ctx) => {
    return listSubmissions(ctx.params.id);
  });

  router.post("/forms/:id/submissions", async (ctx) => {
    return handleFormSubmissionRoute(ctx, { requirePermission, validate });
  });
}
