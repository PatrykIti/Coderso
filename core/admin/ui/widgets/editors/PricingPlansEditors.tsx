import { type ReactNode, useRef } from "react";

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
  normalizePricingPlans,
  normalizePricingPlansData,
  pricingPlanMax,
  pricingPlansDefaults,
  resolvePricingPlanCountForVariant,
  resolvePricingPlansVariant,
  type PricingPlanItem,
  type PricingPlansData,
  type PricingPlansRadius,
  type PricingPlansSpacing,
  type PricingPlansTypography,
  type PricingPlansVariantId,
} from "../../../../widgets/core/pricingPlans";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { SharedColorControl } from "./SharedColorControl";
import { WidgetEditorSection } from "./WidgetEditorControls";

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

function FixedPlanCountNotice({
  variant,
  visibleCount,
  hiddenCount,
}: {
  variant: PricingPlansVariantId;
  visibleCount: number;
  hiddenCount: number;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">
        {getVariantLabel(variant)} shows {visibleCount} plan{visibleCount === 1 ? "" : "s"}.
      </p>
      <p className="text-xs text-muted-foreground">
        This layout has a fixed visible plan count. Use the variant switch to change how many plans
        appear in preview.
      </p>
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
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
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

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
  onClear,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  return (
    <SharedColorControl
      label={label}
      value={value}
      onChange={onChange}
      onClear={onClear}
      placeholder={placeholder}
      pickerFallback={pickerFallback}
    />
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
    const authoredCount = Array.isArray(current.plans) ? current.plans.length : 0;
    if (authoredCount > count) {
      const hiddenTrimCount = authoredCount - count;
      if (typeof window === "undefined" || typeof window.confirm !== "function") {
        return current;
      }

      const confirmed = window.confirm(
        `Trim ${hiddenTrimCount} preserved hidden plan${
          hiddenTrimCount === 1 ? "" : "s"
        } to match the current layout? This cannot be undone.`
      );

      if (!confirmed) {
        return current;
      }
    }

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

function removePlan(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePlansForMutation(current, index + 1);
    if (plans.length <= 2) return current;
    const plan = plans[index];
    if (!plan) return current;

    const shouldConfirm =
      !hasConfiguredPricingPlan(plan) ||
      typeof window === "undefined" ||
      typeof window.confirm !== "function" ||
      window.confirm(`Remove plan ${index + 1}? This action cannot be undone.`);

    if (!shouldConfirm) {
      return current;
    }

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

function removeFeature(
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

function DiagnosticsSnapshot({ value }: { value: PricingPlansData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function PricingPlansWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<PricingPlansData>) {
  const pendingFeatureFocusRef = useRef<string | null>(null);
  const normalized = normalizeValue(value);
  const resolvedVariant = resolvePricingPlansVariant(variant);
  const visibleCount = resolvePricingPlanCountForVariant(resolvedVariant);
  const plans = normalizePricingPlans(
    normalized.plans,
    Math.max(normalized.plans.length, visibleCount)
  );
  const hiddenCount = Math.max(0, plans.length - visibleCount);

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
      <div className="space-y-2">
        <p className="text-sm font-medium">Pricing layout</p>
        <Select
          value={resolvePricingPlansVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select variant" />
          </SelectTrigger>
          <SelectContent>
            {variantOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Section title</p>
        <Input
          value={normalized.header?.title ?? ""}
          onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
          placeholder="Choose the plan that fits your workflow"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Layout plan count</p>
        <FixedPlanCountNotice
          variant={resolvedVariant}
          visibleCount={visibleCount}
          hiddenCount={hiddenCount}
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Basic plan setup</p>
        {plans.map((plan, index) => (
          <div
            key={plan.id ?? `wizard-plan-${index + 1}`}
            className="space-y-3 rounded-lg border p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Plan {index + 1}
            </p>
            {index >= visibleCount ? (
              <p className="text-xs text-muted-foreground">
                Hidden in {getVariantLabel(resolvedVariant)} until the layout shows more plans.
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={plan.name ?? ""}
                onChange={(event) =>
                  updatePlan(value, onChange, index, { name: event.target.value })
                }
                placeholder={`Plan ${index + 1}`}
              />
              <Input
                value={plan.badge ?? ""}
                onChange={(event) =>
                  updatePlan(value, onChange, index, { badge: event.target.value })
                }
                placeholder="Most popular"
              />
              <Input
                value={plan.price ?? ""}
                onChange={(event) =>
                  updatePlan(value, onChange, index, { price: event.target.value })
                }
                placeholder="$49"
              />
              <Input
                value={plan.period ?? ""}
                onChange={(event) =>
                  updatePlan(value, onChange, index, { period: event.target.value })
                }
                placeholder="/month"
              />
              <Input
                value={plan.ctaLabel ?? ""}
                onChange={(event) =>
                  updatePlan(value, onChange, index, { ctaLabel: event.target.value })
                }
                placeholder="Choose plan"
              />
              <Input
                value={plan.ctaHref ?? ""}
                onChange={(event) =>
                  updatePlan(value, onChange, index, { ctaHref: event.target.value })
                }
                placeholder="/checkout"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Key features</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    pendingFeatureFocusRef.current = `${plan.id ?? index}-feature-${
                      plan.features?.length ?? 0
                    }`;
                    addFeature(value, onChange, index);
                  }}
                >
                  Add feature
                </Button>
              </div>
              {(plan.features ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Add at least one visible benefit.</p>
              ) : (
                <div className="space-y-2">
                  {(plan.features ?? []).map((feature, featureIndex) => {
                    const featureText =
                      typeof feature === "string" ? feature : (feature.text ?? "");
                    return (
                      <div
                        key={`${plan.id ?? index}-wizard-feature-${featureIndex}`}
                        className="flex gap-2"
                      >
                        <Input
                          ref={bindFeatureInputRef(`${plan.id ?? index}-feature-${featureIndex}`)}
                          value={featureText}
                          onChange={(event) =>
                            updateFeature(value, onChange, index, featureIndex, event.target.value)
                          }
                          placeholder={`Feature ${featureIndex + 1}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFeature(value, onChange, index, featureIndex)}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PricingPlansVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<PricingPlansData>) {
  const pendingFeatureFocusRef = useRef<string | null>(null);
  const normalized = normalizeValue(value);
  const resolvedVariant = resolvePricingPlansVariant(variant);
  const visibleCount = resolvePricingPlanCountForVariant(resolvedVariant);
  const plans = normalizePricingPlans(
    normalized.plans,
    Math.max(normalized.plans.length, visibleCount)
  );
  const hiddenCount = Math.max(0, plans.length - visibleCount);
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
        title="Variant and plan structure"
        description="Choose pricing layout variant and maintain deterministic plan count."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Layout plan count</p>
          <FixedPlanCountNotice
            variant={resolvedVariant}
            visibleCount={visibleCount}
            hiddenCount={hiddenCount}
          />
        </div>
      </EditorSection>

      <EditorSection
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
                  onClick={() => removePlan(value, onChange, planIndex)}
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

              <div className="space-y-2">
                <p className="text-sm font-medium">CTA URL</p>
                <Input
                  value={plan.ctaHref ?? ""}
                  onChange={(event) =>
                    updatePlan(value, onChange, planIndex, { ctaHref: event.target.value })
                  }
                  placeholder="/checkout"
                />
              </div>

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

            <ColorField
              label="Plan surface"
              value={plan.surface}
              onChange={(next) => updatePlan(value, onChange, planIndex, { surface: next })}
              onClear={() => updatePlan(value, onChange, planIndex, { surface: undefined })}
              placeholder="var(--color-bg)"
              pickerFallback="#ffffff"
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
                            onClick={() => removeFeature(value, onChange, planIndex, featureIndex)}
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
        title="Colors and emphasis"
        description="Configure card surface, border, highlight ring, spacing, radius, and marker style."
      >
        <ColorField
          label="Card surface"
          value={normalized.style?.cardSurface}
          onChange={(next) => updateStyle(value, onChange, { cardSurface: next })}
          onClear={() => clearStyleField(value, onChange, "cardSurface")}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />

        <ColorField
          label="Card border"
          value={normalized.style?.cardBorder}
          onChange={(next) => updateStyle(value, onChange, { cardBorder: next })}
          onClear={() => clearStyleField(value, onChange, "cardBorder")}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <ColorField
          label="Highlight ring"
          value={normalized.style?.highlightRing}
          onChange={(next) => updateStyle(value, onChange, { highlightRing: next })}
          onClear={() => clearStyleField(value, onChange, "highlightRing")}
          placeholder="var(--color-primary)"
          pickerFallback="#1d4ed8"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Spacing</p>
            <Select
              value={normalized.style?.spacing ?? pricingPlansDefaults.style?.spacing ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { spacing: next as PricingPlansSpacing })
              }
            >
              <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Radius</p>
            <Select
              value={normalized.style?.radius ?? pricingPlansDefaults.style?.radius ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { radius: next as PricingPlansRadius })
              }
            >
              <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Feature marker</p>
            <Select
              value={
                normalized.style?.featureMarker === "icon"
                  ? "status"
                  : (normalized.style?.featureMarker ??
                    pricingPlansDefaults.style?.featureMarker ??
                    "bullet")
              }
              onValueChange={(next) =>
                updateStyle(value, onChange, { featureMarker: next as PricingPlansFeatureMarker })
              }
            >
              <SelectTrigger>
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
          </div>
        </div>
      </EditorSection>
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
  const visibleCount = resolvePricingPlanCountForVariant(resolvedVariant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Visual-owned tokens"
        description="Spacing and radius live in Visual mode. Advanced shows the current token state only."
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

          <div className="space-y-2">
            <p className="text-sm font-medium">Visible plans in this layout</p>
            <div className="rounded-md border px-3 py-2 text-sm">{visibleCount}</div>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Fix and reset"
        description="Use these controls when the current payload needs cleanup or a layout-safe reset. Aligning the plan list can remove preserved hidden plans after confirmation."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              alignPlanCountToVariant(
                value,
                onChange,
                resolvePricingPlanCountForVariant(resolvedVariant)
              )
            }
          >
            Align plan list to current layout count
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => updateValue(value, onChange, (current) => current)}
          >
            Clean payload and fill missing defaults
          </Button>
        </div>
      </EditorSection>

      <EditorSection
        title="Raw payload snapshot"
        description="Current authored widget payload before cleanup or normalization."
      >
        <DiagnosticsSnapshot value={value} />
      </EditorSection>
    </div>
  );
}
