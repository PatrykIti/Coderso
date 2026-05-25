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
  formatSplitLayoutRatioLabel,
  getSplitLayoutDiagnostics,
  getSplitLayoutGapOptions,
  getSplitLayoutRatioDisclosure,
  getSplitLayoutRatioSpans,
  normalizeSplitLayoutData,
  resolveSplitLayoutVariant,
  splitLayoutDefaults,
  type SplitLayoutCollapseMobile,
  type SplitLayoutData,
  type SplitLayoutGapControlValue,
  type SplitLayoutRatio,
  type SplitLayoutVariantId,
  type SplitLayoutVerticalAlign,
} from "../../../../widgets/core/splitLayout";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import {
  ReadonlyWidgetSummaryRow,
  type WidgetControlFieldProps,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const variantOptions: Array<{
  id: SplitLayoutVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "50-50",
    label: formatSplitLayoutRatioLabel("50-50"),
    description: "Balanced left/right panes for neutral compositions.",
  },
  {
    id: "40-60",
    label: formatSplitLayoutRatioLabel("40-60"),
    description: "Supportive left pane and dominant right pane.",
  },
  {
    id: "60-40",
    label: formatSplitLayoutRatioLabel("60-40"),
    description: "Dominant left pane with supportive right pane.",
  },
];

const ratioOptions = variantOptions.map((option) => ({
  id: option.id,
  label: option.label,
}));

const collapseOptions: Array<{ id: SplitLayoutCollapseMobile; label: string }> = [
  { id: "stack", label: "Stack panes on phones" },
  { id: "keep", label: "Keep two columns on phones" },
];

const gapOptions = getSplitLayoutGapOptions();

const verticalAlignOptions: Array<{
  id: SplitLayoutVerticalAlign;
  label: string;
}> = [
  { id: "start", label: "Top" },
  { id: "center", label: "Middle" },
  { id: "end", label: "Bottom" },
  { id: "stretch", label: "Equal height" },
];

function normalizeValue(value: SplitLayoutData, variant: string): SplitLayoutData {
  return normalizeSplitLayoutData(value, variant);
}

function updateValue(
  value: SplitLayoutData,
  variant: string,
  onChange: (next: SplitLayoutData) => void,
  updater: (current: SplitLayoutData) => SplitLayoutData
) {
  const current = normalizeValue(value, variant);
  const next = updater(current);
  onChange(normalizeValue(next, variant));
}

function updateRatio(
  value: SplitLayoutData,
  variant: string,
  onChange: (next: SplitLayoutData) => void,
  patch: Partial<NonNullable<SplitLayoutData["ratio"]>>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    ratio: {
      ...current.ratio,
      ...patch,
    },
  }));
}

function updateMeta(
  value: SplitLayoutData,
  variant: string,
  onChange: (next: SplitLayoutData) => void,
  patch: Partial<
    Pick<SplitLayoutData, "collapseMobile" | "reverseOnMobile" | "gap" | "verticalAlign">
  >
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    ...patch,
  }));
}

