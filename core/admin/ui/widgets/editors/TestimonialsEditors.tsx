import { useState, type ReactNode } from "react";

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
import { listMediaCached } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { PostRichTextAdapter } from "@/ui/posts/editor/richtext/PostRichTextAdapter";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { cn } from "@/lib/utils";

import {
  isValidTestimonialsAvatarUrl,
  isValidTestimonialsBackgroundImageUrl,
  isValidTestimonialsCtaHref,
  normalizeTestimonialsCount,
  normalizeTestimonialsData,
  normalizeTestimonialsItems,
  resolveTestimonialsCountForVariant,
  resolveTestimonialsVariant,
  testimonialsDefaults,
  testimonialsItemMax,
  testimonialsPageSizeMax,
  testimonialsPageSizeMin,
  type TestimonialsBackgroundTone,
  type TestimonialsCardBorderWidth,
  type TestimonialsCardRadius,
  type TestimonialsCtaStyle,
  type TestimonialsCtaTarget,
  type TestimonialsData,
  type TestimonialsHeaderAlign,
  type TestimonialsPaginationMode,
  type TestimonialsRatingDisplay,
  type TestimonialsSectionGradient,
  type TestimonialsSliderNavigation,
  type TestimonialsSpacing,
  type TestimonialsTitleSize,
  type TestimonialsVariantId,
  type TestimonialItem,
} from "../../../../widgets/core/testimonials";
import {
  TestimonialsImportError,
  parseTestimonialsImport,
  serializeTestimonialsExport,
  type TestimonialsImportFormat,
} from "../../../../widgets/core/testimonialsImportExport";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ColorContrastNotice, resolveColorContrastAdvisory } from "./ClearableFields";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
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
    description: "Feature a primary testimonial while keeping supporting proof visible.",
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

const ratingOptions = ["0", "1", "2", "3", "4", "5"] as const;
const itemCountOptions = Array.from({ length: testimonialsItemMax - 1 }, (_, index) =>
  String(index + 2)
);
const pageSizeOptions = Array.from(
  { length: testimonialsPageSizeMax - testimonialsPageSizeMin + 1 },
  (_, index) => String(index + testimonialsPageSizeMin)
);

const headerAlignOptions: Array<{ id: TestimonialsHeaderAlign; label: string }> = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const titleSizeOptions: Array<{ id: TestimonialsTitleSize; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

const cardRadiusOptions: Array<{ id: TestimonialsCardRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const cardBorderWidthOptions: Array<{ id: TestimonialsCardBorderWidth; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Standard" },
  { id: "md", label: "Heavy" },
];

const sectionGradientOptions: Array<{ id: TestimonialsSectionGradient; label: string }> = [
  { id: "none", label: "None" },
  { id: "soft", label: "Soft accent" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
];

const backgroundToneOptions: Array<{ id: TestimonialsBackgroundTone; label: string }> = [
  { id: "plain", label: "Plain" },
  { id: "soft", label: "Soft" },
  { id: "contrast", label: "Contrast" },
];

const sliderNavigationOptions: Array<{ id: TestimonialsSliderNavigation; label: string }> = [
  { id: "none", label: "None" },
  { id: "dots", label: "Dots" },
];

const ratingDisplayOptions: Array<{ id: TestimonialsRatingDisplay; label: string }> = [
  { id: "hide-empty", label: "Hide empty" },
  { id: "label-empty", label: "No rating label" },
  { id: "stars", label: "Show empty stars" },
];

const paginationModeOptions: Array<{ id: TestimonialsPaginationMode; label: string }> = [
  { id: "none", label: "No pagination" },
  { id: "load-more", label: "Load more" },
];

const ctaTargetOptions: Array<{ id: TestimonialsCtaTarget; label: string }> = [
  { id: "same-tab", label: "Same tab" },
  { id: "new-tab", label: "New tab" },
];

const ctaStyleOptions: Array<{ id: TestimonialsCtaStyle; label: string }> = [
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "link", label: "Link" },
];

type HeaderData = NonNullable<TestimonialsData["header"]>;
type StyleData = NonNullable<TestimonialsData["style"]>;
type CtaData = NonNullable<TestimonialsData["cta"]>;
type LayoutData = NonNullable<TestimonialsData["layout"]>;
type BehaviorData = NonNullable<TestimonialsData["behavior"]>;
type PaginationData = NonNullable<TestimonialsData["pagination"]>;
type MediaPickerChange =
  | { kind: "select"; assetId: string }
  | { kind: "clear" }
  | { kind: "invalid" };

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
    <SharedColorControl
      label={label}
      value={value}
      onChange={onChange}
      onClear={onClear}
      placeholder={placeholder}
      pickerFallback={pickerFallback}
    />
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

function updateCta(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  patch: Partial<CtaData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    cta: {
      ...current.cta,
      ...patch,
    },
  }));
}

