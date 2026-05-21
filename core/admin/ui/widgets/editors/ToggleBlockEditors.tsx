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
  toggleBlockDefaults,
  type ToggleBlockData,
  type ToggleBlockVariantId,
} from "../../../../widgets/core/toggleBlock";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: ToggleBlockVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "switch",
    label: "Switch",
    description: "Compact switch-style trigger.",
  },
  {
    id: "cards",
    label: "Cards",
    description: "Larger pane cards and stronger framing.",
  },
];

function resolveVariant(variant: string): ToggleBlockVariantId {
  if (variant === "cards") return variant;
  return "switch";
}

function normalizeValue(value: ToggleBlockData): ToggleBlockData {
  return normalizeToggleBlockData(value);
}

function updateValue(
  value: ToggleBlockData,
  onChange: (next: ToggleBlockData) => void,
  updater: (current: ToggleBlockData) => ToggleBlockData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
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
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
}

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: ToggleBlockVariantId;
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

function LabelsSection({
  value,
  onChange,
}: {
  value: ToggleBlockData;
  onChange: (next: ToggleBlockData) => void;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      id="toggle-block.labels"
      title="Labels"
      description="Name both toggle states and helper copy."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary label</p>
          <Input
            value={normalized.labels?.primary ?? toggleBlockDefaults.labels?.primary ?? ""}
            onChange={(event) =>
              updateLabels(value, onChange, {
                primary: event.target.value,
              })
            }
            placeholder="View A"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Secondary label</p>
          <Input
            value={normalized.labels?.secondary ?? toggleBlockDefaults.labels?.secondary ?? ""}
            onChange={(event) =>
              updateLabels(value, onChange, {
                secondary: event.target.value,
              })
            }
            placeholder="View B"
          />
        </div>
      </div>
      <div className="space-y-2">
        <ClearableFieldHeader
          label="Helper text"
          value={normalized.labels?.helper}
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
          value={normalized.labels?.helper ?? ""}
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

function BehaviorSection({
  value,
  onChange,
}: {
  value: ToggleBlockData;
  onChange: (next: ToggleBlockData) => void;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      id="toggle-block.behavior-style"
      title="Behavior and Style"
      description="Choose default pane and visual tokens."
    >
      <div className="space-y-2">
        <p className="text-sm font-medium">Default state</p>
        <Select
          value={normalized.options?.defaultState ?? "primary"}
          onValueChange={(next) =>
            updateOptions(value, onChange, {
              defaultState: next as NonNullable<
                NonNullable<ToggleBlockData["options"]>["defaultState"]
              >,
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Surface color"
            value={normalized.style?.surfaceColor}
            onClear={() => clearStyleField(value, onChange, "surfaceColor")}
            onRestoreValue={(next) => updateStyle(value, onChange, { surfaceColor: next })}
          />
          <Input
            value={normalized.style?.surfaceColor ?? toggleBlockDefaults.style?.surfaceColor ?? ""}
            onChange={(event) =>
              updateStyle(value, onChange, {
                surfaceColor: event.target.value,
              })
            }
            placeholder="var(--color-surface)"
          />
        </div>
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Border color"
            value={normalized.style?.borderColor}
            onClear={() => clearStyleField(value, onChange, "borderColor")}
            onRestoreValue={(next) => updateStyle(value, onChange, { borderColor: next })}
          />
          <Input
            value={normalized.style?.borderColor ?? toggleBlockDefaults.style?.borderColor ?? ""}
            onChange={(event) =>
              updateStyle(value, onChange, {
                borderColor: event.target.value,
              })
            }
            placeholder="var(--color-border)"
          />
        </div>
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Accent color"
            value={normalized.style?.accentColor}
            onClear={() => clearStyleField(value, onChange, "accentColor")}
            onRestoreValue={(next) => updateStyle(value, onChange, { accentColor: next })}
          />
          <Input
            value={normalized.style?.accentColor ?? toggleBlockDefaults.style?.accentColor ?? ""}
            onChange={(event) =>
              updateStyle(value, onChange, {
                accentColor: event.target.value,
              })
            }
            placeholder="var(--color-text)"
          />
        </div>
      </div>
    </EditorSection>
  );
}

function DiagnosticsSnapshot({ value }: { value: ToggleBlockData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
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
        title="Variant"
        description="Choose toggle block style."
      >
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <LabelsSection value={value} onChange={onChange} />
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
        description="Choose toggle block style."
      >
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <LabelsSection value={value} onChange={onChange} />
      <BehaviorSection value={value} onChange={onChange} />
    </div>
  );
}

export function ToggleBlockAdvancedEditor({
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
        description="Variant and behavior tuning."
      >
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <LabelsSection value={value} onChange={onChange} />
      <BehaviorSection value={value} onChange={onChange} />
      <EditorSection
        id="toggle-block.diagnostics"
        title="Diagnostics"
        description="Normalized payload preview."
      >
        <DiagnosticsSnapshot value={normalizeValue(value)} />
      </EditorSection>
    </div>
  );
}
