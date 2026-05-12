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
  normalizeTestimonialsData,
  normalizeTestimonialsItems,
  resolveTestimonialsCountForVariant,
  resolveTestimonialsVariant,
  testimonialsDefaults,
  testimonialsItemMax,
  type TestimonialsData,
  type TestimonialsSpacing,
  type TestimonialsVariantId,
  type TestimonialItem,
} from "../../../../widgets/core/testimonials";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: TestimonialsVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "grid",
    label: "Grid",
    description: "Balanced card grid for multiple customer quotes.",
  },
  {
    id: "spotlight",
    label: "Spotlight",
    description: "Feature a primary testimonial and one supporting quote.",
  },
  {
    id: "slider-static",
    label: "Slider Static",
    description: "Horizontal strip prepared for slider-style presentation.",
  },
];

const spacingOptions: Array<{ id: TestimonialsSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const itemCountOptions = Array.from({ length: testimonialsItemMax - 1 }, (_, index) =>
  String(index + 2)
);

const ratingOptions = ["0", "1", "2", "3", "4", "5"] as const;

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type HeaderData = NonNullable<TestimonialsData["header"]>;
type StyleData = NonNullable<TestimonialsData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function normalizeValue(value: TestimonialsData): TestimonialsData {
  return normalizeTestimonialsData(value);
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
  value: TestimonialsVariantId;
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
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  updater: (current: TestimonialsData) => TestimonialsData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
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
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
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
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
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

function updateItem(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  index: number,
  patch: Partial<TestimonialItem>
) {
  updateValue(value, onChange, (current) => {
    const testimonials = normalizeTestimonialsItems(current.testimonials);
    if (!testimonials[index]) return current;

    const nextTestimonials = [...testimonials];
    nextTestimonials[index] = {
      ...nextTestimonials[index],
      ...patch,
    };

    return {
      ...current,
      testimonials: nextTestimonials,
    };
  });
}

function setTestimonialsCount(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    testimonials: normalizeTestimonialsItems(current.testimonials, count),
  }));
}

function addTestimonial(value: TestimonialsData, onChange: (next: TestimonialsData) => void) {
  updateValue(value, onChange, (current) => {
    const testimonials = normalizeTestimonialsItems(current.testimonials);
    if (testimonials.length >= testimonialsItemMax) return current;

    return {
      ...current,
      testimonials: normalizeTestimonialsItems(
        [
          ...testimonials,
          {
            quote: `Customer quote ${testimonials.length + 1}`,
            author: `Customer ${testimonials.length + 1}`,
            rating: 5,
          },
        ],
        testimonials.length + 1
      ),
    };
  });
}

function removeTestimonial(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const testimonials = normalizeTestimonialsItems(current.testimonials);
    if (testimonials.length <= 2) return current;

    const nextTestimonials = testimonials.filter((_, currentIndex) => currentIndex !== index);

    return {
      ...current,
      testimonials: normalizeTestimonialsItems(nextTestimonials, nextTestimonials.length),
    };
  });
}

function moveTestimonial(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const testimonials = normalizeTestimonialsItems(current.testimonials);
    if (toIndex < 0 || toIndex >= testimonials.length) return current;

    const nextTestimonials = [...testimonials];
    const [item] = nextTestimonials.splice(fromIndex, 1);
    if (!item) return current;
    nextTestimonials.splice(toIndex, 0, item);

    return {
      ...current,
      testimonials: nextTestimonials,
    };
  });
}

