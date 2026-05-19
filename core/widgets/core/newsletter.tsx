import type { CSSProperties, ComponentType } from "react";

import type { NormalizedFormField } from "../../services/forms/validation";
import type { WidgetDefinition, WidgetEditorProps, WidgetRenderContext } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { getFormRuntimeClientScript } from "./formRuntimeScript";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";

export type NewsletterVariantId = "inline" | "stacked" | "minimal";
export type NewsletterSpacing = "none" | "sm" | "md" | "lg" | "xl";
export type NewsletterAlignment = "start" | "center" | "end";
export type NewsletterWidth = "narrow" | "default" | "wide" | "full";
export type NewsletterIntegrationMode = "action-url" | "webhook";
export type NewsletterMethod = "post" | "get";
export type NewsletterSubmissionMode = "static" | "forms-runtime";
export type NewsletterSuccessBehavior =
  | "show-message-hide-form"
  | "show-message-reset-form"
  | "show-message-keep-form";
export type NewsletterOptInMode = "single" | "double";
export type NewsletterOptInEnforcement = "provider-owned";

export type NewsletterFieldKey = "email" | "firstName";

export type NewsletterFirstNameField = {
  enabled?: boolean;
  label?: string;
  placeholder?: string;
  fieldName?: string;
  required?: boolean;
};

export type NewsletterFormSettings = {
  emailFieldName?: string;
  emailLabel?: string;
  showEmailLabel?: boolean;
  consentFieldName?: string;
  firstName?: NewsletterFirstNameField;
};

export type NewsletterStateCopy = {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
};

export type NewsletterSubmissionSettings = {
  mode?: NewsletterSubmissionMode;
  formId?: string;
  analyticsEvent?: string;
  successBehavior?: NewsletterSuccessBehavior;
};

export type NewsletterOptInSettings = {
  mode?: NewsletterOptInMode;
  confirmationCopy?: string;
  enforcement?: NewsletterOptInEnforcement;
};

export type NewsletterResolvedRuntimeData = {
  formId?: string;
  formName?: string;
  description?: string | null;
  status?: string;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: "public" | "internal";
  submissionNonce?: string | null;
  botProtection?: {
    provider: "recaptcha_v3";
    siteKey: string;
    action: "public_write";
  } | null;
  error?: string;
  fields?: NormalizedFormField[];
};

export type NewsletterStyleSettings = {
  spacing?: NewsletterSpacing;
  alignment?: NewsletterAlignment;
  width?: NewsletterWidth;
  background?: string;
  textColor?: string;
  buttonBackground?: string;
  buttonTextColor?: string;
};

export type NewsletterData = {
  title?: string;
  description?: string;
  placeholder?: string;
  form?: NewsletterFormSettings;
  consent?: {
    enabled?: boolean;
    label?: string;
    required?: boolean;
  };
  submit?: {
    label?: string;
    successMessage?: string;
  };
  stateCopy?: NewsletterStateCopy;
  integration?: {
    mode?: NewsletterIntegrationMode;
    method?: NewsletterMethod;
    actionUrl?: string;
    webhookId?: string;
  };
  submission?: NewsletterSubmissionSettings;
  optIn?: NewsletterOptInSettings;
  style?: NewsletterStyleSettings;
  resolved?: NewsletterResolvedRuntimeData;
};

export type NewsletterActionStatus = "empty" | "valid" | "invalid";

export type NewsletterExpectedRuntimeField = {
  name: string;
  type: NormalizedFormField["type"];
  required: boolean;
};

type NewsletterTransport = {
  mode: NewsletterIntegrationMode;
  method: NewsletterMethod;
  actionStatus: NewsletterActionStatus;
  actionUrl: string;
  webhookId: string;
  activeField: "actionUrl" | "webhookId";
};

type NormalizedNewsletterFormSettings = Required<
  Pick<
    NewsletterFormSettings,
    "emailFieldName" | "emailLabel" | "showEmailLabel" | "consentFieldName"
  >
> & {
  firstName: Required<NewsletterFirstNameField>;
};

type NormalizedNewsletterStyleSettings = {
  spacing: NewsletterSpacing;
  alignment: NewsletterAlignment;
  width: NewsletterWidth;
  background: string | undefined;
  textColor: string;
  buttonBackground: string;
  buttonTextColor: string;
};

type NormalizedNewsletterData = Omit<
  NewsletterData,
  "form" | "consent" | "submit" | "stateCopy" | "integration" | "submission" | "optIn" | "style"