function applyVariantDataPatch(
  nextVariant: SplitLayoutVariantId,
  nextData: SplitLayoutData,
  onChange: (next: SplitLayoutData) => void,
  onVariantChange?: (next: string) => void,
  onBlockPatch?: WidgetEditorProps<SplitLayoutData>["onBlockPatch"]
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

function buildVariantSyncedSplitLayoutData(
  value: SplitLayoutData,
  nextVariant: SplitLayoutVariantId
): SplitLayoutData {
  const current = normalizeValue(value, nextVariant);
  return normalizeValue(
    {
      ...current,
      ratio: {
        ...current.ratio,
        desktop: nextVariant,
        tablet: nextVariant,
        mobile: nextVariant,
      },
    },
    nextVariant
  );
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

function SplitRatioMiniature({ ratio }: { ratio: SplitLayoutRatio }) {
  const spans = getSplitLayoutRatioSpans(ratio);

  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-full grid-cols-12 gap-1 rounded-md border bg-muted/30 p-1"
      data-split-variant-preview={ratio}
    >
      <span
        className="rounded bg-foreground/15"
        style={{ gridColumn: `span ${spans.left} / span ${spans.left}` }}
      />
      <span
        className="rounded bg-foreground/35"
        style={{ gridColumn: `span ${spans.right} / span ${spans.right}` }}
      />
    </span>
  );
}

function VariantCards({
  value,
  disclosure,
  fieldProps,
  onChange,
}: {
  value: SplitLayoutVariantId;
  disclosure: ReturnType<typeof getSplitLayoutRatioDisclosure>;
  fieldProps?: WidgetControlFieldProps;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div
        id={fieldProps?.id}
        aria-labelledby={fieldProps?.["aria-labelledby"]}
        aria-describedby={fieldProps?.["aria-describedby"]}
        className="space-y-2"
        role="radiogroup"
      >
        {variantOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange?.(option.id)}
            aria-pressed={value === option.id}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition",
              value === option.id
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:border-primary/50"
            )}
            data-split-variant-card={option.id}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{option.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
              </div>
              <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
                {value === option.id ? "Base preset" : "Choose"}
              </Badge>
            </div>
            <div className="mt-3">
              <SplitRatioMiniature ratio={option.id} />
            </div>
          </button>
        ))}
      </div>

      <div
        className="rounded-md border border-dashed border-border/80 bg-muted/20 p-3"
        data-split-ratio-summary
        data-split-ratio-override={disclosure.hasOverride ? "true" : "false"}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Current layout on devices</p>
          <Badge variant={disclosure.hasOverride ? "outline" : "default"}>
            {disclosure.hasOverride ? "Custom device layout" : "Matches starter layout"}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Desktop {formatSplitLayoutRatioLabel(disclosure.desktop)}, tablet{" "}
          {formatSplitLayoutRatioLabel(disclosure.tablet)}, mobile{" "}
          {formatSplitLayoutRatioLabel(disclosure.mobile)}.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {disclosure.hasExplicitMobile
            ? "Phone layout has its own saved split."
            : "Phone layout follows the tablet layout until you choose a phone-specific split."}
        </p>
      </div>
    </div>
  );
}

function getCollapseModeCopy(
  collapseMobile: SplitLayoutCollapseMobile,
  mobileRatio: SplitLayoutRatio
): string {
  if (collapseMobile === "keep") {
    return `Phones keep two columns using a ${formatSplitLayoutRatioLabel(mobileRatio)} split. This can feel tight on small screens.`;
  }

  return "Phones show one pane per row, which is the safest layout for narrow screens.";
}

function getReverseCopy(
  collapseMobile: SplitLayoutCollapseMobile,
  reverseOnMobile: boolean
): string {
  if (collapseMobile === "keep") {
    return reverseOnMobile
      ? "The right pane is shown first on phones. Screen readers and keyboard navigation still follow the saved pane order."
      : "Enable this to visually show the right pane first on phones. Screen readers and keyboard navigation still follow the saved pane order.";
  }

  return reverseOnMobile
    ? "The right pane is shown above the left pane on phones. Screen readers and keyboard navigation still follow the saved pane order."
    : "Enable this to visually place the right pane above the left pane on phones.";
}

function describePaneSplit(leftSpan: number, rightSpan: number): string {
  if (leftSpan === rightSpan) {
    return "left and right panes share the row evenly.";
  }
  if (leftSpan > rightSpan) {
    return "the left pane is wider than the right pane.";
  }
  return "the right pane is wider than the left pane.";
}

