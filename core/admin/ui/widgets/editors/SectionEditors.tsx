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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  normalizeSectionData,
  resolveSectionVariant,
  sectionDefaults,
  type SectionBorderWidth,
  type SectionData,
  type SectionElement,
  type SectionRadius,
  type SectionVariantId,
} from "../../../../widgets/core/section";
import type { WidgetEditorProps } from "../../../../widgets/types";

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

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type HeadingData = NonNullable<SectionData["heading"]>;
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

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
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
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
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
      <div className="space-y-2">
        <p className="text-sm font-medium">Section layout</p>
        <Select
          value={resolveSectionVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
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
        <p className="text-sm font-medium">Section title</p>
        <Input
          value={normalized.heading?.title ?? ""}
          onChange={(event) => updateHeading(value, onChange, { title: event.target.value })}
          placeholder="Section title"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Description</p>
        <Textarea
          value={normalized.heading?.description ?? ""}
          onChange={(event) =>
            updateHeading(value, onChange, { description: event.target.value })
          }
          placeholder="Short context for the section"
        />
      </div>

      <ColorField
        label="Background color"
        value={normalized.style?.backgroundColor}
        onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
        placeholder="transparent"
        pickerFallback="#ffffff"
      />

      <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Regions are repeatable slots. Add or remove them in the slots panel above tabs.
      </div>
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
      <EditorSection
        title="Variant and structure"
        description="Choose the section wrapper style and width behavior."
      >
        <VariantCards value={resolveSectionVariant(variant)} onChange={onVariantChange} />
      </EditorSection>

      <EditorSection
        title="Heading and intro"
        description="Control heading label, title, and helper description."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Label</p>
          <Input
            value={normalized.heading?.label ?? ""}
            onChange={(event) => updateHeading(value, onChange, { label: event.target.value })}
            placeholder="Section label"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.heading?.title ?? ""}
            onChange={(event) => updateHeading(value, onChange, { title: event.target.value })}
            placeholder="Section title"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.heading?.description ?? ""}
            onChange={(event) =>
              updateHeading(value, onChange, { description: event.target.value })
            }
            placeholder="Supportive copy for this section"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Semantics and anchor"
        description="Define section element type, anchor id, and accessibility label."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Element</p>
          <Select
            value={normalized.semantics?.element ?? sectionDefaults.semantics?.element ?? "section"}
            onValueChange={(next) =>
              updateSemantics(value, onChange, { element: next as SectionElement })
            }
          >
            <SelectTrigger>
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
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Anchor ID</p>
          <Input
            value={normalized.semantics?.anchorId ?? ""}
            onChange={(event) =>
              updateSemantics(value, onChange, { anchorId: event.target.value })
            }
            placeholder="pricing-section"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Aria label</p>
          <Input
            value={normalized.semantics?.ariaLabel ?? ""}
            onChange={(event) =>
              updateSemantics(value, onChange, { ariaLabel: event.target.value })
            }
            placeholder="Pricing section"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Surface and borders"
        description="Tune background, gradient, overlay, border width, and radius."
      >
        <ColorField
          label="Background color"
          value={normalized.style?.backgroundColor}
          onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />

        <ColorField
          label="Gradient start"
          value={normalized.style?.gradientFrom}
          onChange={(next) => updateStyle(value, onChange, { gradientFrom: next })}
          placeholder="#ffffff"
          pickerFallback="#ffffff"
        />

        <ColorField
          label="Gradient end"
          value={normalized.style?.gradientTo}
          onChange={(next) => updateStyle(value, onChange, { gradientTo: next })}
          placeholder="#f1f5f9"
          pickerFallback="#f1f5f9"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Gradient angle</p>
          <Input
            type="number"
            min={0}
            max={360}
            value={String(clampAngle(normalized.style?.gradientAngle))}
            onChange={(event) =>
              updateStyle(value, onChange, {
                gradientAngle: clampAngle(Number(event.target.value)),
              })
            }
          />
        </div>

        <ColorField
          label="Border color"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Border width</p>
            <Select
              value={normalized.style?.borderWidth ?? sectionDefaults.style?.borderWidth ?? "0"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { borderWidth: next as SectionBorderWidth })
              }
            >
              <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Corner radius</p>
            <Select
              value={normalized.style?.radius ?? sectionDefaults.style?.radius ?? "none"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { radius: next as SectionRadius })
              }
            >
              <SelectTrigger>
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
          </div>
        </div>

        <ColorField
          label="Overlay color"
          value={normalized.style?.overlayColor}
          onChange={(next) => updateStyle(value, onChange, { overlayColor: next })}
          placeholder="#000000"
          pickerFallback="#000000"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Overlay opacity (%)</p>
          <Input
            type="number"
            min={0}
            max={100}
            value={String(clampOpacity(normalized.style?.overlayOpacity))}
            onChange={(event) =>
              updateStyle(value, onChange, {
                overlayOpacity: clampOpacity(Number(event.target.value)),
              })
            }
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Regions"
        description="This widget uses repeatable region slots. Use Add/Remove controls in slots panel to shape structure."
      >
        <p className="text-xs text-muted-foreground">
          Insert dialog can place any widget inside each region slot.
        </p>
      </EditorSection>
    </div>
  );
}

export function SectionAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<SectionData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical tokens"
        description="Fine-grained values for semantics and surface tokens."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Anchor ID</p>
            <Input
              value={normalized.semantics?.anchorId ?? ""}
              onChange={(event) =>
                updateSemantics(value, onChange, { anchorId: event.target.value })
              }
              placeholder="section-anchor"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Aria label</p>
            <Input
              value={normalized.semantics?.ariaLabel ?? ""}
              onChange={(event) =>
                updateSemantics(value, onChange, { ariaLabel: event.target.value })
              }
              placeholder="Descriptive section label"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Gradient angle</p>
            <Input
              type="number"
              min={0}
              max={360}
              value={String(clampAngle(normalized.style?.gradientAngle))}
              onChange={(event) =>
                updateStyle(value, onChange, {
                  gradientAngle: clampAngle(Number(event.target.value)),
                })
              }
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Overlay opacity</p>
            <Input
              type="number"
              min={0}
              max={100}
              value={String(clampOpacity(normalized.style?.overlayOpacity))}
              onChange={(event) =>
                updateStyle(value, onChange, {
                  overlayOpacity: clampOpacity(Number(event.target.value)),
                })
              }
            />
          </div>
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
