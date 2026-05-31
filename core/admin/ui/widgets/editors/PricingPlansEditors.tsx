import { type ReactNode, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { ConfirmActionDialog } from "../../shared/ConfirmActionDialog";
import {
  type PricingBillingCycle,
  type PricingFeatureIcon,
  type PricingFeatureStatus,
  type PricingPlanBadgeTone,
  type PricingPlanCtaStyle,
  type PricingPlanFeatureItem,
  type PricingPlanPriceMode,
  type PricingPlansFeatureMarker,
  type PricingPlansMaxWidth,
  describePricingPlanCapacity,
  normalizePricingPlans,
  normalizePricingPlansData,
  pricingPlanMax,
  pricingPlansDefaults,
  resolvePricingPlansVariant,
  type PricingPlanItem,
  type PricingPlansData,
  type PricingPlansRadius,
  type PricingPlansSpacing,
  type PricingPlansTypography,
  type PricingPlansVariantId,
} from "../../../../widgets/core/pricingPlans";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const variantOptions: Array<{
  id: PricingPlansVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "two-plans",
    label: "Two Plans",
    description: "Compact layout for a simple side-by-side pricing choice.",
  },
  {
    id: "three-plans",
    label: "Three Plans",
    description: "Balanced layout for three pricing tiers.",
  },
  {
    id: "four-plans",
    label: "Four Plans",
    description: "Extended layout for broader offer segmentation.",
  },
  {
    id: "comparison-rows",
    label: "Comparison Rows",
    description: "Table-style feature comparison across plans.",
  },
];

const spacingOptions: Array<{ id: PricingPlansSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const radiusOptions: Array<{ id: PricingPlansRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const billingCycleOptions: Array<{ id: PricingBillingCycle; label: string }> = [
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
];

const featureMarkerOptions: Array<{ id: PricingPlansFeatureMarker; label: string }> = [
  { id: "bullet", label: "Bullet" },
  { id: "check", label: "Check" },
  { id: "status", label: "Status icons" },
];

const ctaStyleOptions: Array<{ id: PricingPlanCtaStyle; label: string }> = [
  { id: "outline", label: "Outline" },
  { id: "filled", label: "Filled" },
  { id: "ghost", label: "Ghost" },
];

const badgeToneOptions: Array<{ id: PricingPlanBadgeTone; label: string }> = [
  { id: "neutral", label: "Neutral" },
  { id: "accent", label: "Accent" },
  { id: "highlight", label: "Highlight" },
];

const priceModeOptions: Array<{ id: PricingPlanPriceMode; label: string }> = [
  { id: "legacy", label: "Legacy strings" },
  { id: "structured", label: "Structured amount" },
  { id: "free", label: "Free plan" },
  { id: "custom", label: "Custom label" },
];

const featureStatusOptions: Array<{ id: PricingFeatureStatus; label: string }> = [
  { id: "included", label: "Included" },
  { id: "premium", label: "Premium" },
  { id: "coming-soon", label: "Coming soon" },
];

const featureIconOptions: Array<{ id: PricingFeatureIcon; label: string }> = [
  { id: "check", label: "Check" },
  { id: "sparkle", label: "Sparkle" },
  { id: "lock", label: "Lock" },
  { id: "clock", label: "Clock" },
];

const maxWidthOptions: Array<{ id: PricingPlansMaxWidth; label: string }> = [
  { id: "narrow", label: "Narrow" },
  { id: "default", label: "Default" },
  { id: "wide", label: "Wide" },
];

const typographyOptions: Array<{ id: PricingPlansTypography; label: string }> = [
  { id: "compact", label: "Compact" },
  { id: "balanced", label: "Balanced" },
  { id: "prominent", label: "Prominent" },
];

type HeaderData = NonNullable<PricingPlansData["header"]>;
type BillingToggleData = NonNullable<PricingPlansData["billingToggle"]>;
type ComparisonData = NonNullable<PricingPlansData["comparison"]>;
type LayoutData = NonNullable<PricingPlansData["layout"]>;
type StyleData = NonNullable<PricingPlansData["style"]>;

function normalizeValue(value: PricingPlansData): PricingPlansData {
  return normalizePricingPlansData(value);
}

function normalizePlansForMutation(current: PricingPlansData, minimumCount = 0) {
  const currentCount = Array.isArray(current.plans) ? current.plans.length : 0;
  return normalizePricingPlans(current.plans, Math.max(currentCount, minimumCount));
}

function getVariantLabel(variant: PricingPlansVariantId) {
  return variantOptions.find((option) => option.id === variant)?.label ?? variant;
}

function formatPlanCount(count: number) {
  return `${count} plan${count === 1 ? "" : "s"}`;
}

function formatFeatureCount(count: number) {
  return `${count} feature${count === 1 ? "" : "s"}`;
}

function FixedPlanCountNotice({
  variant,
  capacity,
  renderedCount,
  missingCount,
  hiddenCount,
  mode,
}: {
  variant: PricingPlansVariantId;
  capacity: number;
  renderedCount: number;
  missingCount: number;
  hiddenCount: number;
  mode: "wizard" | "visual";
}) {
  const fillMissingCopy =
    mode === "visual"
      ? `Add ${formatPlanCount(missingCount)} below to fill the remaining layout slot${
          missingCount === 1 ? "" : "s"
        }.`
      : `Use Visual to add ${formatPlanCount(missingCount)} and fill the remaining layout slot${
          missingCount === 1 ? "" : "s"
        }.`;

  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">
        {getVariantLabel(variant)} supports up to {formatPlanCount(capacity)}.
      </p>
      <p className="text-xs text-muted-foreground">
        Saved content currently renders {formatPlanCount(renderedCount)} in preview.
      </p>
      {missingCount > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{fillMissingCopy}</p>
      ) : null}
      {hiddenCount > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {hiddenCount} preserved plan{hiddenCount === 1 ? "" : "s"}{" "}
          {hiddenCount === 1 ? "is" : "are"} hidden in this layout and will reappear when you switch
          to a wider variant or normalize the plan list intentionally.
        </p>
      ) : null}
    </div>
  );
}

