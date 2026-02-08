import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type NewsletterVariantId = "inline" | "stacked" | "minimal";
export type NewsletterSpacing = "sm" | "md" | "lg" | "xl";
export type NewsletterAlignment = "start" | "center" | "end";
export type NewsletterIntegrationMode = "action-url" | "webhook";

export type NewsletterData = {
  title?: string;
  description?: string;
  placeholder?: string;
  consent?: { enabled?: boolean; label?: string; required?: boolean };
  submit?: { label?: string; successMessage?: string };
  integration?: {
    mode?: NewsletterIntegrationMode;
    actionUrl?: string;
    webhookId?: string;
  };
  style?: {
    spacing?: NewsletterSpacing;
    alignment?: NewsletterAlignment;
    background?: string;
  };
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const spacingClassMap = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
} as const;

const headingSizeClassMap = {
  inline: "text-xl",
  stacked: "text-xl",
  minimal: "text-lg",
} as const;

const sectionAlignClassMap = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
} as const;

const formAlignClassMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const;

const variantFormClassMap = {
  inline: "flex w-full flex-col gap-3 sm:flex-row sm:items-center",
  stacked: "flex w-full flex-col gap-3",
  minimal: "flex w-full flex-col gap-2 sm:flex-row sm:items-center",
} as const;

export const newsletterSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    placeholder: { type: "string" },
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
    integration: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["action-url", "webhook"] },
        actionUrl: { type: "string" },
        webhookId: { type: "string" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        spacing: { enum: ["sm", "md", "lg", "xl"] },
        alignment: { enum: ["start", "center", "end"] },
        background: { type: "string" },
      },
    },
  },
};

export const newsletterDefaults: NewsletterData = {
  title: "Join our newsletter",
  description: "Get the latest updates straight to your inbox.",
  placeholder: "you@example.com",
  consent: {
    enabled: true,
    label: "I agree to receive updates.",
    required: false,
  },
  submit: {
    label: "Subscribe",
    successMessage: "Thanks for joining!",
  },
  integration: {
    mode: "action-url",
    actionUrl: "",
    webhookId: "",
  },
  style: {
    spacing: "md",
    alignment: "start",
    background: "transparent",
  },
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveNewsletterSpacing = (
  value: string | undefined
): NewsletterSpacing => {
  if (value === "sm" || value === "lg" || value === "xl") return value;
  return "md";
};

const resolveNewsletterAlignment = (
  value: string | undefined
): NewsletterAlignment => {
  if (value === "center" || value === "end") return value;
  return "start";
};

const resolveNewsletterIntegrationMode = (
  integration: NewsletterData["integration"]
): NewsletterIntegrationMode => {
  if (integration?.mode === "webhook") return "webhook";
  if (integration?.mode === "action-url") return "action-url";

  const webhookId =
    typeof integration?.webhookId === "string"
      ? integration.webhookId.trim()
      : "";
  const actionUrl =
    typeof integration?.actionUrl === "string"
      ? integration.actionUrl.trim()
      : "";

  if (webhookId.length > 0 && actionUrl.length === 0) return "webhook";
  return "action-url";
};

const resolveNonEmptyLabel = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  return value.trim().length > 0 ? value : fallback;
};

export const resolveNewsletterVariant = (variant: string): NewsletterVariantId => {
  if (variant === "stacked" || variant === "minimal") return variant;
  return "inline";
};

export function normalizeNewsletterData(data: NewsletterData): NewsletterData {
  const consentDefaults = newsletterDefaults.consent ?? {
    enabled: true,
    label: "",
    required: false,
  };
  const submitDefaults = newsletterDefaults.submit ?? {
    label: "Subscribe",
    successMessage: "",
  };
  const integrationDefaults = newsletterDefaults.integration ?? {
    mode: "action-url",
    actionUrl: "",
    webhookId: "",
  };
  const styleDefaults = newsletterDefaults.style ?? {
    spacing: "md",
    alignment: "start",
    background: "transparent",
  };

  return {
    ...data,
    title: resolveString(data.title, newsletterDefaults.title ?? ""),
    description: resolveString(data.description, newsletterDefaults.description ?? ""),
    placeholder: resolveString(data.placeholder, newsletterDefaults.placeholder ?? ""),
    consent: {
      enabled: data.consent?.enabled ?? consentDefaults.enabled,
      label: resolveString(data.consent?.label, consentDefaults.label ?? ""),
      required: data.consent?.required ?? consentDefaults.required ?? false,
    },
    submit: {
      label: resolveNonEmptyLabel(data.submit?.label, submitDefaults.label ?? "Subscribe"),
      successMessage: resolveString(
        data.submit?.successMessage,
        submitDefaults.successMessage ?? ""
      ),
    },
    integration: {
      mode: resolveNewsletterIntegrationMode(data.integration),
      actionUrl: resolveString(
        data.integration?.actionUrl,
        integrationDefaults.actionUrl ?? ""
      ),
      webhookId: resolveString(
        data.integration?.webhookId,
        integrationDefaults.webhookId ?? ""
      ),
    },
    style: {
      spacing: resolveNewsletterSpacing(data.style?.spacing),
      alignment: resolveNewsletterAlignment(data.style?.alignment),
      background: resolveString(data.style?.background, styleDefaults.background ?? "transparent"),
    },
  };
}

