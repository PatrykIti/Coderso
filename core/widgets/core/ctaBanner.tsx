import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type CtaBannerVariantId = "centered" | "split" | "with-badge";
export type CtaBannerBorderWidth = "0" | "1" | "2" | "3";
export type CtaBannerRadius = "none" | "md" | "lg" | "xl" | "2xl";
export type CtaBannerPadding = "sm" | "md" | "lg" | "xl";

export type CtaBannerAction = {
  label?: string;
  href?: string;
};

export type CtaBannerData = {
  content?: {
    badge?: string;
    title?: string;
    description?: string;
  };
  actions?: {
    primaryCta?: CtaBannerAction;
    secondaryCta?: CtaBannerAction;
  };
  style?: {
    background?: string;
    text?: string;
    border?: string;
    borderWidth?: CtaBannerBorderWidth;
    radius?: CtaBannerRadius;
    padding?: CtaBannerPadding;
    badgeBackground?: string;
    badgeText?: string;
    primaryButtonBg?: string;
    primaryButtonText?: string;
    primaryButtonBorder?: string;
    secondaryButtonBg?: string;
    secondaryButtonText?: string;
    secondaryButtonBorder?: string;
  };
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const radiusClassMap: Record<CtaBannerRadius, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const paddingClassMap: Record<CtaBannerPadding, string> = {
  sm: "px-4 py-4",
  md: "px-5 py-5",
  lg: "px-6 py-6",
  xl: "px-7 py-7",
};

const borderWidthValueMap: Record<CtaBannerBorderWidth, string> = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
};

export const ctaBannerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    content: {
      type: "object",
      additionalProperties: false,
      properties: {
        badge: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    actions: {
      type: "object",
      additionalProperties: false,
      properties: {
        primaryCta: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            href: { type: "string" },
          },
        },
        secondaryCta: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            href: { type: "string" },
          },
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        background: { type: "string" },
        text: { type: "string" },
        border: { type: "string" },
        borderWidth: { enum: ["0", "1", "2", "3"] },
        radius: { enum: ["none", "md", "lg", "xl", "2xl"] },
        padding: { enum: ["sm", "md", "lg", "xl"] },
        badgeBackground: { type: "string" },
        badgeText: { type: "string" },
        primaryButtonBg: { type: "string" },
        primaryButtonText: { type: "string" },
        primaryButtonBorder: { type: "string" },
        secondaryButtonBg: { type: "string" },
        secondaryButtonText: { type: "string" },
        secondaryButtonBorder: { type: "string" },
      },
    },
  },
};