> & {
  form: NormalizedNewsletterFormSettings;
  consent: Required<NonNullable<NewsletterData["consent"]>>;
  submit: Required<NonNullable<NewsletterData["submit"]>>;
  stateCopy: Required<NewsletterStateCopy>;
  integration: Required<NonNullable<NewsletterData["integration"]>>;
  submission: Required<NewsletterSubmissionSettings>;
  optIn: Required<NewsletterOptInSettings>;
  style: NormalizedNewsletterStyleSettings;
  resolved?: NewsletterResolvedRuntimeData;
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const safeFieldNamePattern = /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/;
const safeEventNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/;
const safeFormIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;
const safeCssVariablePattern = /^var\(--color-[a-z0-9-]+\)$/;
const safeHexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const safeRgbColorPattern =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*((?:0|1|0?\.\d+)))?\s*\)$/i;
const newsletterFormsRoutePattern = /^\/forms\/[a-zA-Z0-9_-]+\/submissions$/;

const spacingClassMap: Record<NewsletterSpacing, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const headingSizeClassMap: Record<NewsletterVariantId, string> = {
  inline: "text-xl",
  stacked: "text-xl",
  minimal: "text-lg",
};

const sectionAlignClassMap: Record<NewsletterAlignment, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

const formAlignClassMap: Record<NewsletterAlignment, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

const variantFormClassMap: Record<NewsletterVariantId, string> = {
  inline: "flex w-full flex-col gap-3 sm:flex-row sm:items-end",
  stacked: "flex w-full flex-col gap-3",
  minimal: "flex w-full flex-col gap-2 sm:flex-row sm:items-end",
};

const widthClassMap: Record<NewsletterWidth, string> = {
  narrow: "max-w-md",
  default: "max-w-xl",
  wide: "max-w-3xl",
  full: "max-w-none",
};

const firstNameDefaults: Required<NewsletterFirstNameField> = {
  enabled: false,
  label: "First name",
  placeholder: "Your first name",
  fieldName: "first_name",
  required: false,
};

export const newsletterSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    placeholder: { type: "string" },
    form: {
      type: "object",
      additionalProperties: false,
      properties: {
        emailFieldName: { type: "string" },
        emailLabel: { type: "string" },
        showEmailLabel: { type: "boolean" },
        consentFieldName: { type: "string" },
        firstName: {
          type: "object",
          additionalProperties: false,
          properties: {
            enabled: { type: "boolean" },
            label: { type: "string" },
            placeholder: { type: "string" },
            fieldName: { type: "string" },
            required: { type: "boolean" },
          },
        },
      },
    },
    consent: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        label: { type: "string" },
        required: { type: "boolean" },
      },
    },
    submit: {
      type: "object",
      additionalProperties: false,
      properties: {
        label: { type: "string" },
        successMessage: { type: "string" },
      },
    },
    stateCopy: {
      type: "object",
      additionalProperties: false,
      properties: {
        loadingMessage: { type: "string" },
        successMessage: { type: "string" },
        errorMessage: { type: "string" },
      },
    },
    integration: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["action-url", "webhook"] },
        method: { enum: ["post", "get"] },
        actionUrl: { type: "string" },
        webhookId: { type: "string" },
      },
    },
    submission: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["static", "forms-runtime"] },
        formId: { type: "string" },
        analyticsEvent: { type: "string" },
        successBehavior: {
          enum: ["show-message-hide-form", "show-message-reset-form", "show-message-keep-form"],
        },
      },
    },
    optIn: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["single", "double"] },
        confirmationCopy: { type: "string" },
        enforcement: { enum: ["provider-owned"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        spacing: { enum: ["none", "sm", "md", "lg", "xl"] },
        alignment: { enum: ["start", "center", "end"] },
        width: { enum: ["narrow", "default", "wide", "full"] },
        background: { type: "string" },
        textColor: { type: "string" },
        buttonBackground: { type: "string" },
        buttonTextColor: { type: "string" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        formId: { type: "string" },
        formName: { type: "string" },
        description: { type: ["string", "null"] },
        status: { type: "string" },
        successMessage: { type: ["string", "null"] },
        successRedirectUrl: { type: ["string", "null"] },
        submissionAccess: { enum: ["public", "internal"] },
        submissionNonce: { type: ["string", "null"] },
        error: { type: "string" },
        botProtection: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            provider: { enum: ["recaptcha_v3"] },
            siteKey: { type: "string" },
            action: { enum: ["public_write"] },
          },
        },
        fields: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              type: { type: "string" },
              label: { type: "string" },
              name: { type: "string" },
              required: { type: "boolean" },
              orderIndex: { type: "number" },
              settings: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
  },
} as const;