export function NewsletterBlock({
  data,
  variant,
}: {
  data: NewsletterData;
  variant: string;
}) {
  const normalizedData = normalizeNewsletterData(data);
  const resolvedVariant = resolveNewsletterVariant(variant);

  const consent = normalizedData.consent ?? newsletterDefaults.consent!;
  const submit = normalizedData.submit ?? newsletterDefaults.submit!;
  const integration = normalizedData.integration ?? newsletterDefaults.integration!;
  const style = normalizedData.style ?? newsletterDefaults.style!;

  const headingSizeClass = headingSizeClassMap[resolvedVariant];
  const spacingClass = spacingClassMap[style.spacing ?? "md"];
  const sectionAlignClass = sectionAlignClassMap[style.alignment ?? "start"];
  const formAlignClass = formAlignClassMap[style.alignment ?? "start"];

  const showTitle = (normalizedData.title ?? "").trim().length > 0;
  const showDescription =
    resolvedVariant !== "minimal" &&
    (normalizedData.description ?? "").trim().length > 0;
  const showConsent = (consent.enabled ?? false) && (consent.label ?? "").trim().length > 0;
  const showSuccessMessage = (submit.successMessage ?? "").trim().length > 0;
  const integrationMode = integration.mode ?? "action-url";
  const webhookId = (integration.webhookId ?? "").trim();
  const formAction =
    integrationMode === "action-url" && (integration.actionUrl ?? "").trim().length > 0
      ? integration.actionUrl?.trim()
      : undefined;

  const sectionStyle: CSSProperties = {
    backgroundColor: style.background ?? "transparent",
  };

  return (
    <section
      className={joinClasses(
        "mx-auto flex w-full max-w-xl flex-col px-4 py-8",
        spacingClass,
        sectionAlignClass
      )}
      style={sectionStyle}
      data-newsletter-variant={resolvedVariant}
      data-newsletter-alignment={style.alignment}
      data-newsletter-spacing={style.spacing}
      data-newsletter-integration-mode={integrationMode}
      data-newsletter-consent-required={String(Boolean(consent.required))}
    >
      {showTitle ? (
        <h3 className={joinClasses(headingSizeClass, "font-semibold text-[var(--color-text)]")}>
          {normalizedData.title}
        </h3>
      ) : null}

      {showDescription ? (
        <p className="text-sm text-[var(--color-text)]/70">{normalizedData.description}</p>
      ) : null}

      <form
        className={joinClasses(variantFormClassMap[resolvedVariant], formAlignClass)}
        method="post"
        action={formAction}
      >
        <input
          type="email"
          required
          className="w-full flex-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder={normalizedData.placeholder}
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)]"
        >
          {submit.label}
        </button>
        {integrationMode === "webhook" && webhookId.length > 0 ? (
          <input type="hidden" name="webhookId" value={webhookId} />
        ) : null}
      </form>

      {showConsent ? (
        <label className="flex items-center gap-2 text-xs text-[var(--color-text)]/60">
          <input type="checkbox" required={Boolean(consent.required)} /> {consent.label}
        </label>
      ) : null}

      {showSuccessMessage ? (
        <p className="text-xs text-[var(--color-text)]/65" data-newsletter-success="true">
          {submit.successMessage}
        </p>
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
        description: "Input and submit button on one row where possible.",
      },
      {
        id: "stacked",
        label: "Stacked",
        description: "Input on top of submit button for stronger vertical flow.",
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
