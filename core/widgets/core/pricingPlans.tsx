import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export type PricingPlansVariantId = "three-plans" | "four-plans" | "comparison-rows";
export type PricingPlansSpacing = "none" | "sm" | "md" | "lg";
export type PricingPlansRadius = "none" | "md" | "lg" | "xl";
export type PricingBillingCycle = "monthly" | "annual";
export type PricingPlansFeatureMarker = "bullet" | "check" | "icon";

export type PricingBillingToggle = {
  enabled?: boolean;
  monthlyLabel?: string;
  annualLabel?: string;
  defaultCycle?: PricingBillingCycle;
};

export type PricingPlanCyclePrices = {
  monthly?: string;
  annual?: string;
};

export type PricingPlanItem = {
  id?: string;
  name?: string;
  price?: string;
  period?: string;
  badge?: string;
  prices?: PricingPlanCyclePrices;
  features?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  highlighted?: boolean;
};

export type PricingPlansData = {
  header?: {
    title?: string;
    description?: string;
  };
  plans: PricingPlanItem[];
  billingToggle?: PricingBillingToggle;
  style?: {
    cardSurface?: string;
    cardBorder?: string;
    highlightRing?: string;
    spacing?: PricingPlansSpacing;
    radius?: PricingPlansRadius;
    featureMarker?: PricingPlansFeatureMarker;
  };
};

type ResolvedPricingStyle = Omit<
  Required<NonNullable<PricingPlansData["style"]>>,
  "cardSurface" | "cardBorder"
> &
  Pick<NonNullable<PricingPlansData["style"]>, "cardSurface" | "cardBorder">;

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const pricingVariantPlanCountMap: Record<PricingPlansVariantId, number> = {
  "three-plans": 3,
  "four-plans": 4,
  "comparison-rows": 3,
};

const spacingClassMap: Record<PricingPlansSpacing, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const radiusClassMap: Record<PricingPlansRadius, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

const pricingPlanMin = 2;
export const pricingPlanMax = 6;

export const pricingPlansSchema = {
  type: "object",
  additionalProperties: false,
  required: ["plans"],
  properties: {
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    plans: {
      type: "array",
      minItems: pricingPlanMin,
      maxItems: pricingPlanMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          price: { type: "string" },
          period: { type: "string" },
          badge: { type: "string" },
          prices: {
            type: "object",
            additionalProperties: false,
            properties: {
              monthly: { type: "string" },
              annual: { type: "string" },
            },
          },
          features: {
            type: "array",
            items: { type: "string" },
          },
          ctaLabel: { type: "string" },
          ctaHref: { type: "string" },
          highlighted: { type: "boolean" },
        },
      },
    },
    billingToggle: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        monthlyLabel: { type: "string" },
        annualLabel: { type: "string" },
        defaultCycle: { enum: ["monthly", "annual"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        cardSurface: { type: "string" },
        cardBorder: { type: "string" },
        highlightRing: { type: "string" },
        spacing: { enum: ["none", "sm", "md", "lg"] },
        radius: { enum: ["none", "md", "lg", "xl"] },
        featureMarker: { enum: ["bullet", "check", "icon"] },
      },
    },
  },
};

export const pricingPlansDefaults: PricingPlansData = {
  header: {
    title: "Choose the plan that fits your workflow",
    description: "Compare pricing tiers and pick the option matching your team stage.",
  },
  billingToggle: {
    enabled: false,
    monthlyLabel: "Monthly",
    annualLabel: "Annual",
    defaultCycle: "monthly",
  },
  plans: [
    {
      id: "plan-1",
      name: "Starter",
      price: "$19",
      period: "/month",
      badge: "For individuals",
      prices: {
        monthly: "$19",
        annual: "$190",
      },
      features: ["1 project", "Email support", "Basic analytics"],
      ctaLabel: "Start now",
      ctaHref: "#",
      highlighted: false,
    },
    {
      id: "plan-2",
      name: "Growth",
      price: "$49",
      period: "/month",
      badge: "Most popular",
      prices: {
        monthly: "$49",
        annual: "$490",
      },
      features: ["10 projects", "Priority support", "Advanced analytics"],
      ctaLabel: "Choose growth",
      ctaHref: "#",
      highlighted: true,
    },
    {
      id: "plan-3",
      name: "Scale",
      price: "$99",
      period: "/month",
      badge: "For teams",
      prices: {
        monthly: "$99",
        annual: "$990",
      },
      features: ["Unlimited projects", "SLA", "Audit logs"],
      ctaLabel: "Contact sales",
      ctaHref: "#",
      highlighted: false,
    },
  ],
  style: {
    cardSurface: "var(--color-bg)",
    cardBorder: "var(--color-border)",
    highlightRing: "var(--color-primary)",
    spacing: "md",
    radius: "lg",
    featureMarker: "bullet",
  },
};

