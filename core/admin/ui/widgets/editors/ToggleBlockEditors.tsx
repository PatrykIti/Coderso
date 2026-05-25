import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  normalizeToggleBlockData,
  type ToggleBlockData,
  type ToggleBlockMotion,
  type ToggleBlockPaneBorderEmphasis,
  type ToggleBlockPanePaddingToken,
  type ToggleBlockPaneRadiusToken,
  type ToggleBlockPaneSurfaceToken,
  type ToggleBlockStateId,
  type ToggleBlockVariantId,
} from "../../../../widgets/core/toggleBlock";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import {
  ClearableFieldHeader,
  ColorContrastNotice,
  resolveColorContrastAdvisory,
} from "./ClearableFields";
import { SharedColorControl } from "./SharedColorControl";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: ToggleBlockVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "switch",
    label: "Switch",
    description: "Compact segmented toggle for quick content swaps.",
  },
  {
    id: "cards",
    label: "Cards",
    description: "Larger selector cards with stronger pane framing.",
  },
];

const motionOptions: Array<{ id: ToggleBlockMotion; label: string; description: string }> = [
  { id: "none", label: "None", description: "Swap panes immediately." },
  { id: "fade", label: "Fade", description: "Fade the active pane in." },
  { id: "slide", label: "Slide", description: "Fade and lift the active pane." },
];

const paneSurfaceOptions: Array<{ id: ToggleBlockPaneSurfaceToken; label: string }> = [
  { id: "default", label: "Inherited" },
  { id: "soft", label: "Soft surface" },
  { id: "contrast", label: "Contrast surface" },
];

const panePaddingOptions: Array<{ id: ToggleBlockPanePaddingToken; label: string }> = [
  { id: "compact", label: "Compact" },
  { id: "comfortable", label: "Comfortable" },
  { id: "spacious", label: "Spacious" },
];

const paneRadiusOptions: Array<{ id: ToggleBlockPaneRadiusToken; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

const paneBorderOptions: Array<{ id: ToggleBlockPaneBorderEmphasis; label: string }> = [
  { id: "subtle", label: "Subtle" },
  { id: "strong", label: "Strong" },
];

type NormalizedToggleBlockData = ReturnType<typeof normalizeToggleBlockData>;

function resolveVariant(variant: string): ToggleBlockVariantId {
  if (variant === "cards") return variant;
  return "switch";
}

function normalizeValue(value: ToggleBlockData): NormalizedToggleBlockData {
  return normalizeToggleBlockData(value);
}

function controlAttributes(id: string, path: string) {
  return {
    "data-widget-control": id,
    "data-widget-control-path": path,
    "data-widget-control-ownership": "writable",
  };
}

function updateValue(
  value: ToggleBlockData,
  onChange: (next: ToggleBlockData) => void,
  updater: (current: NormalizedToggleBlockData) => ToggleBlockData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeToggleBlockData(next));
}

function updateLabels(
  value: ToggleBlockData,
  onChange: (next: ToggleBlockData) => void,
  patch: Partial<NonNullable<ToggleBlockData["labels"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    labels: {
      ...current.labels,
      ...patch,
    },
  }));
}

function clearLabelField(
  value: ToggleBlockData,
  onChange: (next: ToggleBlockData) => void,
  key: keyof NonNullable<ToggleBlockData["labels"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...labels } = current.labels;
    return {
      ...current,
      labels,
    };
  });
}

function updateOptions(
  value: ToggleBlockData,
  onChange: (next: ToggleBlockData) => void,
  patch: Partial<NonNullable<ToggleBlockData["options"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    options: {
      ...current.options,
      ...patch,
    },
  }));
}

function updateStyle(
  value: ToggleBlockData,
  onChange: (next: ToggleBlockData) => void,
  patch: Partial<NonNullable<ToggleBlockData["style"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function clearStyleField(
  value: ToggleBlockData,
  onChange: (next: ToggleBlockData) => void,
  key: keyof NonNullable<ToggleBlockData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style;
    return {
      ...current,
      style,
    };
  });
}

