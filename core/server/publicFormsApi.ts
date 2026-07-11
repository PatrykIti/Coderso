import { ApiError, toErrorResponse } from "./errorHandler";
import { attachUserFromSession } from "./middleware/auth";
import { enforceCsrf } from "./middleware/csrf";
import { checkRateLimit, type RateLimitIdentity } from "./middleware/rateLimit";
import { requirePermission } from "./middleware/rbac";
import { parseRequestBody, type ParseRequestBodyOptions } from "./requestBody";
import {
  createPreparedFormWriteForm,
  createPreparedFormWriteDescriptor,
  handleFormAttachmentUploadRoute,
  handleFormSubmissionRoute,
  mapFormError,
  type PreparedFormWriteAccess,
  type PreparedFormWriteForm,
  type PreparedFormWriteKind,
  type FormWriteAccessTarget,
  type RouteContext,
} from "./routes/formsRoutes";
import { validate } from "./validation/schemaValidator";
import { getForm, getFormWriteState, listFormFields } from "../services/forms/formsService";
import { submitForm } from "../services/forms/submissionService";
import { uploadMedia } from "../services/media/mediaService";
import {
  evaluateSubmissionAccess,
  SUBMISSION_ACCESS_MODE_VALUES,
  type SubmissionAccessMode,
} from "../services/forms/submissionAccess";
import { authenticateApiKey } from "../services/security/apiKeyAuth";
import type { SecuritySettings } from "../services/settings/securitySettings";
import { getStorageSettingsInternal } from "../services/settings/storageSettings";

export type PublicFormsApiContext = {
  url: URL;
  ip?: string;
  userAgent?: string;
  security: SecuritySettings;
};

export const UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER = "forms_write_invalid_target";

const FORM_WRITE_ID_MAX_ENCODED_BYTES = 108;
const FORM_SUBMISSION_MAX_BYTES = 1024 * 1024;
const FORM_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;
const FORM_UPLOAD_ENVELOPE_BYTES = 64 * 1024;
const FORM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UPLOAD_DUPLICATE_KEYS = ["fieldName", "file", "formNonce", "captchaToken"] as const;

type FormWritePathMatch =
  | { matched: false }
  | {
      matched: true;
      kind: PreparedFormWriteKind;
      formId: string | null;
    };

type PreparedFormWriteTarget = Readonly<{
  status: "found";
  mode: SubmissionAccessMode;
  form: Readonly<PreparedFormWriteForm>;
}>;

type FormWriteTargetResult =
  | PreparedFormWriteTarget
  | Readonly<{ status: "missing" }>
  | Readonly<{ status: "invalid-mode" }>;

export type FormWriteRatePlan = Readonly<{
  bucket: "public_write" | "admin_write";
  identity: RateLimitIdentity & { identifier: string };
  isAuthenticated: boolean;
}>;

export type FormWriteExecution =
  | Readonly<{ matched: false }>
  | Readonly<{
      matched: true;
      ok: true;
      result: unknown;
      routeContext: RouteContext;
    }>
  | Readonly<{
      matched: true;
      ok: false;
      error: unknown;
      routeContext: RouteContext;
    }>;

export type FormWriteExecutorContext = PublicFormsApiContext & {
  pathname?: string;
  requestId?: string;
  requestStart?: number;
};

export type FormWriteExecutorDeps = {
  attachSession: (ctx: RouteContext) => Promise<void>;
  loadAccessTarget: (formId: string) => Promise<FormWriteAccessTarget | null>;
  loadCurrentFormWriteState: typeof getFormWriteState;
  chargeRateLimit: typeof checkRateLimit;
  authenticateApiKey: typeof authenticateApiKey;
  enforceSessionCsrf: typeof enforceCsrf;
  requireSessionFormsWrite: (ctx: RouteContext) => Promise<void>;
  loadUploadStorageMaxBytes: () => Promise<number | null>;
  parseBody: (req: Request, options?: ParseRequestBodyOptions) => Promise<unknown>;
  dispatchSubmission: (
    ctx: RouteContext,
    botProtectionSettings: SecuritySettings["botProtection"]
  ) => Promise<unknown>;
  dispatchUpload: (
    ctx: RouteContext,
    botProtectionSettings: SecuritySettings["botProtection"]
  ) => Promise<unknown>;
};

