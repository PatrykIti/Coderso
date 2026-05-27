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
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const variantOptions: Array<{
  id: StackVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "vertical",
    label: "Vertical",
    description: "Items start stacked vertically on every screen size.",
  },
  {
    id: "horizontal",
    label: "Horizontal",
    description: "Items start side by side on every screen size.",
  },
  {
    id: "responsive",
    label: "Responsive",
    description: "Items stack on small screens and sit side by side on larger screens.",
  },
];

const directionOptions: Array<{ id: StackDirection; label: string }> = [
  { id: "column", label: "Stack vertically" },
  { id: "row", label: "Place side by side" },
];

const gapScaleLabels: Record<StackGap, string> = {
  none: "No spacing",
  "0": "No spacing",
  "1": "Extra tight spacing",
  "2": "Tight spacing",
  "3": "Compact spacing",
  "4": "Balanced mobile spacing",
  "5": "Comfortable spacing",
  "6": "Balanced desktop spacing",
  "8": "Roomy spacing",
  "10": "Spacious spacing",
  "12": "Extra spacious spacing",
};

const gapOptions = stackGapTokens
  .filter((value) => value !== "0")
  .map((value) => ({
    id: value,
    label: gapScaleLabels[value],
  }));

const alignOptions: Array<{ id: StackAlign; label: string }> = [
  { id: "start", label: "Align to the start edge" },
  { id: "center", label: "Center items" },
  { id: "end", label: "Align to the end edge" },
  { id: "stretch", label: "Stretch items to fill" },
  { id: "baseline", label: "Align text across items" },
];

const justifyOptions: Array<{ id: StackJustify; label: string }> = [
  { id: "start", label: "Pack at the start" },
  { id: "center", label: "Pack in the center" },
  { id: "end", label: "Pack at the end" },
  { id: "between", label: "Spread with space between" },
  { id: "around", label: "Spread with side breathing room" },
  { id: "evenly", label: "Spread evenly" },
];

const breakpointLabels: Record<StackBreakpoint, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

const wrapLabels: Record<"true" | "false", string> = {
  true: "wraps to a new line when needed",
  false: "stays on one line",
};

function optionLabel<T extends string>(options: Array<{ id: T; label: string }>, value: T): string {
  return options.find((option) => option.id === value)?.label ?? value;
}

