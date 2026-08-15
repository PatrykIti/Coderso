import {
  createForm,
  deleteForm,
  getForm,
  listFormFields,
  listForms,
  setFormFields,
  toFieldRecord,
  updateForm,
} from "../../services/forms/formsService";
import { uploadMedia } from "../../services/media/mediaService";
import type { UploadFile } from "../../services/media/storage/adapter";
import {
  type SubmissionAccessDecision,
  type SubmissionAccessMode,
} from "../../services/forms/submissionAccess";
import { assertFormSubmissionNonce } from "../../services/forms/submissionNonce";
import { listSubmissions, submitForm } from "../../services/forms/submissionService";
import { buildFormSubmissionsExport } from "../../services/forms/submissionExport";
import { runFormAutomation } from "../../services/forms/formAutomationRunner";
import { normalizeFormSettings } from "../../services/forms/formSettings";
import { isFormStatus, type FormStatus } from "../../services/forms/formStatus";
import { ApiError } from "../errorHandler";
import { enforceBotProtection } from "../../services/security/botProtection";
import type { SecuritySettings } from "../../services/settings/securitySettings";
import type { RouteContext as RouterRouteContext } from "../router";
import {
  formAttachmentUploadSchema,
  formCreateSchema,
  formFieldsSchema,
  formSubmissionSchema,
  formSubmissionsExportQuerySchema,
  formUpdateSchema,
} from "../validation/formSchemas";

export type PreparedFormWriteKind = "upload" | "submission";
export type PreparedFormWriteAccess = Extract<SubmissionAccessDecision, { allow: true }>;
export type FormWriteAccessTarget = NonNullable<Awaited<ReturnType<typeof getForm>>>;
export type PreparedFormWriteForm = Readonly<{
  id: string;
  status: FormStatus;
  submissionAccess: SubmissionAccessMode;
  successMessage: string | null;
  successRedirectUrl: string | null;
  settings: unknown;
}>;

export type PreparedFormWriteDescriptor = Readonly<{
  kind: PreparedFormWriteKind;
  formId: string;
  form: Readonly<PreparedFormWriteForm>;
  access: PreparedFormWriteAccess;
}>;

const preparedFormWriteDescriptors = new WeakSet<PreparedFormWriteDescriptor>();

const PREPARED_FORM_KEYS = [
  "id",
  "status",
  "submissionAccess",
  "successMessage",
  "successRedirectUrl",
  "settings",
] as const;
const PREPARED_ACCESS_KEYS = [
  "allow",
  "mode",
  "principal",
  "requireFormNonce",
  "requireCaptcha",
  "requireSessionCsrf",
  "rateBucket",
] as const;

const isOrdinaryObject = (value: object) => {
  return Object.getPrototypeOf(value) === Object.prototype;
};

const readOwnDataDescriptor = (input: object, key: PropertyKey): PropertyDescriptor => {
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) {
    throw new Error("form_write_descriptor_invalid");
  }
  return descriptor;
};

const readOwnDataValue = (input: object, key: PropertyKey): unknown =>
  readOwnDataDescriptor(input, key).value;

const assertDataOnlyOwnProperties = (input: object) => {
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") throw new Error("form_write_descriptor_invalid");
    readOwnDataDescriptor(input, key);
  }
};

const snapshotDataTree = (value: unknown, ancestors = new WeakSet<object>()): unknown => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (typeof value !== "object") throw new Error("form_write_descriptor_invalid");
  if (ancestors.has(value)) throw new Error("form_write_descriptor_invalid");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new Error("form_write_descriptor_invalid");
      }
      const keys = Reflect.ownKeys(value);
      const length = readOwnDataValue(value, "length");
      if (
        typeof length !== "number" ||
        !Number.isSafeInteger(length) ||
        keys.length !== length + 1 ||
        keys.some(
          (key) =>
            typeof key === "symbol" || (key !== "length" && !/^(0|[1-9]\d*)$/.test(String(key)))
        )
      ) {
        throw new Error("form_write_descriptor_invalid");
      }
      const snapshot: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = readOwnDataDescriptor(value, String(index));
        if (!descriptor.enumerable) throw new Error("form_write_descriptor_invalid");
        snapshot.push(snapshotDataTree(descriptor.value, ancestors));
      }
      return Object.freeze(snapshot);
    }
    if (!isOrdinaryObject(value)) throw new Error("form_write_descriptor_invalid");
    const snapshot: Record<string, unknown> = {};
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") throw new Error("form_write_descriptor_invalid");
      const descriptor = readOwnDataDescriptor(value, key);
      if (!descriptor.enumerable) throw new Error("form_write_descriptor_invalid");
      Object.defineProperty(snapshot, key, {
        value: snapshotDataTree(descriptor.value, ancestors),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return Object.freeze(snapshot);
  } finally {
    ancestors.delete(value);
  }
};

