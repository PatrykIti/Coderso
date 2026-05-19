import type { CSSProperties, ComponentType, ReactNode, SVGProps } from "react";
import { Check, Clock3, LockKeyhole, Sparkles } from "lucide-react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export type PricingPlansVariantId = "two-plans" | "three-plans" | "four-plans" | "comparison-rows";
export type PricingPlansSpacing = "none" | "sm" | "md" | "lg";
export type PricingPlansRadius = "none" | "md" | "lg" | "xl";
export type PricingBillingCycle = "monthly" | "annual";
export type PricingPlansFeatureMarker = "bullet" | "check" | "status" | "icon";
export type ResolvedPricingPlansFeatureMarker = "bullet" | "check" | "status";
export type PricingPlanCtaStyle = "outline" | "filled" | "ghost";
export type PricingPlanBadgeTone = "neutral" | "accent" | "highlight";
export type PricingFeatureStatus = "included" | "premium" | "coming-soon";
export type PricingFeatureIcon = "check" | "sparkle" | "lock" | "clock";
export type PricingPlanPriceMode = "legacy" | "structured" | "free" | "custom";
export type PricingPlansMaxWidth = "narrow" | "default" | "wide";
export type PricingPlansTypography = "compact" | "balanced" | "prominent";

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

export type PricingPlanFeatureItem = {
  text?: string;
  status?: PricingFeatureStatus;
  icon?: PricingFeatureIcon;
};

export type PricingPlanPriceDisplay = {
  mode?: PricingPlanPriceMode;
  amount?: number;
  annualAmount?: number;
  currency?: string;
  freeLabel?: string;
  customLabel?: string;
  annualSavingsLabel?: string;
};