export const ctaBannerDefaults: CtaBannerData = {
  content: {
    badge: "Limited offer",
    title: "Ready to launch your next campaign?",
    description: "Use reusable sections and publish faster with consistent design.",
  },
  actions: {
    primaryCta: {
      label: "Get started",
      href: "#",
    },
    secondaryCta: {
      label: "Contact sales",
      href: "#",
    },
  },
  style: {
    background: "var(--color-surface)",
    text: "var(--color-text)",
    border: "var(--color-border)",
    borderWidth: "1",
    radius: "xl",
    padding: "md",
    badgeBackground: "var(--color-primary)",
    badgeText: "var(--color-bg)",
    primaryButtonBg: "var(--color-primary)",
    primaryButtonText: "var(--color-bg)",
    primaryButtonBorder: "transparent",
    secondaryButtonBg: "transparent",
    secondaryButtonText: "var(--color-text)",
    secondaryButtonBorder: "var(--color-border)",
  },
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const normalizeAction = (
  action: CtaBannerAction | undefined,
  fallback: Required<CtaBannerAction>
): Required<CtaBannerAction> => ({
  label: resolveString(action?.label, fallback.label),
  href: resolveString(action?.href, fallback.href),
});

const resolveCtaBannerBorderWidth = (
  value: string | undefined
): CtaBannerBorderWidth => {
  if (value === "0" || value === "2" || value === "3") return value;
  return "1";
};

const resolveCtaBannerRadius = (value: string | undefined): CtaBannerRadius => {
  if (value === "none" || value === "md" || value === "lg" || value === "2xl") {
    return value;
  }
  return "xl";
};

const resolveCtaBannerPadding = (value: string | undefined): CtaBannerPadding => {
  if (value === "sm" || value === "lg" || value === "xl") return value;
  return "md";
};

export const resolveCtaBannerVariant = (variant: string): CtaBannerVariantId => {
  if (variant === "split" || variant === "with-badge") return variant;
  return "centered";
};

export function normalizeCtaBannerData(data: CtaBannerData): CtaBannerData {
  const contentDefaults = ctaBannerDefaults.content ?? {
    badge: "",
    title: "",
    description: "",
  };
  const actionsDefaults = ctaBannerDefaults.actions ?? {
    primaryCta: { label: "", href: "" },
    secondaryCta: { label: "", href: "" },
  };
  const styleDefaults = ctaBannerDefaults.style ?? {
    background: "var(--color-surface)",
    text: "var(--color-text)",
    border: "var(--color-border)",
    borderWidth: "1",
    radius: "xl",
    padding: "md",
    badgeBackground: "var(--color-primary)",
    badgeText: "var(--color-bg)",
    primaryButtonBg: "var(--color-primary)",
    primaryButtonText: "var(--color-bg)",
    primaryButtonBorder: "transparent",
    secondaryButtonBg: "transparent",
    secondaryButtonText: "var(--color-text)",
    secondaryButtonBorder: "var(--color-border)",
  };

  return {
    ...data,
    content: {
      badge: resolveString(data.content?.badge, contentDefaults.badge ?? ""),
      title: resolveString(data.content?.title, contentDefaults.title ?? ""),
      description: resolveString(
        data.content?.description,
        contentDefaults.description ?? ""
      ),
    },
    actions: {
      primaryCta: normalizeAction(
        data.actions?.primaryCta,
        (actionsDefaults.primaryCta ?? { label: "Get started", href: "#" }) as Required<CtaBannerAction>
      ),
      secondaryCta: normalizeAction(
        data.actions?.secondaryCta,
        (actionsDefaults.secondaryCta ?? { label: "Learn more", href: "#" }) as Required<CtaBannerAction>
      ),
    },
    style: {
      background: resolveString(
        data.style?.background,
        styleDefaults.background ?? "var(--color-surface)"
      ),
      text: resolveString(data.style?.text, styleDefaults.text ?? "var(--color-text)"),
      border: resolveString(data.style?.border, styleDefaults.border ?? "var(--color-border)"),
      borderWidth: resolveCtaBannerBorderWidth(data.style?.borderWidth),
      radius: resolveCtaBannerRadius(data.style?.radius),
      padding: resolveCtaBannerPadding(data.style?.padding),
      badgeBackground: resolveString(
        data.style?.badgeBackground,
        styleDefaults.badgeBackground ?? "var(--color-primary)"
      ),
      badgeText: resolveString(
        data.style?.badgeText,
        styleDefaults.badgeText ?? "var(--color-bg)"
      ),
      primaryButtonBg: resolveString(
        data.style?.primaryButtonBg,
        styleDefaults.primaryButtonBg ?? "var(--color-primary)"
      ),
      primaryButtonText: resolveString(
        data.style?.primaryButtonText,
        styleDefaults.primaryButtonText ?? "var(--color-bg)"
      ),
      primaryButtonBorder: resolveString(
        data.style?.primaryButtonBorder,
        styleDefaults.primaryButtonBorder ?? "transparent"
      ),
      secondaryButtonBg: resolveString(
        data.style?.secondaryButtonBg,
        styleDefaults.secondaryButtonBg ?? "transparent"
      ),
      secondaryButtonText: resolveString(
        data.style?.secondaryButtonText,
        styleDefaults.secondaryButtonText ?? "var(--color-text)"
      ),
      secondaryButtonBorder: resolveString(
        data.style?.secondaryButtonBorder,
        styleDefaults.secondaryButtonBorder ?? "var(--color-border)"
      ),
    },
  };
}

export function CtaBannerBlock({
  data,
  variant,
}: {
  data: CtaBannerData;
  variant: string;
}) {
  const normalized = normalizeCtaBannerData(data);
  const resolvedVariant = resolveCtaBannerVariant(variant);
  const style = normalized.style ?? ctaBannerDefaults.style!;
  const content = normalized.content ?? ctaBannerDefaults.content!;
  const actions = normalized.actions ?? ctaBannerDefaults.actions!;

  const hasBadge = (content.badge ?? "").trim().length > 0;
  const showBadge = resolvedVariant === "with-badge" || hasBadge;
  const hasDescription = (content.description ?? "").trim().length > 0;
  const hasPrimary =
    (actions.primaryCta?.label ?? "").trim().length > 0 &&
    (actions.primaryCta?.href ?? "").trim().length > 0;
  const hasSecondary =
    (actions.secondaryCta?.label ?? "").trim().length > 0 &&
    (actions.secondaryCta?.href ?? "").trim().length > 0;

  const wrapperClassName =
    resolvedVariant === "split"
      ? "flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      : "flex flex-col items-center text-center gap-4";

  const actionsClassName =
    resolvedVariant === "split"
      ? "flex flex-wrap items-center gap-3 md:justify-end"
      : "flex flex-wrap items-center justify-center gap-3";

  const containerStyle: CSSProperties = {
    backgroundColor: style.background ?? "var(--color-surface)",
    color: style.text ?? "var(--color-text)",
    borderColor: style.border ?? "var(--color-border)",
    borderStyle: "solid",
    borderWidth: borderWidthValueMap[resolveCtaBannerBorderWidth(style.borderWidth)],
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8" data-cta-banner-outer="true">
      <div
        className={joinClasses(
          "w-full border",
          radiusClassMap[resolveCtaBannerRadius(style.radius)],
          paddingClassMap[resolveCtaBannerPadding(style.padding)]
        )}
        style={containerStyle}
        data-cta-banner-variant={resolvedVariant}
        data-cta-banner-padding={resolveCtaBannerPadding(style.padding)}
        data-cta-banner-border-width={resolveCtaBannerBorderWidth(style.borderWidth)}
      >
        <div className={wrapperClassName}>
          <div className={joinClasses("space-y-2", resolvedVariant === "split" ? "md:max-w-2xl" : "max-w-2xl")}>
            {showBadge ? (
              <span
                className="inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: style.badgeBackground ?? "var(--color-primary)",
                  color: style.badgeText ?? "var(--color-bg)",
                }}
              >
                {content.badge}
              </span>
            ) : null}

            {(content.title ?? "").trim().length > 0 ? (
              <h3 className="text-2xl font-semibold">{content.title}</h3>
            ) : null}
            {hasDescription ? (
              <p className="text-sm text-[var(--color-text)]/80">{content.description}</p>
            ) : null}
          </div>

          <div className={actionsClassName}>
            {hasPrimary ? (
              <a
                href={actions.primaryCta?.href}
                className="inline-flex rounded-md border px-4 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: style.primaryButtonBg ?? "var(--color-primary)",
                  color: style.primaryButtonText ?? "var(--color-bg)",
                  borderColor: style.primaryButtonBorder ?? "transparent",
                }}
              >
                {actions.primaryCta?.label}
              </a>
            ) : null}
            {hasSecondary ? (
              <a
                href={actions.secondaryCta?.href}
                className="inline-flex rounded-md border px-4 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: style.secondaryButtonBg ?? "transparent",
                  color: style.secondaryButtonText ?? "var(--color-text)",
                  borderColor: style.secondaryButtonBorder ?? "var(--color-border)",
                }}
              >
                {actions.secondaryCta?.label}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function createCtaBannerWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<CtaBannerData>>;
  visual: ComponentType<WidgetEditorProps<CtaBannerData>>;
  advanced: ComponentType<WidgetEditorProps<CtaBannerData>>;
}): WidgetDefinition<CtaBannerData> {
  return {
    type: "cta-banner",
    title: "CTA Banner",
    description: "Compact conversion strip with headline and CTA actions.",
    category: "content",
    variants: [
      {
        id: "centered",
        label: "Centered",
        description: "Centered copy and actions for balanced CTA emphasis.",
      },
      {
        id: "split",
        label: "Split",
        description: "Copy on the left and actions on the right.",
      },
      {
        id: "with-badge",
        label: "With Badge",
        description: "CTA with highlighted badge above heading.",
      },
    ],
    schema: ctaBannerSchema,
    defaults: ctaBannerDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: CtaBannerBlock,
  };
}
