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
  type SectionContainerWidth,
  normalizeSectionData,
  resolveSectionVariant,
  sectionDefaults,
  type SectionBorderWidth,
  type SectionData,
  type SectionElement,
  type SectionMaxWidth,
  type SectionPaddingBlock,
  type SectionPaddingInline,
  type SectionRadius,
  type SectionVariantId,
} from "../../../../widgets/core/section";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { hasClearableFieldValue } from "./ClearableFields";
import { WidgetControlRow, WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: SectionVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "default",
    label: "Default",
    description: "Balanced section wrapper for most page groups.",
  },
  {
    id: "contained",
    label: "Contained",
    description: "Compact panel-style section with stronger framing.",
  },
  {
    id: "bleed",
    label: "Bleed",
    description: "Full-width section for edge-to-edge layouts.",
  },
];

const elementOptions: Array<{ id: SectionElement; label: string }> = [
  { id: "section", label: "Section" },
  { id: "div", label: "Div" },
];

const borderWidthOptions: Array<{ id: SectionBorderWidth; label: string }> = [
  { id: "0", label: "0px" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const radiusOptions: Array<{ id: SectionRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
  { id: "2xl", label: "2XL" },
];

const containerWidthOptions: Array<{ id: SectionContainerWidth; label: string }> = [
  { id: "content", label: "Content width" },
  { id: "wide", label: "Wide" },
  { id: "full", label: "Full width" },
];

const maxWidthOptions: Array<{ id: SectionMaxWidth; label: string }> = [
  { id: "none", label: "No max width" },
  { id: "4xl", label: "4XL" },
  { id: "5xl", label: "5XL" },
  { id: "6xl", label: "6XL" },
  { id: "7xl", label: "7XL" },
];

const paddingBlockOptions: Array<{ id: SectionPaddingBlock; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
];

const paddingInlineOptions: Array<{ id: SectionPaddingInline; label: string }> = [
  { id: "none", label: "No side padding" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type HeadingData = NonNullable<SectionData["heading"]>;
type LayoutData = NonNullable<SectionData["layout"]>;
type SemanticsData = NonNullable<SectionData["semantics"]>;
type StyleData = NonNullable<SectionData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

const clampOpacity = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
};

const clampAngle = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 180;
  return Math.max(0, Math.min(360, Math.round(value ?? 180)));
};

function normalizeValue(value: SectionData): SectionData {
  return normalizeSectionData(value);
}

function VariantCards({
  value,
  onChange,
}: {
  value: SectionVariantId;
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
  id,
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
  onClear,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  return (
    <WidgetControlRow
      id={id}
      label={label}
      actions={
        onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!hasClearableFieldValue(value)}
          >
            Clear
          </Button>
        ) : null
      }
    >
      {(fieldProps) => (
        <div className="grid grid-cols-[2.5rem_1fr] gap-2">
          <Input
            type="color"
            value={resolvePickerColor(value, pickerFallback)}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 w-10 p-1"
            aria-labelledby={fieldProps["aria-labelledby"]}
            aria-describedby={fieldProps["aria-describedby"]}
          />
          <Input
            id={fieldProps.id}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            aria-labelledby={fieldProps["aria-labelledby"]}
            aria-describedby={fieldProps["aria-describedby"]}
          />
        </div>
      )}
    </WidgetControlRow>
  );
}

function updateValue(
  value: SectionData,
  onChange: (next: SectionData) => void,
  updater: (current: SectionData) => SectionData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeading(
  value: SectionData,
  onChange: (next: SectionData) => void,
  patch: Partial<HeadingData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    heading: {
      ...current.heading,
      ...patch,
    },
  }));
}

function updateSemantics(
  value: SectionData,
  onChange: (next: SectionData) => void,
  patch: Partial<SemanticsData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    semantics: {
      ...current.semantics,
      ...patch,
    },
  }));
}