function updatePaneStyle(
  value: ToggleBlockData,
  onChange: (next: ToggleBlockData) => void,
  pane: ToggleBlockStateId,
  patch: Partial<
    NonNullable<NonNullable<NonNullable<ToggleBlockData["style"]>["panes"]>[ToggleBlockStateId]>
  >
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      panes: {
        ...current.style.panes,
        [pane]: {
          ...current.style.panes[pane],
          ...patch,
        },
      },
    },
  }));
}

function EditorSection({
  id,
  title,
  description,
  mode,
  role,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  mode?: EditorMode;
  role?: WidgetEditorSectionRole;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} title={title} mode={mode} role={role} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function ToggleBlockVariantPreview({ variant }: { variant: ToggleBlockVariantId }) {
  return (
    <span
      aria-hidden="true"
      data-widget-control={`toggle-block.variant-preview.${variant}`}
      data-widget-control-ownership="preview"
      className={cn(
        "grid w-full gap-2 rounded-lg border p-2",
        variant === "cards" ? "grid-cols-2 bg-muted/30" : "grid-cols-1 bg-background"
      )}
    >
      <span
        className={cn(
          "block border",
          variant === "cards"
            ? "min-h-10 rounded-xl bg-background shadow-sm"
            : "min-h-3 rounded-full bg-muted/40"
        )}
      />
      <span
        className={cn(
          "block border",
          variant === "cards"
            ? "min-h-10 rounded-xl bg-background shadow-sm"
            : "min-h-3 rounded-full bg-muted/40"
        )}
      />
    </span>
  );
}

function VariantCards({
  value,
  onChange,
  controlId = "toggle-block.variant",
  path = "variant",
}: {
  value: ToggleBlockVariantId;
  onChange?: (next: string) => void;
  controlId?: string;
  path?: string;
}) {
  return (
    <div className="space-y-2" {...controlAttributes(controlId, path)}>
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
          <div className="grid gap-3 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
            <ToggleBlockVariantPreview variant={option.id} />
            <div className="space-y-1">
              <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

function DefaultStateNotice({ value }: { value: ToggleBlockData }) {
  const normalized = normalizeValue(value);
  const label =
    normalized.options.defaultState === "secondary"
      ? normalized.labels.secondary
      : normalized.labels.primary;
  const pane = normalized.options.defaultState === "secondary" ? "Secondary" : "Primary";

  return (
    <p
      className="text-xs text-muted-foreground"
      data-widget-control="toggle-block.default-state.preview"
      data-widget-control-ownership="preview"
    >
      {pane} pane opens first in preview and runtime: {label}.
    </p>
  );
}

function LabelsSection({
  value,
  onChange,
  sectionId = "toggle-block.labels",
  title = "Labels",
  description = "Name both toggle states and helper copy.",
  mode = "visual",
  role = "content",
}: {
  value: ToggleBlockData;
  onChange: (next: ToggleBlockData) => void;
  sectionId?: string;
  title?: string;
  description?: string;
  mode?: EditorMode;
  role?: WidgetEditorSectionRole;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection id={sectionId} title={title} mode={mode} role={role} description={description}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2" {...controlAttributes(`${sectionId}.primary`, "labels.primary")}>
          <p className="text-sm font-medium">Primary label</p>
          <Input
            value={normalized.labels.primary}
            onChange={(event) =>
              updateLabels(value, onChange, {
                primary: event.target.value,
              })
            }
            placeholder="View A"
          />
        </div>
        <div
          className="space-y-2"
          {...controlAttributes(`${sectionId}.secondary`, "labels.secondary")}
        >
          <p className="text-sm font-medium">Secondary label</p>
          <Input
            value={normalized.labels.secondary}
            onChange={(event) =>
              updateLabels(value, onChange, {
                secondary: event.target.value,
              })
            }
            placeholder="View B"
          />
        </div>
      </div>
      <div className="space-y-2" {...controlAttributes(`${sectionId}.helper`, "labels.helper")}>
        <ClearableFieldHeader
          label="Helper text"
          value={normalized.labels.helper}
          onClear={() =>
            updateLabels(value, onChange, {
              helper: "",
            })
          }
          onRestoreValue={(next) =>
            updateLabels(value, onChange, {
              helper: next,
            })
          }
        />
        <Input
          value={normalized.labels.helper ?? ""}
          onChange={(event) =>
            updateLabels(value, onChange, {
              helper: event.target.value,
            })
          }
          placeholder="Switch between two content views."
        />
      </div>
    </EditorSection>
  );
}

function StartingPaneSection({
  value,
  onChange,
  sectionId = "toggle-block.starting-pane",
  title = "Starting pane",
  description = "Choose which pane users see first.",
  mode = "visual",
  role = "visual",
}: {
  value: ToggleBlockData;
  onChange: (next: ToggleBlockData) => void;
  sectionId?: string;
  title?: string;
  description?: string;
  mode?: EditorMode;
  role?: WidgetEditorSectionRole;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection id={sectionId} title={title} mode={mode} role={role} description={description}>
      <div
        className="space-y-2"
        {...controlAttributes(`${sectionId}.defaultState`, "options.defaultState")}
      >
        <p className="text-sm font-medium">Default state</p>
        <Select
          value={normalized.options.defaultState}
          onValueChange={(next) =>
            updateOptions(value, onChange, {
              defaultState: next as ToggleBlockStateId,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select default state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary pane</SelectItem>
            <SelectItem value="secondary">Secondary pane</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DefaultStateNotice value={value} />
    </EditorSection>
  );
}

function ExperienceSection({
  value,
  onChange,
}: {
  value: ToggleBlockData;
  onChange: (next: ToggleBlockData) => void;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      id="toggle-block.experience"
      title="Experience"
      mode="visual"
      role="visual"
      description="Tune the opening pane and transition feel."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className="space-y-2"
          {...controlAttributes("toggle-block.experience.defaultState", "options.defaultState")}
        >
          <p className="text-sm font-medium">Default state</p>
          <Select
            value={normalized.options.defaultState}
            onValueChange={(next) =>
              updateOptions(value, onChange, {
                defaultState: next as ToggleBlockStateId,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select default state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary pane</SelectItem>
              <SelectItem value="secondary">Secondary pane</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div
          className="space-y-2"
          {...controlAttributes("toggle-block.experience.motion", "options.motion")}
        >
          <p className="text-sm font-medium">Motion</p>
          <Select
            value={normalized.options.motion}
            onValueChange={(next) =>
              updateOptions(value, onChange, {
                motion: next as ToggleBlockMotion,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select motion" />
            </SelectTrigger>
            <SelectContent>
              {motionOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {motionOptions.find((option) => option.id === normalized.options.motion)?.description}
          </p>
        </div>
      </div>
      <DefaultStateNotice value={value} />
    </EditorSection>
  );
}

function ThemeSection({
  value,
  onChange,
}: {
  value: ToggleBlockData;
  onChange: (next: ToggleBlockData) => void;
}) {
  const normalized = normalizeValue(value);
  const accentContrastAdvisory = resolveColorContrastAdvisory({
    foreground: normalized.style.accentContrastColor,
    background: normalized.style.accentColor,
  });

  return (
    <EditorSection
      id="toggle-block.theme"
      title="Theme"
      mode="visual"
      role="visual"
      description="Control the wrapper surface plus active trigger contrast."
    >
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div {...controlAttributes("toggle-block.theme.surfaceColor", "style.surfaceColor")}>
          <SharedColorControl
            label="Surface color"
            value={value.style?.surfaceColor}
            onChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
            onClear={() => clearStyleField(value, onChange, "surfaceColor")}
            placeholder="var(--color-surface)"
            pickerFallback="#ffffff"
            showValueInput={false}
          />
        </div>
        <div {...controlAttributes("toggle-block.theme.borderColor", "style.borderColor")}>
          <SharedColorControl
            label="Border color"
            value={value.style?.borderColor}
            onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
            onClear={() => clearStyleField(value, onChange, "borderColor")}
            placeholder="var(--color-border)"
            pickerFallback="#e2e8f0"
            showValueInput={false}
          />
        </div>
        <div {...controlAttributes("toggle-block.theme.accentColor", "style.accentColor")}>
          <SharedColorControl
            label="Accent color"
            value={value.style?.accentColor}
            onChange={(next) => updateStyle(value, onChange, { accentColor: next })}
            onClear={() => clearStyleField(value, onChange, "accentColor")}
            placeholder="var(--color-text)"
            pickerFallback="#0f172a"
            showValueInput={false}
          />
        </div>
        <div
          {...controlAttributes(
            "toggle-block.theme.accentContrastColor",
            "style.accentContrastColor"
          )}
        >
          <SharedColorControl
            label="Accent contrast color"
            value={value.style?.accentContrastColor}
            onChange={(next) => updateStyle(value, onChange, { accentContrastColor: next })}
            onClear={() => clearStyleField(value, onChange, "accentContrastColor")}
            placeholder="var(--color-background)"
            pickerFallback="#ffffff"
            showValueInput={false}
          />
        </div>
      </div>
      <ColorContrastNotice
        advisory={accentContrastAdvisory}
        label="Active trigger contrast advisory"
      />
    </EditorSection>
  );
}

function AccessibilitySection({
  value,
  onChange,
}: {
  value: ToggleBlockData;
  onChange: (next: ToggleBlockData) => void;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      id="toggle-block.accessibility"
      title="Accessibility"
      mode="visual"
      role="content"
      description="Override the radiogroup label and selected-state announcement copy."
    >
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div
          className="space-y-2"
          {...controlAttributes("toggle-block.accessibility.ariaLabel", "labels.ariaLabel")}
        >
          <ClearableFieldHeader
            label="Toggle group label"
            value={normalized.labels.ariaLabel}
            onClear={() => clearLabelField(value, onChange, "ariaLabel")}
            onRestoreValue={(next) => updateLabels(value, onChange, { ariaLabel: next })}
          />
          <Input
            value={normalized.labels.ariaLabel}
            onChange={(event) =>
              updateLabels(value, onChange, {
                ariaLabel: event.target.value,
              })
            }
            placeholder="Toggle content view"
          />
        </div>
        <div
          className="space-y-2"
          {...controlAttributes(
            "toggle-block.accessibility.selectedSuffix",
            "labels.selectedSuffix"
          )}
        >
          <ClearableFieldHeader
            label="Selected announcement"
            value={normalized.labels.selectedSuffix}
            onClear={() => clearLabelField(value, onChange, "selectedSuffix")}
            onRestoreValue={(next) => updateLabels(value, onChange, { selectedSuffix: next })}
          />
          <Input
            value={normalized.labels.selectedSuffix}
            onChange={(event) =>
              updateLabels(value, onChange, {
                selectedSuffix: event.target.value,
              })
            }
            placeholder="selected"
          />
        </div>
      </div>
    </EditorSection>
  );
}

function PaneStyleFields({
  pane,
  title,
  value,
  onChange,
}: {
  pane: ToggleBlockStateId;
  title: string;
  value: ToggleBlockData;
  onChange: (next: ToggleBlockData) => void;
}) {
  const normalized = normalizeValue(value);
  const style = normalized.style.panes[pane];

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div
          className="space-y-2"
          {...controlAttributes(
            `toggle-block.pane-style.${pane}.surface`,
            `style.panes.${pane}.surface`
          )}
        >
          <p className="text-sm font-medium">Surface</p>
          <Select
            value={style.surface}
            onValueChange={(next) =>
              updatePaneStyle(value, onChange, pane, {
                surface: next as ToggleBlockPaneSurfaceToken,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select surface" />
            </SelectTrigger>
            <SelectContent>
              {paneSurfaceOptions.map((option) => (
                <SelectItem key={`${pane}-surface-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          className="space-y-2"
          {...controlAttributes(
            `toggle-block.pane-style.${pane}.padding`,
            `style.panes.${pane}.padding`
          )}
        >
          <p className="text-sm font-medium">Padding</p>
          <Select
            value={style.padding}
            onValueChange={(next) =>
              updatePaneStyle(value, onChange, pane, {
                padding: next as ToggleBlockPanePaddingToken,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select padding" />
            </SelectTrigger>
            <SelectContent>
              {panePaddingOptions.map((option) => (
                <SelectItem key={`${pane}-padding-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          className="space-y-2"
          {...controlAttributes(
            `toggle-block.pane-style.${pane}.radius`,
            `style.panes.${pane}.radius`
          )}
        >
          <p className="text-sm font-medium">Radius</p>
          <Select
            value={style.radius}
            onValueChange={(next) =>
              updatePaneStyle(value, onChange, pane, {
                radius: next as ToggleBlockPaneRadiusToken,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select radius" />
            </SelectTrigger>
            <SelectContent>
              {paneRadiusOptions.map((option) => (
                <SelectItem key={`${pane}-radius-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          className="space-y-2"
          {...controlAttributes(
            `toggle-block.pane-style.${pane}.borderEmphasis`,
            `style.panes.${pane}.borderEmphasis`
          )}
        >
          <p className="text-sm font-medium">Border emphasis</p>
          <Select
            value={style.borderEmphasis}
            onValueChange={(next) =>
              updatePaneStyle(value, onChange, pane, {
                borderEmphasis: next as ToggleBlockPaneBorderEmphasis,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select border emphasis" />
            </SelectTrigger>
            <SelectContent>
              {paneBorderOptions.map((option) => (
                <SelectItem key={`${pane}-border-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function PaneStyleSection({
  value,
  onChange,
}: {
  value: ToggleBlockData;
  onChange: (next: ToggleBlockData) => void;
}) {
  return (
    <EditorSection
      id="toggle-block.pane-style"
      title="Pane cards"
      mode="visual"
      role="visual"
      description="Style each pane independently without widening Toggle Block beyond two panes."
    >
      <PaneStyleFields pane="primary" title="Primary pane" value={value} onChange={onChange} />
      <PaneStyleFields pane="secondary" title="Secondary pane" value={value} onChange={onChange} />
    </EditorSection>
  );
}

function AuthoringGuidanceSection({ value }: { value: ToggleBlockData }) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      id="toggle-block.authoring"
      title="Pane authoring"
      mode="visual"
      role="summary"
      description="Keep Toggle Block focused on two views and add content through the page builder."
    >
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Add widgets to the <strong>{normalized.labels.primary}</strong> and{" "}
          <strong>{normalized.labels.secondary}</strong> panes from the page builder.
        </p>
        <p>
          Toggle Block stays intentionally limited to two panes. Use Tabs or a future task for 3+
          views.
        </p>
      </div>
    </EditorSection>
  );
}

function formatTokenLabel<T extends string>(
  options: Array<{ id: T; label: string }>,
  value: T
): string {
  return options.find((option) => option.id === value)?.label ?? value;
}

function colorDiagnostic(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "Theme default";
  if (trimmed.startsWith("var(")) return "Theme token configured";
  return trimmed;
}

function paneStyleSummary(style: NormalizedToggleBlockData["style"]["panes"][ToggleBlockStateId]) {
  return [
    `Surface: ${formatTokenLabel(paneSurfaceOptions, style.surface)}`,
    `Padding: ${formatTokenLabel(panePaddingOptions, style.padding)}`,
    `Radius: ${formatTokenLabel(paneRadiusOptions, style.radius)}`,
    `Border: ${formatTokenLabel(paneBorderOptions, style.borderEmphasis)}`,
  ].join(" · ");
}

function RuntimeSummarySection({ value, variant }: { value: ToggleBlockData; variant?: string }) {
  const normalized = normalizeValue(value);
  const defaultLabel =
    normalized.options.defaultState === "secondary"
      ? normalized.labels.secondary
      : normalized.labels.primary;

  return (
    <EditorSection
      id="toggle-block.advanced.runtime-summary"
      title="Runtime summary"
      mode="advanced"
      role="diagnostics"
      description="Read-only summary of the saved toggle behavior."
    >
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.variant"
        label="Variant"
        path="variant"
        value={variantOptions.find((option) => option.id === resolveVariant(variant ?? ""))?.label}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.defaultState"
        label="Opening pane"
        path="options.defaultState"
        value={`${defaultLabel} (${normalized.options.defaultState})`}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.motion"
        label="Motion"
        path="options.motion"
        value={motionOptions.find((option) => option.id === normalized.options.motion)?.label}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.labels"
        label="Pane labels"
        path="labels"
        value={`${normalized.labels.primary} / ${normalized.labels.secondary}`}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.helper"
        label="Helper copy"
        path="labels.helper"
        value={normalized.labels.helper || "Hidden"}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.accessibility"
        label="Accessibility announcement"
        path="labels"
        value={`${normalized.labels.ariaLabel} · suffix: ${normalized.labels.selectedSuffix}`}
      />
    </EditorSection>
  );
}

function StyleSummarySection({ value }: { value: ToggleBlockData }) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      id="toggle-block.advanced.style-summary"
      title="Style diagnostics"
      mode="advanced"
      role="diagnostics"
      description="Read-only summary of Visual-owned color and pane-card settings."
    >
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.surfaceColor"
        label="Surface color"
        path="style.surfaceColor"
        value={colorDiagnostic(value.style?.surfaceColor)}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.borderColor"
        label="Border color"
        path="style.borderColor"
        value={colorDiagnostic(value.style?.borderColor)}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.accentColor"
        label="Accent color"
        path="style.accentColor"
        value={colorDiagnostic(value.style?.accentColor)}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.accentContrastColor"
        label="Accent contrast color"
        path="style.accentContrastColor"
        value={colorDiagnostic(value.style?.accentContrastColor)}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.primaryPane"
        label="Primary pane card"
        path="style.panes.primary"
        value={paneStyleSummary(normalized.style.panes.primary)}
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.secondaryPane"
        label="Secondary pane card"
        path="style.panes.secondary"
        value={paneStyleSummary(normalized.style.panes.secondary)}
      />
    </EditorSection>
  );
}

function ContractSummarySection() {
  return (
    <EditorSection
      id="toggle-block.advanced.contract-summary"
      title="Support summary"
      mode="advanced"
      role="summary"
      description="Diagnostics only. Daily editing stays in Visual."
    >
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.scope"
        label="Pane scope"
        path="slots.primary"
        value="Fixed two-pane widget: primary and secondary slots"
      />
      <ReadonlyWidgetSummaryRow
        id="toggle-block.advanced.contract"
        label="Editor contract"
        path="editorContract"
        value="Wizard seeds setup, Visual owns daily editing, Advanced is read-only."
      />
    </EditorSection>
  );
}

export function ToggleBlockWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ToggleBlockData>) {
  return (
    <div className="space-y-4">
      <EditorSection
        id="toggle-block.variant"
        title="Step 1: Variant"
        mode="wizard"
        role="setup"
        description="Pick the toggle surface that matches the page rhythm."
      >
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <LabelsSection
        value={value}
        onChange={onChange}
        sectionId="toggle-block.labels.step"
        title="Step 2: Labels"
        mode="wizard"
        role="setup"
        description="Name both views and decide whether helper copy is visible."
      />
      <StartingPaneSection
        value={value}
        onChange={onChange}
        sectionId="toggle-block.starting-pane.step"
        title="Step 3: Starting pane"
        mode="wizard"
        role="setup"
        description="Choose which pane opens first for visitors."
      />
    </div>
  );
}

export function ToggleBlockVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ToggleBlockData>) {
  return (
    <div className="space-y-4">
      <EditorSection
        id="toggle-block.variant"
        title="Variant"
        mode="visual"
        role="visual"
        description="Compare both visual surfaces with a live preview thumbnail."
      >
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <LabelsSection value={value} onChange={onChange} />
      <ExperienceSection value={value} onChange={onChange} />
      <AccessibilitySection value={value} onChange={onChange} />
      <ThemeSection value={value} onChange={onChange} />
      <PaneStyleSection value={value} onChange={onChange} />
      <AuthoringGuidanceSection value={value} />
    </div>
  );
}

export function ToggleBlockAdvancedEditor({ value, variant }: WidgetEditorProps<ToggleBlockData>) {
  return (
    <div className="space-y-4">
      <RuntimeSummarySection value={value} variant={variant} />
      <StyleSummarySection value={value} />
      <ContractSummarySection />
    </div>
  );
}