function describeStackBreakpointSummary({
  direction,
  gap,
  align,
  justify,
  wrap,
}: {
  direction: StackDirection;
  gap: StackGap;
  align: StackAlign;
  justify: StackJustify;
  wrap: boolean;
}) {
  return [
    optionLabel(directionOptions, direction),
    gapScaleLabels[gap],
    optionLabel(alignOptions, align),
    optionLabel(justifyOptions, justify),
    wrapLabels[String(wrap) as "true" | "false"],
  ].join(", ");
}

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

          <WidgetControlRow
            id={`stack.visual.direction.${breakpoint}`}
            label={`${breakpointLabels[breakpoint]} flow`}
            path={`direction.${breakpoint}`}
          >
            {() => (
              <Select
                value={direction[breakpoint]}
                onValueChange={(next) =>
                  updateDirection(value, variant, onChange, {
                    [breakpoint]: next as StackDirection,
                  } as Partial<DirectionData>)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`${breakpointLabels[breakpoint]} flow`} />
                </SelectTrigger>
                <SelectContent>
                  {directionOptions.map((option) => (
                    <SelectItem key={`${breakpoint}-dir-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow
            id={`stack.visual.gap.${breakpoint}`}
            label={`${breakpointLabels[breakpoint]} spacing`}
            path={`gap.${breakpoint}`}
          >
            {() => (
              <Select
                value={gap[breakpoint]}
                onValueChange={(next) =>
                  updateGap(value, variant, onChange, {
                    [breakpoint]: next as StackGap,
                  } as Partial<GapData>)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`${breakpointLabels[breakpoint]} spacing`} />
                </SelectTrigger>
                <SelectContent>
                  {gapOptions.map((option) => (
                    <SelectItem key={`${breakpoint}-gap-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
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

          <WidgetControlRow
            id={`stack.visual.align.${breakpoint}`}
            label={`${breakpointLabels[breakpoint]} item alignment`}
            path={`align.${breakpoint}`}
          >
            {() => (
              <Select
                value={align[breakpoint]}
                onValueChange={(next) =>
                  updateResponsiveMetaField(value, variant, onChange, "align", {
                    [breakpoint]: next as StackAlign,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`${breakpointLabels[breakpoint]} alignment`} />
                </SelectTrigger>
                <SelectContent>
                  {alignOptions.map((option) => (
                    <SelectItem key={`${breakpoint}-align-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow
            id={`stack.visual.justify.${breakpoint}`}
            label={`${breakpointLabels[breakpoint]} distribution`}
            path={`justify.${breakpoint}`}
          >
            {() => (
              <Select
                value={justify[breakpoint]}
                onValueChange={(next) =>
                  updateResponsiveMetaField(value, variant, onChange, "justify", {
                    [breakpoint]: next as StackJustify,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`${breakpointLabels[breakpoint]} distribution`} />
                </SelectTrigger>
                <SelectContent>
                  {justifyOptions.map((option) => (
                    <SelectItem key={`${breakpoint}-justify-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow
            id={`stack.visual.wrap.${breakpoint}`}
            label={`${breakpointLabels[breakpoint]} wrapping`}
            path={`wrap.${breakpoint}`}
            help="Allow side-by-side layouts to continue on a new line when items need more room."
          >
            {() => (
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {wrap[breakpoint] ? "Items can wrap." : "Items stay on one line."}
                  </p>
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
            )}
          </WidgetControlRow>
        </div>
      ))}
    </div>
  );
}

export function StackWizardEditor(_props: WidgetEditorProps<StackData>) {
  return (
    <div className="space-y-4">
      <EditorSection
        id="stack.wizard.quick-start"
        mode="wizard"
        role="setup"
        title="Stack quick start"
        description="Wizard is one-time starter setup. Use Visual for preset choice, responsive flow, spacing, alignment, distribution, and wrapping."
      >
        <p className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Visual owns stack preset choice, breakpoint flow directions, spacing, alignment,
          distribution, and wrapping after setup.
        </p>

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
        <WidgetControlRow
          id="stack.visual.variant"
          label="Stack preset"
          path="variant"
          help="Picking a preset updates the saved desktop, tablet, and mobile flow directions. Fine-tune each screen size below."
        >
          {() => (
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
          )}
        </WidgetControlRow>
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

export function StackAdvancedEditor({ value, variant }: WidgetEditorProps<StackData>) {
  const { direction, gap, align, justify, wrap } = resolveEditorState(value, variant);
  const hasLegacyScalarAxis =
    typeof value.align === "string" ||
    typeof value.justify === "string" ||
    typeof value.wrap === "boolean";

  return (
    <div className="space-y-4">
      <EditorSection
        id="stack.advanced.responsive-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime stack summary"
        description="Visual owns responsive flow editing. Advanced shows the saved runtime result."
      >
        {stackBreakpoints.map((breakpoint) => (
          <ReadonlyWidgetSummaryRow
            key={breakpoint}
            id={`stack.advanced.${breakpoint}`}
            label={breakpointLabels[breakpoint]}
            path={`direction.${breakpoint}`}
            value={describeStackBreakpointSummary({
              direction: direction[breakpoint],
              gap: gap[breakpoint],
              align: align[breakpoint],
              justify: justify[breakpoint],
              wrap: wrap[breakpoint],
            })}
          />
        ))}
      </EditorSection>
      <EditorSection
        id="stack.advanced.support-summary"
        mode="advanced"
        role="summary"
        title="Support summary"
        description="Support-only compatibility notes for saved responsive data."
      >
        <ReadonlyWidgetSummaryRow
          id="stack.advanced.normalization"
          label="Saved compatibility"
          path="direction"
          value={
            hasLegacyScalarAxis
              ? "Legacy single-value axis settings normalize for desktop, tablet, and mobile."
              : "Saved responsive values normalize for desktop, tablet, and mobile."
          }
        />
        <ReadonlyWidgetSummaryRow
          id="stack.advanced.visual-owner"
          label="Editing owner"
          value="Use Visual to adjust flow, spacing, alignment, distribution, and wrapping. Advanced is read-only."
        />
      </EditorSection>
    </div>
  );
}