function EditorSection({
  id,
  mode = "visual",
  role = "visual",
  title,
  description,
  children,
}: {
  id?: string;
  mode?: "wizard" | "visual" | "advanced";
  role?: "setup" | "content" | "visual" | "layout" | "diagnostics" | "summary";
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection
      id={resolvedId}
      title={title}
      mode={mode}
      role={role}
      description={description}
    >
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: PricingPlansVariantId;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function updateValue(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  updater: (current: PricingPlansData) => PricingPlansData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  patch: Partial<HeaderData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    header: {
      ...current.header,
      ...patch,
    },
  }));
}

function updateStyle(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateBillingToggle(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  patch: Partial<BillingToggleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    billingToggle: {
      ...current.billingToggle,
      ...patch,
    },
  }));
}

function updateComparison(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  patch: Partial<ComparisonData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    comparison: {
      ...current.comparison,
      ...patch,
    },
  }));
}

function updateLayout(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  patch: Partial<LayoutData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function clearStyleField(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
}

function updatePlan(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  index: number,
  patch: Partial<PricingPlanItem>
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, index + 1);
    if (!plans[index]) return current;

    const nextPlans = [...plans];
    nextPlans[index] = {
      ...nextPlans[index],
      ...patch,
    };

    return {
      ...current,
      plans: nextPlans,
    };
  });
}

function updatePlanPriceDisplay(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  index: number,
  patch: Partial<NonNullable<PricingPlanItem["priceDisplay"]>>
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, index + 1);
    if (!plans[index]) return current;

    const nextPlans = [...plans];
    nextPlans[index] = {
      ...nextPlans[index],
      priceDisplay: {
        ...nextPlans[index]?.priceDisplay,
        ...patch,
      },
    };

    return {
      ...current,
      plans: nextPlans,
    };
  });
}

function updateFeatureMeta(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  planIndex: number,
  featureIndex: number,
  patch: Partial<PricingPlanFeatureItem>
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, planIndex + 1);
    const plan = plans[planIndex];
    if (!plan) return current;

    const features = [...(plan.features ?? [])];
    const currentFeature = features[featureIndex];
    if (!currentFeature) return current;

    const normalizedFeature: PricingPlanFeatureItem =
      typeof currentFeature === "string"
        ? { text: currentFeature, status: "included" }
        : {
            text: currentFeature.text ?? "",
            status: currentFeature.status ?? "included",
            icon: currentFeature.icon,
          };

    features[featureIndex] = {
      ...normalizedFeature,
      ...patch,
    };

    const nextPlans = [...plans];
    nextPlans[planIndex] = {
      ...plan,
      features,
    };

    return {
      ...current,
      plans: nextPlans,
    };
  });
}

function hasConfiguredPricingPlan(plan: PricingPlanItem) {
  return Boolean(
    plan.name?.trim() ||
    plan.description?.trim() ||
    plan.badge?.trim() ||
    plan.highlightLabel?.trim() ||
    plan.ctaLabel?.trim() ||
    plan.ctaHref?.trim() ||
    plan.price?.trim() ||
    plan.period?.trim() ||
    plan.surface?.trim() ||
    plan.features?.length ||
    plan.priceDisplay?.mode === "structured" ||
    plan.priceDisplay?.mode === "free" ||
    plan.priceDisplay?.mode === "custom"
  );
}

function alignPlanCountToVariant(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => {
    return {
      ...current,
      plans: normalizePricingPlans(current.plans, count),
    };
  });
}

