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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  normalizeScreenFieldGroupData,
  type ScreenFieldGroupData,
} from "../../../../widgets/core/screenFieldGroup";
import {
  normalizeScreenFieldValueData,
  screenFieldValueBindingTargets,
  resolveScreenFieldValueVariant,
  type ScreenFieldValueData,
  type ScreenFieldValueTone,
  type ScreenFieldValueVariantId,
} from "../../../../widgets/core/screenFieldValue";
import {
  normalizeScreenRecordHeaderData,
  screenRecordHeaderBindingTargets,
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

type BindingState = "literal" | "bound" | "mixed";

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

function ModeHint({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function resolveBindingState(
  context: WidgetEditorProps<unknown>["context"],
  propPath: string | null | undefined
): BindingState {
  if (!context?.getBindingState || !propPath) return "literal";
  return context.getBindingState(propPath);
}

function BindingStateBadge({ state }: { state: BindingState }) {
  const label = state === "bound" ? "Bound" : state === "mixed" ? "Mixed" : "Literal";
  const variant = state === "literal" ? "outline" : "default";
  return <Badge variant={variant}>{label}</Badge>;
}

function BindingFriendlyTextControl({
  label,
  value,
  placeholder,
  onValueChange,
  suggestedBindingPropPath,
  context,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  onValueChange: (next: string) => void;
  suggestedBindingPropPath?: string | null;
  context?: WidgetEditorProps<unknown>["context"];
  multiline?: boolean;
  rows?: number;
}) {
  const bindingState = resolveBindingState(context, suggestedBindingPropPath);
  const canJump = Boolean(context?.jumpToBindingPropPath && suggestedBindingPropPath);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {suggestedBindingPropPath ? <BindingStateBadge state={bindingState} /> : null}
        </div>
        {canJump ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            data-binding-prop-path={suggestedBindingPropPath ?? undefined}
            onClick={() => context?.jumpToBindingPropPath?.(suggestedBindingPropPath ?? "")}
          >
            Data
          </Button>
        ) : null}
      </div>
      {multiline ? (
        <Textarea
          rows={rows}
          value={value ?? ""}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <Input
          value={value ?? ""}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
      {suggestedBindingPropPath ? (
        <p className="text-xs text-muted-foreground">
          {bindingState === "literal"
            ? "Literal value only until you map this prop in Data."
            : "This prop already has a field binding in Data."}
        </p>
      ) : null}
    </div>
  );
}

const resolveOwnedBindingPropPath = (targets: Array<{ propPath: string }>, propPath: string) =>
  targets.find((target) => target.propPath === propPath)?.propPath;

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

export function ScreenRecordHeaderWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ScreenRecordHeaderData>) {
  const normalized = normalizeScreenRecordHeaderData(value);
  const resolvedVariant = resolveScreenRecordHeaderVariant(variant);

  const update = (patch: Partial<ScreenRecordHeaderData>) =>
    onChange(normalizeScreenRecordHeaderData({ ...normalized, ...patch }));

  return (
    <div className="space-y-3">
      <ModeHint
        title="Start here"
        description="Pick the header density and shape the main record summary before fine-tuning styles."
      />
      <EditorSection title="Header Variant" description="Choose the density of the record hero.">
        <VariantCards
          value={resolvedVariant}
          options={screenHeaderVariantOptions}
          onChange={onVariantChange}
        />
      </EditorSection>
      <EditorSection title="Primary content" description="Set up the most visible fields first.">
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
      </EditorSection>
      <EditorSection
        title="Optional areas"
        description="Add secondary chrome only if this header needs it."
      >
        <Input
          value={normalized.eyebrow ?? ""}
          onChange={(event) => update({ eyebrow: event.target.value })}
          placeholder="Eyebrow"
        />
        <Input
          value={normalized.badge ?? ""}
          onChange={(event) => update({ badge: event.target.value })}
          placeholder="Badge"
        />
      </EditorSection>
    </div>
  );
}

export function ScreenRecordHeaderVisualEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<ScreenRecordHeaderData>) {
  const normalized = normalizeScreenRecordHeaderData(value);
  const update = (patch: Partial<ScreenRecordHeaderData>) =>
    onChange(normalizeScreenRecordHeaderData({ ...normalized, ...patch }));

  return (
    <div className="space-y-3">
      <ModeHint
        title="Main content"
        description="Tune the visible record copy and use Data shortcuts when a field should come from bindings."
      />
      <EditorSection
        title="Content"
        description="These controls shape the editor-facing header content."
      >
        <BindingFriendlyTextControl
          label="Eyebrow"
          value={normalized.eyebrow}
          onValueChange={(next) => update({ eyebrow: next })}
          suggestedBindingPropPath={resolveOwnedBindingPropPath(
            screenRecordHeaderBindingTargets,
            "eyebrow"
          )}
          placeholder="Eyebrow"
          context={context}
        />
        <BindingFriendlyTextControl
          label="Title"
          value={normalized.title}
          onValueChange={(next) => update({ title: next })}
          suggestedBindingPropPath={resolveOwnedBindingPropPath(
            screenRecordHeaderBindingTargets,
            "title"
          )}
          placeholder="Title"
          context={context}
        />
        <BindingFriendlyTextControl
          label="Subtitle"
          value={normalized.subtitle}
          onValueChange={(next) => update({ subtitle: next })}
          suggestedBindingPropPath={resolveOwnedBindingPropPath(
            screenRecordHeaderBindingTargets,
            "subtitle"
          )}
          placeholder="Subtitle"
          context={context}
        />
        <BindingFriendlyTextControl
          label="Description"
          value={normalized.description}
          onValueChange={(next) => update({ description: next })}
          suggestedBindingPropPath={resolveOwnedBindingPropPath(
            screenRecordHeaderBindingTargets,
            "description"
          )}
          placeholder="Description"
          context={context}
          multiline
        />
        <BindingFriendlyTextControl
          label="Badge"
          value={normalized.badge}
          onValueChange={(next) => update({ badge: next })}
          suggestedBindingPropPath={resolveOwnedBindingPropPath(
            screenRecordHeaderBindingTargets,
            "badge"
          )}
          placeholder="Badge"
          context={context}
        />
      </EditorSection>
    </div>
  );
}

export function ScreenRecordHeaderAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<ScreenRecordHeaderData>) {
  const normalized = normalizeScreenRecordHeaderData(value);
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
      <ModeHint
        title="Expert controls"
        description="Use alignment and raw surface tokens for layout polish or chrome removal."
      />
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

export function ScreenFieldValueWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ScreenFieldValueData>) {
  const normalized = normalizeScreenFieldValueData(value);
  const resolvedVariant = resolveScreenFieldValueVariant(variant);

  const update = (patch: Partial<ScreenFieldValueData>) =>
    onChange(normalizeScreenFieldValueData({ ...normalized, ...patch }));

  return (
    <div className="space-y-3">
      <ModeHint
        title="Start here"
        description="Pick the row shape and define the basic label/value pairing for this record field."
      />
      <EditorSection title="Field Variant">
        <VariantCards
          value={resolvedVariant}
          options={fieldValueVariantOptions}
          onChange={onVariantChange}
        />
      </EditorSection>
      <EditorSection title="Primary content">
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
      </EditorSection>
    </div>
  );
}

export function ScreenFieldValueVisualEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<ScreenFieldValueData>) {
  const normalized = normalizeScreenFieldValueData(value);
  const update = (patch: Partial<ScreenFieldValueData>) =>
    onChange(normalizeScreenFieldValueData({ ...normalized, ...patch }));

  return (
    <div className="space-y-3">
      <ModeHint
        title="Main content"
        description="Use Data shortcuts for bound fields and keep literal values only where the screen should override them."
      />
      <EditorSection title="Content">
        <BindingFriendlyTextControl
          label="Label"
          value={normalized.label}
          onValueChange={(next) => update({ label: next })}
          suggestedBindingPropPath={resolveOwnedBindingPropPath(
            screenFieldValueBindingTargets,
            "label"
          )}
          placeholder="Label"
          context={context}
        />
        <BindingFriendlyTextControl
          label="Value"
          value={normalized.value}
          onValueChange={(next) => update({ value: next })}
          suggestedBindingPropPath={resolveOwnedBindingPropPath(
            screenFieldValueBindingTargets,
            "value"
          )}
          placeholder="Value"
          context={context}
        />
        <BindingFriendlyTextControl
          label="Helper"
          value={normalized.helper}
          onValueChange={(next) => update({ helper: next })}
          suggestedBindingPropPath={resolveOwnedBindingPropPath(
            screenFieldValueBindingTargets,
            "helper"
          )}
          placeholder="Helper text"
          context={context}
          multiline
        />
      </EditorSection>
    </div>
  );
}

