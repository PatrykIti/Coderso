import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  applySpacerPreset,
  describeSpacerHeight,
  deriveSpacerPresetId,
  normalizeSpacerCustomHeightInput,
  normalizeSpacerData,
  resolveSpacerCssHeight,
  resolveSpacerVariant,
  spacerDefaults,
  spacerHeightDisplayLabelMap,
  spacerHeightTokens,
  spacerPresetDefinitions,
  type SpacerData,
  type SpacerVariantId,
} from "../../../../widgets/core/spacer";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { buildVisibleOffTokenOptions, TokenOrPixelField } from "./TokenOrPixelField";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const variantOptions: Array<{
  id: SpacerVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "responsive",
    label: "Responsive",
    description: "Independent height per breakpoint for precise rhythm tuning.",
  },
  {
    id: "fixed",
    label: "Fixed",
    description: "Single height shared across desktop, tablet and mobile.",
  },
];

const heightTokenOptions = buildVisibleOffTokenOptions(
  spacerHeightTokens.map((token) => ({
    id: token,
    label: spacerHeightDisplayLabelMap[token],
  }))
);

const spacerCustomHeightPlaceholder = "Saved custom height";
const spacerCustomHeightHelp =
  "Saved custom heights stay compatible. Pick a preset to replace them.";

const spacerHeightBreakpointHelp = {
  desktop: "Applies to desktop previews and wide screens.",
  tablet: "Applies to tablet previews before desktop takes over.",
  mobile: "Applies to phone previews before tablet takes over.",
} as const;

function normalizeValue(value: SpacerData, _variant: string): SpacerData {
  return normalizeSpacerData(value);
}

function formatSpacerHeightForEditor(value: string | undefined) {
  return describeSpacerHeight(value);
}

function updateValue(
  value: SpacerData,
  variant: string,
  onChange: (next: SpacerData) => void,
  updater: (current: SpacerData) => SpacerData
) {
  const current = normalizeValue(value, variant);
  const next = updater(current);
  onChange(normalizeValue(next, variant));
}

function updateHeight(
  value: SpacerData,
  variant: string,
  onChange: (next: SpacerData) => void,
  patch: Partial<NonNullable<SpacerData["height"]>>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    height: {
      ...current.height,
      ...patch,
    },
  }));
}

function updateMeta(
  value: SpacerData,
  variant: string,
  onChange: (next: SpacerData) => void,
  patch: Partial<Pick<SpacerData, "showGuideInEditor">>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    ...patch,
  }));
}