function addPlan(value: PricingPlansData, onChange: (next: PricingPlansData) => void) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current);
    if (plans.length >= pricingPlanMax) return current;

    return {
      ...current,
      plans: normalizePricingPlans(
        [
          ...plans,
          {
            name: `Plan ${plans.length + 1}`,
            price: "$0",
            period: "/month",
            features: [],
            highlighted: false,
          },
        ],
        plans.length + 1
      ),
    };
  });
}

function removePlanAtIndex(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, index + 1);
    if (plans.length <= 2) return current;
    if (!plans[index]) return current;

    const nextPlans = plans.filter((_, currentIndex) => currentIndex !== index);

    return {
      ...current,
      plans: normalizePricingPlans(nextPlans, nextPlans.length),
    };
  });
}

function movePlan(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, Math.max(fromIndex, toIndex) + 1);
    if (toIndex < 0 || toIndex >= plans.length) return current;

    const nextPlans = [...plans];
    const [item] = nextPlans.splice(fromIndex, 1);
    if (!item) return current;
    nextPlans.splice(toIndex, 0, item);

    return {
      ...current,
      plans: nextPlans,
    };
  });
}

function setHighlightedPlan(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  index: number,
  checked: boolean
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, index + 1).map((plan, currentIndex) => ({
      ...plan,
      highlighted: checked ? currentIndex === index : false,
    }));

    return {
      ...current,
      plans,
    };
  });
}

function addFeature(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  planIndex: number
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, planIndex + 1);
    const plan = plans[planIndex];
    if (!plan) return current;

    const features = [
      ...(plan.features ?? []),
      { text: "New feature", status: "included" as const },
    ];
    const nextPlans = [...plans];
    nextPlans[planIndex] = {
      ...plan,
      features,
    };

    return {
      ...current,
      plans: nextPlans,
    };
  });
}

function updateFeature(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  planIndex: number,
  featureIndex: number,
  nextValue: string
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, planIndex + 1);
    const plan = plans[planIndex];
    if (!plan) return current;

    const features = [...(plan.features ?? [])];
    const currentFeature = features[featureIndex];
    if (!currentFeature) return current;
    features[featureIndex] =
      typeof currentFeature === "string"
        ? { text: nextValue, status: "included" }
        : {
            ...currentFeature,
            text: nextValue,
          };

    const nextPlans = [...plans];
    nextPlans[planIndex] = {
      ...plan,
      features,
    };

    return {
      ...current,
      plans: nextPlans,
    };
  });
}

function removeFeatureAtIndex(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  planIndex: number,
  featureIndex: number
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, planIndex + 1);
    const plan = plans[planIndex];
    if (!plan) return current;

    const features = [...(plan.features ?? [])];
    if (!features[featureIndex]) return current;
    features.splice(featureIndex, 1);

    const nextPlans = [...plans];
    nextPlans[planIndex] = {
      ...plan,
      features,
    };

    return {
      ...current,
      plans: nextPlans,
    };
  });
}

type PendingPricingRemoval =
  | {
      type: "plan";
      planIndex: number;
      planName: string;
      featureCount: number;
    }
  | {
      type: "feature";
      planIndex: number;
      featureIndex: number;
      planName: string;
      featureText: string;
    };

function getPricingFeatureEditorText(feature: string | PricingPlanFeatureItem | undefined) {
  if (typeof feature === "string") return feature.trim();
  return feature?.text?.trim() ?? "";
}

function moveFeature(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  planIndex: number,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, planIndex + 1);
    const plan = plans[planIndex];
    if (!plan) return current;

    const features = [...(plan.features ?? [])];
    if (toIndex < 0 || toIndex >= features.length) return current;

    const [item] = features.splice(fromIndex, 1);
    if (!item) return current;
    features.splice(toIndex, 0, item);

    const nextPlans = [...plans];
    nextPlans[planIndex] = {
      ...plan,
      features,
    };

    return {
      ...current,
      plans: nextPlans,
    };
  });
}