export function ScreenFieldValueAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<ScreenFieldValueData>) {
  const normalized = normalizeScreenFieldValueData(value);
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
      <ModeHint
        title="Expert controls"
        description="Adjust tone and removable surface tokens without changing the binding ownership."
      />
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

export function ScreenFieldGroupWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ScreenFieldGroupData>) {
  const normalized = normalizeScreenFieldGroupData(value);

  const update = (patch: Partial<ScreenFieldGroupData>) =>
    onChange(normalizeScreenFieldGroupData({ ...normalized, ...patch }));

  return (
    <div className="space-y-3">
      <ModeHint
        title="Start here"
        description="Pick the group treatment and define the section heading before you fine-tune chrome."
      />
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
    </div>
  );
}

export function ScreenFieldGroupVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<ScreenFieldGroupData>) {
  const normalized = normalizeScreenFieldGroupData(value);
  const update = (patch: Partial<ScreenFieldGroupData>) =>
    onChange(normalizeScreenFieldGroupData({ ...normalized, ...patch }));

  return (
    <div className="space-y-3">
      <ModeHint
        title="Main content"
        description="Use this panel for group copy and slot guidance, not low-level chrome tokens."
      />
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
      <EditorSection title="Slot guidance">
        <p className="text-sm text-muted-foreground">
          Group related `screen-field-value` widgets in the `content` slot so the selected record
          reads as one deliberate section.
        </p>
      </EditorSection>
    </div>
  );
}

export function ScreenFieldGroupAdvancedEditor({
  value,
  onChange,
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
      <ModeHint
        title="Expert controls"
        description="Tune removable panel chrome after the group structure and copy are already set."
      />
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

export function ScreenTwoColumnWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ScreenTwoColumnData>) {
  const normalized = normalizeScreenTwoColumnData(value);
  const resolvedVariant = resolveScreenTwoColumnVariant(variant);

  const update = (patch: Partial<ScreenTwoColumnData>) =>
    onChange(normalizeScreenTwoColumnData({ ...normalized, ...patch }));

  return (
    <div className="space-y-3">
      <ModeHint
        title="Start here"
        description="Choose the overall column balance and name the two regions before styling them."
      />
      <EditorSection title="Layout Variant">
        <VariantCards
          value={resolvedVariant}
          options={twoColumnVariantOptions}
          onChange={onVariantChange}
        />
      </EditorSection>
      <EditorSection title="Column labels">
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
      </EditorSection>
    </div>
  );
}

export function ScreenTwoColumnVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<ScreenTwoColumnData>) {
  const normalized = normalizeScreenTwoColumnData(value);
  const update = (patch: Partial<ScreenTwoColumnData>) =>
    onChange(normalizeScreenTwoColumnData({ ...normalized, ...patch }));

  return (
    <div className="space-y-3">
      <ModeHint
        title="Main content"
        description="Tune spacing and slot intent so editors know what belongs in each column."
      />
      <EditorSection title="Column labels">
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
      <EditorSection title="Slot guidance">
        <p className="text-sm text-muted-foreground">
          Use the left slot for the primary editable stack and the right slot for supporting fields,
          summaries, or review-only context.
        </p>
      </EditorSection>
    </div>
  );
}

export function ScreenTwoColumnAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<ScreenTwoColumnData>) {
  const normalized = normalizeScreenTwoColumnData(value);
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
      <ModeHint
        title="Expert controls"
        description="Use removable column chrome only after the content split and spacing are already settled."
      />
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
