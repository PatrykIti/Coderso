import { validateOutboundUrl } from "../network/outboundHttpPolicy";

export type FormActionType = "email" | "webhook" | "entry_sync" | "redirect" | "success_message";

export type FormActionCondition =
  | { operator: "always" }
  | { operator: "equals" | "not_equals"; field: string; value: string | number | boolean | null }
  | { operator: "exists" | "not_exists"; field: string };

export type FormActionEmailConfig = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  fromEmail?: string;
};

export type FormActionWebhookConfig = {
  url: string;
  method: "POST" | "PUT" | "PATCH";
  headers: Record<string, string>;
  timeoutMs: number;
  includeSubmission: boolean;
  bodyTemplate?: string;
};

export type FormActionEntrySyncConfig = {
  contentTypeId: string;
  mode: "create" | "upsert_by_slug";
  titleTemplate: string;
  slugTemplate: string;
  dataMapping: Record<string, string>;
};

export type FormActionRedirectConfig = {
  url: string;
};

export type FormActionSuccessMessageConfig = {
  message: string;
};

export type FormActionConfigByType = {
  email: FormActionEmailConfig;
  webhook: FormActionWebhookConfig;
  entry_sync: FormActionEntrySyncConfig;
  redirect: FormActionRedirectConfig;
  success_message: FormActionSuccessMessageConfig;
};

export type FormActionConfig = FormActionConfigByType[FormActionType];

export type FormActionInput = {
  id?: string;
  type: FormActionType;
  label?: string;
  enabled?: boolean;
  continueOnError?: boolean;
  condition?: unknown;
  config?: unknown;
  orderIndex?: number;
};

export type NormalizedFormAction = {
  id: string;
  type: FormActionType;
  label: string;
  enabled: boolean;
  continueOnError: boolean;
  condition: FormActionCondition;
  config: FormActionConfig;
  orderIndex: number;
};

const ACTION_TYPES = new Set<FormActionType>([
  "email",
  "webhook",
  "entry_sync",
  "redirect",
  "success_message",
]);

const WEBHOOK_METHODS = new Set<FormActionWebhookConfig["method"]>(["POST", "PUT", "PATCH"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const normalizeOrder = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;

const createActionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `action_${Math.random().toString(36).slice(2, 10)}`;
};

const resolveDefaultLabel = (type: FormActionType) => {
  if (type === "email") return "Send email";
  if (type === "webhook") return "Call webhook";
  if (type === "entry_sync") return "Sync entry";
  if (type === "redirect") return "Redirect";
  return "Success message";
};

const normalizeConditionField = (value: unknown) => {
  const field = readString(value);
  if (!field) throw new Error("form_action_invalid_condition");
  return field;
};

const normalizeConditionValue = (value: unknown) => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  throw new Error("form_action_invalid_condition");
};

export function normalizeFormActionCondition(value: unknown): FormActionCondition {
  if (!isRecord(value) || !value.operator) {
    return { operator: "always" };
  }

  const operator = readString(value.operator);
  if (!operator) return { operator: "always" };

  if (operator === "always") {
    return { operator: "always" };
  }

  if (operator === "equals" || operator === "not_equals") {
    return {
      operator,
      field: normalizeConditionField(value.field),
      value: normalizeConditionValue(value.value),
    };
  }

  if (operator === "exists" || operator === "not_exists") {
    return {
      operator,
      field: normalizeConditionField(value.field),
    };
  }

  throw new Error("form_action_invalid_condition");
}

const normalizeEmailConfig = (value: unknown): FormActionEmailConfig => {
  if (!isRecord(value)) throw new Error("form_action_invalid_config");

  const to = readString(value.to);
  const subject = readString(value.subject);
  if (!to || !subject) throw new Error("form_action_invalid_config");

  const text = readString(value.text) ?? undefined;
  const html = readString(value.html) ?? undefined;
  if (!text && !html) throw new Error("form_action_invalid_config");

  return {
    to,
    subject,
    ...(text ? { text } : {}),
    ...(html ? { html } : {}),
    ...(readString(value.fromName) ? { fromName: readString(value.fromName)! } : {}),
    ...(readString(value.fromEmail) ? { fromEmail: readString(value.fromEmail)! } : {}),
  };
};