function updateLayout(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
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

function updateBehavior(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  patch: Partial<BehaviorData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    behavior: {
      ...current.behavior,
      ...patch,
    },
  }));
}

function updatePagination(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  patch: Partial<PaginationData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    pagination: {
      ...current.pagination,
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

function resolveItemRowKey(item: TestimonialItem, index: number) {
  return item.id?.trim() || `testimonial-${index + 1}`;
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

function updateItemById(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  itemId: string,
  patch: Partial<TestimonialItem>
) {
  updateValue(value, onChange, (current) => {
    const testimonials = normalizeTestimonialsItems(current.testimonials);
    const index = testimonials.findIndex((item) => item.id === itemId);
    if (index < 0) return current;

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
  updateValue(value, onChange, (current) => {
    const nextTestimonials = normalizeTestimonialsItems(current.testimonials, count);
    const nextSpotlightId =
      current.layout?.spotlightItemId &&
      nextTestimonials.some((item) => item.id === current.layout?.spotlightItemId)
        ? current.layout?.spotlightItemId
        : nextTestimonials[0]?.id;

    return {
      ...current,
      testimonials: nextTestimonials,
      layout: {
        ...current.layout,
        spotlightItemId: nextSpotlightId,
      },
    };
  });
}

function addTestimonial(value: TestimonialsData, onChange: (next: TestimonialsData) => void) {
  updateValue(value, onChange, (current) => {
    const testimonials = normalizeTestimonialsItems(current.testimonials);
    if (testimonials.length >= testimonialsItemMax) return current;

    const nextTestimonials = normalizeTestimonialsItems(
      [
        ...testimonials,
        {
          quote: `Customer quote ${testimonials.length + 1}`,
          author: `Customer ${testimonials.length + 1}`,
          rating: 5,
        },
      ],
      testimonials.length + 1
    );

    return {
      ...current,
      testimonials: nextTestimonials,
      layout: {
        ...current.layout,
        spotlightItemId: current.layout?.spotlightItemId ?? nextTestimonials[0]?.id,
      },
    };
  });
}

function removeTestimonialByIndex(
  value: TestimonialsData,
  onChange: (next: TestimonialsData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const testimonials = normalizeTestimonialsItems(current.testimonials);
    if (testimonials.length <= 2) return current;

    const nextTestimonials = testimonials.filter((_, currentIndex) => currentIndex !== index);
    const normalizedTestimonials = normalizeTestimonialsItems(
      nextTestimonials,
      nextTestimonials.length
    );
    const nextSpotlightId =
      current.layout?.spotlightItemId &&
      normalizedTestimonials.some((item) => item.id === current.layout?.spotlightItemId)
        ? current.layout?.spotlightItemId
        : normalizedTestimonials[0]?.id;

    return {
      ...current,
      testimonials: normalizedTestimonials,
      layout: {
        ...current.layout,
        spotlightItemId: nextSpotlightId,
      },
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

function buildVariantSyncedTestimonialsValue(
  value: TestimonialsData,
  nextVariant: string
): TestimonialsData {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveTestimonialsVariant(nextVariant);
  const nextCount = resolveTestimonialsCountForVariant(resolvedVariant);
  const nextTestimonials = normalizeTestimonialsItems(normalized.testimonials, nextCount);
  const spotlightItemId = nextTestimonials.some(
    (item) => item.id === normalized.layout?.spotlightItemId
  )
    ? normalized.layout?.spotlightItemId
    : nextTestimonials[0]?.id;

  return {
    ...normalized,
    testimonials: nextTestimonials,
    layout: {
      ...normalized.layout,
      spotlightItemId,
    },
  };
}

function resolveMediaPickerChange(value: unknown): MediaPickerChange {
  if (value === null) return { kind: "clear" };
  if (typeof value === "string" && value.trim().length > 0) {
    return { kind: "select", assetId: value.trim() };
  }
  return { kind: "invalid" };
}

function getAvatarFeedback(value: string | undefined) {
  if (!(value ?? "").trim()) return null;
  if (isValidTestimonialsAvatarUrl(value)) return null;
  return "Saved avatar image is not public-safe and will not render. Clear it or pick a Media Library image.";
}

function getBackgroundImageFeedback(value: string | undefined) {
  if (!(value ?? "").trim()) return null;
  if (isValidTestimonialsBackgroundImageUrl(value)) return null;
  return "Saved background image is not public-safe and will not render. Clear it or pick a Media Library image.";
}

function getCtaHrefFeedback(value: string | undefined) {
  if (!(value ?? "").trim()) return null;
  if (isValidTestimonialsCtaHref(value)) return null;
  return "Use a relative path, hash, or full http/https URL. Unsafe CTA links are ignored publicly.";
}

function resolveAvatarInputValue(
  rowKey: string,
  avatarInputValues: Record<string, string>,
  avatar: string | undefined
) {
  return Object.prototype.hasOwnProperty.call(avatarInputValues, rowKey)
    ? (avatarInputValues[rowKey] ?? "")
    : (avatar ?? "");
}

function DiagnosticsSnapshot({ value }: { value: TestimonialsData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function FieldNote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function AvatarPickerField({
  label,
  avatarValue,
  rowKey,
  mediaPickerValue,
  mediaError,
  onClear,
  onAssetChange,
}: {
  label: string;
  avatarValue: string;
  rowKey: string;
  mediaPickerValue: string | null;
  mediaError?: string;
  onClear: () => void;
  onAssetChange: (next: unknown) => void;
}) {
  const feedback = getAvatarFeedback(avatarValue);
  const hasAvatar = avatarValue.trim().length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Button type="button" variant="outline" size="sm" onClick={onClear} disabled={!hasAvatar}>
          Clear avatar
        </Button>
      </div>
      <div data-testimonials-avatar-picker={rowKey}>
        <MediaPicker
          value={mediaPickerValue}
          onChange={onAssetChange}
          multiple={false}
          accept={["image/*"]}
        />
      </div>
      {hasAvatar ? (
        <p className="rounded-md border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          An avatar image is already configured. Pick an image from the Media Library to replace it.
        </p>
      ) : null}
      <FieldNote>
        Pick an avatar image from the Media Library. Existing external avatars stay read-only.
      </FieldNote>
      {feedback ? <p className="text-xs text-amber-700">{feedback}</p> : null}
      {mediaError ? <p className="text-xs text-destructive">{mediaError}</p> : null}
    </div>
  );
}

function TestimonialContentCard({
  value,
  onChange,
  variant,
  testimonial,
  index,
  testimonials,
  avatarValue,
  selectedAvatarMediaIds,
  mediaPickerErrorsByRowKey,
  onAvatarAssetChange,
  onClearAvatar,
  onRequestRemove,
}: {
  value: TestimonialsData;
  onChange: (next: TestimonialsData) => void;
  variant: TestimonialsVariantId;
  testimonial: TestimonialItem;
  index: number;
  testimonials: TestimonialItem[];
  avatarValue: string;
  selectedAvatarMediaIds: Record<string, string | null>;
  mediaPickerErrorsByRowKey: Record<string, string>;
  onAvatarAssetChange: (testimonialId: string, index: number, nextValue: unknown) => void;
  onClearAvatar: (testimonialId: string, index: number) => void;
  onRequestRemove: (index: number) => void;
}) {
  const rowKey = resolveItemRowKey(testimonial, index);
  const isSpotlight = value.layout?.spotlightItemId === testimonial.id;

  return (
    <div key={rowKey} className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Testimonial {index + 1}</p>
          {variant === "spotlight" && isSpotlight ? (
            <p className="text-xs text-primary">Pinned as the spotlight testimonial.</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {variant === "spotlight" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateLayout(value, onChange, { spotlightItemId: testimonial.id })}
              disabled={isSpotlight}
            >
              {isSpotlight ? "Spotlight" : "Set spotlight"}
            </Button>
          ) : null}
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
            onClick={() => onRequestRemove(index)}
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
          onChange={(event) => updateItem(value, onChange, index, { quote: event.target.value })}
          placeholder="Customer quote"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Rich quote formatting</p>
        <PostRichTextAdapter
          value={testimonial.quoteHtml ?? ""}
          onChange={(next) => updateItem(value, onChange, index, { quoteHtml: next })}
          toolbarProfile="paragraph"
          minHeightClassName="min-h-[7rem]"
          className="bg-muted/20"
          placeholder="Optional emphasized quote with links or line breaks..."
        />
        <FieldNote>
          Rich quote HTML is sanitized before it reaches the widget runtime. Plain quote text still
          stays available as fallback.
        </FieldNote>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Author</p>
          <Input
            value={testimonial.author ?? ""}
            onChange={(event) => updateItem(value, onChange, index, { author: event.target.value })}
            placeholder="Author name"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Role</p>
          <Input
            value={testimonial.role ?? ""}
            onChange={(event) => updateItem(value, onChange, index, { role: event.target.value })}
            placeholder="Role or position"
          />
        </div>

        <AvatarPickerField
          label="Avatar image"
          avatarValue={avatarValue}
          rowKey={rowKey}
          mediaPickerValue={selectedAvatarMediaIds[rowKey] ?? null}
          mediaError={mediaPickerErrorsByRowKey[rowKey]}
          onClear={() => onClearAvatar(testimonial.id ?? rowKey, index)}
          onAssetChange={(next) => onAvatarAssetChange(testimonial.id ?? rowKey, index, next)}
        />

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
            onValueChange={(next) => updateItem(value, onChange, index, { rating: Number(next) })}
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
  );
}

export function TestimonialsWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<TestimonialsData>) {
  const normalized = normalizeValue(value);
  const testimonials = normalizeTestimonialsItems(normalized.testimonials);
  const [selectedAvatarMediaIds, setSelectedAvatarMediaIds] = useState<
    Record<string, string | null>
  >({});
  const [avatarInputValues, setAvatarInputValues] = useState<Record<string, string>>({});
  const [mediaPickerErrorsByRowKey, setMediaPickerErrorsByRowKey] = useState<
    Record<string, string>
  >({});

  const handleVariantChange = (next: string) => {
    if (!onVariantChange && !onBlockPatch) return;
    const nextValue = buildVariantSyncedTestimonialsValue(value, next);
    if (onBlockPatch) {
      onBlockPatch((current) => ({
        ...current,
        variant: next,
        data: nextValue,
      }));
      return;
    }
    onVariantChange?.(next);
    onChange(nextValue);
  };

  const setAvatarError = (rowKey: string, message?: string) => {
    setMediaPickerErrorsByRowKey((current) => {
      if (!message) {
        const { [rowKey]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [rowKey]: message };
    });
  };

  const setAvatarInputValue = (rowKey: string, nextValue?: string) => {
    setAvatarInputValues((current) => {
      if (nextValue === undefined) {
        const { [rowKey]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [rowKey]: nextValue };
    });
  };

  const handleAvatarAssetChange = async (
    testimonialId: string,
    index: number,
    nextValue: unknown
  ) => {
    const rowKey = testimonials[index]?.id ?? testimonialId;
    const change = resolveMediaPickerChange(nextValue);
    if (change.kind === "invalid") {
      setAvatarError(rowKey, `Testimonial ${index + 1}: failed to resolve selected media.`);
      return;
    }

    if (change.kind === "clear") {
      setSelectedAvatarMediaIds((current) => ({ ...current, [rowKey]: null }));
      setAvatarError(rowKey);
      setAvatarInputValue(rowKey, undefined);
      updateItemById(value, onChange, testimonialId, { avatar: undefined });
      return;
    }

    try {
      const items = await listMediaCached({ force: false });
      const selected = items.find((item) => item.id === change.assetId);
      if (!selected?.url) throw new Error("testimonials_media_not_found");
      if (
        !(selected.type === "image" || selected.mimeType.trim().toLowerCase().startsWith("image/"))
      ) {
        throw new Error("testimonials_media_unsupported");
      }
      setSelectedAvatarMediaIds((current) => ({ ...current, [rowKey]: change.assetId }));
      setAvatarError(rowKey);
      setAvatarInputValue(rowKey, undefined);
      updateItemById(value, onChange, testimonialId, { avatar: selected.url });
    } catch (error) {
      setAvatarError(
        rowKey,
        error instanceof Error && error.message === "testimonials_media_unsupported"
          ? `Testimonial ${index + 1}: selected media must be an image asset.`
          : `Testimonial ${index + 1}: failed to resolve selected media.`
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Testimonials style</p>
        <Select value={resolveTestimonialsVariant(variant)} onValueChange={handleVariantChange}>
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

      <EditorSection
        title="Section copy"
        description="Configure the headline and supporting social proof context up front."
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
          <p className="text-sm font-medium">Section title</p>
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

      <EditorSection
        title="Initial testimonials"
        description="Capture the essential author, quote, role, source, rating, and avatar fields."
      >
        {testimonials.map((testimonial, index) => {
          const rowKey = resolveItemRowKey(testimonial, index);
          const avatarValue = resolveAvatarInputValue(
            rowKey,
            avatarInputValues,
            testimonial.avatar
          );
          return (
            <div key={rowKey} className="space-y-3 rounded-lg border p-3">
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
              <Input
                value={testimonial.role ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { role: event.target.value })
                }
                placeholder="Role or position"
              />
              <Input
                value={testimonial.sourceLabel ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { sourceLabel: event.target.value })
                }
                placeholder="Acme Studio"
              />
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
              <AvatarPickerField
                label="Avatar image"
                avatarValue={avatarValue}
                rowKey={rowKey}
                mediaPickerValue={selectedAvatarMediaIds[rowKey] ?? null}
                mediaError={mediaPickerErrorsByRowKey[rowKey]}
                onClear={() => {
                  setAvatarInputValue(rowKey, undefined);
                  setSelectedAvatarMediaIds((current) => ({ ...current, [rowKey]: null }));
                  setAvatarError(rowKey);
                  updateItem(value, onChange, index, { avatar: undefined });
                }}
                onAssetChange={(next) =>
                  void handleAvatarAssetChange(testimonial.id ?? rowKey, index, next)
                }
              />
            </div>
          );
        })}
      </EditorSection>
    </div>
  );
}

export function TestimonialsVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<TestimonialsData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveTestimonialsVariant(variant);
  const testimonials = normalizeTestimonialsItems(normalized.testimonials);
  const [selectedAvatarMediaIds, setSelectedAvatarMediaIds] = useState<
    Record<string, string | null>
  >({});
  const [avatarInputValues, setAvatarInputValues] = useState<Record<string, string>>({});
  const [mediaPickerErrorsByRowKey, setMediaPickerErrorsByRowKey] = useState<
    Record<string, string>
  >({});
  const [backgroundMediaPickerValue, setBackgroundMediaPickerValue] = useState<string | null>(null);
  const [backgroundMediaError, setBackgroundMediaError] = useState<string | null>(null);
  const [pendingRemovalIndex, setPendingRemovalIndex] = useState<number | null>(null);

  const handleVariantChange = (next: string) => {
    if (!onVariantChange && !onBlockPatch) return;
    const nextValue = buildVariantSyncedTestimonialsValue(value, next);
    if (onBlockPatch) {
      onBlockPatch((current) => ({
        ...current,
        variant: next,
        data: nextValue,
      }));
      return;
    }
    onVariantChange?.(next);
    onChange(nextValue);
  };

  const setAvatarError = (rowKey: string, message?: string) => {
    setMediaPickerErrorsByRowKey((current) => {
      if (!message) {
        const { [rowKey]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [rowKey]: message };
    });
  };

  const setAvatarInputValue = (rowKey: string, nextValue?: string) => {
    setAvatarInputValues((current) => {
      if (nextValue === undefined) {
        const { [rowKey]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [rowKey]: nextValue };
    });
  };

  const handleAvatarAssetChange = async (
    testimonialId: string,
    index: number,
    nextValue: unknown
  ) => {
    const rowKey = testimonials[index]?.id ?? testimonialId;
    const change = resolveMediaPickerChange(nextValue);
    if (change.kind === "invalid") {
      setAvatarError(rowKey, `Testimonial ${index + 1}: failed to resolve selected media.`);
      return;
    }

    if (change.kind === "clear") {
      setSelectedAvatarMediaIds((current) => ({ ...current, [rowKey]: null }));
      setAvatarError(rowKey);
      setAvatarInputValue(rowKey, undefined);
      updateItemById(value, onChange, testimonialId, { avatar: undefined });
      return;
    }

    try {
      const items = await listMediaCached({ force: false });
      const selected = items.find((item) => item.id === change.assetId);
      if (!selected?.url) throw new Error("testimonials_media_not_found");
      if (
        !(selected.type === "image" || selected.mimeType.trim().toLowerCase().startsWith("image/"))
      ) {
        throw new Error("testimonials_media_unsupported");
      }
      setSelectedAvatarMediaIds((current) => ({ ...current, [rowKey]: change.assetId }));
      setAvatarError(rowKey);
      setAvatarInputValue(rowKey, undefined);
      updateItemById(value, onChange, testimonialId, { avatar: selected.url });
    } catch (error) {
      setAvatarError(
        rowKey,
        error instanceof Error && error.message === "testimonials_media_unsupported"
          ? `Testimonial ${index + 1}: selected media must be an image asset.`
          : `Testimonial ${index + 1}: failed to resolve selected media.`
      );
    }
  };

  const handleBackgroundAssetChange = async (nextValue: unknown) => {
    const change = resolveMediaPickerChange(nextValue);
    if (change.kind === "invalid") {
      setBackgroundMediaError("Failed to resolve selected background image.");
      return;
    }

    if (change.kind === "clear") {
      setBackgroundMediaPickerValue(null);
      setBackgroundMediaError(null);
      updateStyle(value, onChange, { backgroundImage: undefined });
      return;
    }

    try {
      const items = await listMediaCached({ force: false });
      const selected = items.find((item) => item.id === change.assetId);
      if (!selected?.url) throw new Error("testimonials_media_not_found");
      if (
        !(selected.type === "image" || selected.mimeType.trim().toLowerCase().startsWith("image/"))
      ) {
        throw new Error("testimonials_media_unsupported");
      }
      setBackgroundMediaPickerValue(change.assetId);
      setBackgroundMediaError(null);
      updateStyle(value, onChange, { backgroundImage: selected.url });
    } catch (error) {
      setBackgroundMediaError(
        error instanceof Error && error.message === "testimonials_media_unsupported"
          ? "Selected media must be an image asset."
          : "Failed to resolve selected background image."
      );
    }
  };

  const handleClearBackgroundImage = () => {
    setBackgroundMediaPickerValue(null);
    setBackgroundMediaError(null);
    clearStyleField(value, onChange, "backgroundImage");
  };

  const sectionTextContrast = resolveColorContrastAdvisory({
    foreground: normalized.style?.textColor,
    background: normalized.style?.cardSurface,
    fallbackBackground: "#ffffff",
  });
  const accentContrast = resolveColorContrastAdvisory({
    foreground: normalized.style?.accentColor,
    background: normalized.style?.cardSurface,
    fallbackBackground: "#ffffff",
  });

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout structure"
        description="Choose display style, baseline count, and spotlight/navigation behavior."
      >
        <VariantCards value={resolvedVariant} onChange={handleVariantChange} />

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

          <div className="space-y-2">
            <p className="text-sm font-medium">Slider navigation</p>
            <Select
              value={normalized.behavior?.sliderNavigation ?? "dots"}
              onValueChange={(next) =>
                updateBehavior(value, onChange, {
                  sliderNavigation: next as TestimonialsSliderNavigation,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Navigation" />
              </SelectTrigger>
              <SelectContent>
                {sliderNavigationOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {resolvedVariant !== "slider-static" ? (
              <FieldNote>This option only affects the slider-static variant.</FieldNote>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Rating zero display</p>
            <Select
              value={normalized.behavior?.ratingDisplay ?? "hide-empty"}
              onValueChange={(next) =>
                updateBehavior(value, onChange, {
                  ratingDisplay: next as TestimonialsRatingDisplay,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Rating display" />
              </SelectTrigger>
              <SelectContent>
                {ratingDisplayOptions.map((option) => (
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
        description="Manage quotes, author identity, source labels, ratings, avatars, and spotlight selection."
      >
        {testimonials.map((testimonial, index) => (
          <TestimonialContentCard
            key={resolveItemRowKey(testimonial, index)}
            value={value}
            onChange={onChange}
            variant={resolvedVariant}
            testimonial={testimonial}
            index={index}
            testimonials={testimonials}
            avatarValue={resolveAvatarInputValue(
              resolveItemRowKey(testimonial, index),
              avatarInputValues,
              testimonial.avatar
            )}
            selectedAvatarMediaIds={selectedAvatarMediaIds}
            mediaPickerErrorsByRowKey={mediaPickerErrorsByRowKey}
            onAvatarAssetChange={(testimonialId, itemIndex, next) =>
              void handleAvatarAssetChange(testimonialId, itemIndex, next)
            }
            onClearAvatar={(testimonialId) => {
              const rowKey = testimonialId;
              setAvatarInputValue(rowKey, undefined);
              setSelectedAvatarMediaIds((current) => ({ ...current, [rowKey]: null }));
              setAvatarError(rowKey);
              updateItemById(value, onChange, testimonialId, { avatar: undefined });
            }}
            onRequestRemove={(itemIndex) => setPendingRemovalIndex(itemIndex)}
          />
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
        title="Section surface and typography"
        description="Control section background, background media, heading alignment, and bounded card styling."
      >
        <ColorField
          label="Section background"
          value={normalized.style?.sectionBackground}
          onChange={(next) => updateStyle(value, onChange, { sectionBackground: next })}
          onClear={() => clearStyleField(value, onChange, "sectionBackground")}
          placeholder="var(--color-surface)"
          pickerFallback="#ffffff"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Background gradient</p>
            <Select
              value={normalized.style?.sectionGradient ?? "none"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  sectionGradient: next as TestimonialsSectionGradient,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gradient" />
              </SelectTrigger>
              <SelectContent>
                {sectionGradientOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Background tone</p>
            <Select
              value={normalized.style?.backgroundTone ?? "plain"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { backgroundTone: next as TestimonialsBackgroundTone })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                {backgroundToneOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Header alignment</p>
            <Select
              value={normalized.style?.headerAlign ?? "center"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { headerAlign: next as TestimonialsHeaderAlign })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Alignment" />
              </SelectTrigger>
              <SelectContent>
                {headerAlignOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Title size</p>
            <Select
              value={normalized.style?.titleSize ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { titleSize: next as TestimonialsTitleSize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Title size" />
              </SelectTrigger>
              <SelectContent>
                {titleSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Card radius</p>
            <Select
              value={normalized.style?.cardRadius ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { cardRadius: next as TestimonialsCardRadius })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Card radius" />
              </SelectTrigger>
              <SelectContent>
                {cardRadiusOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Card border width</p>
            <Select
              value={normalized.style?.cardBorderWidth ?? "sm"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  cardBorderWidth: next as TestimonialsCardBorderWidth,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Border width" />
              </SelectTrigger>
              <SelectContent>
                {cardBorderWidthOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Background image</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearBackgroundImage}
              disabled={!(normalized.style?.backgroundImage ?? "").trim()}
            >
              Clear image
            </Button>
          </div>
          <div data-testimonials-background-picker="true">
            <MediaPicker
              value={backgroundMediaPickerValue}
              onChange={(next) => {
                void handleBackgroundAssetChange(next);
              }}
              multiple={false}
              accept={["image/*"]}
            />
          </div>
          {(normalized.style?.backgroundImage ?? "").trim().length > 0 ? (
            <p className="rounded-md border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              A background image is already configured. Pick an image from the Media Library to
              replace it.
            </p>
          ) : null}
        </div>
        <FieldNote>
          Pick a background image from the Media Library. Existing external backgrounds stay
          read-only.
        </FieldNote>
        {getBackgroundImageFeedback(normalized.style?.backgroundImage) ? (
          <p className="text-xs text-amber-700">
            {getBackgroundImageFeedback(normalized.style?.backgroundImage)}
          </p>
        ) : null}
        {backgroundMediaError ? (
          <p className="text-xs text-destructive">{backgroundMediaError}</p>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Colors and emphasis"
        description="Control card surface, border, text, and accent color used for ratings and source labels."
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
          onClear={() => clearStyleField(value, onChange, "textColor")}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />

        <ColorField
          label="Accent color"
          value={normalized.style?.accentColor}
          onChange={(next) => updateStyle(value, onChange, { accentColor: next })}
          onClear={() => clearStyleField(value, onChange, "accentColor")}
          placeholder="var(--color-primary)"
          pickerFallback="#1d4ed8"
        />

        <ColorContrastNotice advisory={sectionTextContrast} label="Text contrast advisory" />
        <ColorContrastNotice advisory={accentContrast} label="Accent contrast advisory" />
      </EditorSection>

      <EditorSection
        title="CTA and conversion follow-up"
        description="Add an optional section CTA below the testimonial list with safe link handling."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">CTA visibility</p>
          <Select
            value={normalized.cta?.enabled ? "enabled" : "disabled"}
            onValueChange={(next) => updateCta(value, onChange, { enabled: next === "enabled" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="CTA visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium">CTA label</p>
            <Input
              value={normalized.cta?.label ?? ""}
              onChange={(event) => updateCta(value, onChange, { label: event.target.value })}
              placeholder="Read more stories"
            />
          </div>

          <div className="sm:col-span-2">
            <LinkDestinationField
              fieldId="testimonials-cta-destination"
              label="CTA destination"
              value={normalized.cta?.href ?? ""}
              disabled={!normalized.cta?.enabled}
              onChange={(next) => updateCta(value, onChange, { href: next })}
              feedback={getCtaHrefFeedback(normalized.cta?.href)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">CTA target</p>
            <Select
              value={normalized.cta?.target ?? "same-tab"}
              onValueChange={(next) =>
                updateCta(value, onChange, { target: next as TestimonialsCtaTarget })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                {ctaTargetOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">CTA style</p>
            <Select
              value={normalized.cta?.style ?? "secondary"}
              onValueChange={(next) =>
                updateCta(value, onChange, { style: next as TestimonialsCtaStyle })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                {ctaStyleOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <ConfirmActionDialog
        open={pendingRemovalIndex !== null}
        title="Remove testimonial"
        description={
          pendingRemovalIndex === null
            ? ""
            : `Remove testimonial ${pendingRemovalIndex + 1}? This action cannot be undone.`
        }
        confirmLabel="Remove"
        onOpenChange={(open) => {
          if (!open) setPendingRemovalIndex(null);
        }}
        onConfirm={() => {
          if (pendingRemovalIndex === null) return;
          removeTestimonialByIndex(value, onChange, pendingRemovalIndex);
          setPendingRemovalIndex(null);
        }}
      />
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
  const resolvedSpacing = normalized.style?.spacing ?? testimonialsDefaults.style?.spacing ?? "md";
  const resolvedRatingDisplay = normalized.behavior?.ratingDisplay ?? "hide-empty";
  const resolvedSliderNavigation = normalized.behavior?.sliderNavigation ?? "dots";
  const [importDraft, setImportDraft] = useState("");
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [exportText, setExportText] = useState("");
  const [exportFormat, setExportFormat] = useState<TestimonialsImportFormat>("json");

  const runImportPreview = () => {
    try {
      const result = parseTestimonialsImport(importDraft);
      setImportIssues([]);
      setImportSummary(
        `Preview ready: ${result.items.length} testimonial${result.items.length === 1 ? "" : "s"} from ${result.format.toUpperCase()}.`
      );
    } catch (error) {
      if (error instanceof TestimonialsImportError) {
        setImportSummary(null);
        setImportIssues(error.issues.map((issue) => `Row ${issue.row}: ${issue.message}`));
        return;
      }
      setImportSummary(null);
      setImportIssues(["Import preview failed."]);
    }
  };

  const applyImport = () => {
    try {
      const result = parseTestimonialsImport(importDraft);
      const nextCount = normalizeTestimonialsCount(result.items.length);
      const nextTestimonials = normalizeTestimonialsItems(result.items, nextCount);
      const nextSpotlightId = nextTestimonials.some(
        (item) => item.id === normalized.layout?.spotlightItemId
      )
        ? normalized.layout?.spotlightItemId
        : nextTestimonials[0]?.id;

      onChange(
        normalizeTestimonialsData({
          ...normalized,
          testimonials: nextTestimonials,
          layout: {
            ...normalized.layout,
            spotlightItemId: nextSpotlightId,
          },
        })
      );
      setImportIssues([]);
      setImportSummary(
        `Imported ${nextTestimonials.length} testimonial${nextTestimonials.length === 1 ? "" : "s"} from ${result.format.toUpperCase()}.`
      );
    } catch (error) {
      if (error instanceof TestimonialsImportError) {
        setImportSummary(null);
        setImportIssues(error.issues.map((issue) => `Row ${issue.row}: ${issue.message}`));
        return;
      }
      setImportSummary(null);
      setImportIssues(["Import failed."]);
    }
  };

  return (
    <div className="space-y-4">
      <EditorSection
        title="Display diagnostics"
        description="Visual owns spacing and testimonial display behavior. Advanced keeps read-only diagnostics plus pagination, normalization, and payload tools."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-3 text-sm text-muted-foreground sm:col-span-2">
            <p>
              Variant: <span className="font-medium text-foreground">{resolvedVariant}</span>
            </p>
            <p>
              Card spacing token:{" "}
              <span className="font-medium text-foreground">{resolvedSpacing}</span>
            </p>
            <p>
              Rating zero display:{" "}
              <span className="font-medium text-foreground">{resolvedRatingDisplay}</span>
            </p>
            <p>
              Slider navigation:{" "}
              <span className="font-medium text-foreground">
                {resolvedVariant === "slider-static"
                  ? resolvedSliderNavigation
                  : `${resolvedSliderNavigation} (inactive outside slider-static)`}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Pagination mode</p>
            <Select
              value={normalized.pagination?.mode ?? "none"}
              onValueChange={(next) =>
                updatePagination(value, onChange, { mode: next as TestimonialsPaginationMode })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pagination" />
              </SelectTrigger>
              <SelectContent>
                {paginationModeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Load more page size</p>
            <Select
              value={String(
                normalized.pagination?.pageSize ?? testimonialsDefaults.pagination?.pageSize ?? 6
              )}
              onValueChange={(next) =>
                updatePagination(value, onChange, { pageSize: Number(next) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium">Load more label</p>
            <Input
              value={normalized.pagination?.loadMoreLabel ?? ""}
              onChange={(event) =>
                updatePagination(value, onChange, { loadMoreLabel: event.target.value })
              }
              placeholder="Load more testimonials"
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and fallback"
        description="Normalize testimonial list to the current variant baseline or rebuild the full payload."
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
            onClick={() => onChange(normalizeTestimonialsData(value))}
          >
            Normalize full payload
          </Button>
        </div>
      </EditorSection>

      <EditorSection
        title="Import and export"
        description="Preview or apply local JSON/CSV testimonial imports, and generate normalized exports."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Import JSON or CSV</p>
          <Textarea
            value={importDraft}
            onChange={(event) => setImportDraft(event.target.value)}
            placeholder='[{"quote":"Great support","author":"Alex"}]'
            rows={8}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={runImportPreview}>
              Preview import
            </Button>
            <Button type="button" variant="outline" onClick={applyImport}>
              Apply import
            </Button>
          </div>
          {importSummary ? <p className="text-xs text-muted-foreground">{importSummary}</p> : null}
          {importIssues.length > 0 ? (
            <div className="space-y-1">
              {importIssues.map((issue) => (
                <p key={issue} className="text-xs text-destructive">
                  {issue}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Export normalized testimonials</p>
            <Select
              value={exportFormat}
              onValueChange={(next) => setExportFormat(next as TestimonialsImportFormat)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setExportText(serializeTestimonialsExport(normalized.testimonials, exportFormat))
            }
          >
            Generate export
          </Button>
          <Textarea
            value={exportText}
            readOnly
            rows={8}
            placeholder="Generated export will appear here."
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Raw payload snapshot"
        description="Use this only for technical validation while refining the data model."
      >
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}