function updateLayout(
  value: SectionData,
  onChange: (next: SectionData) => void,
  patch: Partial<LayoutData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function updateStyle(
  value: SectionData,
  onChange: (next: SectionData) => void,
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

function clearStyleField(
  value: SectionData,
  onChange: (next: SectionData) => void,
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

function DiagnosticsSnapshot({ value }: { value: SectionData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function SectionWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<SectionData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <WidgetEditorSection
        id="section.wizard"
        title="Section setup"
        description="Pick a safe starting layout and heading for this section."
      >
        <WidgetControlRow id="section.wizard.variant" label="Section layout">
          {(fieldProps) => (
            <Select
              value={resolveSectionVariant(variant)}
              onValueChange={(next) => onVariantChange?.(next)}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.wizard.title" label="Section title">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={normalized.heading?.title ?? ""}
              onChange={(event) => updateHeading(value, onChange, { title: event.target.value })}
              placeholder="Section title"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.wizard.description" label="Description">
          {(fieldProps) => (
            <Textarea
              id={fieldProps.id}
              value={normalized.heading?.description ?? ""}
              onChange={(event) =>
                updateHeading(value, onChange, { description: event.target.value })
              }
              placeholder="Short context for the section"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <ColorField
          id="section.wizard.backgroundColor"
          label="Background color"
          value={normalized.style?.backgroundColor}
          onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
          onClear={() => clearStyleField(value, onChange, "backgroundColor")}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
      </WidgetEditorSection>
    </div>
  );
}

export function SectionVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<SectionData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <WidgetEditorSection
        title="Variant and structure"
        description="Choose the section wrapper style and width behavior."
        id="section.variant-structure"
      >
        <VariantCards value={resolveSectionVariant(variant)} onChange={onVariantChange} />
      </WidgetEditorSection>

      <WidgetEditorSection
        title="Heading and intro"
        description="Control heading label, title, and helper description."
        id="section.heading-intro"
      >
        <WidgetControlRow id="section.heading.label" label="Label">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={normalized.heading?.label ?? ""}
              onChange={(event) => updateHeading(value, onChange, { label: event.target.value })}
              placeholder="Section label"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.title" label="Title">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={normalized.heading?.title ?? ""}
              onChange={(event) => updateHeading(value, onChange, { title: event.target.value })}
              placeholder="Section title"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.description" label="Description">
          {(fieldProps) => (
            <Textarea
              id={fieldProps.id}
              value={normalized.heading?.description ?? ""}
              onChange={(event) =>
                updateHeading(value, onChange, { description: event.target.value })
              }
              placeholder="Supportive copy for this section"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
      </WidgetEditorSection>

      <WidgetEditorSection
        title="Semantics and anchor"
        description="Define section element type, anchor id, and accessibility label."
        id="section.semantics-anchor"
      >
        <WidgetControlRow id="section.semantics.element" label="Element">
          {(fieldProps) => (
            <Select
              value={
                normalized.semantics?.element ?? sectionDefaults.semantics?.element ?? "section"
              }
              onValueChange={(next) =>
                updateSemantics(value, onChange, { element: next as SectionElement })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select element" />
              </SelectTrigger>
              <SelectContent>
                {elementOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.semantics.anchorId" label="Anchor ID">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={normalized.semantics?.anchorId ?? ""}
              onChange={(event) =>
                updateSemantics(value, onChange, { anchorId: event.target.value })
              }
              placeholder="pricing-section"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.semantics.ariaLabel" label="Aria label">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={normalized.semantics?.ariaLabel ?? ""}
              onChange={(event) =>
                updateSemantics(value, onChange, { ariaLabel: event.target.value })
              }
              placeholder="Pricing section"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
      </WidgetEditorSection>

      <WidgetEditorSection
        title="Width and spacing"
        description="Choose bounded width and padding presets instead of raw CSS values."
        id="section.width-spacing"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WidgetControlRow id="section.layout.containerWidth" label="Container width">
            {(fieldProps) => (
              <Select
                value={
                  normalized.layout?.containerWidth ??
                  sectionDefaults.layout?.containerWidth ??
                  "content"
                }
                onValueChange={(next) =>
                  updateLayout(value, onChange, { containerWidth: next as SectionContainerWidth })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select container width" />
                </SelectTrigger>
                <SelectContent>
                  {containerWidthOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.maxWidth" label="Max width">
            {(fieldProps) => (
              <Select
                value={normalized.layout?.maxWidth ?? sectionDefaults.layout?.maxWidth ?? "6xl"}
                onValueChange={(next) =>
                  updateLayout(value, onChange, { maxWidth: next as SectionMaxWidth })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select max width" />
                </SelectTrigger>
                <SelectContent>
                  {maxWidthOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.paddingBlock" label="Vertical padding">
            {(fieldProps) => (
              <Select
                value={
                  normalized.layout?.paddingBlock ?? sectionDefaults.layout?.paddingBlock ?? "md"
                }
                onValueChange={(next) =>
                  updateLayout(value, onChange, { paddingBlock: next as SectionPaddingBlock })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select vertical padding" />
                </SelectTrigger>
                <SelectContent>
                  {paddingBlockOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.paddingInline" label="Side padding">
            {(fieldProps) => (
              <Select
                value={
                  normalized.layout?.paddingInline ?? sectionDefaults.layout?.paddingInline ?? "md"
                }
                onValueChange={(next) =>
                  updateLayout(value, onChange, { paddingInline: next as SectionPaddingInline })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select side padding" />
                </SelectTrigger>
                <SelectContent>
                  {paddingInlineOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        title="Surface and borders"
        description="Tune background, gradient, overlay, border width, and radius."
        id="section.surface-borders"
      >
        <ColorField
          id="section.style.backgroundColor"
          label="Background color"
          value={normalized.style?.backgroundColor}
          onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
          onClear={() => clearStyleField(value, onChange, "backgroundColor")}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />

        <ColorField
          id="section.style.gradientFrom"
          label="Gradient start"
          value={normalized.style?.gradientFrom}
          onChange={(next) => updateStyle(value, onChange, { gradientFrom: next })}
          placeholder="#ffffff"
          pickerFallback="#ffffff"
        />

        <ColorField
          id="section.style.gradientTo"
          label="Gradient end"
          value={normalized.style?.gradientTo}
          onChange={(next) => updateStyle(value, onChange, { gradientTo: next })}
          placeholder="#f1f5f9"
          pickerFallback="#f1f5f9"
        />

        <WidgetControlRow id="section.style.gradientAngle" label="Gradient angle">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              type="number"
              min={0}
              max={360}
              value={String(clampAngle(normalized.style?.gradientAngle))}
              onChange={(event) =>
                updateStyle(value, onChange, {
                  gradientAngle: clampAngle(Number(event.target.value)),
                })
              }
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <ColorField
          id="section.style.borderColor"
          label="Border color"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WidgetControlRow id="section.style.borderWidth" label="Border width">
            {(fieldProps) => (
              <Select
                value={normalized.style?.borderWidth ?? sectionDefaults.style?.borderWidth ?? "0"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { borderWidth: next as SectionBorderWidth })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select border width" />
                </SelectTrigger>
                <SelectContent>
                  {borderWidthOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.style.radius" label="Corner radius">
            {(fieldProps) => (
              <Select
                value={normalized.style?.radius ?? sectionDefaults.style?.radius ?? "none"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { radius: next as SectionRadius })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select radius" />
                </SelectTrigger>
                <SelectContent>
                  {radiusOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        </div>

        <ColorField
          id="section.style.overlayColor"
          label="Overlay color"
          value={normalized.style?.overlayColor}
          onChange={(next) => updateStyle(value, onChange, { overlayColor: next })}
          placeholder="#000000"
          pickerFallback="#000000"
        />

        <WidgetControlRow id="section.style.overlayOpacity" label="Overlay opacity (%)">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              type="number"
              min={0}
              max={100}
              value={String(clampOpacity(normalized.style?.overlayOpacity))}
              onChange={(event) =>
                updateStyle(value, onChange, {
                  overlayOpacity: clampOpacity(Number(event.target.value)),
                })
              }
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
      </WidgetEditorSection>
    </div>
  );
}

export function SectionAdvancedEditor({ value, onChange }: WidgetEditorProps<SectionData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <WidgetEditorSection
        title="Technical tokens"
        description="Fine-grained values for semantics and surface tokens."
        id="section.technical-tokens"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WidgetControlRow id="section.advanced.anchorId" label="Anchor ID">
            {(fieldProps) => (
              <Input
                id={fieldProps.id}
                value={normalized.semantics?.anchorId ?? ""}
                onChange={(event) =>
                  updateSemantics(value, onChange, { anchorId: event.target.value })
                }
                placeholder="section-anchor"
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.advanced.ariaLabel" label="Aria label">
            {(fieldProps) => (
              <Input
                id={fieldProps.id}
                value={normalized.semantics?.ariaLabel ?? ""}
                onChange={(event) =>
                  updateSemantics(value, onChange, { ariaLabel: event.target.value })
                }
                placeholder="Descriptive section label"
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
            )}
          </WidgetControlRow>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WidgetControlRow id="section.advanced.gradientAngle" label="Gradient angle">
            {(fieldProps) => (
              <Input
                id={fieldProps.id}
                type="number"
                min={0}
                max={360}
                value={String(clampAngle(normalized.style?.gradientAngle))}
                onChange={(event) =>
                  updateStyle(value, onChange, {
                    gradientAngle: clampAngle(Number(event.target.value)),
                  })
                }
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.advanced.overlayOpacity" label="Overlay opacity">
            {(fieldProps) => (
              <Input
                id={fieldProps.id}
                type="number"
                min={0}
                max={100}
                value={String(clampOpacity(normalized.style?.overlayOpacity))}
                onChange={(event) =>
                  updateStyle(value, onChange, {
                    overlayOpacity: clampOpacity(Number(event.target.value)),
                  })
                }
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
            )}
          </WidgetControlRow>
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        title="Raw payload snapshot"
        description="Runtime-oriented JSON view of normalized data."
        id="section.raw-payload"
      >
        <DiagnosticsSnapshot value={normalized} />
      </WidgetEditorSection>
    </div>
  );
}