export function PricingPlansWizardEditor({ value, variant }: WidgetEditorProps<PricingPlansData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolvePricingPlansVariant(variant);
  const capacitySummary = describePricingPlanCapacity(resolvedVariant, normalized.plans);
  const visibleCount = capacitySummary.capacity;
  const plans = normalized.plans;

  return (
    <WidgetEditorSection
      id="pricing-plans.wizard.starter-offer"
      mode="wizard"
      role="setup"
      title="Starter offer"
      description="Review the current pricing layout. Edit plan copy, pricing, and CTAs in Visual."
    >
      <div className="space-y-4">
        <ReadonlyWidgetSummaryRow
          id="pricing-plans.wizard.variant"
          label="Pricing layout"
          path="variant"
          value={
            variantOptions.find((option) => option.id === resolvedVariant)?.label ?? "Three plans"
          }
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Layout plan count</p>
          <FixedPlanCountNotice
            variant={resolvedVariant}
            capacity={capacitySummary.capacity}
            renderedCount={capacitySummary.rendered}
            missingCount={capacitySummary.missing}
            hiddenCount={capacitySummary.hidden}
            mode="wizard"
          />
        </div>

        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-sm font-medium">Daily editing happens in Visual</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use Visual to edit the section headline, plan names, descriptions, prices, feature
            lists, badges, CTA labels, and CTA destinations.
          </p>
          <div className="mt-3 space-y-2">
            {plans.slice(0, visibleCount).map((plan, index) => (
              <div
                key={plan.id ?? `wizard-plan-preview-${index + 1}`}
                className="flex items-center justify-between gap-3 rounded-md border bg-background/70 px-3 py-2 text-sm"
              >
                <span className="font-medium">{plan.name?.trim() || `Plan ${index + 1}`}</span>
                <span className="text-xs text-muted-foreground">Visual owns details</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetEditorSection>
  );
}

export function PricingPlansVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<PricingPlansData>) {
  const pendingFeatureFocusRef = useRef<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingPricingRemoval | null>(null);
  const normalized = normalizeValue(value);
  const resolvedVariant = resolvePricingPlansVariant(variant);
  const capacitySummary = describePricingPlanCapacity(resolvedVariant, normalized.plans);
  const visibleCount = capacitySummary.capacity;
  const plans = normalized.plans;
  const billingToggle = normalized.billingToggle ?? pricingPlansDefaults.billingToggle!;
  const comparison = normalized.comparison ?? pricingPlansDefaults.comparison!;
  const layout = normalized.layout ?? pricingPlansDefaults.layout!;

  const bindFeatureInputRef = (key: string) => (node: HTMLInputElement | null) => {
    if (!node || pendingFeatureFocusRef.current !== key) return;
    pendingFeatureFocusRef.current = null;
    queueMicrotask(() => {
      node.focus();
      node.select();
    });
  };

  return (
    <div className="space-y-4">
      <EditorSection
        id="pricing-plans.visual.variant-structure"
        mode="visual"
        role="layout"
        title="Variant and plan structure"
        description="Choose pricing layout variant and maintain deterministic plan count."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Layout plan count</p>
          <FixedPlanCountNotice
            variant={resolvedVariant}
            capacity={capacitySummary.capacity}
            renderedCount={capacitySummary.rendered}
            missingCount={capacitySummary.missing}
            hiddenCount={capacitySummary.hidden}
            mode="visual"
          />
        </div>
      </EditorSection>

      <EditorSection
        id="pricing-plans.visual.header-copy"
        mode="visual"
        role="content"
        title="Header copy"
        description="Edit section title and description shown above pricing plans."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.header?.title ?? ""}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Choose the plan that fits your workflow"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.header?.description ?? ""}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Compare pricing tiers and pick the option matching your team stage."
          />
        </div>
      </EditorSection>

      <EditorSection
        id="pricing.billing"
        mode="visual"
        role="content"
        title="Billing toggle"
        description="Control whether plans show monthly vs annual pricing defaults."
      >
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Enable billing toggle</p>
            <p className="text-xs text-muted-foreground">
              Use cycle-specific prices while keeping legacy price fields as fallback.
            </p>
          </div>
          <Switch
            checked={billingToggle.enabled === true}
            onCheckedChange={(checked) =>
              updateBillingToggle(value, onChange, { enabled: checked })
            }
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Monthly label</p>
            <Input
              value={billingToggle.monthlyLabel ?? ""}
              disabled={billingToggle.enabled !== true}
              onChange={(event) =>
                updateBillingToggle(value, onChange, { monthlyLabel: event.target.value })
              }
              placeholder="Monthly"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Annual label</p>
            <Input
              value={billingToggle.annualLabel ?? ""}
              disabled={billingToggle.enabled !== true}
              onChange={(event) =>
                updateBillingToggle(value, onChange, { annualLabel: event.target.value })
              }
              placeholder="Annual"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Default cycle</p>
            <Select
              value={billingToggle.defaultCycle ?? "monthly"}
              disabled={billingToggle.enabled !== true}
              onValueChange={(next) =>
                updateBillingToggle(value, onChange, { defaultCycle: next as PricingBillingCycle })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Cycle" />
              </SelectTrigger>
              <SelectContent>
                {billingCycleOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {billingToggle.enabled !== true ? (
          <p className="text-xs text-muted-foreground">
            Billing labels and cycle selection stay read-only until the toggle is enabled.
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        id="pricing-plans.visual.plan-actions"
        mode="visual"
        role="content"
        title="Plans, features, and actions"
        description="Manage plan content, feature rows, CTA actions, and highlighted offer."
      >
        {plans.map((plan, planIndex) => (
          <div key={plan.id ?? `plan-${planIndex + 1}`} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Plan {planIndex + 1}</p>
                {planIndex >= visibleCount ? (
                  <Badge variant="outline">Hidden in this layout</Badge>
                ) : null}
                {plan.highlighted ? <Badge>Highlighted</Badge> : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => movePlan(value, onChange, planIndex, planIndex - 1)}
                  disabled={planIndex === 0}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => movePlan(value, onChange, planIndex, planIndex + 1)}
                  disabled={planIndex === plans.length - 1}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPendingRemoval({
                      type: "plan",
                      planIndex,
                      planName: plan.name?.trim() || `Plan ${planIndex + 1}`,
                      featureCount: plan.features?.length ?? 0,
                    })
                  }
                  disabled={plans.length <= 2}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Highlight this plan</p>
                <p className="text-xs text-muted-foreground">
                  Only one plan should be highlighted at a time.
                </p>
              </div>
              <Switch
                checked={Boolean(plan.highlighted)}
                onCheckedChange={(checked) =>
                  setHighlightedPlan(value, onChange, planIndex, checked)
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Name</p>
                <Input
                  value={plan.name ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, { name: event.target.value })
                  }
                  placeholder={`Plan ${planIndex + 1}`}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Badge</p>
                <Input
                  value={plan.badge ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, { badge: event.target.value })
                  }
                  placeholder="Most popular"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Description</p>
                <Input
                  value={plan.description ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, { description: event.target.value })
                  }
                  placeholder="For small teams getting started"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Highlight banner label</p>
                <Input
                  value={plan.highlightLabel ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, { highlightLabel: event.target.value })
                  }
                  placeholder="Most popular"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Price</p>
                <Input
                  value={plan.price ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, { price: event.target.value })
                  }
                  placeholder="$49"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Billing period</p>
                <Input
                  value={plan.period ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, { period: event.target.value })
                  }
                  placeholder="/month"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Monthly price</p>
                <Input
                  value={plan.prices?.monthly ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, {
                      prices: {
                        ...plan.prices,
                        monthly: event.target.value,
                      },
                    })
                  }
                  placeholder="$49"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Annual price</p>
                <Input
                  value={plan.prices?.annual ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, {
                      prices: {
                        ...plan.prices,
                        annual: event.target.value,
                      },
                    })
                  }
                  placeholder="$490"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Price mode</p>
                <Select
                  value={plan.priceDisplay?.mode ?? "legacy"}
                  onValueChange={(next) =>
                    updatePlanPriceDisplay(value, onChange, planIndex, {
                      mode: next as PricingPlanPriceMode,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceModeOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {plan.priceDisplay?.mode === "structured" ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Structured amount</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={plan.priceDisplay?.amount ?? ""}
                      onChange={(event) =>
                        updatePlanPriceDisplay(value, onChange, planIndex, {
                          amount:
                            event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                      placeholder="49"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Structured annual amount</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={plan.priceDisplay?.annualAmount ?? ""}
                      onChange={(event) =>
                        updatePlanPriceDisplay(value, onChange, planIndex, {
                          annualAmount:
                            event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                      placeholder="490"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Currency</p>
                    <Input
                      value={plan.priceDisplay?.currency ?? ""}
                      onChange={(event) =>
                        updatePlanPriceDisplay(value, onChange, planIndex, {
                          currency: event.target.value,
                        })
                      }
                      placeholder="USD"
                    />
                  </div>
                </>
              ) : null}

              {plan.priceDisplay?.mode === "free" ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Free label</p>
                  <Input
                    value={plan.priceDisplay?.freeLabel ?? ""}
                    onChange={(event) =>
                      updatePlanPriceDisplay(value, onChange, planIndex, {
                        freeLabel: event.target.value,
                      })
                    }
                    placeholder="Free forever"
                  />
                </div>
              ) : null}

              {plan.priceDisplay?.mode === "custom" ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Custom label</p>
                  <Input
                    value={plan.priceDisplay?.customLabel ?? ""}
                    onChange={(event) =>
                      updatePlanPriceDisplay(value, onChange, planIndex, {
                        customLabel: event.target.value,
                      })
                    }
                    placeholder="Contact us"
                  />
                </div>
              ) : null}

              {billingToggle.enabled ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Annual savings label</p>
                  <Input
                    value={plan.priceDisplay?.annualSavingsLabel ?? ""}
                    onChange={(event) =>
                      updatePlanPriceDisplay(value, onChange, planIndex, {
                        annualSavingsLabel: event.target.value,
                      })
                    }
                    placeholder="2 months free"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium">CTA label</p>
                <Input
                  value={plan.ctaLabel ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, { ctaLabel: event.target.value })
                  }
                  placeholder="Choose plan"
                />
              </div>

              <LinkDestinationField
                fieldId={`pricing-plans-plan-${plan.id ?? planIndex}-cta`}
                label="CTA destination"
                controlPath="plans.ctaHref"
                value={plan.ctaHref}
                onChange={(next) => updatePlan(value, onChange, planIndex, { ctaHref: next })}
                emptyLabel="No destination"
                helpText="Pick a site page for this plan. Hand-typed links from older edits stay until you replace or clear them."
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">CTA style</p>
                <Select
                  value={plan.ctaStyle ?? (plan.highlighted ? "filled" : "outline")}
                  onValueChange={(next) =>
                    updatePlan(value, onChange, planIndex, {
                      ctaStyle: next as PricingPlanCtaStyle,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="CTA style" />
                  </SelectTrigger>
                  <SelectContent>
                    {ctaStyleOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Badge tone</p>
                <Select
                  value={plan.badgeTone ?? (plan.highlighted ? "highlight" : "neutral")}
                  onValueChange={(next) =>
                    updatePlan(value, onChange, planIndex, {
                      badgeTone: next as PricingPlanBadgeTone,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Badge tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {badgeToneOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SharedColorControl
              controlId={`pricing-plans.plan.${planIndex + 1}.surface`}
              controlPath={`plans.${planIndex}.surface`}
              label="Plan surface"
              value={plan.surface}
              onChange={(next) => updatePlan(value, onChange, planIndex, { surface: next })}
              onClear={() => updatePlan(value, onChange, planIndex, { surface: undefined })}
              placeholder="var(--color-bg)"
              pickerFallback="#ffffff"
              showValueInput={false}
              treatAsThemeDefaultValues={["var(--color-bg)"]}
              clearedLabel="Inherits card surface"
              clearedDescription="No per-plan surface override is saved. This plan inherits the widget card surface."
              clearResultLabel="removes the saved plan surface override"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Features</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    pendingFeatureFocusRef.current = `${plan.id ?? planIndex}-feature-${
                      plan.features?.length ?? 0
                    }`;
                    addFeature(value, onChange, planIndex);
                  }}
                >
                  Add feature
                </Button>
              </div>

              {(plan.features ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No features yet.</p>
              ) : (
                <div className="space-y-2">
                  {(plan.features ?? []).map((feature, featureIndex) => {
                    const featureValue =
                      typeof feature === "string"
                        ? { text: feature, status: "included" as const, icon: "check" as const }
                        : {
                            text: feature.text ?? "",
                            status: feature.status ?? "included",
                            icon: feature.icon ?? "check",
                          };
                    return (
                      <div
                        key={`${plan.id ?? planIndex}-feature-${featureIndex}`}
                        className="space-y-2 rounded-md border p-2"
                      >
                        <Input
                          ref={bindFeatureInputRef(
                            `${plan.id ?? planIndex}-feature-${featureIndex}`
                          )}
                          value={featureValue.text}
                          onChange={(event) =>
                            updateFeature(
                              value,
                              onChange,
                              planIndex,
                              featureIndex,
                              event.target.value
                            )
                          }
                          placeholder={`Feature ${featureIndex + 1}`}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs font-medium">Status</p>
                            <Select
                              value={featureValue.status}
                              onValueChange={(next) =>
                                updateFeatureMeta(value, onChange, planIndex, featureIndex, {
                                  status: next as PricingFeatureStatus,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {featureStatusOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-medium">Icon</p>
                            <Select
                              value={featureValue.icon}
                              onValueChange={(next) =>
                                updateFeatureMeta(value, onChange, planIndex, featureIndex, {
                                  icon: next as PricingFeatureIcon,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Icon" />
                              </SelectTrigger>
                              <SelectContent>
                                {featureIconOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              moveFeature(
                                value,
                                onChange,
                                planIndex,
                                featureIndex,
                                featureIndex - 1
                              )
                            }
                            disabled={featureIndex === 0}
                          >
                            Move up
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              moveFeature(
                                value,
                                onChange,
                                planIndex,
                                featureIndex,
                                featureIndex + 1
                              )
                            }
                            disabled={featureIndex === (plan.features ?? []).length - 1}
                          >
                            Move down
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPendingRemoval({
                                type: "feature",
                                planIndex,
                                featureIndex,
                                planName: plan.name?.trim() || `Plan ${planIndex + 1}`,
                                featureText:
                                  getPricingFeatureEditorText(feature) ||
                                  `Feature ${featureIndex + 1}`,
                              })
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => addPlan(value, onChange)}
          disabled={plans.length >= pricingPlanMax}
        >
          Add plan
        </Button>
      </EditorSection>

      {resolvedVariant === "comparison-rows" ? (
        <EditorSection
          id="pricing-plans.visual.comparison-behavior"
          mode="visual"
          role="layout"
          title="Comparison rows behavior"
          description="Tune header hierarchy and sticky behavior for the comparison layout."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Sticky header</p>
                <p className="text-xs text-muted-foreground">
                  Keep plan names visible while long tables scroll.
                </p>
              </div>
              <Switch
                checked={comparison.stickyHeader === true}
                onCheckedChange={(checked) =>
                  updateComparison(value, onChange, { stickyHeader: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Header badges</p>
                <p className="text-xs text-muted-foreground">
                  Show plan badges directly in the comparison header.
                </p>
              </div>
              <Switch
                checked={comparison.showHeaderBadges !== false}
                onCheckedChange={(checked) =>
                  updateComparison(value, onChange, { showHeaderBadges: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Header CTA</p>
                <p className="text-xs text-muted-foreground">
                  Repeat CTA buttons in the table header.
                </p>
              </div>
              <Switch
                checked={comparison.showHeaderCta !== false}
                onCheckedChange={(checked) =>
                  updateComparison(value, onChange, { showHeaderCta: checked })
                }
              />
            </div>
          </div>
        </EditorSection>
      ) : null}

      <EditorSection
        id="pricing-plans.visual.layout-notes"
        mode="visual"
        role="layout"
        title="Layout and notes"
        description="Set section width, typography emphasis, and plain-text pricing notes."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Max width</p>
            <Select
              value={layout.maxWidth ?? "default"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { maxWidth: next as PricingPlansMaxWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Width" />
              </SelectTrigger>
              <SelectContent>
                {maxWidthOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Typography preset</p>
            <Select
              value={layout.typography ?? "balanced"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { typography: next as PricingPlansTypography })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Typography" />
              </SelectTrigger>
              <SelectContent>
                {typographyOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Footer note</p>
          <Textarea
            value={layout.footerNote ?? ""}
            onChange={(event) => updateLayout(value, onChange, { footerNote: event.target.value })}
            placeholder="All prices exclude VAT. Contact us for enterprise pricing."
          />
        </div>
      </EditorSection>

      <EditorSection
        id="pricing-plans.visual.colors-emphasis"
        mode="visual"
        role="visual"
        title="Colors and emphasis"
        description="Configure card surface, border, highlight ring, spacing, radius, and marker style."
      >
        <SharedColorControl
          controlId="pricing-plans.style.cardSurface"
          controlPath="style.cardSurface"
          label="Card surface"
          value={normalized.style?.cardSurface}
          onChange={(next) => updateStyle(value, onChange, { cardSurface: next })}
          onClear={() => clearStyleField(value, onChange, "cardSurface")}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
          showValueInput={false}
          treatAsThemeDefaultValues={["var(--color-bg)"]}
          clearedLabel="Inherited surface"
          clearedDescription="No card or table surface override is saved. Pricing cards inherit the surrounding background."
          clearResultLabel="removes the saved card surface override"
        />

        <SharedColorControl
          controlId="pricing-plans.style.cardBorder"
          controlPath="style.cardBorder"
          label="Card border"
          value={normalized.style?.cardBorder}
          onChange={(next) => updateStyle(value, onChange, { cardBorder: next })}
          onClear={() => clearStyleField(value, onChange, "cardBorder")}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
          showValueInput={false}
          treatAsThemeDefaultValues={["var(--color-border)"]}
          clearedLabel="Inherited border"
          clearedDescription="No card or table border color override is saved. The renderer omits the inline border color."
          clearResultLabel="removes the saved card border override"
        />

        <SharedColorControl
          controlId="pricing-plans.style.highlightRing"
          controlPath="style.highlightRing"
          label="Highlight ring"
          value={normalized.style?.highlightRing}
          onChange={(next) => updateStyle(value, onChange, { highlightRing: next })}
          onClear={() => clearStyleField(value, onChange, "highlightRing")}
          placeholder="var(--color-primary)"
          pickerFallback="#1d4ed8"
          showValueInput={false}
          treatAsThemeDefaultValues={["var(--color-primary)"]}
          clearedLabel="Theme default"
          clearedDescription="No highlight-ring override is saved. The widget uses the theme primary color."
          clearResultLabel="restores the widget default highlight ring"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <WidgetControlRow id="pricing-plans.style.spacing" path="style.spacing" label="Spacing">
            {(fieldProps) => (
              <Select
                value={normalized.style?.spacing ?? pricingPlansDefaults.style?.spacing ?? "md"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { spacing: next as PricingPlansSpacing })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Spacing" />
                </SelectTrigger>
                <SelectContent>
                  {spacingOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="pricing-plans.style.radius" path="style.radius" label="Radius">
            {(fieldProps) => (
              <Select
                value={normalized.style?.radius ?? pricingPlansDefaults.style?.radius ?? "lg"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { radius: next as PricingPlansRadius })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Radius" />
                </SelectTrigger>
                <SelectContent>
                  {radiusOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow
            id="pricing-plans.style.featureMarker"
            path="style.featureMarker"
            label="Feature marker"
          >
            {(fieldProps) => (
              <Select
                value={
                  normalized.style?.featureMarker === "icon"
                    ? "status"
                    : (normalized.style?.featureMarker ??
                      pricingPlansDefaults.style?.featureMarker ??
                      "bullet")
                }
                onValueChange={(next) =>
                  updateStyle(value, onChange, {
                    featureMarker: next as PricingPlansFeatureMarker,
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Feature marker" />
                </SelectTrigger>
                <SelectContent>
                  {featureMarkerOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        </div>
      </EditorSection>

      <ConfirmActionDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
        title={
          pendingRemoval?.type === "feature"
            ? "Remove feature?"
            : pendingRemoval?.type === "plan"
              ? "Remove pricing plan?"
              : "Confirm removal"
        }
        description={
          pendingRemoval?.type === "feature"
            ? `Remove "${pendingRemoval.featureText}" from ${pendingRemoval.planName}? This action cannot be undone.`
            : pendingRemoval?.type === "plan"
              ? `Remove ${pendingRemoval.planName}? This also removes ${formatFeatureCount(
                  pendingRemoval.featureCount
                )} saved on that plan.`
              : "Confirm this destructive pricing change."
        }
        confirmLabel={pendingRemoval?.type === "feature" ? "Remove feature" : "Remove plan"}
        onConfirm={() => {
          if (pendingRemoval?.type === "plan") {
            removePlanAtIndex(value, onChange, pendingRemoval.planIndex);
          } else if (pendingRemoval?.type === "feature") {
            removeFeatureAtIndex(
              value,
              onChange,
              pendingRemoval.planIndex,
              pendingRemoval.featureIndex
            );
          }
          setPendingRemoval(null);
        }}
      />
    </div>
  );
}

export function PricingPlansAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<PricingPlansData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolvePricingPlansVariant(variant);
  const capacitySummary = describePricingPlanCapacity(resolvedVariant, normalized.plans);
  const visibleCount = capacitySummary.capacity;
  const [pendingSupportAction, setPendingSupportAction] = useState<
    "align-plans" | "normalize" | null
  >(null);
  const planCount = normalized.plans?.length ?? 0;
  const configuredPlanCount = normalized.plans?.filter(hasConfiguredPricingPlan).length ?? 0;
  const hiddenPlanCount = capacitySummary.hidden;

  return (
    <div className="space-y-4">
      <EditorSection
        id="pricing-plans.advanced.visual-tokens"
        mode="advanced"
        role="diagnostics"
        title="Visual-owned tokens"
        description="Spacing and radius live in Visual mode. Advanced shows only the current token state."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Spacing token</p>
            <div className="rounded-md border px-3 py-2 text-sm">
              {normalized.style?.spacing ?? pricingPlansDefaults.style?.spacing ?? "md"}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Radius token</p>
            <div className="rounded-md border px-3 py-2 text-sm">
              {normalized.style?.radius ?? pricingPlansDefaults.style?.radius ?? "lg"}
            </div>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="pricing-plans.advanced.fix-reset"
        mode="advanced"
        role="summary"
        title="Fix and reset"
        description="Support-only repair actions. Each change requires confirmation before the payload is rewritten."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPendingSupportAction("align-plans")}
          >
            Review plan alignment
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPendingSupportAction("normalize")}
          >
            Review payload cleanup
          </Button>
        </div>
      </EditorSection>

      <EditorSection
        id="pricing-plans.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Human diagnostics only. Advanced does not show raw pricing JSON."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Rendered plans in this layout</p>
            <div className="rounded-md border px-3 py-2 text-sm">
              {capacitySummary.rendered} of {capacitySummary.capacity}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Configured plans</p>
            <div className="rounded-md border px-3 py-2 text-sm">
              {configuredPlanCount} of {planCount}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Hidden preserved plans</p>
            <div className="rounded-md border px-3 py-2 text-sm">{hiddenPlanCount}</div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Billing toggle</p>
            <div className="rounded-md border px-3 py-2 text-sm">
              {normalized.billingToggle?.enabled ? "Enabled" : "Disabled"}
            </div>
          </div>
        </div>
      </EditorSection>

      <ConfirmActionDialog
        open={pendingSupportAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSupportAction(null);
        }}
        title={
          pendingSupportAction === "align-plans"
            ? "Align plans to current layout?"
            : "Clean pricing payload?"
        }
        description={
          pendingSupportAction === "align-plans"
            ? `This rewrites the saved plan list to ${visibleCount} plan${visibleCount === 1 ? "" : "s"} for the current layout. Preserved hidden plans may be removed.`
            : "This reapplies schema-owned defaults and removes unsupported pricing values without exposing raw JSON."
        }
        confirmLabel={pendingSupportAction === "align-plans" ? "Align plans" : "Clean payload"}
        onConfirm={() => {
          if (pendingSupportAction === "align-plans") {
            alignPlanCountToVariant(value, onChange, visibleCount);
          } else if (pendingSupportAction === "normalize") {
            updateValue(value, onChange, (current) => current);
          }
          setPendingSupportAction(null);
        }}
      />
    </div>
  );
}