export const newsletterDefaults: NewsletterData = {
  title: "Join our newsletter",
  description: "Get the latest updates straight to your inbox.",
  placeholder: "you@example.com",
  form: {
    emailFieldName: "email",
    emailLabel: "Email address",
    showEmailLabel: false,
    consentFieldName: "consent",
    firstName: firstNameDefaults,
  },
  consent: {
    enabled: true,
    label: "I agree to receive updates.",
    required: false,
  },
  submit: {
    label: "Subscribe",
    successMessage: "Thanks for joining!",
  },
  stateCopy: {
    loadingMessage: "Sending...",
    successMessage: "Thanks for joining!",
    errorMessage: "Unable to submit the form. Please try again.",
  },
  integration: {
    mode: "action-url",
    method: "post",
    actionUrl: "",
    webhookId: "",
  },
  submission: {
    mode: "static",
    formId: "",
    analyticsEvent: "",
    successBehavior: "show-message-hide-form",
  },
  optIn: {
    mode: "single",
    confirmationCopy: "Please check your inbox to confirm your subscription.",
    enforcement: "provider-owned",
  },
  style: {
    spacing: "md",
    alignment: "start",
    width: "default",
    background: "transparent",
    textColor: "",
    buttonBackground: "",
    buttonTextColor: "",
  },
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveNonEmptyString = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : fallback;
};

const normalizeSafeFieldName = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim() ?? "";
  if (!safeFieldNamePattern.test(trimmed)) return fallback;
  return trimmed;
};

const normalizeSafeIdentifier = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return safeFormIdPattern.test(trimmed) ? trimmed : "";
};

const normalizeAnalyticsEvent = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return safeEventNamePattern.test(trimmed) ? trimmed : "";
};

const normalizeOptionalText = (value: string | undefined) =>
  typeof value === "string" ? value : "";

const resolveUniqueFieldName = ({
  requested,
  fallback,
  used,
}: {
  requested: string;
  fallback: string;
  used: Set<string>;
}) => {
  const requestedCandidate = requested.trim();
  if (requestedCandidate && !used.has(requestedCandidate)) {
    used.add(requestedCandidate);
    return requestedCandidate;
  }

  const fallbackCandidate = fallback.trim();
  if (fallbackCandidate && !used.has(fallbackCandidate)) {
    used.add(fallbackCandidate);
    return fallbackCandidate;
  }

  let suffix = 2;
  while (used.has(`${fallbackCandidate}_${suffix}`)) {
    suffix += 1;
  }
  const unique = `${fallbackCandidate}_${suffix}`;
  used.add(unique);
  return unique;
};

const normalizeNewsletterColorValue = (value: string | undefined) => {
  const resolved = resolveClearableStyleValue(value);
  const trimmed = resolved?.trim() ?? "";
  if (!trimmed) return undefined;
  if (trimmed === "transparent") return trimmed;
  if (safeHexColorPattern.test(trimmed) || safeRgbColorPattern.test(trimmed)) return trimmed;
  if (safeCssVariablePattern.test(trimmed)) return trimmed;
  return undefined;
};

const resolveNewsletterSpacing = (value: string | undefined): NewsletterSpacing => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return "md";
};

const resolveNewsletterAlignment = (value: string | undefined): NewsletterAlignment => {
  if (value === "center" || value === "end") return value;
  return "start";
};

const resolveNewsletterWidth = (value: string | undefined): NewsletterWidth => {
  if (value === "narrow" || value === "wide" || value === "full") return value;
  return "default";
};

const resolveNewsletterMethod = (value: string | undefined): NewsletterMethod => {
  if (value === "get") return "get";
  return "post";
};

const resolveNewsletterIntegrationMode = (
  integration: NewsletterData["integration"]
): NewsletterIntegrationMode => {
  if (integration?.mode === "webhook") return "webhook";
  if (integration?.mode === "action-url") return "action-url";
  const actionUrl = normalizeOptionalText(integration?.actionUrl).trim();
  const webhookId = normalizeOptionalText(integration?.webhookId).trim();
  if (webhookId.length > 0 && actionUrl.length === 0) return "webhook";
  return "action-url";
};

const resolveNewsletterSubmissionMode = (value: string | undefined): NewsletterSubmissionMode => {
  if (value === "forms-runtime") return "forms-runtime";
  return "static";
};

