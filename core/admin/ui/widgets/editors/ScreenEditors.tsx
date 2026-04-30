import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  normalizeScreenFieldGroupData,
  type ScreenFieldGroupData,
} from "../../../../widgets/core/screenFieldGroup";
import {
  normalizeScreenFieldValueData,
  resolveScreenFieldValueVariant,
  type ScreenFieldValueData,
  type ScreenFieldValueTone,
  type ScreenFieldValueVariantId,
} from "../../../../widgets/core/screenFieldValue";
import {
  normalizeScreenRecordHeaderData,
  resolveScreenRecordHeaderVariant,
  type ScreenRecordHeaderAlign,
  type ScreenRecordHeaderData,
  type ScreenRecordHeaderVariantId,
} from "../../../../widgets/core/screenRecordHeader";
import {
  normalizeScreenTwoColumnData,
  resolveScreenTwoColumnVariant,
  type ScreenTwoColumnData,
  type ScreenTwoColumnGap,
  type ScreenTwoColumnVariantId,
} from "../../../../widgets/core/screenTwoColumn";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function VariantCards<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string; description: string }>;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
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

function ClearableStyleInput({
  label,
  value,
  onChange,
  onClear,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear: () => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
      <Input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

const screenHeaderVariantOptions: Array<{
  id: ScreenRecordHeaderVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "card",
    label: "Card",
    description: "Hero-like admin header for the main record summary.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Tighter header for dense admin dashboards.",
  },
];

const alignOptions: Array<{ id: ScreenRecordHeaderAlign; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
];

function ScreenRecordHeaderEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ScreenRecordHeaderData>) {
  const normalized = normalizeScreenRecordHeaderData(value);
  const resolvedVariant = resolveScreenRecordHeaderVariant(variant);

  const update = (patch: Partial<ScreenRecordHeaderData>) =>
    onChange(normalizeScreenRecordHeaderData({ ...normalized, ...patch }));
  const updateStyle = (patch: Partial<NonNullable<ScreenRecordHeaderData["style"]>>) =>
    update({ style: { ...normalized.style, ...patch } });
  const clearStyle = (key: keyof NonNullable<ScreenRecordHeaderData["style"]>) => {
    const { [key]: _removed, ...nextStyle } = normalized.style ?? {};
    update({ style: Object.keys(nextStyle).length > 0 ? nextStyle : {} });
  };

  return (
    <div className="space-y-3">
      <EditorSection title="Header Variant" description="Choose the density of the record hero.">
        <VariantCards
          value={resolvedVariant}
          options={screenHeaderVariantOptions}
          onChange={onVariantChange}
        />
      </EditorSection>
      <EditorSection title="Content">
        <Input
          value={normalized.eyebrow ?? ""}
          onChange={(event) => update({ eyebrow: event.target.value })}
          placeholder="Eyebrow"
        />
        <Input
          value={normalized.title ?? ""}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="Title"
        />
        <Input
          value={normalized.subtitle ?? ""}
          onChange={(event) => update({ subtitle: event.target.value })}
          placeholder="Subtitle"
        />
        <Textarea
          rows={3}
          value={normalized.description ?? ""}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Description"
        />
        <Input
          value={normalized.badge ?? ""}
          onChange={(event) => update({ badge: event.target.value })}
          placeholder="Badge"
        />
      </EditorSection>
      <EditorSection title="Alignment">
        <Select
          value={normalized.align ?? "start"}
          onValueChange={(next) => update({ align: next as ScreenRecordHeaderAlign })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {alignOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </EditorSection>
      <EditorSection title="Surface">
        <ClearableStyleInput
          label="Frame background"
          value={normalized.style?.frameBackground}
          onChange={(next) => updateStyle({ frameBackground: next })}
          onClear={() => clearStyle("frameBackground")}
          placeholder="var(--color-bg)"
        />
        <ClearableStyleInput
          label="Frame gradient"
          value={normalized.style?.frameGradient}
          onChange={(next) => updateStyle({ frameGradient: next })}
          onClear={() => clearStyle("frameGradient")}
          placeholder="linear-gradient(...)"
        />
        <ClearableStyleInput
          label="Frame border"
          value={normalized.style?.frameBorderColor}
          onChange={(next) => updateStyle({ frameBorderColor: next })}
          onClear={() => clearStyle("frameBorderColor")}
          placeholder="var(--color-border)"
        />
        <ClearableStyleInput
          label="Badge background"
          value={normalized.style?.badgeBackground}
          onChange={(next) => updateStyle({ badgeBackground: next })}
          onClear={() => clearStyle("badgeBackground")}
          placeholder="var(--color-muted)"
        />
        <ClearableStyleInput
          label="Badge border"
          value={normalized.style?.badgeBorderColor}
          onChange={(next) => updateStyle({ badgeBorderColor: next })}
          onClear={() => clearStyle("badgeBorderColor")}
          placeholder="var(--color-border)"
        />
      </EditorSection>
    </div>
  );
}

const fieldValueVariantOptions: Array<{
  id: ScreenFieldValueVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "stacked",
    label: "Stacked",
    description: "Label above value, useful for cards and inspectors.",
  },
  {
    id: "inline",
    label: "Inline",
    description: "Label block next to the field value for compact layouts.",
  },
];

const toneOptions: Array<{ id: ScreenFieldValueTone; label: string }> = [
  { id: "default", label: "Default" },
  { id: "strong", label: "Strong" },
  { id: "muted", label: "Muted" },
];

function ScreenFieldValueEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ScreenFieldValueData>) {
  const normalized = normalizeScreenFieldValueData(value);
  const resolvedVariant = resolveScreenFieldValueVariant(variant);

  const update = (patch: Partial<ScreenFieldValueData>) =>
    onChange(normalizeScreenFieldValueData({ ...normalized, ...patch }));
  const updateStyle = (patch: Partial<NonNullable<ScreenFieldValueData["style"]>>) =>
    update({ style: { ...normalized.style, ...patch } });
  const clearStyle = (key: keyof NonNullable<ScreenFieldValueData["style"]>) => {
    const { [key]: _removed, ...nextStyle } = normalized.style ?? {};
    update({ style: Object.keys(nextStyle).length > 0 ? nextStyle : {} });
  };

  return (
    <div className="space-y-3">
      <EditorSection title="Field Variant">
        <VariantCards
          value={resolvedVariant}
          options={fieldValueVariantOptions}
          onChange={onVariantChange}
        />
      </EditorSection>
      <EditorSection title="Content">
        <Input
          value={normalized.label ?? ""}
          onChange={(event) => update({ label: event.target.value })}
          placeholder="Label"
        />
        <Input
          value={normalized.value ?? ""}
          onChange={(event) => update({ value: event.target.value })}
          placeholder="Value"
        />
        <Textarea
          rows={3}
          value={normalized.helper ?? ""}
          onChange={(event) => update({ helper: event.target.value })}
          placeholder="Helper text"
        />
      </EditorSection>
      <EditorSection title="Tone">
        <Select
          value={normalized.tone ?? "default"}
          onValueChange={(next) => update({ tone: next as ScreenFieldValueTone })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {toneOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </EditorSection>
      <EditorSection title="Surface">
        <ClearableStyleInput
          label="Frame background"
          value={normalized.style?.frameBackground}
          onChange={(next) => updateStyle({ frameBackground: next })}
          onClear={() => clearStyle("frameBackground")}
          placeholder="var(--color-bg)"
        />
        <ClearableStyleInput
          label="Frame border"
          value={normalized.style?.frameBorderColor}
          onChange={(next) => updateStyle({ frameBorderColor: next })}
          onClear={() => clearStyle("frameBorderColor")}
          placeholder="var(--color-border)"
        />
      </EditorSection>
    </div>
  );
}

const fieldGroupVariantOptions = [
  {
    id: "card",
    label: "Card",
    description: "Framed admin panel with clear separation from the canvas.",
  },
  {
    id: "subtle",
    label: "Subtle",
    description: "Lighter grouping chrome for dense admin layouts.",
  },
] as const;

function ScreenFieldGroupEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ScreenFieldGroupData>) {
  const normalized = normalizeScreenFieldGroupData(value);

  const update = (patch: Partial<ScreenFieldGroupData>) =>
    onChange(normalizeScreenFieldGroupData({ ...normalized, ...patch }));
  const updateStyle = (patch: Partial<NonNullable<ScreenFieldGroupData["style"]>>) =>
    update({ style: { ...normalized.style, ...patch } });
  const clearStyle = (key: keyof NonNullable<ScreenFieldGroupData["style"]>) => {
    const { [key]: _removed, ...nextStyle } = normalized.style ?? {};
    update({ style: Object.keys(nextStyle).length > 0 ? nextStyle : {} });
  };

  return (
    <div className="space-y-3">
      <EditorSection title="Group Variant">
        <VariantCards
          value={(variant === "subtle" ? "subtle" : "card") as "card" | "subtle"}
          options={fieldGroupVariantOptions.map((option) => ({ ...option }))}
          onChange={onVariantChange}
        />
      </EditorSection>
      <EditorSection title="Content">
        <Input
          value={normalized.title ?? ""}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="Group title"
        />
        <Textarea
          rows={3}
          value={normalized.description ?? ""}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Group description"
        />
      </EditorSection>
      <EditorSection title="Surface">
        <ClearableStyleInput
          label="Frame background"
          value={normalized.style?.frameBackground}
          onChange={(next) => updateStyle({ frameBackground: next })}
          onClear={() => clearStyle("frameBackground")}
          placeholder="var(--color-bg)"
        />
        <ClearableStyleInput
          label="Frame border"
          value={normalized.style?.frameBorderColor}
          onChange={(next) => updateStyle({ frameBorderColor: next })}
          onClear={() => clearStyle("frameBorderColor")}
          placeholder="var(--color-border)"
        />
      </EditorSection>
    </div>
  );
}

const twoColumnVariantOptions: Array<{
  id: ScreenTwoColumnVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Two equally weighted columns for broader record layouts.",
  },
  {
    id: "aside",
    label: "Aside",
    description: "Primary area with a narrower supporting sidebar.",
  },
];