export type PricingPlanItem = {
  id?: string;
  name?: string;
  description?: string;
  price?: string;
  period?: string;
  badge?: string;
  badgeTone?: PricingPlanBadgeTone;
  surface?: string;
  ctaStyle?: PricingPlanCtaStyle;
  highlightLabel?: string;
  prices?: PricingPlanCyclePrices;
  features?: Array<string | PricingPlanFeatureItem>;
  priceDisplay?: PricingPlanPriceDisplay;
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
  comparison?: {
    stickyHeader?: boolean;
    showHeaderCta?: boolean;
    showHeaderBadges?: boolean;
  };
  layout?: {
    maxWidth?: PricingPlansMaxWidth;
    typography?: PricingPlansTypography;
    footerNote?: string;
  };
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
  Pick<NonNullable<PricingPlansData["style"]>, "cardSurface" | "cardBorder"> & {
    featureMarker: ResolvedPricingPlansFeatureMarker;
  };

type ResolvedPricingLayout = Required<
  Pick<NonNullable<PricingPlansData["layout"]>, "maxWidth" | "typography">
> &
  Pick<NonNullable<PricingPlansData["layout"]>, "footerNote">;

type ResolvedPricingComparison = Required<NonNullable<PricingPlansData["comparison"]>>;

type ResolvedPricingPlanState = {
  allPlans: PricingPlanItem[];
  visiblePlans: PricingPlanItem[];
  hiddenPlans: PricingPlanItem[];
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const pricingVariantPlanCountMap: Record<PricingPlansVariantId, number> = {
  "two-plans": 2,
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

const maxWidthClassMap: Record<PricingPlansMaxWidth, string> = {
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

const pricingTypographyClassMap: Record<
  PricingPlansTypography,
  {
    sectionTitle: string;
    sectionDescription: string;
    planName: string;
    planDescription: string;
    price: string;
    period: string;
    featureList: string;
    comparisonPrice: string;
    footerNote: string;
  }
> = {
  compact: {
    sectionTitle: "text-xl",
    sectionDescription: "text-sm",
    planName: "text-sm",
    planDescription: "text-xs",
    price: "text-2xl",
    period: "text-xs",
    featureList: "text-sm",
    comparisonPrice: "text-lg",
    footerNote: "text-xs",
  },
  balanced: {
    sectionTitle: "text-2xl",
    sectionDescription: "text-sm",
    planName: "text-base",
    planDescription: "text-sm",
    price: "text-3xl",
    period: "text-xs",
    featureList: "text-sm",
    comparisonPrice: "text-xl",
    footerNote: "text-sm",
  },
  prominent: {
    sectionTitle: "text-3xl",
    sectionDescription: "text-base",
    planName: "text-lg",
    planDescription: "text-sm",
    price: "text-4xl",
    period: "text-sm",
    featureList: "text-base",
    comparisonPrice: "text-2xl",
    footerNote: "text-sm",
  },
};

const ctaStyleClassMap: Record<PricingPlanCtaStyle, string> = {
  outline:
    "inline-flex w-fit rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)]",
  filled:
    "inline-flex w-fit rounded-md bg-[var(--color-text)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg)] transition hover:opacity-90",
  ghost:
    "inline-flex w-fit rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] underline-offset-4 transition hover:underline",
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
          description: { type: "string" },
          price: { type: "string" },
          period: { type: "string" },
          badge: { type: "string" },
          badgeTone: { enum: ["neutral", "accent", "highlight"] },
          surface: { type: "string" },
          ctaStyle: { enum: ["outline", "filled", "ghost"] },
          highlightLabel: { type: "string" },
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
            items: {
              anyOf: [
                { type: "string" },
                {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    status: { enum: ["included", "premium", "coming-soon"] },
                    icon: { enum: ["check", "sparkle", "lock", "clock"] },
                  },
                },
              ],
            },
          },
          priceDisplay: {
            type: "object",
            additionalProperties: false,
            properties: {
              mode: { enum: ["legacy", "structured", "free", "custom"] },
              amount: { type: "number" },
              annualAmount: { type: "number" },
              currency: { type: "string" },
              freeLabel: { type: "string" },
              customLabel: { type: "string" },
              annualSavingsLabel: { type: "string" },
            },
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
    comparison: {
      type: "object",
      additionalProperties: false,
      properties: {
        stickyHeader: { type: "boolean" },
        showHeaderCta: { type: "boolean" },
        showHeaderBadges: { type: "boolean" },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        maxWidth: { enum: ["narrow", "default", "wide"] },
        typography: { enum: ["compact", "balanced", "prominent"] },
        footerNote: { type: "string" },
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
        featureMarker: { enum: ["bullet", "check", "status", "icon"] },
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
  comparison: {
    stickyHeader: false,
    showHeaderCta: true,
    showHeaderBadges: true,
  },
  layout: {
    maxWidth: "default",
    typography: "balanced",
    footerNote: undefined,
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

const resolveOptionalTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveOptionalPriceAmount = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(Math.max(0, value) * 100) / 100;
};

const resolvePricingSpacing = (value: string | undefined): PricingPlansSpacing => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg") return value;
  return "md";
};

const resolvePricingRadius = (value: string | undefined): PricingPlansRadius => {
  if (value === "none" || value === "md" || value === "lg" || value === "xl") return value;
  return "lg";
};

const resolvePricingBillingCycle = (value: string | undefined): PricingBillingCycle =>
  value === "annual" ? "annual" : "monthly";

const resolvePricingFeatureMarker = (
  value: string | undefined
): ResolvedPricingPlansFeatureMarker => {
  if (value === "check") return value;
  if (value === "status" || value === "icon") return "status";
  return "bullet";
};

const resolvePricingPlanBadgeTone = (
  value: unknown,
  highlighted: boolean
): PricingPlanBadgeTone => {
  if (value === "accent" || value === "highlight") return value;
  if (value === "neutral") return value;
  return highlighted ? "highlight" : "neutral";
};

const resolvePricingPlanCtaStyle = (value: unknown, highlighted: boolean): PricingPlanCtaStyle => {
  if (value === "filled" || value === "ghost") return value;
  if (value === "outline") return value;
  return highlighted ? "filled" : "outline";
};

const resolvePricingFeatureStatus = (value: unknown): PricingFeatureStatus => {
  if (value === "premium" || value === "coming-soon") return value;
  return "included";
};

const resolvePricingFeatureIcon = (value: unknown): PricingFeatureIcon | undefined => {
  if (value === "check" || value === "sparkle" || value === "lock" || value === "clock") {
    return value;
  }
  return undefined;
};

const resolvePricingPriceMode = (value: unknown): PricingPlanPriceMode => {
  if (value === "structured" || value === "free" || value === "custom") return value;
  return "legacy";
};

const resolvePricingMaxWidth = (value: unknown): PricingPlansMaxWidth => {
  if (value === "narrow" || value === "wide") return value;
  return "default";
};

const resolvePricingTypography = (value: unknown): PricingPlansTypography => {
  if (value === "compact" || value === "prominent") return value;
  return "balanced";
};

function normalizePricingPriceDisplay(value: unknown): PricingPlanPriceDisplay | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as PricingPlanPriceDisplay;
  const mode = resolvePricingPriceMode(source.mode);
  const amount = resolveOptionalPriceAmount(source.amount);
  const annualAmount = resolveOptionalPriceAmount(source.annualAmount);
  const currency = resolveOptionalTrimmedString(source.currency)?.slice(0, 3).toUpperCase();
  const freeLabel = resolveOptionalTrimmedString(source.freeLabel);
  const customLabel = resolveOptionalTrimmedString(source.customLabel);
  const annualSavingsLabel = resolveOptionalTrimmedString(source.annualSavingsLabel);

  if (
    mode === "legacy" &&
    amount === undefined &&
    annualAmount === undefined &&
    !currency &&
    !freeLabel &&
    !customLabel &&
    !annualSavingsLabel
  ) {
    return undefined;
  }

  return {
    mode,
    amount,
    annualAmount,
    currency,
    freeLabel,
    customLabel,
    annualSavingsLabel,
  };
}

function normalizeFeatureList(value: unknown): PricingPlanFeatureItem[] {
  if (!Array.isArray(value)) return [];

  const normalized: PricingPlanFeatureItem[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (!trimmed) continue;
      normalized.push({ text: trimmed, status: "included" });
      continue;
    }

    if (!item || typeof item !== "object") continue;
    const text = resolveOptionalTrimmedString((item as PricingPlanFeatureItem).text);
    if (!text) continue;
    const status = resolvePricingFeatureStatus((item as PricingPlanFeatureItem).status);
    const icon =
      resolvePricingFeatureIcon((item as PricingPlanFeatureItem).icon) ??
      (status === "premium" ? "sparkle" : status === "coming-soon" ? "clock" : undefined);
    normalized.push({
      text,
      status,
      icon,
    });
  }
  return normalized;
}

export const resolvePricingPlansVariant = (variant: string): PricingPlansVariantId => {
  if (variant === "two-plans" || variant === "four-plans" || variant === "comparison-rows") {
    return variant;
  }
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

    const highlighted = Boolean(base.highlighted);

    normalized.push({
      id,
      name,
      description: resolveOptionalTrimmedString(base.description),
      price,
      period: resolveOptionalString(base.period),
      badge: resolveOptionalString(base.badge),
      badgeTone: resolvePricingPlanBadgeTone(base.badgeTone, highlighted),
      surface: resolveClearableStyleValue(base.surface),
      ctaStyle: resolvePricingPlanCtaStyle(base.ctaStyle, highlighted),
      highlightLabel: resolveOptionalTrimmedString(base.highlightLabel),
      prices: {
        monthly: resolveOptionalString(base.prices?.monthly) ?? price,
        annual: resolveOptionalString(base.prices?.annual),
      },
      features: normalizeFeatureList(base.features),
      priceDisplay: normalizePricingPriceDisplay(base.priceDisplay),
      ctaLabel: resolveOptionalString(base.ctaLabel),
      ctaHref:
        normalizeWidgetSafeHref(base.ctaHref, {
          allowRelative: true,
          allowHash: true,
          allowHttp: true,
        }) ?? undefined,
      highlighted,
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
  const comparisonDefaults = pricingPlansDefaults.comparison ?? {
    stickyHeader: false,
    showHeaderCta: true,
    showHeaderBadges: true,
  };
  const layoutDefaults = pricingPlansDefaults.layout ?? {
    maxWidth: "default" as const,
    typography: "balanced" as const,
    footerNote: undefined,
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
          : billingDefaults.enabled === true,
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
    comparison: {
      stickyHeader:
        typeof data.comparison?.stickyHeader === "boolean"
          ? data.comparison.stickyHeader
          : comparisonDefaults.stickyHeader === true,
      showHeaderCta:
        typeof data.comparison?.showHeaderCta === "boolean"
          ? data.comparison.showHeaderCta
          : comparisonDefaults.showHeaderCta !== false,
      showHeaderBadges:
        typeof data.comparison?.showHeaderBadges === "boolean"
          ? data.comparison.showHeaderBadges
          : comparisonDefaults.showHeaderBadges !== false,
    },
    layout: {
      maxWidth: resolvePricingMaxWidth(data.layout?.maxWidth ?? layoutDefaults.maxWidth),
      typography: resolvePricingTypography(data.layout?.typography ?? layoutDefaults.typography),
      footerNote: resolveOptionalTrimmedString(data.layout?.footerNote),
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

function resolveFeatureText(feature: string | PricingPlanFeatureItem | undefined) {
  if (typeof feature === "string") return resolveOptionalTrimmedString(feature);
  return resolveOptionalTrimmedString(feature?.text);
}

function collectFeatureRows(plans: PricingPlanItem[]): string[] {
  const rows: string[] = [];
  for (const plan of plans) {
    for (const feature of plan.features ?? []) {
      const text = resolveFeatureText(feature);
      if (!text || rows.includes(text)) continue;
      rows.push(text);
    }
  }
  return rows;
}

function resolvePricingPlanStateForVariant(
  plans: PricingPlanItem[],
  visibleCount: number
): ResolvedPricingPlanState {
  const allPlans = normalizePricingPlans(plans);
  return {
    allPlans,
    visiblePlans: allPlans.slice(0, visibleCount),
    hiddenPlans: allPlans.slice(visibleCount),
  };
}

const pricingFeatureStatusLabelMap: Record<PricingFeatureStatus, string> = {
  included: "Included",
  premium: "Premium",
  "coming-soon": "Coming soon",
};

const pricingFeatureIconMap: Record<PricingFeatureIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  check: Check,
  sparkle: Sparkles,
  lock: LockKeyhole,
  clock: Clock3,
};

function isZeroPriceText(value: string | undefined) {
  if (!value) return false;
  return /^\s*[$€£]?\s*0(?:[.,]0+)?\s*$/.test(value);
}

function isCustomPriceText(value: string | undefined) {
  if (!value) return false;
  return /custom/i.test(value);
}

function formatCurrencyAmount(amount: number, currency: string | undefined) {
  if (!currency) return undefined;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return undefined;
  }
}

function resolveBillingPeriodLabel(period: string | undefined, cycle: PricingBillingCycle) {
  const trimmed = resolveOptionalTrimmedString(period);
  if (!trimmed || cycle !== "annual") {
    return trimmed;
  }

  return trimmed
    .replace(/\/month\b/i, "/year")
    .replace(/\bper month\b/i, "per year")
    .replace(/\/mo\b/i, "/yr")
    .replace(/\bmonthly\b/i, "yearly");
}

function resolveDisplayedPlanPrice(
  plan: PricingPlanItem,
  billingToggle: NonNullable<PricingPlansData["billingToggle"]>
) {
  const display = normalizePricingPriceDisplay(plan.priceDisplay);
  const cycle = billingToggle.enabled
    ? resolvePricingBillingCycle(billingToggle.defaultCycle)
    : "monthly";

  if (display?.mode === "free") {
    return {
      priceLabel: display.freeLabel ?? "Free",
      periodLabel: undefined,
      savingsLabel: undefined,
    };
  }

  if (display?.mode === "custom") {
    return {
      priceLabel: display.customLabel ?? plan.price ?? "Custom pricing",
      periodLabel: undefined,
      savingsLabel: undefined,
    };
  }

  if (display?.mode === "structured") {
    const amount = cycle === "annual" ? (display.annualAmount ?? display.amount) : display.amount;
    const formatted =
      amount === undefined ? undefined : formatCurrencyAmount(amount, display.currency);
    if (formatted) {
      return {
        priceLabel: formatted,
        periodLabel: resolveBillingPeriodLabel(plan.period, cycle),
        savingsLabel: cycle === "annual" ? display.annualSavingsLabel : undefined,
      };
    }
  }

  const legacyPrice = billingToggle.enabled
    ? cycle === "annual"
      ? (plan.prices?.annual ?? plan.price)
      : (plan.prices?.monthly ?? plan.price)
    : plan.price;
  const priceLabel = legacyPrice ?? plan.price ?? "$0";
  const hidePeriod = isZeroPriceText(priceLabel) || isCustomPriceText(priceLabel);

  return {
    priceLabel: isZeroPriceText(priceLabel) ? "Free" : priceLabel,
    periodLabel: hidePeriod ? undefined : resolveBillingPeriodLabel(plan.period, cycle),
    savingsLabel: cycle === "annual" ? display?.annualSavingsLabel : undefined,
  };
}

function resolvePlanHighlightLabel(plan: PricingPlanItem) {
  if (!plan.highlighted) return undefined;
  return (
    resolveOptionalTrimmedString(plan.highlightLabel) ??
    (resolveOptionalTrimmedString(plan.badge)?.toLowerCase().includes("popular")
      ? resolveOptionalTrimmedString(plan.badge)
      : "Most popular")
  );
}

function resolvePlanBadgeStyle(tone: PricingPlanBadgeTone, highlightColor: string): CSSProperties {
  if (tone === "highlight") {
    return {
      backgroundColor: highlightColor,
      color: "var(--color-bg)",
      borderColor: highlightColor,
      borderStyle: "solid",
      borderWidth: "1px",
    };
  }

  if (tone === "accent") {
    return {
      backgroundColor: `color-mix(in oklab, ${highlightColor} 14%, transparent)`,
      color: highlightColor,
      borderColor: `color-mix(in oklab, ${highlightColor} 28%, transparent)`,
      borderStyle: "solid",
      borderWidth: "1px",
    };
  }

  return {
    backgroundColor: "color-mix(in oklab, var(--color-text) 8%, transparent)",
    color: "var(--color-text)",
    borderColor: "color-mix(in oklab, var(--color-text) 18%, transparent)",
    borderStyle: "solid",
    borderWidth: "1px",
  };
}

function renderPlanBadge(
  plan: PricingPlanItem,
  highlightColor: string,
  options?: { hideText?: string }
) {
  const badgeText = resolveOptionalTrimmedString(plan.badge);
  if (!badgeText || badgeText === options?.hideText) return null;
  const tone = resolvePricingPlanBadgeTone(plan.badgeTone, Boolean(plan.highlighted));
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
      data-pricing-badge-tone={tone}
      style={resolvePlanBadgeStyle(tone, highlightColor)}
    >
      {badgeText}
    </span>
  );
}

function renderFeatureMarker(
  feature: PricingPlanFeatureItem,
  marker: ResolvedPricingPlansFeatureMarker,
  highlightColor: string
): ReactNode {
  if (marker === "bullet") {
    return (
      <span
        aria-hidden="true"
        className="text-base font-semibold"
        style={{ color: highlightColor }}
      >
        •
      </span>
    );
  }

  if (marker === "check") {
    return (
      <span aria-hidden="true" className="text-sm font-semibold" style={{ color: highlightColor }}>
        ✓
      </span>
    );
  }

  const resolvedStatus = resolvePricingFeatureStatus(feature.status);
  const resolvedIcon =
    resolvePricingFeatureIcon(feature.icon) ??
    (resolvedStatus === "premium"
      ? "sparkle"
      : resolvedStatus === "coming-soon"
        ? "clock"
        : "check");
  const Icon = pricingFeatureIconMap[resolvedIcon];
  return <Icon aria-hidden="true" className="h-4 w-4" style={{ color: highlightColor }} />;
}

function renderFeatureStatusBadge(feature: PricingPlanFeatureItem, highlightColor: string) {
  const status = resolvePricingFeatureStatus(feature.status);
  if (status === "included") return null;

  const toneStyle: CSSProperties =
    status === "premium"
      ? {
          backgroundColor: `color-mix(in oklab, ${highlightColor} 14%, transparent)`,
          color: highlightColor,
          borderColor: `color-mix(in oklab, ${highlightColor} 24%, transparent)`,
        }
      : {
          backgroundColor: "color-mix(in oklab, var(--color-text) 10%, transparent)",
          color: "var(--color-text)",
          borderColor: "color-mix(in oklab, var(--color-text) 16%, transparent)",
        };

  return (
    <span
      className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium"
      data-pricing-feature-status={status}
      style={toneStyle}
    >
      {pricingFeatureStatusLabelMap[status]}
    </span>
  );
}

function findPlanFeature(plan: PricingPlanItem, featureText: string) {
  for (const feature of plan.features ?? []) {
    const text = resolveFeatureText(feature);
    if (text === featureText) {
      if (typeof feature === "string") {
        return { text, status: "included" as const };
      }
      return {
        text,
        status: resolvePricingFeatureStatus(feature.status),
        icon: resolvePricingFeatureIcon(feature.icon),
      } satisfies PricingPlanFeatureItem;
    }
  }
  return undefined;
}

function PricingCardsLayout({
  plans,
  variant,
  style,
  layout,
  billingToggle,
  instanceId,
}: {
  plans: PricingPlanItem[];
  variant: PricingPlansVariantId;
  style: ResolvedPricingStyle;
  layout: ResolvedPricingLayout;
  billingToggle: NonNullable<PricingPlansData["billingToggle"]>;
  instanceId: string;
}) {
  const gridClassName =
    variant === "four-plans"
      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
      : variant === "two-plans"
        ? "grid grid-cols-1 lg:grid-cols-2"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  const typography = pricingTypographyClassMap[layout.typography];

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
        const planTitleId = scopedId(instanceId, `plan-${plan.id ?? index + 1}-title`);
        const highlightLabel = resolvePlanHighlightLabel(plan);
        const pricePresentation = resolveDisplayedPlanPrice(plan, billingToggle);
        const cardStyle: CSSProperties = {
          ...cardStyleBase,
          backgroundColor:
            resolveClearableStyleValue(plan.surface) ??
            resolveClearableStyleValue(style.cardSurface),
          boxShadow: highlighted ? `0 0 0 2px ${style.highlightRing}` : undefined,
        };

        return (
          <article
            key={plan.id ?? `plan-${index + 1}`}
            className={joinClasses(
              "flex h-full flex-col gap-4 overflow-hidden border p-5",
              radiusClassMap[style.radius]
            )}
            style={cardStyle}
            aria-labelledby={planTitleId}
            data-pricing-plan={String(index + 1)}
            data-pricing-highlighted={String(highlighted)}
            data-pricing-plan-cta-style={
              plan.ctaStyle ?? resolvePricingPlanCtaStyle(undefined, highlighted)
            }
          >
            {highlightLabel ? (
              <div
                className="-mx-5 -mt-5 mb-1 px-4 py-2 text-center text-xs font-semibold"
                data-pricing-highlight-label={highlightLabel}
                style={{
                  backgroundColor: style.highlightRing,
                  color: "var(--color-bg)",
                }}
              >
                {highlightLabel}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex flex-wrap items-start gap-2">
                <p
                  id={planTitleId}
                  className={joinClasses(
                    "font-semibold text-[var(--color-text)]",
                    typography.planName
                  )}
                >
                  {plan.name}
                </p>
                {renderPlanBadge(plan, style.highlightRing, { hideText: highlightLabel })}
              </div>
              {resolveOptionalTrimmedString(plan.description) ? (
                <p
                  className={joinClasses("text-[var(--color-text)]/70", typography.planDescription)}
                >
                  {plan.description}
                </p>
              ) : null}
            </div>

            <div className="space-y-1 text-[var(--color-text)]">
              <p className="flex items-end gap-1">
                <span className={joinClasses(typography.price, "font-semibold")}>
                  {pricePresentation.priceLabel}
                </span>
                {pricePresentation.periodLabel ? (
                  <span
                    className={joinClasses("pb-1 text-[var(--color-text)]/65", typography.period)}
                  >
                    {pricePresentation.periodLabel}
                  </span>
                ) : null}
              </p>
              {pricePresentation.savingsLabel ? (
                <p className="text-xs font-medium" style={{ color: style.highlightRing }}>
                  {pricePresentation.savingsLabel}
                </p>
              ) : null}
            </div>

            <ul
              className={joinClasses(
                "space-y-2 text-[var(--color-text)]/80",
                typography.featureList
              )}
            >
              {(plan.features ?? []).map((feature, featureIndex) => {
                const resolvedText = resolveFeatureText(feature);
                if (!resolvedText) return null;
                const resolvedFeature =
                  typeof feature === "string"
                    ? ({ text: resolvedText, status: "included" } satisfies PricingPlanFeatureItem)
                    : ({
                        text: resolvedText,
                        status: resolvePricingFeatureStatus(feature.status),
                        icon: resolvePricingFeatureIcon(feature.icon),
                      } satisfies PricingPlanFeatureItem);

                return (
                  <li
                    key={`${plan.id ?? index}-feature-${featureIndex}`}
                    className="flex items-start gap-2"
                  >
                    <span className="mt-0.5">
                      {renderFeatureMarker(
                        resolvedFeature,
                        style.featureMarker,
                        style.highlightRing
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{resolvedText}</span>
                      {renderFeatureStatusBadge(resolvedFeature, style.highlightRing)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {(plan.ctaLabel ?? "").trim().length > 0 && (plan.ctaHref ?? "").trim().length > 0 ? (
              <a
                href={plan.ctaHref}
                className={joinClasses(
                  "mt-auto",
                  ctaStyleClassMap[
                    plan.ctaStyle ?? resolvePricingPlanCtaStyle(undefined, highlighted)
                  ]
                )}
                aria-label={plan.name ? `${plan.ctaLabel} for ${plan.name}` : plan.ctaLabel}
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
  layout,
  comparison,
  billingToggle,
  instanceId,
}: {
  plans: PricingPlanItem[];
  style: ResolvedPricingStyle;
  layout: ResolvedPricingLayout;
  comparison: ResolvedPricingComparison;
  billingToggle: NonNullable<PricingPlansData["billingToggle"]>;
  instanceId: string;
}) {
  const featureRows = collectFeatureRows(plans);
  const typography = pricingTypographyClassMap[layout.typography];

  const tableStyle: CSSProperties =
    compactStyle({
      borderColor: resolveClearableStyleValue(style.cardBorder),
      borderStyle: "solid",
      borderWidth: "1px",
      backgroundColor: resolveClearableStyleValue(style.cardSurface),
    }) ?? {};

  const stickyHeaderStyle = comparison.stickyHeader
    ? {
        position: "sticky" as const,
        top: 0,
        zIndex: 10,
        backgroundColor: resolveClearableStyleValue(style.cardSurface) ?? "var(--color-bg)",
      }
    : undefined;

  return (
    <div className={joinClasses("overflow-x-auto", radiusClassMap[style.radius])}>
      <table
        className="w-full min-w-[44rem] border-collapse text-sm"
        style={tableStyle}
        data-pricing-comparison="true"
        data-pricing-comparison-sticky={String(comparison.stickyHeader)}
      >
        <caption className="sr-only">Pricing plan comparison</caption>
        <thead>
          <tr className="border-b" style={{ borderColor: style.cardBorder }}>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text)]/65"
              style={stickyHeaderStyle}
            >
              Feature
            </th>
            {plans.map((plan, index) => {
              const highlighted = Boolean(plan.highlighted);
              const highlightLabel = resolvePlanHighlightLabel(plan);
              const pricePresentation = resolveDisplayedPlanPrice(plan, billingToggle);
              const ctaStyle = plan.ctaStyle ?? resolvePricingPlanCtaStyle(undefined, highlighted);

              return (
                <th
                  key={plan.id ?? `header-${index + 1}`}
                  scope="col"
                  className="px-4 py-3 text-left align-top"
                  style={{
                    ...stickyHeaderStyle,
                    backgroundColor:
                      resolveClearableStyleValue(plan.surface) ??
                      stickyHeaderStyle?.backgroundColor,
                    boxShadow: highlighted ? `inset 0 0 0 1px ${style.highlightRing}` : undefined,
                  }}
                  data-pricing-comparison-highlighted={String(highlighted)}
                >
                  <div className="space-y-2">
                    {highlightLabel ? (
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: style.highlightRing,
                          color: "var(--color-bg)",
                        }}
                      >
                        {highlightLabel}
                      </span>
                    ) : null}
                    {comparison.showHeaderBadges
                      ? renderPlanBadge(plan, style.highlightRing, { hideText: highlightLabel })
                      : null}
                    <p
                      id={scopedId(instanceId, `comparison-plan-${plan.id ?? index + 1}-title`)}
                      className={joinClasses(
                        "font-semibold text-[var(--color-text)]",
                        typography.planName
                      )}
                    >
                      {plan.name}
                    </p>
                    <p
                      className={joinClasses(
                        "font-semibold text-[var(--color-text)]",
                        typography.comparisonPrice
                      )}
                    >
                      {pricePresentation.priceLabel}
                    </p>
                    {pricePresentation.periodLabel ? (
                      <p className={joinClasses("text-[var(--color-text)]/65", typography.period)}>
                        {pricePresentation.periodLabel}
                      </p>
                    ) : null}
                    {pricePresentation.savingsLabel ? (
                      <p className="text-xs font-medium" style={{ color: style.highlightRing }}>
                        {pricePresentation.savingsLabel}
                      </p>
                    ) : null}
                    {comparison.showHeaderCta &&
                    (plan.ctaLabel ?? "").trim().length > 0 &&
                    (plan.ctaHref ?? "").trim().length > 0 ? (
                      <a
                        href={plan.ctaHref}
                        className={ctaStyleClassMap[ctaStyle]}
                        aria-label={plan.name ? `${plan.ctaLabel} for ${plan.name}` : plan.ctaLabel}
                      >
                        {plan.ctaLabel}
                      </a>
                    ) : null}
                  </div>
                </th>
              );
            })}
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
              <th scope="row" className="px-4 py-3 text-left text-[var(--color-text)]">
                {feature}
              </th>
              {plans.map((plan, planIndex) => {
                const featureItem = findPlanFeature(plan, feature);
                const hasFeature = Boolean(featureItem);
                const featureIconKey = featureItem
                  ? (resolvePricingFeatureIcon(featureItem.icon) ??
                    (featureItem.status === "premium"
                      ? "sparkle"
                      : featureItem.status === "coming-soon"
                        ? "clock"
                        : "check"))
                  : undefined;
                const FeatureIcon = featureIconKey
                  ? pricingFeatureIconMap[featureIconKey]
                  : undefined;
                const label = hasFeature
                  ? pricingFeatureStatusLabelMap[resolvePricingFeatureStatus(featureItem?.status)]
                  : "Not included";
                return (
                  <td key={`feature-cell-${planIndex}-${rowIndex}`} className="px-4 py-3">
                    <span
                      className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold"
                      style={{
                        backgroundColor: hasFeature
                          ? style.highlightRing
                          : "color-mix(in oklab, var(--color-text) 10%, transparent)",
                        color: hasFeature ? "var(--color-bg)" : "var(--color-text)",
                      }}
                      aria-label={label}
                    >
                      {hasFeature && FeatureIcon ? (
                        <FeatureIcon aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : hasFeature ? (
                        "✓"
                      ) : (
                        "-"
                      )}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th
              scope="row"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/65"
            >
              Action
            </th>
            {plans.map((plan, index) => (
              <td key={`cta-${index}`} className="px-4 py-3">
                {(plan.ctaLabel ?? "").trim().length > 0 &&
                (plan.ctaHref ?? "").trim().length > 0 ? (
                  <a
                    href={plan.ctaHref}
                    className={
                      ctaStyleClassMap[
                        plan.ctaStyle ??
                          resolvePricingPlanCtaStyle(undefined, Boolean(plan.highlighted))
                      ]
                    }
                    aria-label={plan.name ? `${plan.ctaLabel} for ${plan.name}` : plan.ctaLabel}
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

export function PricingPlansBlock({
  data,
  variant,
  blockId,
}: {
  data: PricingPlansData;
  variant: string;
  blockId?: string;
}) {
  const resolvedVariant = resolvePricingPlansVariant(variant);
  const visibleCount = resolvePricingPlanCountForVariant(resolvedVariant);
  const normalizedData = normalizePricingPlansData(data);
  const billingToggle = normalizedData.billingToggle ?? pricingPlansDefaults.billingToggle!;
  const style = normalizedData.style ?? pricingPlansDefaults.style!;
  const comparison = normalizedData.comparison ?? pricingPlansDefaults.comparison!;
  const layout = normalizedData.layout ?? pricingPlansDefaults.layout!;
  const { visiblePlans, hiddenPlans } = resolvePricingPlanStateForVariant(
    normalizedData.plans,
    visibleCount
  );
  const rootInstanceId = createWidgetInstanceId("pricing-plans", blockId, resolvedVariant);
  const sectionTitleId =
    (normalizedData.header?.title ?? "").trim().length > 0
      ? scopedId(rootInstanceId, "title")
      : undefined;
  const typography = pricingTypographyClassMap[layout.typography ?? "balanced"];

  const resolvedStyle = {
    cardSurface: style.cardSurface,
    cardBorder: style.cardBorder,
    highlightRing: style.highlightRing ?? "var(--color-primary)",
    spacing: resolvePricingSpacing(style.spacing),
    radius: resolvePricingRadius(style.radius),
    featureMarker: resolvePricingFeatureMarker(style.featureMarker),
  } satisfies ResolvedPricingStyle;

  const resolvedLayout = {
    maxWidth: resolvePricingMaxWidth(layout.maxWidth),
    typography: resolvePricingTypography(layout.typography),
    footerNote: resolveOptionalTrimmedString(layout.footerNote),
  } satisfies ResolvedPricingLayout;

  const resolvedComparison = {
    stickyHeader: comparison.stickyHeader === true,
    showHeaderCta: comparison.showHeaderCta !== false,
    showHeaderBadges: comparison.showHeaderBadges !== false,
  } satisfies ResolvedPricingComparison;
  const activeBillingLabel =
    billingToggle.defaultCycle === "annual"
      ? (billingToggle.annualLabel ?? "Annual")
      : (billingToggle.monthlyLabel ?? "Monthly");

  return (
    <section
      className={joinClasses("mx-auto w-full px-4 py-8", maxWidthClassMap[resolvedLayout.maxWidth])}
      role="region"
      aria-labelledby={sectionTitleId}
      aria-label={sectionTitleId ? undefined : "Pricing plans"}
      data-pricing-variant={resolvedVariant}
      data-pricing-spacing={resolvedStyle.spacing}
      data-pricing-count={String(visiblePlans.length)}
      data-pricing-hidden-count={String(hiddenPlans.length)}
      data-pricing-max-width={resolvedLayout.maxWidth}
      data-pricing-typography={resolvedLayout.typography}
    >
      <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center">
        {(normalizedData.header?.title ?? "").trim().length > 0 ? (
          <h3
            id={sectionTitleId}
            className={joinClasses(
              typography.sectionTitle,
              "font-semibold text-[var(--color-text)]"
            )}
          >
            {normalizedData.header?.title}
          </h3>
        ) : null}
        {(normalizedData.header?.description ?? "").trim().length > 0 ? (
          <p className={joinClasses(typography.sectionDescription, "text-[var(--color-text)]/75")}>
            {normalizedData.header?.description}
          </p>
        ) : null}
      </header>

      {billingToggle.enabled ? (
        <div
          className="mb-4 flex items-center justify-center gap-2"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Billing cycle: ${activeBillingLabel} pricing shown`}
          data-pricing-billing-toggle="static"
          data-pricing-cycle={billingToggle.defaultCycle ?? "monthly"}
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
          plans={visiblePlans}
          style={resolvedStyle}
          layout={resolvedLayout}
          comparison={resolvedComparison}
          billingToggle={billingToggle}
          instanceId={rootInstanceId}
        />
      ) : (
        <PricingCardsLayout
          plans={visiblePlans}
          variant={resolvedVariant}
          style={resolvedStyle}
          layout={resolvedLayout}
          billingToggle={billingToggle}
          instanceId={rootInstanceId}
        />
      )}

      {resolvedLayout.footerNote ? (
        <p
          className={joinClasses(
            "mt-4 text-center text-[var(--color-text)]/70",
            typography.footerNote
          )}
          data-pricing-footer-note="true"
        >
          {resolvedLayout.footerNote}
        </p>
      ) : null}
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
        id: "two-plans",
        label: "Two Plans",
        description: "Compact two-card pricing layout.",
      },
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