const resolveNewsletterSuccessBehavior = (value: string | undefined): NewsletterSuccessBehavior => {
  if (value === "show-message-reset-form" || value === "show-message-keep-form") return value;
  return "show-message-hide-form";
};

const resolveNewsletterOptInMode = (value: string | undefined): NewsletterOptInMode => {
  if (value === "double") return "double";
  return "single";
};

const resolveNewsletterOptInEnforcement = (
  value: string | undefined
): NewsletterOptInEnforcement => {
  return "provider-owned";
};

const normalizeFirstNameField = (
  value: NewsletterFirstNameField | undefined
): Required<NewsletterFirstNameField> => ({
  enabled: value?.enabled ?? firstNameDefaults.enabled,
  label: resolveNonEmptyString(value?.label, firstNameDefaults.label),
  placeholder: resolveString(value?.placeholder, firstNameDefaults.placeholder),
  fieldName: normalizeSafeFieldName(value?.fieldName, firstNameDefaults.fieldName),
  required: value?.required ?? firstNameDefaults.required,
});

const isPrivateOrCredentialedUrl = (url: URL) => {
  if (url.username || url.password) return true;
  const host = url.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^\[?(fc|fd|fe80:)/.test(host)
  );
};

export function normalizeNewsletterActionUrl(value: string | undefined): {
  value: string;
  status: NewsletterActionStatus;
} {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) return { value: "", status: "empty" };
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/admin/") ||
    trimmed.startsWith("/internal/")
  ) {
    return { value: "", status: "invalid" };
  }
  if (trimmed.startsWith("/")) {
    return /^\/forms\/[a-zA-Z0-9_-]+\/submissions$/.test(trimmed)
      ? { value: trimmed, status: "valid" }
      : { value: "", status: "invalid" };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" || isPrivateOrCredentialedUrl(parsed)) {
      return { value: "", status: "invalid" };
    }
    return { value: parsed.toString(), status: "valid" };
  } catch {
    return { value: "", status: "invalid" };
  }
}

export function resolveNewsletterTransport(
  integration: NewsletterData["integration"]
): NewsletterTransport {
  const mode = resolveNewsletterIntegrationMode(integration);
  const method = resolveNewsletterMethod(integration?.method);
  const action = normalizeNewsletterActionUrl(integration?.actionUrl);
  return {
    mode,
    method,
    actionStatus: action.status,
    actionUrl: mode === "action-url" && action.status === "valid" ? action.value : "",
    webhookId: normalizeSafeIdentifier(integration?.webhookId),
    activeField: mode === "webhook" ? "webhookId" : "actionUrl",
  };
}

export const resolveNewsletterVariant = (variant: string): NewsletterVariantId => {
  if (variant === "stacked" || variant === "minimal") return variant;
  return "inline";
};

const isNewsletterFormsRouteActionUrl = (value: string | undefined) =>
  newsletterFormsRoutePattern.test((value ?? "").trim());