const defaultFormWriteExecutorDeps: FormWriteExecutorDeps = {
  async attachSession(ctx) {
    await attachUserFromSession(ctx);
  },
  loadAccessTarget: getForm,
  loadCurrentFormWriteState: getFormWriteState,
  chargeRateLimit: checkRateLimit,
  authenticateApiKey,
  enforceSessionCsrf: enforceCsrf,
  async requireSessionFormsWrite(ctx) {
    await requirePermission("forms:write")(ctx);
  },
  async loadUploadStorageMaxBytes() {
    return (await getStorageSettingsInternal()).maxSizeBytes;
  },
  parseBody: parseRequestBody,
  async dispatchSubmission(ctx, botProtectionSettings) {
    return handleFormSubmissionRoute(ctx, {
      validate,
      botProtectionSettings,
      persistSubmission: submitForm,
    });
  },
  async dispatchUpload(ctx, botProtectionSettings) {
    return handleFormAttachmentUploadRoute(ctx, {
      validate,
      botProtectionSettings,
      loadFormFields: listFormFields,
      persistUpload: uploadMedia,
    });
  },
};

let formWriteExecutorTestDeps: Partial<FormWriteExecutorDeps> | null = null;

const getFormWriteExecutorDeps = (): FormWriteExecutorDeps => ({
  ...defaultFormWriteExecutorDeps,
  ...(process.env.NODE_ENV === "production" ? {} : (formWriteExecutorTestDeps ?? {})),
});

export function __setFormWriteExecutorDepsForTests(
  overrides: Partial<FormWriteExecutorDeps> | null
): void {
  if (process.env.NODE_ENV === "production" && overrides !== null) {
    throw new Error("form_write_executor_test_override_forbidden_in_production");
  }
  formWriteExecutorTestDeps = overrides === null ? null : { ...overrides };
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const mapFormWriteBoundaryError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  return mapFormError(error) ?? new ApiError("internal_error", "Unexpected error", 500);
};

const errorResponse = (error: unknown) => {
  const mapped = mapFormWriteBoundaryError(error);
  return jsonResponse(toErrorResponse(mapped), mapped.status);
};

