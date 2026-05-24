import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  normalizeStackData,
  resolveStackVariant,
  resolveStackVariantDirectionDefaults,
  stackAlignDefaults,
  stackBreakpoints,
  stackGapDefaults,
  stackGapTokens,
  stackJustifyDefaults,
  stackWrapDefaults,
  type NormalizedStackData,
  type StackAlign,
  type StackBreakpoint,
  type StackData,
  type StackDirection,
  type StackGap,
  type StackJustify,
  type StackResolvedResponsiveValue,
  type StackVariantId,
} from "../../../../widgets/core/stack";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: StackVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "vertical",
    label: "Vertical",
    description: "Preset for column-first flow across every breakpoint.",
  },
  {
    id: "horizontal",
    label: "Horizontal",
    description: "Preset for row-first flow across every breakpoint.",
  },
  {
    id: "responsive",
    label: "Responsive",
    description: "Preset for stacked mobile flow that expands into rows from tablet upward.",
  },
];

const directionOptions: Array<{ id: StackDirection; label: string }> = [
  { id: "column", label: "Column" },
  { id: "row", label: "Row" },
];

const gapScaleLabels: Record<StackGap, string> = {
  none: "No gap",
  "0": "Gap 0 - zero spacing",
  "1": "Gap 1 - extra tight",
  "2": "Gap 2 - tight",
  "3": "Gap 3 - compact",
  "4": "Gap 4 - default mobile",
  "5": "Gap 5 - comfortable",
  "6": "Gap 6 - default desktop",
  "8": "Gap 8 - roomy",
  "10": "Gap 10 - spacious",
  "12": "Gap 12 - extra spacious",
};

const gapOptions = stackGapTokens
  .filter((value) => value !== "0")
  .map((value) => ({
    id: value,
    label: gapScaleLabels[value],
  }));

const alignOptions: Array<{ id: StackAlign; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "stretch", label: "Stretch" },
  { id: "baseline", label: "Baseline" },
];

const justifyOptions: Array<{ id: StackJustify; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "between", label: "Space between" },
  { id: "around", label: "Space around" },
  { id: "evenly", label: "Space evenly" },
];

const breakpointLabels: Record<StackBreakpoint, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

const isStackDirection = (candidate: unknown): candidate is StackDirection =>
  candidate === "row" || candidate === "column";

const isStackGap = (candidate: unknown): candidate is StackGap =>
  typeof candidate === "string" && stackGapTokens.includes(candidate as StackGap);

const isStackAlign = (candidate: unknown): candidate is StackAlign =>
  candidate === "start" ||
  candidate === "center" ||
  candidate === "end" ||
  candidate === "stretch" ||
  candidate === "baseline";

const isStackJustify = (candidate: unknown): candidate is StackJustify =>
  candidate === "start" ||
  candidate === "center" ||
  candidate === "end" ||
  candidate === "between" ||
  candidate === "around" ||
  candidate === "evenly";

const isBoolean = (candidate: unknown): candidate is boolean => typeof candidate === "boolean";

function normalizeValue(value: StackData, variant: string): NormalizedStackData {
  return normalizeStackData(value, variant);
}

function resolveStackGapControlValue(value: StackGap): StackGap {
  return value === "0" ? "none" : value;
}

function resolveResponsiveEditorValue<T extends string | boolean>(
  value: unknown,
  fallback: StackResolvedResponsiveValue<T>,
  isAllowed: (candidate: unknown) => candidate is T
): StackResolvedResponsiveValue<T> {
  if (isAllowed(value)) {
    return {
      desktop: value,
      tablet: value,
      mobile: value,
    };
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Partial<Record<StackBreakpoint, unknown>>;
    return {
      desktop: isAllowed(record.desktop) ? record.desktop : fallback.desktop,
      tablet: isAllowed(record.tablet) ? record.tablet : fallback.tablet,
      mobile: isAllowed(record.mobile) ? record.mobile : fallback.mobile,
    };
  }

  return { ...fallback };
}

function resolveEditorState(value: StackData, variant: string) {
  const normalized = normalizeValue(value, variant) as Partial<NormalizedStackData> & StackData;

  return {
    normalized,
    direction: resolveResponsiveEditorValue(
      normalized.direction,
      resolveStackVariantDirectionDefaults(resolveStackVariant(variant)),
      isStackDirection
    ),
    gap: Object.fromEntries(
      Object.entries(
        resolveResponsiveEditorValue(normalized.gap, stackGapDefaults, isStackGap)
      ).map(([breakpoint, gapValue]) => [
        breakpoint,
        resolveStackGapControlValue(gapValue as StackGap),
      ])
    ) as GapData,
    align: resolveResponsiveEditorValue(normalized.align, stackAlignDefaults, isStackAlign),
    justify: resolveResponsiveEditorValue(normalized.justify, stackJustifyDefaults, isStackJustify),
    wrap: resolveResponsiveEditorValue(normalized.wrap, stackWrapDefaults, isBoolean),
  };
}