const gapOptions: Array<{ id: ScreenTwoColumnGap; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

function ScreenTwoColumnEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ScreenTwoColumnData>) {
  const normalized = normalizeScreenTwoColumnData(value);
  const resolvedVariant = resolveScreenTwoColumnVariant(variant);

  const update = (patch: Partial<ScreenTwoColumnData>) =>
    onChange(normalizeScreenTwoColumnData({ ...normalized, ...patch }));
  const updateStyle = (patch: Partial<NonNullable<ScreenTwoColumnData["style"]>>) =>
    update({ style: { ...normalized.style, ...patch } });
  const clearStyle = (key: keyof NonNullable<ScreenTwoColumnData["style"]>) => {
    const { [key]: _removed, ...nextStyle } = normalized.style ?? {};
    update({ style: Object.keys(nextStyle).length > 0 ? nextStyle : {} });
  };

  return (
    <div className="space-y-3">
      <EditorSection title="Layout Variant">
        <VariantCards
          value={resolvedVariant}
          options={twoColumnVariantOptions}
          onChange={onVariantChange}
        />
      </EditorSection>
      <EditorSection title="Column Labels">
        <Input
          value={normalized.leftTitle ?? ""}
          onChange={(event) => update({ leftTitle: event.target.value })}
          placeholder="Left column label"
        />
        <Input
          value={normalized.rightTitle ?? ""}
          onChange={(event) => update({ rightTitle: event.target.value })}
          placeholder="Right column label"
        />
        <Select
          value={normalized.gap ?? "md"}
          onValueChange={(next) => update({ gap: next as ScreenTwoColumnGap })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {gapOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </EditorSection>
      <EditorSection title="Column Surface">
        <ClearableStyleInput
          label="Column background"
          value={normalized.style?.columnBackground}
          onChange={(next) => updateStyle({ columnBackground: next })}
          onClear={() => clearStyle("columnBackground")}
          placeholder="var(--color-bg)"
        />
        <ClearableStyleInput
          label="Column border"
          value={normalized.style?.columnBorderColor}
          onChange={(next) => updateStyle({ columnBorderColor: next })}
          onClear={() => clearStyle("columnBorderColor")}
          placeholder="var(--color-border)"
        />
      </EditorSection>
    </div>
  );
}

export const ScreenRecordHeaderWizardEditor = ScreenRecordHeaderEditor;
export const ScreenRecordHeaderVisualEditor = ScreenRecordHeaderEditor;
export const ScreenRecordHeaderAdvancedEditor = ScreenRecordHeaderEditor;

export const ScreenFieldValueWizardEditor = ScreenFieldValueEditor;
export const ScreenFieldValueVisualEditor = ScreenFieldValueEditor;
export const ScreenFieldValueAdvancedEditor = ScreenFieldValueEditor;

export const ScreenFieldGroupWizardEditor = ScreenFieldGroupEditor;
export const ScreenFieldGroupVisualEditor = ScreenFieldGroupEditor;
export const ScreenFieldGroupAdvancedEditor = ScreenFieldGroupEditor;

export const ScreenTwoColumnWizardEditor = ScreenTwoColumnEditor;
export const ScreenTwoColumnVisualEditor = ScreenTwoColumnEditor;
export const ScreenTwoColumnAdvancedEditor = ScreenTwoColumnEditor;
