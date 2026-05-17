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
  dividerSpaceCssValueMap,
  dividerSpaceTokens,
  normalizeDividerData,
  resolveDividerSpaceCss,
  resolveDividerVariant,
  type DividerData,
  type DividerSpaceToken,
  type DividerVariantId,
  type DividerWidthMode,
} from "../../../../widgets/core/divider";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: DividerVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "line",
    label: "Line",
    description: "Clean horizontal separator for clear section boundaries.",
  },
  {
    id: "dashed",
    label: "Dashed",
    description: "Lighter separator style for softer visual grouping.",
  },
  {
    id: "label-center",
    label: "Label center",
    description: "Line with optional centered label for contextual grouping.",
  },
];

const widthModeOptions: Array<{ id: DividerWidthMode; label: string }> = [
  { id: "full", label: "Full width" },
  { id: "container", label: "Container width" },
  { id: "custom", label: "Custom width" },
];

const thicknessOptions = Array.from({ length: 8 }, (_, index) => {
  const value = String(index + 1);
  return { id: value, label: `${value}px` };
});

const marginTokenOptions = dividerSpaceTokens.map((token) => ({
  id: token,
  label: token === "none" ? "None" : `${token} (${dividerSpaceCssValueMap[token]})`,
}));

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

const isDividerSpaceToken = (value: string): value is DividerSpaceToken =>
  dividerSpaceTokens.includes(value as DividerSpaceToken);

function normalizeValue(value: DividerData): DividerData {
  return normalizeDividerData(value);
}

function updateValue(
  value: DividerData,
  onChange: (next: DividerData) => void,
  updater: (current: DividerData) => DividerData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateData(
  value: DividerData,
  onChange: (next: DividerData) => void,
  patch: Partial<DividerData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    ...patch,
  }));
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
  value: DividerVariantId;
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
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Line color</p>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, "#e2e8f0")}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="var(--color-border)"
        />
      </div>
    </div>
  );
}

function SpacingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const token = isDividerSpaceToken(value) ? value : "custom";

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      <Select
        value={token}
        onValueChange={(next) => {
          if (next === "custom") return;
          onChange(next);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Spacing token" />
        </SelectTrigger>
        <SelectContent>
          {marginTokenOptions.map((option) => (
            <SelectItem key={`${label}-${option.id}`} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom px</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={isDividerSpaceToken(value) ? "" : value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. 32px"
      />
      <p className="text-xs text-muted-foreground">Resolved: {resolveDividerSpaceCss(value)}</p>
    </div>
  );
}

function DiagnosticsSnapshot({ value }: { value: DividerData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function DividerFields({
  value,
  onChange,
}: {
  value: DividerData;
  onChange: (next: DividerData) => void;
}) {
  const normalized = normalizeValue(value);
  const widthMode = normalized.width ?? "full";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Line thickness</p>
          <Select
            value={String(normalized.thickness ?? 1)}
            onValueChange={(next) => updateData(value, onChange, { thickness: Number(next) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Thickness" />
            </SelectTrigger>
            <SelectContent>
              {thicknessOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Width mode</p>
          <Select
            value={widthMode}
            onValueChange={(next) =>
              updateData(value, onChange, { width: next as DividerWidthMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Width mode" />
            </SelectTrigger>
            <SelectContent>
              {widthModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {widthMode === "custom" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Custom width</p>
          <Input
            value={normalized.customWidth ?? "320px"}
            onChange={(event) => updateData(value, onChange, { customWidth: event.target.value })}
            placeholder="e.g. 320px or 60%"
          />
        </div>
      ) : null}

      <ColorField
        value={normalized.color}
        onChange={(next) => updateData(value, onChange, { color: next })}
      />
    </div>
  );
}

export function DividerWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<DividerData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveDividerVariant(variant);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Divider style</p>
        <Select value={resolvedVariant} onValueChange={(next) => onVariantChange?.(next)}>
          <SelectTrigger>
            <SelectValue placeholder="Select divider style" />
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

      {resolvedVariant === "label-center" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Center label</p>
          <Input
            value={normalized.label ?? ""}
            onChange={(event) => updateData(value, onChange, { label: event.target.value })}
            placeholder="Optional label"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Line thickness</p>
        <Select
          value={String(normalized.thickness ?? 1)}
          onValueChange={(next) => updateData(value, onChange, { thickness: Number(next) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Thickness" />
          </SelectTrigger>
          <SelectContent>
            {thicknessOptions.map((option) => (
              <SelectItem key={`wizard-thickness-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function DividerVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<DividerData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveDividerVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and label"
        description="Choose divider style and optional label for center variant."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
        {resolvedVariant === "label-center" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Center label</p>
            <Input
              value={normalized.label ?? ""}
              onChange={(event) => updateData(value, onChange, { label: event.target.value })}
              placeholder="Optional label"
            />
          </div>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Line style and width"
        description="Adjust thickness, color and width behavior."
      >
        <DividerFields value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        title="Spacing around divider"
        description="Control top and bottom spacing for predictable rhythm."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SpacingField
            label="Margin top"
            value={normalized.marginTop ?? "6"}
            onChange={(next) => updateData(value, onChange, { marginTop: next })}
          />
          <SpacingField
            label="Margin bottom"
            value={normalized.marginBottom ?? "6"}
            onChange={(next) => updateData(value, onChange, { marginBottom: next })}
          />
        </div>
      </EditorSection>
    </div>
  );
}

export function DividerAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<DividerData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveDividerVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical divider tokens"
        description="Direct access to style, width and spacing fields."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Variant</p>
          <Select value={resolvedVariant} disabled onValueChange={() => undefined}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variantOptions.map((option) => (
                <SelectItem key={`advanced-variant-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Variant is controlled by visual variant cards.
          </p>
        </div>

        <DividerFields value={value} onChange={onChange} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SpacingField
            label="Margin top"
            value={normalized.marginTop ?? "6"}
            onChange={(next) => updateData(value, onChange, { marginTop: next })}
          />
          <SpacingField
            label="Margin bottom"
            value={normalized.marginBottom ?? "6"}
            onChange={(next) => updateData(value, onChange, { marginBottom: next })}
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Raw payload snapshot"
        description="Runtime-oriented JSON view of normalized data."
      >
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}