export function normalizeNewsletterData(data: NewsletterData): NormalizedNewsletterData {
  const transport = resolveNewsletterTransport(data.integration);
  const styleDefaults = newsletterDefaults.style ?? {};
  const stateDefaults = newsletterDefaults.stateCopy ?? {};
  const formDefaults = newsletterDefaults.form ?? {};
  const submitDefaults = newsletterDefaults.submit ?? {};
  const consentDefaults = newsletterDefaults.consent ?? {};
  const submissionDefaults = newsletterDefaults.submission ?? {};
  const optInDefaults = newsletterDefaults.optIn ?? {};
  const hasStyleObject = data.style !== undefined;
  const usedFieldNames = new Set<string>();
  const normalizedEmailFieldName = resolveUniqueFieldName({
    requested: normalizeSafeFieldName(
      data.form?.emailFieldName,
      formDefaults.emailFieldName ?? "email"
    ),
    fallback: formDefaults.emailFieldName ?? "email",
    used: usedFieldNames,
  });
  const normalizedFirstName = normalizeFirstNameField(data.form?.firstName);
  const normalizedFirstNameFieldName = resolveUniqueFieldName({
    requested: normalizedFirstName.fieldName,
    fallback: firstNameDefaults.fieldName,
    used: usedFieldNames,
  });
  const normalizedConsentFieldName = resolveUniqueFieldName({
    requested: normalizeSafeFieldName(
      data.form?.consentFieldName,
      formDefaults.consentFieldName ?? "consent"
    ),
    fallback: formDefaults.consentFieldName ?? "consent",
    used: usedFieldNames,
  });

  return {
    ...data,
    title: resolveString(data.title, newsletterDefaults.title ?? ""),
    description: resolveString(data.description, newsletterDefaults.description ?? ""),
    placeholder: resolveString(data.placeholder, newsletterDefaults.placeholder ?? ""),
    form: {
      emailFieldName: normalizedEmailFieldName,
      emailLabel: resolveNonEmptyString(
        data.form?.emailLabel,
        formDefaults.emailLabel ?? "Email address"
      ),
      showEmailLabel: data.form?.showEmailLabel ?? formDefaults.showEmailLabel ?? false,
      consentFieldName: normalizedConsentFieldName,
      firstName: {
        ...normalizedFirstName,
        fieldName: normalizedFirstNameFieldName,
      },
    },
    consent: {
      enabled: data.consent?.enabled ?? consentDefaults.enabled ?? true,
      label: resolveString(data.consent?.label, consentDefaults.label ?? ""),
      required: data.consent?.required ?? consentDefaults.required ?? false,
    },
    submit: {
      label: resolveNonEmptyString(data.submit?.label, submitDefaults.label ?? "Subscribe"),
      successMessage: resolveString(
        data.submit?.successMessage,
        submitDefaults.successMessage ?? ""
      ),
    },
    stateCopy: {
      loadingMessage: resolveNonEmptyString(
        data.stateCopy?.loadingMessage,
        stateDefaults.loadingMessage ?? "Sending..."
      ),
      successMessage: resolveNonEmptyString(
        data.stateCopy?.successMessage ?? data.submit?.successMessage,
        stateDefaults.successMessage ?? submitDefaults.successMessage ?? "Thanks for joining!"
      ),
      errorMessage: resolveNonEmptyString(
        data.stateCopy?.errorMessage,
        stateDefaults.errorMessage ?? "Unable to submit the form. Please try again."
      ),
    },
    integration: {
      mode: transport.mode,
      method: transport.method,
      actionUrl: normalizeOptionalText(data.integration?.actionUrl),
      webhookId: normalizeSafeIdentifier(data.integration?.webhookId),
    },
    submission: {
      mode: resolveNewsletterSubmissionMode(data.submission?.mode),
      formId: normalizeSafeIdentifier(data.submission?.formId),
      analyticsEvent: normalizeAnalyticsEvent(data.submission?.analyticsEvent),
      successBehavior: resolveNewsletterSuccessBehavior(data.submission?.successBehavior),
    },
    optIn: {
      mode: resolveNewsletterOptInMode(data.optIn?.mode),
      confirmationCopy: resolveString(
        data.optIn?.confirmationCopy,
        optInDefaults.confirmationCopy ?? ""
      ),
      enforcement: resolveNewsletterOptInEnforcement(data.optIn?.enforcement),
    },
    style: {
      spacing: resolveNewsletterSpacing(data.style?.spacing),
      alignment: resolveNewsletterAlignment(data.style?.alignment),
      width: resolveNewsletterWidth(data.style?.width),
      background: hasStyleObject
        ? normalizeNewsletterColorValue(data.style?.background)
        : normalizeNewsletterColorValue(styleDefaults.background),
      textColor: normalizeNewsletterColorValue(data.style?.textColor) ?? "",
      buttonBackground: normalizeNewsletterColorValue(data.style?.buttonBackground) ?? "",
      buttonTextColor: normalizeNewsletterColorValue(data.style?.buttonTextColor) ?? "",
    },
    resolved: data.resolved,
  };
}

const resolveFieldTextColor = (color: string | undefined) =>
  color && color.trim().length > 0 ? color : "var(--color-text)";

const resolveButtonBackground = (color: string | undefined) =>
  color && color.trim().length > 0 ? color : "var(--color-primary)";

const resolveButtonTextColor = (color: string | undefined) =>
  color && color.trim().length > 0 ? color : "var(--color-bg)";

const getFirstNameInputType = () => "text";

export function getExpectedNewsletterRuntimeFields(
  normalized: Pick<NormalizedNewsletterData, "form" | "consent">
): NewsletterExpectedRuntimeField[] {
  const expectedFields: NewsletterExpectedRuntimeField[] = [
    {
      name: normalized.form.emailFieldName,
      type: "email",
      required: true,
    },
  ];

  if (normalized.form.firstName.enabled) {
    expectedFields.push({
      name: normalized.form.firstName.fieldName,
      type: "text",
      required: normalized.form.firstName.required,
    });
  }

  if (normalized.consent.enabled && normalized.consent.label.trim().length > 0) {
    expectedFields.push({
      name: normalized.form.consentFieldName,
      type: "checkbox",
      required: normalized.consent.required,
    });
  }

  return expectedFields;
}