const normalizeWebhookHeaders = (value: unknown) => {
  if (!isRecord(value)) return {};
  const headers: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const header = readString(rawValue);
    if (!header) continue;
    const normalizedKey = readString(key);
    if (!normalizedKey) continue;
    headers[normalizedKey] = header;
  }
  return headers;
};

/**
 * TASK-567 config-time gate for the public-amplified form-action webhook
 * surface. Literal URLs get the full shared blocklist now; templated URLs
 * validate the static prefix up to the first placeholder (a templated host is
 * re-validated against the fully rendered URL at every delivery, fail-closed).
 */
const assertFormWebhookUrlAllowed = (url: string) => {
  const templateStart = url.indexOf("{{");
  if (templateStart === -1) {
    if (!validateOutboundUrl(url, { provider: "webhook" }).ok) {
      throw new Error("form_action_invalid_config");
    }
    return;
  }

  const staticPrefix = url.slice(0, templateStart);
  if (!staticPrefix.trim()) return; // host itself is templated; delivery backstops
  const prefixResult = validateOutboundUrl(staticPrefix, { provider: "webhook" });
  if (prefixResult.ok) return;
  // The static prefix is not a complete URL (e.g. "https://{{host}}/x");
  // enforce the https scheme here, host validation happens at delivery time.
  if (prefixResult.code === "egress_invalid_url") {
    const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(staticPrefix)?.[1];
    if (!scheme || scheme.toLowerCase() !== "https") {
      throw new Error("form_action_invalid_config");
    }
    return;
  }
  throw new Error("form_action_invalid_config");
};

const normalizeWebhookConfig = (value: unknown): FormActionWebhookConfig => {
  if (!isRecord(value)) throw new Error("form_action_invalid_config");
  const url = readString(value.url);
  if (!url) throw new Error("form_action_invalid_config");
  assertFormWebhookUrlAllowed(url);

  const methodRaw = readString(value.method)?.toUpperCase();
  const method = WEBHOOK_METHODS.has(methodRaw as FormActionWebhookConfig["method"])
    ? (methodRaw as FormActionWebhookConfig["method"])
    : "POST";

  const timeoutMs =
    typeof value.timeoutMs === "number" && Number.isFinite(value.timeoutMs)
      ? Math.max(1_000, Math.min(Math.round(value.timeoutMs), 20_000))
      : 8_000;

  return {
    url,
    method,
    headers: normalizeWebhookHeaders(value.headers),
    timeoutMs,
    includeSubmission: normalizeBoolean(value.includeSubmission, true),
    ...(readString(value.bodyTemplate) ? { bodyTemplate: readString(value.bodyTemplate)! } : {}),
  };
};

const normalizeDataMapping = (value: unknown) => {
  if (!isRecord(value)) return {};
  const mapping: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const target = readString(key);
    const template = readString(rawValue);
    if (!target || !template) continue;
    mapping[target] = template;
  }
  return mapping;
};

const normalizeEntrySyncConfig = (value: unknown): FormActionEntrySyncConfig => {
  if (!isRecord(value)) throw new Error("form_action_invalid_config");

  const contentTypeId = readString(value.contentTypeId);
  const titleTemplate = readString(value.titleTemplate);
  const slugTemplate = readString(value.slugTemplate);
  if (!contentTypeId || !titleTemplate || !slugTemplate) {
    throw new Error("form_action_invalid_config");
  }

  const modeRaw = readString(value.mode);
  const mode = modeRaw === "upsert_by_slug" ? "upsert_by_slug" : "create";

  return {
    contentTypeId,
    mode,
    titleTemplate,
    slugTemplate,
    dataMapping: normalizeDataMapping(value.dataMapping),
  };
};

const normalizeRedirectConfig = (value: unknown): FormActionRedirectConfig => {
  if (!isRecord(value)) throw new Error("form_action_invalid_config");
  const url = readString(value.url);
  if (!url) throw new Error("form_action_invalid_config");
  return { url };
};