function updateValue(
  value: StackData,
  variant: string,
  onChange: (next: StackData) => void,
  updater: (current: NormalizedStackData) => StackData
) {
  const current = normalizeValue(value, variant);
  const next = updater(current);
  onChange(normalizeValue(next, variant));
}

type DirectionData = NormalizedStackData["direction"];
type GapData = NormalizedStackData["gap"];
type ResponsiveMetaField = "align" | "justify" | "wrap";
type ResponsiveMetaValueMap = {
  align: StackAlign;
  justify: StackJustify;
  wrap: boolean;
};

function updateDirection(
  value: StackData,
  variant: string,
  onChange: (next: StackData) => void,
  patch: Partial<DirectionData>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    direction: {
      ...current.direction,
      ...patch,
    },
  }));
}

function updateGap(
  value: StackData,
  variant: string,
  onChange: (next: StackData) => void,
  patch: Partial<GapData>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    gap: {
      ...current.gap,
      ...patch,
    },
  }));
}

function updateResponsiveMetaField<K extends ResponsiveMetaField>(
  value: StackData,
  variant: string,
  onChange: (next: StackData) => void,
  field: K,
  patch: Partial<Record<StackBreakpoint, ResponsiveMetaValueMap[K]>>
) {
  updateValue(value, variant, onChange, (current) => {
    const currentField = current[field] as Record<StackBreakpoint, ResponsiveMetaValueMap[K]>;
    return {
      ...current,
      [field]: {
        ...currentField,
        ...patch,
      },
    } as StackData;
  });
}

function writeResponsiveMetaAllBreakpoints<K extends "align" | "justify">(
  value: StackData,
  variant: string,
  onChange: (next: StackData) => void,
  field: K,
  next: ResponsiveMetaValueMap[K]
) {
  updateResponsiveMetaField(value, variant, onChange, field, {
    desktop: next,
    tablet: next,
    mobile: next,
  });
}

function buildVariantSyncedStackData(value: StackData, nextVariant: StackVariantId): StackData {
  const current = normalizeValue(value, nextVariant);
  return normalizeValue(
    {
      ...current,
      direction: resolveStackVariantDirectionDefaults(nextVariant),
    },
    nextVariant
  );
}

function applyVariantDataPatch(
  nextVariant: StackVariantId,
  nextData: StackData,
  onChange: (next: StackData) => void,
  onVariantChange?: (next: string) => void,
  onBlockPatch?: WidgetEditorProps<StackData>["onBlockPatch"]
) {
  if (onBlockPatch) {
    onBlockPatch((current) => ({
      ...current,
      variant: nextVariant,
      data: nextData,
    }));
    return;
  }

  if (!onVariantChange) {
    return;
  }

  onChange(nextData);
  onVariantChange(nextVariant);
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id?: string;
  mode?: EditorMode;
  role?: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection
      id={resolvedId}
      mode={mode}
      role={role}
      title={title}
      description={description}
    >
      {children}
    </WidgetEditorSection>
  );
}