const hasExactOwnKeys = (input: object, expected: readonly string[]) => {
  const actual = Reflect.ownKeys(input);
  return (
    actual.length === expected.length &&
    actual.every((key) => typeof key === "string" && expected.includes(key))
  );
};

export function createPreparedFormWriteForm(input: FormWriteAccessTarget): PreparedFormWriteForm {
  if (!input || typeof input !== "object" || !isOrdinaryObject(input)) {
    throw new Error("form_write_descriptor_invalid");
  }
  assertDataOnlyOwnProperties(input);
  const id = readOwnDataValue(input, "id");
  const status = readOwnDataValue(input, "status");
  const submissionAccess = readOwnDataValue(input, "submissionAccess");
  const successMessage = readOwnDataValue(input, "successMessage");
  const successRedirectUrl = readOwnDataValue(input, "successRedirectUrl");
  if (
    typeof id !== "string" ||
    !isFormStatus(status) ||
    (submissionAccess !== "public" && submissionAccess !== "internal") ||
    (successMessage !== null && typeof successMessage !== "string") ||
    (successRedirectUrl !== null && typeof successRedirectUrl !== "string")
  ) {
    throw new Error("form_write_descriptor_invalid");
  }
  return Object.freeze({
    id,
    status,
    submissionAccess,
    successMessage,
    successRedirectUrl,
    settings: snapshotDataTree(readOwnDataValue(input, "settings")),
  });
}

const snapshotPreparedAccess = (
  input: PreparedFormWriteAccess,
  formMode: SubmissionAccessMode
): PreparedFormWriteAccess => {
  if (!input || typeof input !== "object" || !isOrdinaryObject(input)) {
    throw new Error("form_write_descriptor_invalid");
  }
  assertDataOnlyOwnProperties(input);
  if (!hasExactOwnKeys(input, PREPARED_ACCESS_KEYS)) {
    throw new Error("form_write_descriptor_invalid");
  }
  const allow = readOwnDataValue(input, "allow");
  const mode = readOwnDataValue(input, "mode");
  const principal = readOwnDataValue(input, "principal");
  const requireFormNonce = readOwnDataValue(input, "requireFormNonce");
  const requireCaptcha = readOwnDataValue(input, "requireCaptcha");
  const requireSessionCsrf = readOwnDataValue(input, "requireSessionCsrf");
  const rateBucket = readOwnDataValue(input, "rateBucket");
  if (
    allow !== true ||
    mode !== formMode ||
    (mode !== "public" && mode !== "internal") ||
    (principal !== "anonymous" && principal !== "session" && principal !== "apiKey")
  ) {
    throw new Error("form_write_descriptor_invalid");
  }
  if (mode === "public") {
    if (
      (principal !== "anonymous" && principal !== "session") ||
      requireFormNonce !== true ||
      requireCaptcha !== (principal === "anonymous") ||
      requireSessionCsrf !== false ||
      rateBucket !== "public_write"
    ) {
      throw new Error("form_write_descriptor_invalid");
    }
    return Object.freeze({
      allow: true,
      mode,
      principal,
      requireFormNonce: true,
      requireCaptcha,
      requireSessionCsrf: false,
      rateBucket: "public_write",
    });
  }
  if (
    (principal !== "session" && principal !== "apiKey") ||
    requireFormNonce !== false ||
    requireCaptcha !== false ||
    requireSessionCsrf !== (principal === "session") ||
    rateBucket !== "admin_write"
  ) {
    throw new Error("form_write_descriptor_invalid");
  }
  if (principal === "session") {
    return Object.freeze({
      allow: true,
      mode,
      principal,
      requireFormNonce: false,
      requireCaptcha: false,
      requireSessionCsrf: true,
      rateBucket: "admin_write",
    });
  }
  return Object.freeze({
    allow: true,
    mode,
    principal,
    requireFormNonce: false,
    requireCaptcha: false,
    requireSessionCsrf: false,
    rateBucket: "admin_write",
  });
};

export function createPreparedFormWriteDescriptor(input: {
  kind: PreparedFormWriteKind;
  formId: string;
  form: Readonly<PreparedFormWriteForm>;
  access: PreparedFormWriteAccess;
}): PreparedFormWriteDescriptor {
  if (input.kind !== "upload" && input.kind !== "submission") {
    throw new Error("form_write_descriptor_invalid");
  }
  if (!hasExactOwnKeys(input.form, PREPARED_FORM_KEYS)) {
    throw new Error("form_write_descriptor_invalid");
  }
  const form = createPreparedFormWriteForm(input.form as FormWriteAccessTarget);
  if (input.formId !== form.id) throw new Error("form_write_descriptor_invalid");
  const access = snapshotPreparedAccess(input.access, form.submissionAccess);
  const descriptor = Object.freeze({
    kind: input.kind,
    formId: input.formId,
    form,
    access,
  });
  preparedFormWriteDescriptors.add(descriptor);
  return descriptor;
}

