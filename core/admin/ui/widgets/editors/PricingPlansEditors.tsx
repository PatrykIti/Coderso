import { type ReactNode } from "react";

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
  type PricingPlansFeatureMarker,
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
  { id: "icon", label: "Icon" },
];

const planCountOptions = Array.from({ length: pricingPlanMax - 1 }, (_, index) =>
  String(index + 2)
);

type HeaderData = NonNullable<PricingPlansData["header"]>;
type BillingToggleData = NonNullable<PricingPlansData["billingToggle"]>;
type StyleData = NonNullable<PricingPlansData["style"]>;

function normalizeValue(value: PricingPlansData): PricingPlansData {
  return normalizePricingPlansData(value);
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
    const plans = normalizePricingPlans(current.plans);
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

function setPlanCount(
  value: PricingPlansData,
  onChange: (next: PricingPlansData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    plans: normalizePricingPlans(current.plans, count),
  }));
}

function addPlan(value: PricingPlansData, onChange: (next: PricingPlansData) => void) {
  updateValue(value, onChange, (current) => {
    const plans = normalizePricingPlans(current.plans);
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
    const plans = normalizePricingPlans(current.plans);
    if (plans.length <= 2) return current;

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
    const plans = normalizePricingPlans(current.plans);
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
    const plans = normalizePricingPlans(current.plans).map((plan, currentIndex) => ({
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
    const plans = normalizePricingPlans(current.plans);
    const plan = plans[planIndex];
    if (!plan) return current;

    const features = [...(plan.features ?? []), "New feature"];
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
    const plans = normalizePricingPlans(current.plans);
    const plan = plans[planIndex];
    if (!plan) return current;

    const features = [...(plan.features ?? [])];
    if (!features[featureIndex]) return current;
    features[featureIndex] = nextValue;

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
    const plans = normalizePricingPlans(current.plans);
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
    const plans = normalizePricingPlans(current.plans);
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
  const normalized = normalizeValue(value);
  const plans = normalizePricingPlans(normalized.plans);

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
        <p className="text-sm font-medium">Plans count</p>
        <Select
          value={String(plans.length)}
          onValueChange={(next) => setPlanCount(value, onChange, Number(next))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select count" />
          </SelectTrigger>
          <SelectContent>
            {planCountOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Basic plan setup</p>
        {plans.map((plan, index) => (
          <div
            key={plan.id ?? `wizard-plan-${index + 1}`}
            className="space-y-2 rounded-lg border p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Plan {index + 1}
            </p>
            <Input
              value={plan.name ?? ""}
              onChange={(event) => updatePlan(value, onChange, index, { name: event.target.value })}
              placeholder={`Plan ${index + 1}`}
            />
            <Input
              value={plan.price ?? ""}
              onChange={(event) =>
                updatePlan(value, onChange, index, { price: event.target.value })
              }
              placeholder="$49"
            />
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
  const normalized = normalizeValue(value);
  const resolvedVariant = resolvePricingPlansVariant(variant);
  const plans = normalizePricingPlans(normalized.plans);
  const billingToggle = normalized.billingToggle ?? pricingPlansDefaults.billingToggle!;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and plan structure"
        description="Choose pricing layout variant and maintain deterministic plan count."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Plans count</p>
          <Select
            value={String(plans.length)}
            onValueChange={(next) => setPlanCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select count" />
            </SelectTrigger>
            <SelectContent>
              {planCountOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </EditorSection>

      <EditorSection
        title="Plans, features, and actions"
        description="Manage plan content, feature rows, CTA actions, and highlighted offer."
      >
        {plans.map((plan, planIndex) => (
          <div key={plan.id ?? `plan-${planIndex + 1}`} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Plan {planIndex + 1}</p>
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Features</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addFeature(value, onChange, planIndex)}
                >
                  Add feature
                </Button>
              </div>

              {(plan.features ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No features yet.</p>
              ) : (
                <div className="space-y-2">
                  {(plan.features ?? []).map((feature, featureIndex) => (
                    <div
                      key={`${plan.id ?? planIndex}-feature-${featureIndex}`}
                      className="space-y-2 rounded-md border p-2"
                    >
                      <Input
                        value={feature}
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
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            moveFeature(value, onChange, planIndex, featureIndex, featureIndex - 1)
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
                            moveFeature(value, onChange, planIndex, featureIndex, featureIndex + 1)
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
                  ))}
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

      <EditorSection
        title="Colors and emphasis"
        description="Configure card surface, border, highlight ring, and corner radius."
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
                normalized.style?.featureMarker ??
                pricingPlansDefaults.style?.featureMarker ??
                "bullet"
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

  return (
    <div className="space-y-4">
      <EditorSection
        title="Display tokens"
        description="Technical controls for spacing/radius and stable comparison output."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Spacing token</p>
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
            <p className="text-sm font-medium">Radius token</p>
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
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Normalize plan list to variant baseline and keep deterministic payload shape."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setPlanCount(value, onChange, resolvePricingPlanCountForVariant(resolvedVariant))
            }
          >
            Normalize plans to variant baseline
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => updateValue(value, onChange, (current) => current)}
          >
            Normalize full payload
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="Raw payload snapshot" description="Current normalized widget payload.">
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}