function applyPreset(
  value: SpacerData,
  variant: string,
  onChange: (next: SpacerData) => void,
  presetId: (typeof spacerPresetDefinitions)[number]["id"]
) {
  const preset = spacerPresetDefinitions.find((option) => option.id === presetId);
  if (!preset) return;

  if (resolveSpacerVariant(variant) === "fixed") {
    updateHeight(value, variant, onChange, { desktop: preset.height.desktop });
    return;
  }

  updateValue(value, variant, onChange, (current) => applySpacerPreset(current, presetId));
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id: string;
  mode: EditorMode;
  role: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: SpacerVariantId;
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

function SpacerPresetChooser({
  value,
  variant,
  onChange,
}: {
  value: SpacerData;
  variant: string;
  onChange: (next: SpacerData) => void;
}) {
  const normalized = normalizeValue(value, variant);
  const currentPresetId = deriveSpacerPresetId(normalized.height);
  const currentPreset =
    spacerPresetDefinitions.find((preset) => preset.id === currentPresetId) ?? null;
  const resolvedVariant = resolveSpacerVariant(variant);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {currentPreset
            ? `Current preset: ${currentPreset.label}.`
            : "Manual heights are active. Presets stay available as shortcuts."}
        </p>
        {resolvedVariant === "fixed" ? (
          <p className="text-xs text-muted-foreground">
            Fixed mode preserves the saved tablet and mobile heights. Presets update the desktop
            height only while fixed is active, so switch to responsive to apply a full preset across
            phone, tablet, and desktop.
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {spacerPresetDefinitions.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(value, variant, onChange, preset.id)}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition",
              currentPresetId === preset.id
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:border-primary/50"
            )}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold leading-tight">{preset.label}</p>
              <Badge
                className="shrink-0"
                variant={currentPresetId === preset.id ? "default" : "outline"}
              >
                {currentPresetId === preset.id ? "Selected" : "Apply"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Desktop: {formatSpacerHeightForEditor(preset.height.desktop)} / Tablet:{" "}
              {formatSpacerHeightForEditor(preset.height.tablet)} / Phone:{" "}
              {formatSpacerHeightForEditor(preset.height.mobile)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function HeightField({
  id,
  path,
  label,
  breakpoint,
  value,
  onChange,
}: {
  id: string;
  path: string;
  label: string;
  breakpoint: keyof typeof spacerHeightBreakpointHelp;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <WidgetControlRow id={id} label={label} path={path} hideLabel>
      {() => (
        <TokenOrPixelField
          label={label}
          fieldDescription={spacerHeightBreakpointHelp[breakpoint]}
          value={value}
          onChange={onChange}
          tokenOptions={heightTokenOptions}
          isToken={(candidate) =>
            spacerHeightTokens.includes(candidate as (typeof spacerHeightTokens)[number])
          }
          resolveCss={resolveSpacerCssHeight}
          formatResolvedValue={formatSpacerHeightForEditor}
          selectPlaceholder="Quick preset"
          inputPlaceholder={spacerCustomHeightPlaceholder}
          customOptionLabel="Saved custom height"
          customValueLabel="saved custom height"
          selectedValueLabel="preset"
          replacementOptionLabel="a preset"
          normalizeCustomValue={normalizeSpacerCustomHeightInput}
          customInputLabel={`${label} saved custom height`}
          customInputHelp={spacerCustomHeightHelp}
          allowCustom={false}
        />
      )}
    </WidgetControlRow>
  );
}

function ResponsiveHeights({
  value,
  variant,
  onChange,
}: {
  value: SpacerData;
  variant: string;
  onChange: (next: SpacerData) => void;
}) {
  const normalized = normalizeValue(value, variant);
  const height = normalized.height ?? spacerDefaults.height!;
  const resolvedVariant = resolveSpacerVariant(variant);

  return (
    <div className="space-y-3">
      <HeightField
        id="spacer.visual.desktop-height"
        path="height.desktop"
        label="Desktop height"
        breakpoint="desktop"
        value={height.desktop ?? "16"}
        onChange={(next) => updateHeight(value, variant, onChange, { desktop: next })}
      />
      {resolvedVariant === "responsive" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <HeightField
            id="spacer.visual.tablet-height"
            path="height.tablet"
            label="Tablet height"
            breakpoint="tablet"
            value={height.tablet ?? "12"}
            onChange={(next) => updateHeight(value, variant, onChange, { tablet: next })}
          />
          <HeightField
            id="spacer.visual.mobile-height"
            path="height.mobile"
            label="Mobile height"
            breakpoint="mobile"
            value={height.mobile ?? "8"}
            onChange={(next) => updateHeight(value, variant, onChange, { mobile: next })}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Fixed mode uses desktop height for tablet and mobile.
        </p>
      )}
    </div>
  );
}

export function SpacerWizardEditor({ value, variant }: WidgetEditorProps<SpacerData>) {
  const normalized = normalizeValue(value, variant);
  const height = normalized.height ?? spacerDefaults.height!;
  const resolvedVariant = resolveSpacerVariant(variant);
  const variantLabel =
    variantOptions.find((option) => option.id === resolvedVariant)?.label ?? "Responsive";

  return (
    <div className="space-y-4">
      <EditorSection
        id="spacer.wizard.quick-start"
        mode="wizard"
        role="setup"
        title="Spacer quick start"
        description="Wizard now summarizes the saved spacer mode and starter rhythm. Visual owns ongoing responsive height editing."
      >
        <ReadonlyWidgetSummaryRow
          id="spacer.wizard.variant"
          label="Spacer mode"
          path="variant"
          value={variantLabel}
        />

        <WidgetControlRow
          id="spacer.wizard.rhythm-preset"
          label="Rhythm presets"
          path="height"
          ownership="readonly"
          help="Visual owns spacer heights after setup."
        >
          {() => (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Desktop: {height.desktop ?? "16"} / Tablet: {height.tablet ?? "12"} / Phone:{" "}
              {height.mobile ?? "8"}
            </div>
          )}
        </WidgetControlRow>

        <ReadonlyWidgetSummaryRow
          id="spacer.wizard.desktop-height"
          label="Desktop height"
          path="height.desktop"
          value={height.desktop ?? "16"}
        />
        {resolvedVariant === "fixed" ? (
          <p className="text-xs text-muted-foreground">
            Fixed mode reuses the desktop height for tablet and mobile.
          </p>
        ) : null}

        <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          Visual owns the editor guide toggle after setup so you can enable or hide the spacer
          helper while composing.
        </div>
      </EditorSection>
    </div>
  );
}

export function SpacerVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<SpacerData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <EditorSection
        id="spacer.visual.variant"
        mode="visual"
        role="visual"
        title="Variant and responsive behavior"
        description="Choose fixed or responsive spacer mode."
      >
        <WidgetControlRow id="spacer.visual.variant" label="Spacer mode" path="variant" hideLabel>
          {() => <VariantCards value={resolveSpacerVariant(variant)} onChange={onVariantChange} />}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="spacer.visual.rhythm"
        mode="visual"
        role="layout"
        title="Responsive heights"
        description="Control spacer height per breakpoint with friendly rhythm presets."
      >
        <div className="space-y-4">
          <WidgetControlRow
            id="spacer.visual.rhythm-preset"
            label="Rhythm presets"
            path="height"
            help="Apply a named vertical rhythm preset without typing technical lengths."
          >
            {() => <SpacerPresetChooser value={value} variant={variant} onChange={onChange} />}
          </WidgetControlRow>
          <ResponsiveHeights value={value} variant={variant} onChange={onChange} />
        </div>
      </EditorSection>

      <EditorSection
        id="spacer.visual.guide"
        mode="visual"
        role="visual"
        title="Editor guide"
        description="Optional helper label visible in preview environments."
      >
        <WidgetControlRow
          id="spacer.visual.editor-guide"
          label="Show guide in editor"
          path="showGuideInEditor"
          hideLabel
        >
          {() => (
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Show guide in editor</p>
                  <p className="text-xs text-muted-foreground">
                    Helps identify spacer size while composing templates.
                  </p>
                </div>
                <Switch
                  checked={Boolean(normalized.showGuideInEditor)}
                  onCheckedChange={(checked) =>
                    updateMeta(value, variant, onChange, { showGuideInEditor: checked })
                  }
                />
              </div>
            </div>
          )}
        </WidgetControlRow>
      </EditorSection>
    </div>
  );
}

export function SpacerAdvancedEditor({ value, variant }: WidgetEditorProps<SpacerData>) {
  const resolvedVariant = resolveSpacerVariant(variant);
  const normalized = normalizeValue(value, resolvedVariant);
  const height = normalized.height ?? spacerDefaults.height!;
  const desktop = height.desktop ?? "16";
  const tablet = resolvedVariant === "fixed" ? desktop : (height.tablet ?? "12");
  const mobile = resolvedVariant === "fixed" ? desktop : (height.mobile ?? "8");
  const hasSavedResponsiveFallback =
    resolvedVariant === "fixed" &&
    ((Boolean(height.tablet) && height.tablet !== desktop) ||
      (Boolean(height.mobile) && height.mobile !== desktop));

  return (
    <div className="space-y-4">
      <EditorSection
        id="spacer.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime spacing summary"
        description="Visual owns spacing edits. Advanced shows the saved runtime behavior."
      >
        <ReadonlyWidgetSummaryRow
          id="spacer.advanced.desktop-height"
          label="Desktop height"
          path="height.desktop"
          value={formatSpacerHeightForEditor(desktop)}
        />
        <ReadonlyWidgetSummaryRow
          id="spacer.advanced.tablet-height"
          label="Tablet height"
          path="height.tablet"
          value={formatSpacerHeightForEditor(tablet)}
        />
        <ReadonlyWidgetSummaryRow
          id="spacer.advanced.mobile-height"
          label="Mobile height"
          path="height.mobile"
          value={formatSpacerHeightForEditor(mobile)}
        />
        <ReadonlyWidgetSummaryRow
          id="spacer.advanced.guide"
          label="Editor guide"
          path="showGuideInEditor"
          value={
            normalized.showGuideInEditor ? "Shown in editor previews" : "Hidden in editor previews"
          }
        />
      </EditorSection>
      <EditorSection
        id="spacer.advanced.support-summary"
        mode="advanced"
        role="summary"
        title="Support summary"
        description="Read-only compatibility notes for saved Spacer data."
      >
        <ReadonlyWidgetSummaryRow
          id="spacer.advanced.mode"
          label="Spacer mode"
          path="variant"
          value={resolvedVariant === "fixed" ? "Fixed rhythm" : "Responsive rhythm"}
        />
        <ReadonlyWidgetSummaryRow
          id="spacer.advanced.saved-responsive-fallback"
          label="Saved responsive fallback"
          path="height"
          value={
            hasSavedResponsiveFallback
              ? "Tablet or mobile fallback values are preserved for responsive mode."
              : "No separate responsive fallback values are saved."
          }
        />
      </EditorSection>
    </div>
  );
}