function requirePreparedFormWriteDescriptor(
  ctx: RouteContext,
  kind: PreparedFormWriteKind
): PreparedFormWriteDescriptor {
  const descriptor = ctx.preparedFormWrite;
  if (
    !descriptor ||
    !preparedFormWriteDescriptors.has(descriptor) ||
    !Object.isFrozen(descriptor) ||
    !Object.isFrozen(descriptor.form) ||
    !Object.isFrozen(descriptor.access) ||
    !hasExactOwnKeys(descriptor.form, PREPARED_FORM_KEYS) ||
    !hasExactOwnKeys(descriptor.access, PREPARED_ACCESS_KEYS) ||
    descriptor.kind !== kind ||
    descriptor.formId !== ctx.params.id ||
    descriptor.form.id !== ctx.params.id ||
    descriptor.access.mode !== descriptor.form.submissionAccess
  ) {
    throw new ApiError("form_invalid", "Invalid form write context.", 400);
  }
  return descriptor;
}

export type RouteContext = RouterRouteContext & {
  preparedFormWrite?: PreparedFormWriteDescriptor;
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
    case "form_unpublished":
      return new ApiError("form_unpublished", "Form is not published.", 409);
    case "form_write_state_unavailable":
      return new ApiError(
        "form_write_state_unavailable",
        "Form write state is temporarily unavailable.",
        503
      );
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
    // Reuse the existing media convention (mediaRoutes.ts) so the file-upload surface
    // stays consistent with /media. Without these, an unmapped media error rethrows
    // raw (default returns null) → a generic 500 instead of a client error.
    case "media_file_invalid":
      return new ApiError("media_file_invalid", "Invalid upload payload", 400);
    case "media_file_too_large":
      return new ApiError("media_file_too_large", "File exceeds size limit", 413);
    case "media_mime_not_allowed":
      return new ApiError("media_mime_not_allowed", "File type not allowed", 400);
    case "media_storage_unavailable":
      return new ApiError("media_storage_unavailable", "Media storage is unavailable", 503);
    case "form_payload_too_large":
      return new ApiError("form_payload_too_large", "Form payload exceeds size limit", 413);
    default:
      return null;
  }
};

const throwMappedFormError = (error: unknown): never => {
  const mapped = mapFormError(error);
  if (mapped) throw mapped;
  throw error;
};