export function getNewsletterFormsRuntimeCompatibility(
  normalized: Pick<NormalizedNewsletterData, "form" | "consent">,
  runtimeFields:
    | Array<Pick<NormalizedFormField, "name" | "type" | "required">>
    | Array<{ name: string; type: string; required: boolean }>
    | undefined
) {
  const expectedFields = getExpectedNewsletterRuntimeFields(normalized);
  const availableRuntimeFields = runtimeFields ?? [];

  const missingExpectedFields = expectedFields.filter(
    (field) =>
      !availableRuntimeFields.some(
        (runtimeField) => runtimeField.name === field.name && runtimeField.type === field.type
      )
  );
  const requiredMismatchFields = expectedFields.filter((field) => {
    const runtimeField = availableRuntimeFields.find(
      (candidate) => candidate.name === field.name && candidate.type === field.type
    );
    return Boolean(runtimeField?.required) && !field.required;
  });
  const unmappedRequiredRuntimeFields = availableRuntimeFields.filter(
    (runtimeField) =>
      runtimeField.required && !expectedFields.some((field) => field.name === runtimeField.name)
  );

  return {
    expectedFields,
    missingExpectedFields,
    requiredMismatchFields,
    unmappedRequiredRuntimeFields,
    ready:
      missingExpectedFields.length === 0 &&
      requiredMismatchFields.length === 0 &&
      unmappedRequiredRuntimeFields.length === 0,
  };
}

