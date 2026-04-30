import { type ReactNode } from "react";

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
  ctaBannerDefaults,
  normalizeCtaBannerData,
  resolveCtaBannerVariant,
  type CtaBannerBorderWidth,
  type CtaBannerData,
  type CtaBannerPadding,
  type CtaBannerRadius,
  type CtaBannerVariantId,
} from "../../../../widgets/core/ctaBanner";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";

const variantOptions: Array<{
  id: CtaBannerVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "centered",
    label: "Centered",
    description: "Centered copy and actions.",
  },
  {
    id: "split",
    label: "Split",
    description: "Copy on left, actions on right.",
  },
  {
    id: "with-badge",
    label: "With Badge",
    description: "Highlights badge above CTA heading.",
  },
];

const borderWidthOptions: Array<{ id: CtaBannerBorderWidth; label: string }> = [
  { id: "0", label: "0px" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const radiusOptions: Array<{ id: CtaBannerRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
  { id: "2xl", label: "2XL" },
];

const paddingOptions: Array<{ id: CtaBannerPadding; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
];

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type ContentData = NonNullable<CtaBannerData["content"]>;
type ActionsData = NonNullable<CtaBannerData["actions"]>;
type StyleData = NonNullable<CtaBannerData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function normalizeValue(value: CtaBannerData): CtaBannerData {
  return normalizeCtaBannerData(value);
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
  value: CtaBannerVariantId;
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
  onClear,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
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
  value: CtaBannerData,
  onChange: (next: CtaBannerData) => void,
  updater: (current: CtaBannerData) => CtaBannerData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateContent(
  value: CtaBannerData,
  onChange: (next: CtaBannerData) => void,
  patch: Partial<ContentData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    content: {
      ...current.content,
      ...patch,
    },
  }));
}

function updateActions(
  value: CtaBannerData,
  onChange: (next: CtaBannerData) => void,
  patch: Partial<ActionsData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    actions: {
      ...current.actions,
      ...patch,
    },
  }));
}

