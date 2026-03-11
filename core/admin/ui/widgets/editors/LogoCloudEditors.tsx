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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  logoCloudDefaults,
  logoCloudLogoMax,
  normalizeLogoCloudData,
  normalizeLogoCloudLogos,
  resolveLogoCloudVariant,
  type LogoCloudAlignment,
  type LogoCloudData,
  type LogoCloudGap,
  type LogoCloudHeight,
  type LogoCloudLogo,
  type LogoCloudVariantId,
} from "../../../../widgets/core/logoCloud";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions: Array<{
  id: LogoCloudVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "grid",
    label: "Grid",
    description: "Balanced logo grid layout.",
  },
  {
    id: "strip",
    label: "Strip",
    description: "Horizontal strip with wrapping logos.",
  },
  {
    id: "dense",
    label: "Dense",
    description: "High-density logo matrix.",
  },
];

const logoHeightOptions: Array<{ id: LogoCloudHeight; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const gapOptions: Array<{ id: LogoCloudGap; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const alignmentOptions: Array<{ id: LogoCloudAlignment; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
];

const logoCountOptions = Array.from({ length: logoCloudLogoMax }, (_, index) =>
  String(index + 1)
);

type HeaderData = NonNullable<LogoCloudData["header"]>;
type StyleData = NonNullable<LogoCloudData["style"]>;

function normalizeValue(value: LogoCloudData): LogoCloudData {
  return normalizeLogoCloudData(value);
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
  value: LogoCloudVariantId;
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

function updateValue(
  value: LogoCloudData,
  onChange: (next: LogoCloudData) => void,
  updater: (current: LogoCloudData) => LogoCloudData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: LogoCloudData,
  onChange: (next: LogoCloudData) => void,
  patch: Partial<HeaderData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    header: {
      ...current.header,
      ...patch,
    },
  }));
}

function updateStyle(
  value: LogoCloudData,
  onChange: (next: LogoCloudData) => void,
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

function updateLogo(
  value: LogoCloudData,
  onChange: (next: LogoCloudData) => void,
  index: number,
  patch: Partial<LogoCloudLogo>
) {
  updateValue(value, onChange, (current) => {
    const logos = normalizeLogoCloudLogos(current.logos);
    if (!logos[index]) return current;

    const nextLogos = [...logos];
    nextLogos[index] = {
      ...nextLogos[index],
      ...patch,
    };

    return {
      ...current,
      logos: nextLogos,
    };
  });
}

function setLogoCount(
  value: LogoCloudData,
  onChange: (next: LogoCloudData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    logos: normalizeLogoCloudLogos(current.logos, count),
  }));
}

function addLogo(value: LogoCloudData, onChange: (next: LogoCloudData) => void) {
  updateValue(value, onChange, (current) => {
    const logos = normalizeLogoCloudLogos(current.logos);
    if (logos.length >= logoCloudLogoMax) return current;

    return {
      ...current,
      logos: normalizeLogoCloudLogos(
        [...logos, { name: `Logo ${logos.length + 1}`, href: "#" }],
        logos.length + 1
      ),
    };
  });
}

function removeLogo(
  value: LogoCloudData,
  onChange: (next: LogoCloudData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const logos = normalizeLogoCloudLogos(current.logos);
    if (logos.length <= 1) return current;

    const nextLogos = logos.filter((_, currentIndex) => currentIndex !== index);

    return {
      ...current,
      logos: normalizeLogoCloudLogos(nextLogos, nextLogos.length),
    };
  });
}

function moveLogo(
  value: LogoCloudData,
  onChange: (next: LogoCloudData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const logos = normalizeLogoCloudLogos(current.logos);
    if (toIndex < 0 || toIndex >= logos.length) return current;

    const nextLogos = [...logos];
    const [item] = nextLogos.splice(fromIndex, 1);
    if (!item) return current;
    nextLogos.splice(toIndex, 0, item);

    return {
      ...current,
      logos: nextLogos,
    };
  });
}