function StackVariantMiniature({ variant }: { variant: StackVariantId }) {
  if (variant === "responsive") {
    return (
      <div
        aria-hidden="true"
        data-stack-variant-miniature="responsive"
        className="grid gap-1 rounded-md border bg-muted/30 p-2"
      >
        <div className="grid gap-1 rounded border bg-background/80 p-2">
          <span className="h-2 w-full rounded bg-primary/60" />
          <span className="h-2 w-full rounded bg-primary/60" />
          <span className="h-2 w-full rounded bg-primary/60" />
        </div>
        <div className="grid grid-flow-col gap-1 rounded border bg-background/80 p-2">
          <span className="h-2 w-6 rounded bg-primary/60" />
          <span className="h-2 w-6 rounded bg-primary/60" />
          <span className="h-2 w-6 rounded bg-primary/60" />
        </div>
      </div>
    );
  }

  const miniatureBars =
    variant === "horizontal"
      ? ["h-2 w-6", "h-2 w-6", "h-2 w-6"]
      : ["h-2 w-full", "h-2 w-full", "h-2 w-full"];

  return (
    <div
      aria-hidden="true"
      data-stack-variant-miniature={variant}
      className={cn(
        "grid rounded-md border bg-muted/30 p-2",
        variant === "horizontal" ? "grid-flow-col gap-1" : "gap-1"
      )}
    >
      {miniatureBars.map((className, index) => (
        <span key={`${variant}-${index}`} className={cn("rounded bg-primary/60", className)} />
      ))}
    </div>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: StackVariantId;
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
          <div className="space-y-3">
            <StackVariantMiniature variant={option.id} />
            <div className="flex w-full items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
              <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
                {value === option.id ? "Selected" : "Pick"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function DiagnosticsSnapshot({ value }: { value: StackData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function SlotGuidanceCard() {
  return (
    <div
      data-stack-slot-guidance="true"
      className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
    >
      Add child widgets to the `content` slot from the insert dialog.
    </div>
  );
}

function DirectionAndGapGrid({
  value,
  variant,
  onChange,
}: {
  value: StackData;
  variant: string;
  onChange: (next: StackData) => void;
}) {
  const { direction, gap } = resolveEditorState(value, variant);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stackBreakpoints.map((breakpoint) => (
        <div
          key={`direction-${breakpoint}`}
          data-stack-direction-card={breakpoint}
          className="space-y-3 rounded-md border p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {breakpointLabels[breakpoint]}
          </p>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Direction</p>
            <Select
              value={direction[breakpoint]}
              onValueChange={(next) =>
                updateDirection(value, variant, onChange, {
                  [breakpoint]: next as StackDirection,
                } as Partial<DirectionData>)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                {directionOptions.map((option) => (
                  <SelectItem key={`${breakpoint}-dir-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Gap</p>
            <Select
              value={gap[breakpoint]}
              onValueChange={(next) =>
                updateGap(value, variant, onChange, {
                  [breakpoint]: next as StackGap,
                } as Partial<GapData>)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`${breakpoint}-gap-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResponsiveAxisAndWrapGrid({
  value,
  variant,
  onChange,
}: {
  value: StackData;
  variant: string;
  onChange: (next: StackData) => void;
}) {
  const { align, justify, wrap } = resolveEditorState(value, variant);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stackBreakpoints.map((breakpoint) => (
        <div
          key={`axis-${breakpoint}`}
          data-stack-axis-card={breakpoint}
          className="space-y-3 rounded-md border p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {breakpointLabels[breakpoint]}
          </p>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Align</p>
            <Select
              value={align[breakpoint]}
              onValueChange={(next) =>
                updateResponsiveMetaField(value, variant, onChange, "align", {
                  [breakpoint]: next as StackAlign,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Align" />
              </SelectTrigger>
              <SelectContent>
                {alignOptions.map((option) => (
                  <SelectItem key={`${breakpoint}-align-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Justify</p>
            <Select
              value={justify[breakpoint]}
              onValueChange={(next) =>
                updateResponsiveMetaField(value, variant, onChange, "justify", {
                  [breakpoint]: next as StackJustify,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Justify" />
              </SelectTrigger>
              <SelectContent>
                {justifyOptions.map((option) => (
                  <SelectItem key={`${breakpoint}-justify-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Wrap items</p>
                <p className="text-xs text-muted-foreground">
                  Allow row layouts to wrap at this breakpoint.
                </p>
              </div>
              <Switch
                checked={wrap[breakpoint]}
                onCheckedChange={(checked) =>
                  updateResponsiveMetaField(value, variant, onChange, "wrap", {
                    [breakpoint]: checked,
                  })
                }
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StackWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<StackData>) {
  const { direction, gap, align, justify } = resolveEditorState(value, variant);

  return (
    <div className="space-y-4">
      <EditorSection
        id="stack.wizard.quick-start"
        mode="wizard"
        role="setup"
        title="Stack quick start"
        description="Pick a safe starting flow. Visual owns ongoing responsive layout editing."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Stack style</p>
          <Select
            value={resolveStackVariant(variant)}
            onValueChange={(next) =>
              applyVariantDataPatch(
                next as StackVariantId,
                buildVariantSyncedStackData(value, next as StackVariantId),
                onChange,
                onVariantChange,
                onBlockPatch
              )
            }
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
          <p className="text-sm font-medium">Mobile direction</p>
          <Select
            value={direction.mobile}
            onValueChange={(next) =>
              updateDirection(value, variant, onChange, { mobile: next as StackDirection })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Mobile direction" />
            </SelectTrigger>
            <SelectContent>
              {directionOptions.map((option) => (
                <SelectItem key={`wizard-mobile-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Gap on all breakpoints</p>
          <p className="text-xs text-muted-foreground">
            Writes desktop, tablet, and mobile spacing together. Use Visual for per-breakpoint gaps.
          </p>
          <Select
            value={gap.mobile}
            onValueChange={(next) => {
              const resolvedGap = next as StackGap;
              updateGap(value, variant, onChange, {
                desktop: resolvedGap,
                tablet: resolvedGap,
                mobile: resolvedGap,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Gap on all breakpoints" />
            </SelectTrigger>
            <SelectContent>
              {gapOptions.map((option) => (
                <SelectItem key={`wizard-gap-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Align on all breakpoints</p>
          <p className="text-xs text-muted-foreground">
            Writes desktop, tablet, and mobile alignment together. Use Visual for per-breakpoint
            axis control.
          </p>
          <Select
            value={align.mobile}
            onValueChange={(next) =>
              writeResponsiveMetaAllBreakpoints(
                value,
                variant,
                onChange,
                "align",
                next as StackAlign
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Align on all breakpoints" />
            </SelectTrigger>
            <SelectContent>
              {alignOptions.map((option) => (
                <SelectItem key={`wizard-align-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Justify on all breakpoints</p>
          <p className="text-xs text-muted-foreground">
            Writes desktop, tablet, and mobile distribution together. Use Visual for per-breakpoint
            distribution and wrap.
          </p>
          <Select
            value={justify.mobile}
            onValueChange={(next) =>
              writeResponsiveMetaAllBreakpoints(
                value,
                variant,
                onChange,
                "justify",
                next as StackJustify
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Justify on all breakpoints" />
            </SelectTrigger>
            <SelectContent>
              {justifyOptions.map((option) => (
                <SelectItem key={`wizard-justify-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SlotGuidanceCard />
      </EditorSection>
    </div>
  );
}

export function StackVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<StackData>) {
  return (
    <div className="space-y-4">
      <EditorSection
        id="stack.visual.variant-flow"
        mode="visual"
        role="layout"
        title="Variant and flow"
        description="Choose the starting preset and inspect the resulting flow miniature."
      >
        <VariantCards
          value={resolveStackVariant(variant)}
          onChange={(next) =>
            applyVariantDataPatch(
              next as StackVariantId,
              buildVariantSyncedStackData(value, next as StackVariantId),
              onChange,
              onVariantChange,
              onBlockPatch
            )
          }
        />
      </EditorSection>

      <EditorSection
        id="stack.visual.responsive-direction"
        mode="visual"
        role="layout"
        title="Responsive direction"
        description="Control flow direction and gap independently per breakpoint."
      >
        <DirectionAndGapGrid value={value} variant={variant} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="stack.visual.responsive-axis-wrap"
        mode="visual"
        role="layout"
        title="Responsive alignment and wrap"
        description="Tune align, justify, and wrap for each breakpoint."
      >
        <ResponsiveAxisAndWrapGrid value={value} variant={variant} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="stack.visual.slot-guidance"
        mode="visual"
        role="summary"
        title="Slot guidance"
        description="Stack keeps one fixed content slot for child widgets."
      >
        <SlotGuidanceCard />
      </EditorSection>
    </div>
  );
}

export function StackAdvancedEditor({ value, onChange, variant }: WidgetEditorProps<StackData>) {
  const { normalized, direction, gap, align, justify, wrap } = resolveEditorState(value, variant);

  return (
    <div className="space-y-4">
      <EditorSection
        id="stack.advanced.responsive-summary"
        mode="advanced"
        role="diagnostics"
        title="Technical flow tokens"
        description="Visual owns responsive flow editing. Advanced shows the resolved breakpoint contract."
      >
        {stackBreakpoints.map((breakpoint) => (
          <ReadonlyWidgetSummaryRow
            key={breakpoint}
            id={`stack.advanced.${breakpoint}`}
            label={breakpointLabels[breakpoint]}
            path="direction"
            value={`${direction[breakpoint]} flow, ${gapScaleLabels[gap[breakpoint]]}, align ${align[breakpoint]}, justify ${justify[breakpoint]}, wrap ${wrap[breakpoint] ? "on" : "off"}.`}
          />
        ))}
        <div hidden className="hidden" aria-hidden="true">
          <DirectionAndGapGrid value={value} variant={variant} onChange={onChange} />
          <ResponsiveAxisAndWrapGrid value={value} variant={variant} onChange={onChange} />
        </div>
      </EditorSection>
      <EditorSection
        id="stack.advanced.payload-snapshot"
        mode="advanced"
        role="diagnostics"
        title="Raw payload snapshot"
        description="Normalized read-only payload for debugging migrations and saved data."
      >
        <ReadonlyWidgetSummaryRow
          id="stack.advanced.normalized-payload"
          label="Normalized payload"
          value={<DiagnosticsSnapshot value={normalized} />}
        />
      </EditorSection>
    </div>
  );
}