function updateStyle(
  value: CtaBannerData,
  onChange: (next: CtaBannerData) => void,
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
  value: CtaBannerData,
  onChange: (next: CtaBannerData) => void,
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

function DiagnosticsSnapshot({ value }: { value: CtaBannerData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function CtaBannerWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CtaBannerData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Banner layout</p>
        <Select
          value={resolveCtaBannerVariant(variant)}
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
        <p className="text-sm font-medium">Headline</p>
        <Input
          value={normalized.content?.title ?? ""}
          onChange={(event) => updateContent(value, onChange, { title: event.target.value })}
          placeholder="Ready to launch your next campaign?"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Primary CTA label</p>
        <Input
          value={normalized.actions?.primaryCta?.label ?? ""}
          onChange={(event) =>
            updateActions(value, onChange, {
              primaryCta: {
                ...normalized.actions?.primaryCta,
                label: event.target.value,
              },
            })
          }
          placeholder="Get started"
        />
      </div>
    </div>
  );
}

export function CtaBannerVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CtaBannerData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout structure"
        description="Choose CTA layout variant for this conversion strip."
      >
        <VariantCards value={resolveCtaBannerVariant(variant)} onChange={onVariantChange} />
      </EditorSection>

      <EditorSection title="Content copy" description="Edit badge, title, and support line.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Badge</p>
          <Input
            value={normalized.content?.badge ?? ""}
            onChange={(event) => updateContent(value, onChange, { badge: event.target.value })}
            placeholder="Limited offer"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.content?.title ?? ""}
            onChange={(event) => updateContent(value, onChange, { title: event.target.value })}
            placeholder="Ready to launch your next campaign?"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.content?.description ?? ""}
            onChange={(event) =>
              updateContent(value, onChange, { description: event.target.value })
            }
            placeholder="Use reusable sections and publish faster."
          />
        </div>
      </EditorSection>

      <EditorSection title="Actions" description="Configure primary and secondary CTA buttons.">
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-semibold">Primary CTA</p>
          <Input
            value={normalized.actions?.primaryCta?.label ?? ""}
            onChange={(event) =>
              updateActions(value, onChange, {
                primaryCta: {
                  ...normalized.actions?.primaryCta,
                  label: event.target.value,
                },
              })
            }
            placeholder="Get started"
          />
          <Input
            value={normalized.actions?.primaryCta?.href ?? ""}
            onChange={(event) =>
              updateActions(value, onChange, {
                primaryCta: {
                  ...normalized.actions?.primaryCta,
                  href: event.target.value,
                },
              })
            }
            placeholder="#"
          />
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-semibold">Secondary CTA</p>
          <Input
            value={normalized.actions?.secondaryCta?.label ?? ""}
            onChange={(event) =>
              updateActions(value, onChange, {
                secondaryCta: {
                  ...normalized.actions?.secondaryCta,
                  label: event.target.value,
                },
              })
            }
            placeholder="Contact sales"
          />
          <Input
            value={normalized.actions?.secondaryCta?.href ?? ""}
            onChange={(event) =>
              updateActions(value, onChange, {
                secondaryCta: {
                  ...normalized.actions?.secondaryCta,
                  href: event.target.value,
                },
              })
            }
            placeholder="#"
          />
        </div>
      </EditorSection>

      <EditorSection title="Colors and button styles" description="Set content and button palette.">
        <ColorField
          label="Background"
          value={normalized.style?.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          onClear={() => clearStyleField(value, onChange, "background")}
          placeholder="var(--color-surface)"
          pickerFallback="#f8fafc"
        />
        <ColorField
          label="Text color"
          value={normalized.style?.text}
          onChange={(next) => updateStyle(value, onChange, { text: next })}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />
        <ColorField
          label="Badge background"
          value={normalized.style?.badgeBackground}
          onChange={(next) => updateStyle(value, onChange, { badgeBackground: next })}
          onClear={() => clearStyleField(value, onChange, "badgeBackground")}
          placeholder="var(--color-primary)"
          pickerFallback="#1d4ed8"
        />
        <ColorField
          label="Badge text"
          value={normalized.style?.badgeText}
          onChange={(next) => updateStyle(value, onChange, { badgeText: next })}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />
        <ColorField
          label="Primary button background"
          value={normalized.style?.primaryButtonBg}
          onChange={(next) => updateStyle(value, onChange, { primaryButtonBg: next })}
          onClear={() => clearStyleField(value, onChange, "primaryButtonBg")}
          placeholder="var(--color-primary)"
          pickerFallback="#1d4ed8"
        />
        <ColorField
          label="Primary button text"
          value={normalized.style?.primaryButtonText}
          onChange={(next) => updateStyle(value, onChange, { primaryButtonText: next })}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />
        <ColorField
          label="Secondary button text"
          value={normalized.style?.secondaryButtonText}
          onChange={(next) => updateStyle(value, onChange, { secondaryButtonText: next })}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />
        <ColorField
          label="Secondary button background"
          value={normalized.style?.secondaryButtonBg}
          onChange={(next) => updateStyle(value, onChange, { secondaryButtonBg: next })}
          onClear={() => clearStyleField(value, onChange, "secondaryButtonBg")}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
      </EditorSection>

      <EditorSection
        title="Border and spacing"
        description="Adjust frame border, corner radius, and banner padding."
      >
        <ColorField
          label="Border color"
          value={normalized.style?.border}
          onChange={(next) => updateStyle(value, onChange, { border: next })}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Border width</p>
          <Select
            value={normalized.style?.borderWidth ?? "1"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { borderWidth: next as CtaBannerBorderWidth })
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
          <p className="text-sm font-medium">Radius</p>
          <Select
            value={normalized.style?.radius ?? "xl"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { radius: next as CtaBannerRadius })
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

        <div className="space-y-2">
          <p className="text-sm font-medium">Padding</p>
          <Select
            value={normalized.style?.padding ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { padding: next as CtaBannerPadding })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select padding" />
            </SelectTrigger>
            <SelectContent>
              {paddingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>
    </div>
  );
}

export function CtaBannerAdvancedEditor({ value, onChange }: WidgetEditorProps<CtaBannerData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical style tokens"
        description="Raw style token controls for integrations and fine-tuning."
      >
        <Input
          value={normalized.style?.background ?? ""}
          onChange={(event) => updateStyle(value, onChange, { background: event.target.value })}
          placeholder="background token"
        />
        <Input
          value={normalized.style?.text ?? ""}
          onChange={(event) => updateStyle(value, onChange, { text: event.target.value })}
          placeholder="text token"
        />
        <Input
          value={normalized.style?.border ?? ""}
          onChange={(event) => updateStyle(value, onChange, { border: event.target.value })}
          placeholder="border token"
        />
        <Input
          value={normalized.style?.primaryButtonBorder ?? ""}
          onChange={(event) =>
            updateStyle(value, onChange, { primaryButtonBorder: event.target.value })
          }
          placeholder="primary button border token"
        />
        <Input
          value={normalized.style?.secondaryButtonBorder ?? ""}
          onChange={(event) =>
            updateStyle(value, onChange, { secondaryButtonBorder: event.target.value })
          }
          placeholder="secondary button border token"
        />
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic fallbacks for all CTA banner fields."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(normalizeValue(value))}>
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => onChange(ctaBannerDefaults)}>
            Reset to defaults
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="Raw payload snapshot">
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}