// Strict query guard for the submissions export (TASK-490), mirroring
// analyticsRoutes.assertKnownQuery: reject any query key other than `format`
// BEFORE coercion, so unknown params 400 even when the coerced payload would
// otherwise satisfy the schema.
const EXPORT_QUERY_KEYS = new Set(["format"]);
const assertKnownExportQuery = (query: Record<string, string | undefined>) => {
  const unknown = Object.keys(query).find(
    (key) => query[key] !== undefined && !EXPORT_QUERY_KEYS.has(key)
  );
  if (unknown) {
    throw new ApiError("validation_error", "Invalid payload", 400, [
      {
        path: unknown,
        message: "must NOT have additional properties",
        keyword: "additionalProperties",
      },
    ]);
  }
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

  if (
    "data" in payload &&
    typeof payload.data === "object" &&
    payload.data !== null &&
    !Array.isArray(payload.data)
  ) {
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
  validate: FormsRouteDeps["validate"];
  botProtectionSettings?: SecuritySettings["botProtection"];
  persistSubmission: typeof submitForm;
};

export async function handleFormSubmissionRoute(ctx: RouteContext, deps: FormSubmissionRouteDeps) {
  const descriptor = requirePreparedFormWriteDescriptor(ctx, "submission");
  const { validate } = deps;
  if (
    ctx.body &&
    typeof ctx.body === "object" &&
    !Array.isArray(ctx.body) &&
    "data" in ctx.body &&
    typeof (ctx.body as { data?: unknown }).data === "object" &&
    (ctx.body as { data?: unknown }).data !== null &&
    !Array.isArray((ctx.body as { data?: unknown }).data)
  ) {
    const allowedEnvelopeKeys = new Set(["data", "formNonce", "captchaToken"]);
    if (Object.keys(ctx.body).some((key) => !allowedEnvelopeKeys.has(key))) {
      throw new ApiError("form_invalid", "Invalid form payload.", 400);
    }
  }
  const normalized = normalizeSubmissionBody(ctx.body);
  validate(formSubmissionSchema, normalized);
  const body = normalized as SubmissionBody;
  const resolvedForm = descriptor.form;
  const access = descriptor.access;

  if (access.requireFormNonce) {
    assertFormSubmissionNonce(resolvedForm.id, body.formNonce);
  }
  if (access.requireCaptcha) {
    if (!deps.botProtectionSettings) {
      throw new Error("form_write_descriptor_invalid");
    }
    await enforceBotProtection({
      token: body.captchaToken,
      action: "public_write",
      ip: ctx.ip,
      settings: deps.botProtectionSettings,
    });
  }

  let submission: Awaited<ReturnType<typeof submitForm>> | null = null;
  try {
    submission = await deps.persistSubmission(ctx.params.id, body.data, {
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

// Local structural upload-transport guard (mirrors the PRIVATE isUploadFile in
// mediaRoutes.ts). Reimplemented here as a leaf duplicate — no cross-route import,
// avoiding coupling the two route modules.
function isUploadFile(input: unknown): input is UploadFile {
  if (!input || typeof input !== "object") return false;
  const file = input as UploadFile;
  return (
    typeof file.name === "string" &&
    typeof file.type === "string" &&
    typeof file.size === "number" &&
    typeof file.arrayBuffer === "function"
  );
}

export type FormAttachmentUploadRouteDeps = {
  validate: FormsRouteDeps["validate"];
  botProtectionSettings?: SecuritySettings["botProtection"];
  loadFormFields: typeof listFormFields;
  persistUpload: typeof uploadMedia;
};

type AttachmentUploadBody = {
  fieldName: string;
  file: UploadFile;
  formNonce?: string;
  captchaToken?: string;
};

/**
 * PUBLIC nonce-gated upload endpoint (TASK-516-07). NO requirePermission("media:write")
 * — it reuses the form's OWN public submission access gate + the runtime-issued
 * submission nonce + bot-protection, and reuses mediaService.uploadMedia for mime/size
 * enforcement (scoped to the field's accept/maxSizeMb). Returns a reference only.
 */
export async function handleFormAttachmentUploadRoute(
  ctx: RouteContext,
  deps: FormAttachmentUploadRouteDeps
) {
  const descriptor = requirePreparedFormWriteDescriptor(ctx, "upload");
  const { validate } = deps;
  validate(formAttachmentUploadSchema, ctx.body);
  const body = ctx.body as AttachmentUploadBody;

  // Schema cannot validate a binary File — runtime guard before uploadMedia so a
  // non-file `file` cannot fall through.
  if (!isUploadFile(body.file)) {
    throw new ApiError("form_field_invalid", "Invalid upload payload", 400);
  }

  const form = descriptor.form;
  const access = descriptor.access;
  if (access.requireFormNonce) {
    assertFormSubmissionNonce(form.id, body.formNonce);
  }
  if (access.requireCaptcha) {
    if (!deps.botProtectionSettings) {
      throw new Error("form_write_descriptor_invalid");
    }
    await enforceBotProtection({
      token: body.captchaToken,
      action: "public_write",
      ip: ctx.ip,
      settings: deps.botProtectionSettings,
    });
  }

  // Field-scoped constraint enforcement.
  const normalizedFields = (await deps.loadFormFields(form.id)).map(toFieldRecord);
  const field = normalizedFields.find((entry) => entry.name === body.fieldName);
  if (!field || field.type !== "file") {
    throw new ApiError("form_field_invalid", "Invalid field", 400);
  }

  let row: Awaited<ReturnType<typeof uploadMedia>> | null = null;
  try {
    row = await deps.persistUpload(body.file, {}, ctx.user?.id, {
      allowedMime: field.settings.accept,
      maxSizeBytes: field.settings.maxSizeMb ? field.settings.maxSizeMb * 1024 * 1024 : undefined,
    });
  } catch (error) {
    throwMappedFormError(error);
  }
  if (!row) {
    throw new ApiError("form_field_invalid", "Invalid upload payload", 400);
  }

  return { id: row.id, url: row.url, mimeType: row.mimeType, size: row.size };
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

  router.get("/forms/:id/submissions/export", requirePermission("forms:read"), async (ctx) => {
    assertKnownExportQuery(ctx.query);
    const format = ctx.query.format ?? "csv";
    validate(formSubmissionsExportQuerySchema, { format }); // enum + reject-unknown
    try {
      return await buildFormSubmissionsExport(ctx.params.id, format as "csv" | "json");
    } catch (error) {
      throwMappedFormError(error);
    }
  });

  router.get("/forms/:id/submissions", requirePermission("forms:read"), async (ctx) => {
    return listSubmissions(ctx.params.id);
  });

  router.post("/forms/:id/submissions", async (ctx) => {
    return handleFormSubmissionRoute(ctx, { validate, persistSubmission: submitForm });
  });

  // PUBLIC — no requirePermission("media:write"); gated by the form's own access + nonce.
  router.post("/forms/:id/uploads", async (ctx) => {
    return handleFormAttachmentUploadRoute(ctx, {
      validate,
      loadFormFields: listFormFields,
      persistUpload: uploadMedia,
    });
  });
}