const createPlanId = (index: number) => `plan-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolvePricingSpacing = (value: string | undefined): PricingPlansSpacing => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolvePricingRadius = (value: string | undefined): PricingPlansRadius => {
  if (value === "none" || value === "md" || value === "xl") return value;
  return "lg";
};

const resolvePricingBillingCycle = (value: string | undefined): PricingBillingCycle =>
  value === "annual" ? "annual" : "monthly";

const resolvePricingFeatureMarker = (value: string | undefined): PricingPlansFeatureMarker => {
  if (value === "check" || value === "icon") return value;
  return "bullet";
};

const normalizeFeatureList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    normalized.push(trimmed);
  }
  return normalized;
};

export const resolvePricingPlansVariant = (variant: string): PricingPlansVariantId => {
  if (variant === "four-plans" || variant === "comparison-rows") return variant;
  return "three-plans";
};

export const resolvePricingPlanCountForVariant = (variant: PricingPlansVariantId): number =>
  pricingVariantPlanCountMap[variant];

export const normalizePricingPlanCount = (value: number) => {
  if (!Number.isFinite(value)) return resolvePricingPlanCountForVariant("three-plans");
  return Math.min(pricingPlanMax, Math.max(pricingPlanMin, Math.floor(value)));
};

export function normalizePricingPlans(
  plans: PricingPlanItem[] | undefined,
  desiredCount?: number
): PricingPlanItem[] {
  const source = Array.isArray(plans) ? plans : [];
  const fallbackNames = ["Starter", "Growth", "Scale", "Business"];
  const fallbackPrices = ["$19", "$49", "$99", "$199"];

  const targetCount =
    typeof desiredCount === "number"
      ? normalizePricingPlanCount(desiredCount)
      : normalizePricingPlanCount(
          source.length > 0 ? source.length : resolvePricingPlanCountForVariant("three-plans")
        );

  const normalized: PricingPlanItem[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};

    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createPlanId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`plan-${candidate}`)) {
        candidate += 1;
      }
      id = `plan-${candidate}`;
    }
    usedIds.add(id);

    const name =
      typeof base.name === "string" && base.name.trim().length > 0
        ? base.name.trim()
        : (fallbackNames[index] ?? `Plan ${index + 1}`);

    const price =
      typeof base.price === "string" && base.price.trim().length > 0
        ? base.price.trim()
        : (fallbackPrices[index] ?? "$0");

    normalized.push({
      id,
      name,
      price,
      period: resolveOptionalString(base.period),
      badge: resolveOptionalString(base.badge),
      prices: {
        monthly: resolveOptionalString(base.prices?.monthly) ?? price,
        annual: resolveOptionalString(base.prices?.annual),
      },
      features: normalizeFeatureList(base.features),
      ctaLabel: resolveOptionalString(base.ctaLabel),
      ctaHref:
        normalizeWidgetSafeHref(base.ctaHref, {
          allowRelative: true,
          allowHash: true,
          allowHttp: true,
        }) ?? undefined,
      highlighted: Boolean(base.highlighted),
    });
  }

  return normalized;
}

function ensureSingleHighlighted(plans: PricingPlanItem[]): PricingPlanItem[] {
  let highlightedSeen = false;

  return plans.map((plan, index) => {
    const shouldHighlight = Boolean(plan.highlighted);
    if (!shouldHighlight) return plan;

    if (!highlightedSeen) {
      highlightedSeen = true;
      return plan;
    }

    return {
      ...plan,
      highlighted: false,
      badge: plan.badge ?? (index === 0 ? "Most popular" : undefined),
    };
  });
}

export function normalizePricingPlansData(data: PricingPlansData): PricingPlansData {
  const headerDefaults = pricingPlansDefaults.header ?? {
    title: "",
    description: "",
  };
  const billingDefaults = pricingPlansDefaults.billingToggle ?? {
    enabled: false,
    monthlyLabel: "Monthly",
    annualLabel: "Annual",
    defaultCycle: "monthly" as const,
  };
  const styleDefaults = pricingPlansDefaults.style ?? {
    cardSurface: "var(--color-bg)",
    cardBorder: "var(--color-border)",
    highlightRing: "var(--color-primary)",
    spacing: "md",
    radius: "lg",
    featureMarker: "bullet",
  };
  const hasStyleObject = data.style !== undefined;

  return {
    ...data,
    header: {
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
    },
    plans: ensureSingleHighlighted(normalizePricingPlans(data.plans)),
    billingToggle: {
      enabled:
        typeof data.billingToggle?.enabled === "boolean"
          ? data.billingToggle.enabled
          : billingDefaults.enabled !== false,
      monthlyLabel: resolveString(
        data.billingToggle?.monthlyLabel,
        billingDefaults.monthlyLabel ?? "Monthly"
      ),
      annualLabel: resolveString(
        data.billingToggle?.annualLabel,
        billingDefaults.annualLabel ?? "Annual"
      ),
      defaultCycle: resolvePricingBillingCycle(
        data.billingToggle?.defaultCycle ?? billingDefaults.defaultCycle
      ),
    },
    style: {
      cardSurface: hasStyleObject
        ? resolveClearableStyleValue(data.style?.cardSurface)
        : styleDefaults.cardSurface,
      cardBorder: hasStyleObject
        ? resolveClearableStyleValue(data.style?.cardBorder)
        : styleDefaults.cardBorder,
      highlightRing: resolveString(
        data.style?.highlightRing,
        styleDefaults.highlightRing ?? "var(--color-primary)"
      ),
      spacing: resolvePricingSpacing(data.style?.spacing),
      radius: resolvePricingRadius(data.style?.radius),
      featureMarker: resolvePricingFeatureMarker(
        data.style?.featureMarker ?? styleDefaults.featureMarker
      ),
    },
  };
}

function collectFeatureRows(plans: PricingPlanItem[]): string[] {
  const rows: string[] = [];
  for (const plan of plans) {
    for (const feature of plan.features ?? []) {
      if (rows.includes(feature)) continue;
      rows.push(feature);
    }
  }
  return rows;
}

const featureMarkerIconMap: Record<PricingPlansFeatureMarker, string> = {
  bullet: "•",
  check: "✓",
  icon: "◆",
};

const resolveDisplayedPlanPrice = (
  plan: PricingPlanItem,
  billingToggle: NonNullable<PricingPlansData["billingToggle"]>
) => {
  if (billingToggle.enabled) {
    return billingToggle.defaultCycle === "annual"
      ? (plan.prices?.annual ?? plan.price)
      : (plan.prices?.monthly ?? plan.price);
  }
  return plan.price;
};

function PricingCardsLayout({
  plans,
  variant,
  style,
  billingToggle,
}: {
  plans: PricingPlanItem[];
  variant: PricingPlansVariantId;
  style: ResolvedPricingStyle;
  billingToggle: NonNullable<PricingPlansData["billingToggle"]>;
}) {
  const gridClassName =
    variant === "four-plans"
      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  const cardStyleBase: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.cardSurface),
      borderColor: resolveClearableStyleValue(style.cardBorder),
      borderStyle: "solid",
      borderWidth: "1px",
    }) ?? {};

  return (
    <div className={joinClasses(gridClassName, spacingClassMap[style.spacing])}>
      {plans.map((plan, index) => {
        const highlighted = Boolean(plan.highlighted);
        const cardStyle: CSSProperties = {
          ...cardStyleBase,
          boxShadow: highlighted ? `0 0 0 2px ${style.highlightRing}` : undefined,
        };

        return (
          <article
            key={plan.id ?? `plan-${index + 1}`}
            className={joinClasses(
              "flex h-full flex-col gap-4 border p-5",
              radiusClassMap[style.radius]
            )}
            style={cardStyle}
            data-pricing-plan={String(index + 1)}
            data-pricing-highlighted={String(highlighted)}
          >
            <div className="space-y-1">
              <p className="text-base font-semibold text-[var(--color-text)]">{plan.name}</p>
              {(plan.badge ?? "").trim().length > 0 ? (
                <span
                  className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: style.highlightRing,
                    color: "var(--color-bg)",
                  }}
                >
                  {plan.badge}
                </span>
              ) : null}
            </div>

            <p className="flex items-end gap-1 text-[var(--color-text)]">
              <span className="text-3xl font-semibold">
                {resolveDisplayedPlanPrice(plan, billingToggle)}
              </span>
              {(plan.period ?? "").trim().length > 0 ? (
                <span className="pb-1 text-xs text-[var(--color-text)]/65">{plan.period}</span>
              ) : null}
            </p>

            <ul className="space-y-2 text-sm text-[var(--color-text)]/80">
              {(plan.features ?? []).map((feature, featureIndex) => (
                <li key={`${plan.id ?? index}-feature-${featureIndex}`} className="flex gap-2">
                  <span style={{ color: style.highlightRing }}>
                    {featureMarkerIconMap[style.featureMarker ?? "bullet"]}
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {(plan.ctaLabel ?? "").trim().length > 0 && (plan.ctaHref ?? "").trim().length > 0 ? (
              <a
                href={plan.ctaHref}
                className="mt-auto inline-flex w-fit rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)]"
              >
                {plan.ctaLabel}
              </a>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function PricingComparisonRowsLayout({
  plans,
  style,
  billingToggle,
}: {
  plans: PricingPlanItem[];
  style: ResolvedPricingStyle;
  billingToggle: NonNullable<PricingPlansData["billingToggle"]>;
}) {
  const featureRows = collectFeatureRows(plans);

  const tableStyle: CSSProperties =
    compactStyle({
      borderColor: resolveClearableStyleValue(style.cardBorder),
      borderStyle: "solid",
      borderWidth: "1px",
      backgroundColor: resolveClearableStyleValue(style.cardSurface),
    }) ?? {};

  return (
    <div className={joinClasses("overflow-x-auto", radiusClassMap[style.radius])}>
      <table
        className="w-full min-w-[44rem] border-collapse text-sm"
        style={tableStyle}
        data-pricing-comparison="true"
      >
        <thead>
          <tr className="border-b" style={{ borderColor: style.cardBorder }}>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text)]/65">
              Feature
            </th>
            {plans.map((plan, index) => (
              <th
                key={plan.id ?? `header-${index + 1}`}
                className="px-4 py-3 text-left align-top"
                style={
                  plan.highlighted
                    ? {
                        boxShadow: `inset 0 0 0 1px ${style.highlightRing}`,
                      }
                    : undefined
                }
              >
                <p className="text-sm font-semibold text-[var(--color-text)]">{plan.name}</p>
                <p className="text-xl font-semibold text-[var(--color-text)]">
                  {resolveDisplayedPlanPrice(plan, billingToggle)}
                </p>
                {(plan.period ?? "").trim().length > 0 ? (
                  <p className="text-xs text-[var(--color-text)]/65">{plan.period}</p>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureRows.map((feature, rowIndex) => (
            <tr
              key={`feature-row-${rowIndex}`}
              className="border-b"
              style={{ borderColor: style.cardBorder }}
              data-pricing-feature-row={String(rowIndex + 1)}
            >
              <td className="px-4 py-3 text-[var(--color-text)]">{feature}</td>
              {plans.map((plan, planIndex) => {
                const hasFeature = (plan.features ?? []).includes(feature);
                return (
                  <td key={`feature-cell-${planIndex}-${rowIndex}`} className="px-4 py-3">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: hasFeature
                          ? style.highlightRing
                          : "color-mix(in oklab, var(--color-text) 10%, transparent)",
                        color: hasFeature ? "var(--color-bg)" : "var(--color-text)",
                      }}
                      aria-label={hasFeature ? "Included" : "Not included"}
                    >
                      {hasFeature ? "✓" : "-"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/65">
              Action
            </td>
            {plans.map((plan, index) => (
              <td key={`cta-${index}`} className="px-4 py-3">
                {(plan.ctaLabel ?? "").trim().length > 0 &&
                (plan.ctaHref ?? "").trim().length > 0 ? (
                  <a
                    href={plan.ctaHref}
                    className="inline-flex rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)]"
                  >
                    {plan.ctaLabel}
                  </a>
                ) : (
                  <span className="text-xs text-[var(--color-text)]/40">Not set</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function PricingPlansBlock({ data, variant }: { data: PricingPlansData; variant: string }) {
  const resolvedVariant = resolvePricingPlansVariant(variant);
  const visibleCount = resolvePricingPlanCountForVariant(resolvedVariant);
  const normalizedData = normalizePricingPlansData(data);
  const billingToggle = normalizedData.billingToggle ?? pricingPlansDefaults.billingToggle!;
  const style = normalizedData.style ?? pricingPlansDefaults.style!;

  const plans = normalizePricingPlans(normalizedData.plans, visibleCount);

  const resolvedStyle = {
    cardSurface: style.cardSurface,
    cardBorder: style.cardBorder,
    highlightRing: style.highlightRing ?? "var(--color-primary)",
    spacing: resolvePricingSpacing(style.spacing),
    radius: resolvePricingRadius(style.radius),
    featureMarker: resolvePricingFeatureMarker(style.featureMarker),
  } satisfies ResolvedPricingStyle;

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      data-pricing-variant={resolvedVariant}
      data-pricing-spacing={resolvedStyle.spacing}
      data-pricing-count={String(plans.length)}
    >
      <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center">
        {(normalizedData.header?.title ?? "").trim().length > 0 ? (
          <h3 className="text-2xl font-semibold text-[var(--color-text)]">
            {normalizedData.header?.title}
          </h3>
        ) : null}
        {(normalizedData.header?.description ?? "").trim().length > 0 ? (
          <p className="text-sm text-[var(--color-text)]/75">
            {normalizedData.header?.description}
          </p>
        ) : null}
      </header>

      {billingToggle.enabled ? (
        <div
          className="mb-4 flex items-center justify-center gap-2"
          data-pricing-billing-toggle="static"
          data-pricing-cycle={billingToggle.defaultCycle ?? "monthly"}
          aria-label="Billing cycle options"
        >
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            data-state={billingToggle.defaultCycle !== "annual" ? "active" : "inactive"}
          >
            {billingToggle.monthlyLabel}
          </span>
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            data-state={billingToggle.defaultCycle === "annual" ? "active" : "inactive"}
          >
            {billingToggle.annualLabel}
          </span>
        </div>
      ) : null}

      {resolvedVariant === "comparison-rows" ? (
        <PricingComparisonRowsLayout
          plans={plans}
          style={resolvedStyle}
          billingToggle={billingToggle}
        />
      ) : (
        <PricingCardsLayout
          plans={plans}
          variant={resolvedVariant}
          style={resolvedStyle}
          billingToggle={billingToggle}
        />
      )}
    </section>
  );
}

export function createPricingPlansWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<PricingPlansData>>;
  visual: ComponentType<WidgetEditorProps<PricingPlansData>>;
  advanced: ComponentType<WidgetEditorProps<PricingPlansData>>;
}): WidgetDefinition<PricingPlansData> {
  return {
    type: "pricing-plans",
    title: "Pricing Plans",
    description: "Plan cards and comparison layout for offers.",
    category: "content",
    variants: [
      {
        id: "three-plans",
        label: "Three Plans",
        description: "Three-card pricing layout.",
      },
      {
        id: "four-plans",
        label: "Four Plans",
        description: "Four-card pricing layout for broader offers.",
      },
      {
        id: "comparison-rows",
        label: "Comparison Rows",
        description: "Feature-by-feature table style comparison.",
      },
    ],
    schema: pricingPlansSchema,
    defaults: pricingPlansDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: PricingPlansBlock,
  };
}