export function SplitLayoutWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<SplitLayoutData>) {
  return (
    <div className="space-y-4">
      <EditorSection
        id="split-layout.wizard.quick-start"
        mode="wizard"
        role="setup"
        title="Choose a starter split"
        description="Use this once to seed the pane layout. Visual owns day-to-day device behavior and spacing."
      >
        <WidgetControlRow
          id="split-layout.wizard.starter-layout"
          label="Starter layout"
          path="variant"
        >
          {(fieldProps) => (
            <Select
              value={resolveSplitLayoutVariant(variant)}
              onValueChange={(next) =>
                applyVariantDataPatch(
                  next as SplitLayoutVariantId,
                  buildVariantSyncedSplitLayoutData(value, next as SplitLayoutVariantId),
                  onChange,
                  onVariantChange,
                  onBlockPatch
                )
              }
            >
              <SelectTrigger {...fieldProps}>
                <SelectValue placeholder="Select starter layout" />
              </SelectTrigger>
              <SelectContent>
                {ratioOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <div
          className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
          data-widget-control="split-layout.wizard.next-step"
          data-widget-control-ownership="preview"
        >
          After choosing the starter layout, use Visual to tune phone layout, spacing, and pane
          alignment.
        </div>
        <div
          className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
          data-widget-control="split-layout.wizard.structure-guidance"
          data-widget-control-ownership="preview"
        >
          Add widgets to the left and right panes from Structure or the insert controls.
        </div>
      </EditorSection>
    </div>
  );
}

export function SplitLayoutVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<SplitLayoutData>) {
  const normalized = normalizeValue(value, variant);
  const resolvedVariant = resolveSplitLayoutVariant(variant);
  const disclosure = getSplitLayoutRatioDisclosure(value, resolvedVariant);
  const diagnostics = getSplitLayoutDiagnostics(value, resolvedVariant);
  const mobileKeep = (normalized.collapseMobile ?? "stack") === "keep";

  return (
    <div className="space-y-4">
      <EditorSection
        id="split-layout.visual.variant-ratio"
        mode="visual"
        role="layout"
        title="Pane layout"
        description="Choose the base pane shape and tune the desktop and tablet layout."
      >
        <WidgetControlRow id="split-layout.visual.base-preset" label="Base layout" path="variant">
          {(fieldProps) => (
            <VariantCards
              value={resolvedVariant}
              disclosure={disclosure}
              fieldProps={fieldProps}
              onChange={(next) =>
                applyVariantDataPatch(
                  next as SplitLayoutVariantId,
                  buildVariantSyncedSplitLayoutData(value, next as SplitLayoutVariantId),
                  onChange,
                  onVariantChange,
                  onBlockPatch
                )
              }
            />
          )}
        </WidgetControlRow>

        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          <WidgetControlRow
            id="split-layout.visual.desktop-ratio"
            label="Desktop layout"
            path="ratio.desktop"
          >
            {(fieldProps) => (
              <Select
                value={normalized.ratio?.desktop ?? resolvedVariant}
                onValueChange={(next) =>
                  updateRatio(value, variant, onChange, {
                    desktop: next as SplitLayoutRatio,
                  })
                }
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue placeholder="Desktop layout" />
                </SelectTrigger>
                <SelectContent>
                  {ratioOptions.map((option) => (
                    <SelectItem key={`desktop-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow
            id="split-layout.visual.tablet-ratio"
            label="Tablet layout"
            path="ratio.tablet"
          >
            {(fieldProps) => (
              <Select
                value={normalized.ratio?.tablet ?? splitLayoutDefaults.ratio?.tablet ?? "50-50"}
                onValueChange={(next) =>
                  updateRatio(value, variant, onChange, {
                    tablet: next as SplitLayoutRatio,
                  })
                }
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue placeholder="Tablet layout" />
                </SelectTrigger>
                <SelectContent>
                  {ratioOptions.map((option) => (
                    <SelectItem key={`tablet-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        </div>
      </EditorSection>

      <EditorSection
        id="split-layout.visual.mobile-behavior"
        mode="visual"
        role="layout"
        title="Phone behavior"
        description="Choose whether phone visitors see one stacked column or a preserved two-pane layout."
      >
        <WidgetControlRow
          id="split-layout.visual.phone-layout"
          label="Phone layout"
          path="collapseMobile"
        >
          {(fieldProps) => (
            <Select
              value={normalized.collapseMobile ?? "stack"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, {
                  collapseMobile: next as SplitLayoutCollapseMobile,
                })
              }
            >
              <SelectTrigger {...fieldProps}>
                <SelectValue placeholder="Phone layout" />
              </SelectTrigger>
              <SelectContent>
                {collapseOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <div
          className="text-xs text-muted-foreground"
          data-widget-control="split-layout.visual.phone-layout-preview"
          data-widget-control-ownership="preview"
        >
          <p className="text-xs text-muted-foreground">
            {getCollapseModeCopy(normalized.collapseMobile ?? "stack", disclosure.mobile)}
          </p>
        </div>

        {mobileKeep ? (
          <WidgetControlRow
            id="split-layout.visual.phone-ratio"
            label="Phone split"
            path="ratio.mobile"
            className="space-y-2"
          >
            {(fieldProps) => (
              <div data-split-mobile-ratio-control="visible">
                <Select
                  value={normalized.ratio?.mobile ?? normalized.ratio?.tablet ?? resolvedVariant}
                  onValueChange={(next) =>
                    updateRatio(value, variant, onChange, {
                      mobile: next as SplitLayoutRatio,
                    })
                  }
                >
                  <SelectTrigger {...fieldProps}>
                    <SelectValue placeholder="Phone split" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratioOptions.map((option) => (
                      <SelectItem key={`mobile-${option.id}`} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </WidgetControlRow>
        ) : (
          <div
            className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
            data-widget-control="split-layout.visual.phone-ratio-preview"
            data-widget-control-ownership="preview"
            data-split-mobile-ratio-control="stack-note"
          >
            Stacked phone layout does not need a phone split. Each pane gets the full screen width.
          </div>
        )}
        {mobileKeep ? (
          <div
            className="text-xs text-muted-foreground"
            data-widget-control="split-layout.visual.phone-ratio-preview"
            data-widget-control-ownership="preview"
          >
            <p className="text-xs text-muted-foreground">
              Use this only when phones should keep a different two-column split than tablets.
            </p>
          </div>
        ) : null}

        <WidgetControlRow
          id="split-layout.visual.reverse-phone-order"
          label="Show right pane first on phones"
          path="reverseOnMobile"
        >
          {(fieldProps) => (
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground" data-split-reverse-copy>
                    {getReverseCopy(
                      normalized.collapseMobile ?? "stack",
                      Boolean(normalized.reverseOnMobile)
                    )}
                  </p>
                </div>
                <Switch
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                  checked={Boolean(normalized.reverseOnMobile)}
                  onCheckedChange={(checked) =>
                    updateMeta(value, variant, onChange, { reverseOnMobile: checked })
                  }
                />
              </div>
            </div>
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="split-layout.visual.spacing-alignment"
        mode="visual"
        role="layout"
        title="Spacing and alignment"
        description="Control the space between panes and how their content lines up."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WidgetControlRow
            id="split-layout.visual.pane-spacing"
            label="Space between panes"
            path="gap"
          >
            {(fieldProps) => (
              <Select
                value={diagnostics.gap.controlValue}
                onValueChange={(next) =>
                  updateMeta(value, variant, onChange, { gap: next as SplitLayoutGapControlValue })
                }
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue placeholder="Space between panes" />
                </SelectTrigger>
                <SelectContent>
                  {gapOptions.map((option) => (
                    <SelectItem key={`gap-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
          <div
            className="text-xs text-muted-foreground"
            data-widget-control="split-layout.visual.pane-spacing-preview"
            data-widget-control-ownership="preview"
          >
            <p className="text-xs text-muted-foreground" data-split-gap-copy>
              {diagnostics.gap.description}
            </p>
          </div>

          <WidgetControlRow
            id="split-layout.visual.content-height-alignment"
            label="Content height alignment"
            path="verticalAlign"
          >
            {(fieldProps) => (
              <Select
                value={normalized.verticalAlign ?? "stretch"}
                onValueChange={(next) =>
                  updateMeta(value, variant, onChange, {
                    verticalAlign: next as SplitLayoutVerticalAlign,
                  })
                }
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue placeholder="Content height alignment" />
                </SelectTrigger>
                <SelectContent>
                  {verticalAlignOptions.map((option) => (
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

      <EditorSection
        id="split-layout.visual.pane-guidance"
        mode="visual"
        role="summary"
        title="Pane content"
        description="Use Structure and the insert controls to place widgets into each pane."
      >
        <p className="text-xs text-muted-foreground">
          Target the left or right pane from Structure to add or move nested widgets without
          guessing internal placement names.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Empty-pane guidance appears only in admin preview surfaces, never in the public runtime.
        </p>
      </EditorSection>
    </div>
  );
}

export function SplitLayoutAdvancedEditor({ value, variant }: WidgetEditorProps<SplitLayoutData>) {
  const diagnostics = getSplitLayoutDiagnostics(value, variant);
  const mobileSummary =
    diagnostics.mobile.mode === "stack"
      ? `${diagnostics.mobile.reversed ? "Right pane first" : "Left pane first"} with one pane per row on phones.`
      : `${formatSplitLayoutRatioLabel(diagnostics.mobile.ratio ?? diagnostics.ratios.mobile)} split on phones with ${diagnostics.mobile.reversed ? "right pane first" : "left pane first"}.`;

  return (
    <div className="space-y-4">
      <EditorSection
        id="split-layout.advanced.responsive-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="How this layout renders"
        description="Visual owns editing. Advanced only explains the saved layout in read-only form."
      >
        <div className="space-y-2" data-split-advanced-diagnostics>
          <ReadonlyWidgetSummaryRow
            id="split-layout.advanced.preset"
            label="Starter layout"
            path="variant"
            value={
              diagnostics.ratios.desktop === diagnostics.variant &&
              diagnostics.ratios.tablet === diagnostics.variant &&
              diagnostics.ratios.mobile === diagnostics.variant
                ? `${formatSplitLayoutRatioLabel(diagnostics.variant)} starter layout is still used on every device size.`
                : `${formatSplitLayoutRatioLabel(diagnostics.variant)} starter layout has device-specific changes.`
            }
          />
          <ReadonlyWidgetSummaryRow
            id="split-layout.advanced.desktop"
            label="Desktop"
            path="ratio.desktop"
            value={`${formatSplitLayoutRatioLabel(diagnostics.ratios.desktop)}: ${describePaneSplit(diagnostics.desktop.leftSpan, diagnostics.desktop.rightSpan)}`}
          />
          <ReadonlyWidgetSummaryRow
            id="split-layout.advanced.tablet"
            label="Tablet"
            path="ratio.tablet"
            value={`${formatSplitLayoutRatioLabel(diagnostics.ratios.tablet)}: ${describePaneSplit(diagnostics.tablet.leftSpan, diagnostics.tablet.rightSpan)}`}
          />
          <ReadonlyWidgetSummaryRow
            id="split-layout.advanced.mobile"
            label="Phone"
            path="ratio.mobile"
            value={mobileSummary}
          />
          <ReadonlyWidgetSummaryRow
            id="split-layout.advanced.gap"
            label="Space between panes"
            path="gap"
            value={`${diagnostics.gap.label}. ${diagnostics.gap.description}`}
          />
          <ReadonlyWidgetSummaryRow
            id="split-layout.advanced.vertical-align"
            label="Content height alignment"
            path="verticalAlign"
            value={diagnostics.verticalAlign.label}
          />
        </div>
      </EditorSection>

      <EditorSection
        id="split-layout.advanced.saved-layout-summary"
        mode="advanced"
        role="diagnostics"
        title="Saved layout summary"
        description="Read-only support summary for saved device layout and phone order."
      >
        <ReadonlyWidgetSummaryRow
          id="split-layout.advanced.saved-device-layouts"
          label="Device layouts"
          path="ratio.desktop"
          value={`Desktop ${formatSplitLayoutRatioLabel(diagnostics.ratios.desktop)}, tablet ${formatSplitLayoutRatioLabel(diagnostics.ratios.tablet)}, phone ${diagnostics.mobile.mode === "stack" ? "stacked" : formatSplitLayoutRatioLabel(diagnostics.ratios.mobile)}.`}
        />
        <ReadonlyWidgetSummaryRow
          id="split-layout.advanced.saved-phone-order"
          label="Phone order"
          path="reverseOnMobile"
          value={
            diagnostics.mobile.reversed
              ? "Right pane is shown first on phones."
              : "Left pane is shown first on phones."
          }
        />
      </EditorSection>
    </div>
  );
}