function DiagnosticsSnapshot({ value }: { value: TestimonialsData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function TestimonialsWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<TestimonialsData>) {
  const normalized = normalizeValue(value);
  const testimonials = normalizeTestimonialsItems(normalized.testimonials);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Testimonials style</p>
        <Select
          value={resolveTestimonialsVariant(variant)}
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
          value={normalized.header?.title ?? ""}
          onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
          placeholder="Trusted by teams that ship fast"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Testimonials count</p>
        <Select
          value={String(testimonials.length)}
          onValueChange={(next) => setTestimonialsCount(value, onChange, Number(next))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select count" />
          </SelectTrigger>
          <SelectContent>
            {itemCountOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Initial testimonials</p>
        {testimonials.map((testimonial, index) => (
          <div
            key={testimonial.id ?? `wizard-testimonial-${index + 1}`}
            className="space-y-2 rounded-lg border p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Testimonial {index + 1}
            </p>
            <Textarea
              value={testimonial.quote ?? ""}
              onChange={(event) =>
                updateItem(value, onChange, index, { quote: event.target.value })
              }
              placeholder="Customer quote"
            />
            <Input
              value={testimonial.author ?? ""}
              onChange={(event) =>
                updateItem(value, onChange, index, { author: event.target.value })
              }
              placeholder="Author name"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TestimonialsVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<TestimonialsData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveTestimonialsVariant(variant);
  const testimonials = normalizeTestimonialsItems(normalized.testimonials);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout structure"
        description="Choose display style and baseline spacing for testimonial cards."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Testimonials count</p>
            <Select
              value={String(testimonials.length)}
              onValueChange={(next) => setTestimonialsCount(value, onChange, Number(next))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select count" />
              </SelectTrigger>
              <SelectContent>
                {itemCountOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Card spacing</p>
            <Select
              value={normalized.style?.spacing ?? testimonialsDefaults.style?.spacing ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { spacing: next as TestimonialsSpacing })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Spacing" />
              </SelectTrigger>
              <SelectContent>
                {spacingOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Header copy"
        description="Edit section eyebrow, title, and supporting description."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Eyebrow</p>
          <Input
            value={normalized.header?.eyebrow ?? ""}
            onChange={(event) => updateHeader(value, onChange, { eyebrow: event.target.value })}
            placeholder="Customer stories"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.header?.title ?? ""}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Trusted by teams that ship fast"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.header?.description ?? ""}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Use real customer voices to build trust and reduce hesitation."
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Testimonials content and ratings"
        description="Manage quotes, author identity, source labels, and star ratings."
      >
        {testimonials.map((testimonial, index) => (
          <div
            key={testimonial.id ?? `testimonial-${index + 1}`}
            className="space-y-3 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Testimonial {index + 1}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveTestimonial(value, onChange, index, index - 1)}
                  disabled={index === 0}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveTestimonial(value, onChange, index, index + 1)}
                  disabled={index === testimonials.length - 1}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeTestimonial(value, onChange, index)}
                  disabled={testimonials.length <= 2}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Quote</p>
              <Textarea
                value={testimonial.quote ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { quote: event.target.value })
                }
                placeholder="Customer quote"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Author</p>
                <Input
                  value={testimonial.author ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { author: event.target.value })
                  }
                  placeholder="Author name"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Role</p>
                <Input
                  value={testimonial.role ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { role: event.target.value })
                  }
                  placeholder="Role or position"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Avatar URL</p>
                <Input
                  value={testimonial.avatar ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { avatar: event.target.value })
                  }
                  placeholder="https://cdn.example.com/avatar.jpg"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Source label</p>
                <Input
                  value={testimonial.sourceLabel ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { sourceLabel: event.target.value })
                  }
                  placeholder="Acme Studio"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Rating</p>
                <Select
                  value={String(testimonial.rating ?? 0)}
                  onValueChange={(next) =>
                    updateItem(value, onChange, index, { rating: Number(next) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratingOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option} / 5
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => addTestimonial(value, onChange)}
          disabled={testimonials.length >= testimonialsItemMax}
        >
          Add testimonial
        </Button>
      </EditorSection>

      <EditorSection
        title="Colors and emphasis"
        description="Control card surface, border, text, and accent color used for ratings/source labels."
      >
        <ColorField
          label="Card background"
          value={normalized.style?.cardSurface}
          onChange={(next) => updateStyle(value, onChange, { cardSurface: next })}
          onClear={() => clearStyleField(value, onChange, "cardSurface")}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />

        <ColorField
          label="Card border"
          value={normalized.style?.cardBorder}
          onChange={(next) => updateStyle(value, onChange, { cardBorder: next })}
          onClear={() => clearStyleField(value, onChange, "cardBorder")}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <ColorField
          label="Text color"
          value={normalized.style?.textColor}
          onChange={(next) => updateStyle(value, onChange, { textColor: next })}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />

        <ColorField
          label="Accent color"
          value={normalized.style?.accentColor}
          onChange={(next) => updateStyle(value, onChange, { accentColor: next })}
          placeholder="var(--color-primary)"
          pickerFallback="#1d4ed8"
        />
      </EditorSection>
    </div>
  );
}

export function TestimonialsAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<TestimonialsData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveTestimonialsVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Display tokens"
        description="Technical controls for spacing and deterministic count baselines."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Card spacing token</p>
          <Select
            value={normalized.style?.spacing ?? testimonialsDefaults.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as TestimonialsSpacing })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Spacing" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and fallback"
        description="Normalize testimonial list to variant baseline for stable runtime output."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setTestimonialsCount(
                value,
                onChange,
                resolveTestimonialsCountForVariant(resolvedVariant)
              )
            }
          >
            Normalize list to variant baseline
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => updateValue(value, onChange, (current) => current)}
          >
            Normalize full payload
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="Raw payload snapshot" description="Current normalized widget payload.">
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}