export function NewsletterBlock({
  data,
  variant,
  blockId,
  renderContext,
}: {
  data: NewsletterData;
  variant: string;
  blockId?: string;
  renderContext?: WidgetRenderContext;
}) {
  const normalized = normalizeNewsletterData(data);
  const resolvedVariant = resolveNewsletterVariant(variant);
  const form = normalized.form;
  const consent = normalized.consent ?? newsletterDefaults.consent!;
  const submit = normalized.submit ?? newsletterDefaults.submit!;
  const stateCopy = normalized.stateCopy;
  const submission = normalized.submission;
  const style = normalized.style;
  const optIn = normalized.optIn;
  const resolved = normalized.resolved;
  const transport = resolveNewsletterTransport(normalized.integration);

  const rootId = createWidgetInstanceId("newsletter", blockId, resolvedVariant);
  const titleId = normalized.title?.trim() ? scopedId(rootId, "title") : undefined;
  const emailInputId = scopedId(rootId, form.emailFieldName);
  const firstNameInputId = scopedId(rootId, form.firstName.fieldName);
  const consentInputId = scopedId(rootId, form.consentFieldName);
  const bindingCompatibility = getNewsletterFormsRuntimeCompatibility(
    {
      form: normalized.form,
      consent: normalized.consent,
    },
    resolved?.fields
  );
  const formsRuntimeCompatible = bindingCompatibility.ready;
  const actionRequiresFormsRuntime =
    transport.mode === "action-url" && isNewsletterFormsRouteActionUrl(transport.actionUrl);
  const previewState =
    renderContext?.mode === "editor-preview" ? (renderContext.previewState ?? null) : null;
  const previewRuntimeLoading = previewState?.status === "loading";
  const previewRuntimeError =
    previewState?.status === "error" && typeof previewState.message === "string"
      ? previewState.message.trim()
      : "";

  const formsRuntimeReady =
    submission.mode === "forms-runtime" &&
    resolved?.submissionAccess === "public" &&
    resolved?.status === "published" &&
    !resolved?.error &&
    (resolved.formId ?? "").trim().length > 0 &&
    formsRuntimeCompatible;
  const canUseFormsRuntime =
    formsRuntimeReady && (renderContext?.mode === "public" || Boolean(resolved?.submissionNonce));
  const canUseNativeAction =
    submission.mode !== "forms-runtime" &&
    transport.mode === "action-url" &&
    transport.actionStatus === "valid" &&
    !actionRequiresFormsRuntime;
  const connectionReady = formsRuntimeReady || canUseNativeAction;
  const submitReady = canUseFormsRuntime || canUseNativeAction;

  const formAction = formsRuntimeReady
    ? `/forms/${encodeURIComponent((resolved?.formId ?? "").trim())}/submissions`
    : canUseNativeAction
      ? transport.actionUrl
      : undefined;
  const formMethod = formsRuntimeReady ? "post" : transport.method;

  const textColor = resolveFieldTextColor(style.textColor);
  const sectionStyle: CSSProperties =
    compactStyle({
      backgroundColor: style.background,
    }) ?? {};
  const buttonStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveButtonBackground(style.buttonBackground),
      color: resolveButtonTextColor(style.buttonTextColor),
    }) ?? {};
  const fieldStyle: CSSProperties =
    compactStyle({
      color: textColor,
    }) ?? {};

  const showTitle = (normalized.title ?? "").trim().length > 0;
  const showDescription =
    resolvedVariant !== "minimal" && (normalized.description ?? "").trim().length > 0;
  const showConsent = (consent.enabled ?? false) && (consent.label ?? "").trim().length > 0;
  const showFirstName = Boolean(form.firstName.enabled);
  const showOptInCopy = optIn.mode === "double" && (optIn.confirmationCopy ?? "").trim().length > 0;
  const connectionMessage = !connectionReady
    ? previewRuntimeLoading
      ? "Loading bound Form preview..."
      : previewRuntimeError
        ? previewRuntimeError
        : renderContext?.mode === "public"
          ? actionRequiresFormsRuntime
            ? "This signup form needs a Forms runtime binding before it can accept submissions."
            : "This signup form is not connected yet."
          : actionRequiresFormsRuntime
            ? "Switch Newsletter submission mode to Forms runtime when you target a Coderso Forms route."
            : "Connect a Forms runtime binding or a safe external action URL to enable submissions."
    : renderContext?.mode === "editor-preview" && formsRuntimeReady && !canUseFormsRuntime
      ? "Editor preview shows the bound Forms contract. Public runtime injects nonce and bot protection at render time."
      : "";

  return (
    <section
      className={joinClasses(
        "mx-auto flex w-full flex-col px-4 py-8",
        widthClassMap[style.width],
        spacingClassMap[style.spacing],
        sectionAlignClassMap[style.alignment]
      )}
      style={sectionStyle}
      aria-labelledby={titleId}
      aria-label={titleId ? undefined : "Newsletter signup"}
      data-newsletter-variant={resolvedVariant}
      data-newsletter-alignment={style.alignment}
      data-newsletter-spacing={style.spacing}
      data-newsletter-width={style.width}
      data-newsletter-integration-mode={transport.mode}
      data-newsletter-consent-required={String(Boolean(consent.required))}
      data-newsletter-action-status={canUseFormsRuntime ? "runtime" : transport.actionStatus}
      data-newsletter-submit-ready={String(connectionReady)}
      data-newsletter-submit-interactive={String(submitReady)}
      data-newsletter-submission-mode={submission.mode}
      data-newsletter-opt-in={optIn.mode}
      data-newsletter-first-name-enabled={String(showFirstName)}
      data-newsletter-analytics-event={submission.analyticsEvent || undefined}
    >
      {showTitle ? (
        <h3
          id={titleId}
          className={joinClasses(headingSizeClassMap[resolvedVariant], "font-semibold")}
          style={fieldStyle}
        >
          {normalized.title}
        </h3>
      ) : null}

      {showDescription ? (
        <p className="text-sm opacity-70" style={fieldStyle}>
          {normalized.description}
        </p>
      ) : null}

      <form
        className="w-full space-y-3"
        method={connectionReady ? formMethod : undefined}
        action={connectionReady ? formAction : undefined}
        data-nextless-form-runtime={canUseFormsRuntime ? "1" : undefined}
        data-form-id={canUseFormsRuntime ? (resolved?.formId ?? "") : undefined}
        data-form-success-message={canUseFormsRuntime ? stateCopy.successMessage : undefined}
        data-form-loading-label={canUseFormsRuntime ? stateCopy.loadingMessage : undefined}
        data-form-submit-label={canUseFormsRuntime ? submit.label : undefined}
        data-form-success-behavior={canUseFormsRuntime ? submission.successBehavior : undefined}
        data-form-analytics-event={
          canUseFormsRuntime ? submission.analyticsEvent || undefined : undefined
        }
        data-form-captcha-site-key={
          canUseFormsRuntime ? (resolved?.botProtection?.siteKey ?? "") : undefined
        }
        data-form-captcha-action={
          canUseFormsRuntime ? (resolved?.botProtection?.action ?? "") : undefined
        }
        data-newsletter-submit-ready={String(connectionReady)}
        data-newsletter-submit-interactive={String(submitReady)}
        aria-labelledby={titleId}
        aria-label={titleId ? undefined : "Newsletter signup"}
      >
        {resolved?.submissionNonce && canUseFormsRuntime ? (
          <input type="hidden" name="__nl_form_nonce" value={resolved.submissionNonce} />
        ) : null}
        {resolved?.botProtection?.siteKey && canUseFormsRuntime ? (
          <input type="hidden" name="captchaToken" value="" />
        ) : null}

        <div data-form-embed-form-body="true" className="space-y-3">
          <div
            className={joinClasses(
              variantFormClassMap[resolvedVariant],
              formAlignClassMap[style.alignment]
            )}
          >
            {showFirstName ? (
              <div className="w-full flex-1 min-w-0 space-y-1">
                <label
                  htmlFor={firstNameInputId}
                  className={joinClasses(
                    "text-xs font-medium",
                    form.firstName.enabled ? undefined : "sr-only"
                  )}
                  style={fieldStyle}
                >
                  {form.firstName.label}
                </label>
                <input
                  id={firstNameInputId}
                  type={getFirstNameInputType()}
                  name={form.firstName.fieldName}
                  autoComplete="given-name"
                  required={Boolean(form.firstName.required)}
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  placeholder={form.firstName.placeholder}
                  style={fieldStyle}
                />
              </div>
            ) : null}

            <div className="w-full flex-1 min-w-0 space-y-1">
              <label
                htmlFor={emailInputId}
                className={joinClasses(
                  "text-xs font-medium",
                  form.showEmailLabel ? undefined : "sr-only"
                )}
                style={fieldStyle}
              >
                {form.emailLabel}
              </label>
              <input
                id={emailInputId}
                type="email"
                name={form.emailFieldName}
                autoComplete="email"
                required
                aria-label={form.showEmailLabel ? undefined : form.emailLabel}
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                placeholder={normalized.placeholder}
                style={fieldStyle}
              />
            </div>

            <div
              className={joinClasses(
                "w-full",
                resolvedVariant === "stacked" ? undefined : "sm:w-auto"
              )}
            >
              <button
                type={submitReady ? "submit" : "button"}
                data-form-submit="1"
                aria-busy="false"
                disabled={!submitReady}
                className="w-full rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                style={buttonStyle}
              >
                {submit.label}
              </button>
            </div>
          </div>

          {showConsent ? (
            <label className="flex items-start gap-2 text-xs opacity-75" style={fieldStyle}>
              <input
                id={consentInputId}
                type="checkbox"
                name={form.consentFieldName}
                value="on"
                required={Boolean(consent.required)}
                className="mt-0.5"
              />
              <span>{consent.label}</span>
            </label>
          ) : null}
        </div>

        <p
          className="hidden text-xs opacity-75"
          style={fieldStyle}
          data-form-embed-success="true"
          data-newsletter-success="true"
          role="status"
          aria-live="polite"
        >
          {stateCopy.successMessage}
        </p>
        <p
          className="hidden text-xs text-rose-600"
          data-form-embed-error="true"
          data-newsletter-error="true"
          role="alert"
          aria-live="assertive"
        >
          {stateCopy.errorMessage}
        </p>
      </form>

      {showOptInCopy ? (
        <p className="text-xs opacity-75" style={fieldStyle} data-newsletter-double-opt-in="true">
          {optIn.confirmationCopy}
        </p>
      ) : null}

      {connectionMessage ? (
        <p
          className="text-xs opacity-75"
          style={fieldStyle}
          data-newsletter-diagnostics="missing-target"
        >
          {connectionMessage}
        </p>
      ) : null}

      {canUseFormsRuntime ? (
        <script dangerouslySetInnerHTML={{ __html: getFormRuntimeClientScript() }} />
      ) : null}
    </section>
  );
}

export function createNewsletterWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<NewsletterData>>;
  visual: ComponentType<WidgetEditorProps<NewsletterData>>;
  advanced: ComponentType<WidgetEditorProps<NewsletterData>>;
}): WidgetDefinition<NewsletterData> {
  return {
    type: "newsletter",
    title: "Newsletter",
    description: "Email signup form.",
    category: "forms",
    variants: [
      {
        id: "inline",
        label: "Inline",
        description: "Input and submit button share one row where possible.",
      },
      {
        id: "stacked",
        label: "Stacked",
        description: "Input sits above button for a clear vertical flow.",
      },
      {
        id: "minimal",
        label: "Minimal",
        description: "Compact signup form with reduced supporting text.",
      },
    ],
    schema: newsletterSchema,
    defaults: newsletterDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: NewsletterBlock,
  };
}