const normalizeSuccessMessageConfig = (value: unknown): FormActionSuccessMessageConfig => {
  if (!isRecord(value)) throw new Error("form_action_invalid_config");
  const message = readString(value.message);
  if (!message) throw new Error("form_action_invalid_config");
  return { message };
};

export function normalizeFormActionConfig<T extends FormActionType>(
  type: T,
  value: unknown
): FormActionConfigByType[T] {
  if (type === "email") {
    return normalizeEmailConfig(value) as FormActionConfigByType[T];
  }
  if (type === "webhook") {
    return normalizeWebhookConfig(value) as FormActionConfigByType[T];
  }
  if (type === "entry_sync") {
    return normalizeEntrySyncConfig(value) as FormActionConfigByType[T];
  }
  if (type === "redirect") {
    return normalizeRedirectConfig(value) as FormActionConfigByType[T];
  }
  return normalizeSuccessMessageConfig(value) as FormActionConfigByType[T];
}

export function normalizeFormActionInput(
  input: FormActionInput,
  fallbackOrderIndex: number,
  options: Readonly<{ requireStableIds?: boolean }> = {}
): NormalizedFormAction {
  if (!ACTION_TYPES.has(input.type)) {
    throw new Error("form_action_invalid_type");
  }

  const type = input.type;
  const label = readString(input.label) ?? resolveDefaultLabel(type);

  return {
    id:
      readString(input.id) ??
      (options.requireStableIds
        ? (() => {
            throw new Error("form_action_invalid_payload");
          })()
        : createActionId()),
    type,
    label,
    enabled: normalizeBoolean(input.enabled, true),
    continueOnError: normalizeBoolean(input.continueOnError, true),
    condition: normalizeFormActionCondition(input.condition),
    config: normalizeFormActionConfig(type, input.config),
    orderIndex: normalizeOrder(input.orderIndex, fallbackOrderIndex),
  };
}

export function normalizeFormActionsInput(
  input: unknown,
  options: Readonly<{ requireStableIds?: boolean }> = {}
): NormalizedFormAction[] {
  if (!Array.isArray(input)) throw new Error("form_action_invalid_payload");
  const normalized = input.map((item, index) => {
    if (!isRecord(item)) throw new Error("form_action_invalid_payload");
    return normalizeFormActionInput(item as FormActionInput, index, options);
  });
  if (new Set(normalized.map((action) => action.id)).size !== normalized.length) {
    throw new Error("form_action_invalid_payload");
  }
  return normalized;
}

/**
 * Canonical write/snapshot shape shared by persistence and aggregate installers.
 * The stable id tie-breaker prevents equal authored order indexes from making
 * the resulting snapshot depend on input or database row order.
 */
export function normalizeFormActionsForWrite(
  input: unknown,
  options: Readonly<{ requireStableIds?: boolean }> = {}
): NormalizedFormAction[] {
  return normalizeFormActionsInput(input, options)
    .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
    .map((action, orderIndex) => ({ ...action, orderIndex }));
}

const readFieldValue = (payload: Record<string, unknown>, fieldPath: string): unknown => {
  const normalizedPath = fieldPath.startsWith("submission.")
    ? fieldPath.slice("submission.".length)
    : fieldPath;

  const parts = normalizedPath
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return undefined;

  let current: unknown = payload;
  for (const part of parts) {
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      current = current[Number(part)];
      continue;
    }
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
};

const isPresentValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const toComparableValue = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  return "";
};

export function matchesFormActionCondition(
  condition: FormActionCondition,
  payload: Record<string, unknown>
) {
  if (condition.operator === "always") return true;

  if (condition.operator === "exists") {
    return isPresentValue(readFieldValue(payload, condition.field));
  }

  if (condition.operator === "not_exists") {
    return !isPresentValue(readFieldValue(payload, condition.field));
  }

  if (condition.operator !== "equals" && condition.operator !== "not_equals") {
    return false;
  }

  const actual = toComparableValue(readFieldValue(payload, condition.field));
  const expected = toComparableValue(condition.value);

  if (condition.operator === "equals") {
    return actual === expected;
  }

  return actual !== expected;
}

export function parseFormActionConfigByType(
  type: FormActionType,
  config: unknown
): FormActionConfig {
  return normalizeFormActionConfig(type, config);
}