function DiagnosticsSnapshot({ value }: { value: LogoCloudData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function LogoCloudWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<LogoCloudData>) {
  const normalized = normalizeValue(value);
  const header = normalized.header ?? logoCloudDefaults.header!;
  const logos = normalizeLogoCloudLogos(normalized.logos);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Logo cloud layout</p>
        <Select
          value={resolveLogoCloudVariant(variant)}
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
          value={header.title}
          onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
          placeholder="Trusted by teams worldwide"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Logo count</p>
        <Select
          value={String(logos.length)}
          onValueChange={(next) => setLogoCount(value, onChange, Number(next))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select count" />
          </SelectTrigger>
          <SelectContent>
            {logoCountOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Basic logo names</p>
        {logos.slice(0, 3).map((logo, index) => (
          <Input
            key={logo.id}
            value={logo.name}
            onChange={(event) =>
              updateLogo(value, onChange, index, { name: event.target.value })
            }
            placeholder={`Logo ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function LogoCloudVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<LogoCloudData>) {
  const normalized = normalizeValue(value);
  const header = normalized.header ?? logoCloudDefaults.header!;
  const style = normalized.style ?? logoCloudDefaults.style!;
  const logos = normalizeLogoCloudLogos(normalized.logos);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout structure"
        description="Choose logo cloud presentation and deterministic logo count."
      >
        <VariantCards value={resolveLogoCloudVariant(variant)} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Logo count</p>
          <Select
            value={String(logos.length)}
            onValueChange={(next) => setLogoCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select count" />
            </SelectTrigger>
            <SelectContent>
              {logoCountOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Header copy"
        description="Edit section title and optional helper description."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={header.title}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Trusted by teams worldwide"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={header.description}
            onChange={(event) =>
              updateHeader(value, onChange, { description: event.target.value })
            }
            placeholder="Showcase partner and client logos."
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Logos list and links"
        description="Manage logo names, image URLs, and optional target links."
      >
        {logos.map((logo, index) => (
          <div key={logo.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Logo {index + 1}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveLogo(value, onChange, index, index - 1)}
                  disabled={index === 0}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveLogo(value, onChange, index, index + 1)}
                  disabled={index === logos.length - 1}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeLogo(value, onChange, index)}
                  disabled={logos.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Name</p>
              <Input
                value={logo.name}
                onChange={(event) =>
                  updateLogo(value, onChange, index, { name: event.target.value })
                }
                placeholder={`Logo ${index + 1}`}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Image URL</p>
              <Input
                value={logo.image ?? ""}
                onChange={(event) =>
                  updateLogo(value, onChange, index, { image: event.target.value })
                }
                placeholder="https://cdn.example.com/logo.svg"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Link URL</p>
              <Input
                value={logo.href ?? ""}
                onChange={(event) =>
                  updateLogo(value, onChange, index, { href: event.target.value })
                }
                placeholder="#"
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => addLogo(value, onChange)}
          disabled={logos.length >= logoCloudLogoMax}
        >
          Add logo
        </Button>
      </EditorSection>

      <EditorSection
        title="Display style"
        description="Control logo sizing, spacing, alignment, and hover behavior."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Logo height</p>
          <Select
            value={style.logoHeight}
            onValueChange={(next) =>
              updateStyle(value, onChange, { logoHeight: next as LogoCloudHeight })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select height" />
            </SelectTrigger>
            <SelectContent>
              {logoHeightOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Gap</p>
          <Select
            value={style.gap}
            onValueChange={(next) =>
              updateStyle(value, onChange, { gap: next as LogoCloudGap })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gap" />
            </SelectTrigger>
            <SelectContent>
              {gapOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment</p>
          <Select
            value={style.alignment}
            onValueChange={(next) =>
              updateStyle(value, onChange, { alignment: next as LogoCloudAlignment })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Grayscale logos</p>
            <p className="text-xs text-muted-foreground">
              Converts logo images to grayscale at rest.
            </p>
          </div>
          <Switch
            checked={style.grayscale}
            onCheckedChange={(checked) =>
              updateStyle(value, onChange, { grayscale: Boolean(checked) })
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Colorize on hover</p>
            <p className="text-xs text-muted-foreground">
              Removes grayscale effect when hovering a logo.
            </p>
          </div>
          <Switch
            checked={style.hoverColor}
            onCheckedChange={(checked) =>
              updateStyle(value, onChange, { hoverColor: Boolean(checked) })
            }
          />
        </div>
      </EditorSection>
    </div>
  );
}

export function LogoCloudAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<LogoCloudData>) {
  const normalized = normalizeValue(value);
  const style = normalized.style ?? logoCloudDefaults.style!;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical layout tokens"
        description="Raw technical controls for rendering density and alignment."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Logo height token</p>
          <Select
            value={style.logoHeight}
            onValueChange={(next) =>
              updateStyle(value, onChange, { logoHeight: next as LogoCloudHeight })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select height" />
            </SelectTrigger>
            <SelectContent>
              {logoHeightOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Gap token</p>
          <Select
            value={style.gap}
            onValueChange={(next) =>
              updateStyle(value, onChange, { gap: next as LogoCloudGap })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gap" />
            </SelectTrigger>
            <SelectContent>
              {gapOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment token</p>
          <Select
            value={style.alignment}
            onValueChange={(next) =>
              updateStyle(value, onChange, { alignment: next as LogoCloudAlignment })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic fallback names/IDs and style defaults."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(normalizeValue(value))}>
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => onChange(logoCloudDefaults)}>
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