const parseCookies = (header: string | null) => {
  if (!header) return {} as Record<string, string>;
  const cookies: Record<string, string> = {};
  for (const entry of header.split(";")) {
    const chunk = entry.trim();
    if (!chunk) continue;
    const splitIndex = chunk.indexOf("=");
    if (splitIndex <= 0) continue;
    const key = chunk.slice(0, splitIndex).trim();
    const rawValue = chunk.slice(splitIndex + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }
  return cookies;
};

const buildHeadersRecord = (req: Request) => {
  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
};

const matchFormWritePath = (method: string, pathname: string): FormWritePathMatch => {
  if (method.toUpperCase() !== "POST") return { matched: false };
  const parts = pathname.split("/").filter(Boolean);
  if (
    parts.length !== 3 ||
    parts[0] !== "forms" ||
    (parts[2] !== "uploads" && parts[2] !== "submissions")
  ) {
    return { matched: false };
  }

  const kind = parts[2] === "uploads" ? "upload" : "submission";
  const encodedId = parts[1] ?? "";
  if (new TextEncoder().encode(encodedId).byteLength > FORM_WRITE_ID_MAX_ENCODED_BYTES) {
    return { matched: true, kind, formId: null };
  }

  let decodedId: string;
  try {
    decodedId = decodeURIComponent(encodedId);
  } catch {
    return { matched: true, kind, formId: null };
  }
  if (!FORM_ID_PATTERN.test(decodedId)) {
    return { matched: true, kind, formId: null };
  }
  return { matched: true, kind, formId: decodedId.toLowerCase() };
};

const hasCoherentSession = (
  ctx: RouteContext
): ctx is RouteContext & {
  user: NonNullable<RouteContext["user"]>;
  sessionId: string;
} => Boolean(ctx.user?.id && ctx.sessionId);

const createRouteContext = (
  req: Request,
  ctx: FormWriteExecutorContext,
  formId: string
): RouteContext => ({
  params: { id: formId },
  query: Object.fromEntries(ctx.url.searchParams.entries()),
  body: undefined,
  headers: buildHeadersRecord(req),
  cookies: parseCookies(req.headers.get("cookie")),
  ip: ctx.ip,
  userAgent: ctx.userAgent,
  requestId: ctx.requestId,
  requestStart: ctx.requestStart,
});

async function prepareFormWriteTarget(
  routeContext: RouteContext,
  formId: string,
  deps: FormWriteExecutorDeps
): Promise<FormWriteTargetResult> {
  await deps.attachSession(routeContext);
  if (Boolean(routeContext.user) !== Boolean(routeContext.sessionId)) {
    throw new Error("form_write_session_invalid");
  }

  const loaded = await deps.loadAccessTarget(formId);
  if (loaded === null) return Object.freeze({ status: "missing" });
  let form: PreparedFormWriteForm;
  try {
    form = createPreparedFormWriteForm(loaded);
  } catch {
    return Object.freeze({ status: "invalid-mode" });
  }
  if (form.id !== formId || !SUBMISSION_ACCESS_MODE_VALUES.includes(form.submissionAccess)) {
    return Object.freeze({ status: "invalid-mode" });
  }

  return Object.freeze({
    status: "found",
    mode: form.submissionAccess,
    form,
  });
}

const unresolvedRatePlan = (ctx: RouteContext): FormWriteRatePlan =>
  Object.freeze({
    bucket: "public_write",
    identity: Object.freeze({
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      identifier: UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER,
    }),
    isAuthenticated: false,
  });

export function resolveFormWriteRatePlan(
  routeContext: RouteContext,
  target: PreparedFormWriteTarget
): FormWriteRatePlan {
  if (target.mode === "public") {
    return Object.freeze({
      bucket: "public_write",
      identity: Object.freeze({
        ip: routeContext.ip,
        userAgent: routeContext.userAgent,
        identifier: target.form.id,
      }),
      isAuthenticated: false,
    });
  }

  if (hasCoherentSession(routeContext)) {
    return Object.freeze({
      bucket: "admin_write",
      identity: Object.freeze({
        ip: routeContext.ip,
        userAgent: routeContext.userAgent,
        identifier: target.form.id,
        userId: routeContext.user.id,
      }),
      isAuthenticated: true,
    });
  }

  return Object.freeze({
    bucket: "admin_write",
    identity: Object.freeze({
      ip: routeContext.ip,
      userAgent: routeContext.userAgent,
      identifier: target.form.id,
    }),
    isAuthenticated: false,
  });
}

const chargeRatePlan = (
  plan: FormWriteRatePlan,
  security: SecuritySettings,
  deps: FormWriteExecutorDeps
) => {
  deps.chargeRateLimit(plan.bucket, plan.identity, security.rateLimit, {
    isAuthenticated: plan.isAuthenticated,
  });
};

const isPublishedPublicFormWriteState = (value: unknown): boolean => {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 2 || !keys.every((key) => key === "status" || key === "submissionAccess")) {
    return false;
  }
  const status = Object.getOwnPropertyDescriptor(value, "status");
  const submissionAccess = Object.getOwnPropertyDescriptor(value, "submissionAccess");
  return (
    Boolean(status && "value" in status && !status.get && !status.set) &&
    status?.value === "published" &&
    Boolean(
      submissionAccess &&
      "value" in submissionAccess &&
      !submissionAccess.get &&
      !submissionAccess.set
    ) &&
    submissionAccess?.value === "public"
  );
};

const mapSessionAuthorizationError = (error: unknown): never => {
  if (error instanceof ApiError) throw error;
  if (error instanceof Error && error.message === "auth_required") {
    throw new ApiError("auth_required", "Not authenticated", 401);
  }
  if (error instanceof Error && error.message === "forbidden") {
    throw new ApiError("forbidden", "Forbidden", 403);
  }
  throw error;
};

async function authorizePreparedFormWrite(
  req: Request,
  routeContext: RouteContext,
  target: PreparedFormWriteTarget,
  security: SecuritySettings,
  deps: FormWriteExecutorDeps
): Promise<PreparedFormWriteAccess> {
  if (target.mode === "public") {
    const decision = evaluateSubmissionAccess({
      mode: "public",
      isAuthenticated: hasCoherentSession(routeContext),
    });
    if (!decision.allow) throw new Error("form_write_access_invalid");
    return decision;
  }

  if (hasCoherentSession(routeContext)) {
    await deps.enforceSessionCsrf(req, routeContext, security.csrf);
    try {
      await deps.requireSessionFormsWrite(routeContext);
    } catch (error) {
      mapSessionAuthorizationError(error);
    }
    const decision = evaluateSubmissionAccess({ mode: "internal", isAuthenticated: true });
    if (!decision.allow) throw new Error("form_write_access_invalid");
    return decision;
  }

  const apiKey = await deps.authenticateApiKey(routeContext.headers?.authorization ?? null);
  const decision = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: apiKey?.scopes,
  });
  if (!decision.allow) {
    throw new ApiError(
      decision.reason,
      decision.reason === "forbidden" ? "Forbidden" : "Not authenticated",
      decision.reason === "forbidden" ? 403 : 401
    );
  }
  return decision;
}

const failure = (routeContext: RouteContext, error: unknown): FormWriteExecution =>
  Object.freeze({ matched: true as const, ok: false as const, error, routeContext });

const rejectAfterRateCharge = (
  routeContext: RouteContext,
  error: unknown,
  security: SecuritySettings,
  deps: FormWriteExecutorDeps
): FormWriteExecution => {
  try {
    chargeRatePlan(unresolvedRatePlan(routeContext), security, deps);
    return failure(routeContext, error);
  } catch (rateError) {
    return failure(routeContext, rateError);
  }
};

export async function executePreparedFormWrite(
  req: Request,
  ctx: FormWriteExecutorContext
): Promise<FormWriteExecution> {
  const match = matchFormWritePath(req.method, ctx.pathname ?? ctx.url.pathname);
  if (!match.matched) return Object.freeze({ matched: false });

  const deps = getFormWriteExecutorDeps();
  const routeContext = createRouteContext(req, ctx, match.formId ?? "");
  if (match.formId === null) {
    return rejectAfterRateCharge(
      routeContext,
      new ApiError("form_invalid", "Invalid form identifier.", 400),
      ctx.security,
      deps
    );
  }

  let target: FormWriteTargetResult;
  try {
    target = await prepareFormWriteTarget(routeContext, match.formId, deps);
  } catch (error) {
    return rejectAfterRateCharge(routeContext, error, ctx.security, deps);
  }

  if (target.status === "missing") {
    return rejectAfterRateCharge(
      routeContext,
      new ApiError("form_not_found", "Form not found.", 404),
      ctx.security,
      deps
    );
  }
  if (target.status === "invalid-mode") {
    return rejectAfterRateCharge(
      routeContext,
      new ApiError("form_invalid", "Invalid form access mode.", 400),
      ctx.security,
      deps
    );
  }

  try {
    chargeRatePlan(resolveFormWriteRatePlan(routeContext, target), ctx.security, deps);
    if (target.mode === "public" && target.form.status !== "published") {
      throw new Error("form_unpublished");
    }
    const access = await authorizePreparedFormWrite(req, routeContext, target, ctx.security, deps);

    let bodyOptions: ParseRequestBodyOptions;
    if (match.kind === "upload") {
      const configuredMax = await deps.loadUploadStorageMaxBytes();
      if (configuredMax === null || !Number.isSafeInteger(configuredMax) || configuredMax <= 0) {
        throw new ApiError("media_storage_unavailable", "Media storage is unavailable", 503);
      }
      bodyOptions = {
        maxBytes: Math.min(configuredMax, FORM_UPLOAD_MAX_BYTES) + FORM_UPLOAD_ENVELOPE_BYTES,
        rejectDuplicateKeys: UPLOAD_DUPLICATE_KEYS,
        tooLargeCode: "media_file_too_large",
      };
    } else {
      bodyOptions = {
        maxBytes: FORM_SUBMISSION_MAX_BYTES,
        tooLargeCode: "form_payload_too_large",
      };
    }

    routeContext.body = await deps.parseBody(req, bodyOptions);
    if (target.mode === "public") {
      let currentState: unknown;
      try {
        currentState = await deps.loadCurrentFormWriteState(target.form.id);
      } catch {
        throw new Error("form_write_state_unavailable");
      }
      if (!isPublishedPublicFormWriteState(currentState)) {
        throw new Error("form_unpublished");
      }
    }
    routeContext.preparedFormWrite = createPreparedFormWriteDescriptor({
      kind: match.kind,
      formId: target.form.id,
      form: target.form,
      access,
    });

    const result =
      match.kind === "upload"
        ? await deps.dispatchUpload(routeContext, ctx.security.botProtection)
        : await deps.dispatchSubmission(routeContext, ctx.security.botProtection);
    return Object.freeze({
      matched: true as const,
      ok: true as const,
      result,
      routeContext,
    });
  } catch (error) {
    return failure(routeContext, error);
  }
}

export async function handlePublicFormsApi(
  req: Request,
  ctx: PublicFormsApiContext
): Promise<Response | null> {
  const execution = await executePreparedFormWrite(req, ctx);
  if (!execution.matched) return null;
  if (!execution.ok) return errorResponse(execution.error);
  return jsonResponse(execution.result);
}
