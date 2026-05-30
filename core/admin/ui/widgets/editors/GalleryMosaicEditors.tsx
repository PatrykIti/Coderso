import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";

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
import { listMediaCached, type MediaRecord } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { FileImage, GripVertical, Video } from "lucide-react";
import { reorderItemsById, resolveDropIndexFromPointer } from "@/ui/posts/editor/blocks/blockDnD";

import {
  describeGalleryMosaicCountReduction,
  galleryMosaicItemMax,
  normalizeGalleryMosaicData,
  normalizeGalleryMosaicItems,
  resolveGalleryMosaicItemRemovalLabel,
  resolveGalleryMosaicVariant,
  summarizeGalleryMosaicCountReduction,
  type GalleryMosaicCaptionPosition,
  type GalleryMosaicCountReductionSummary,
  type GalleryMosaicData,
  type GalleryMosaicGap,
  type GalleryMosaicInteractionMode,
  type GalleryMosaicItem,
  type GalleryMosaicLightboxZoom,
  type GalleryMosaicLayoutDensity,
  type GalleryMosaicMotionPreset,
  type GalleryMosaicItemRatio,
  type GalleryMosaicObjectPosition,
  type GalleryMosaicRadius,
  type GalleryMosaicRatio,
  type GalleryMosaicVariantId,
} from "../../../../widgets/core/galleryMosaic";
import type { WidgetEditorProps, WidgetEditorSectionRole } from "../../../../widgets/types";
import { LinkDestinationField } from "./LinkDestinationField";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const variantOptions: Array<{
  id: GalleryMosaicVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "mosaic",
    label: "Mosaic",
    description: "Asymmetric layout with highlighted lead media.",
  },
  {
    id: "uniform-grid",
    label: "Uniform Grid",
    description: "Equal tiles in a clean grid.",
  },
  {
    id: "feature-left",
    label: "Feature Left",
    description: "Large media on left with supporting items on right.",
  },
];

const ratioOptions: Array<{ id: GalleryMosaicRatio; label: string }> = [
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "3:4", label: "3:4" },
];

const gapOptions: Array<{ id: GalleryMosaicGap; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const radiusOptions: Array<{ id: GalleryMosaicRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const captionPositionOptions: Array<{
  id: GalleryMosaicCaptionPosition;
  label: string;
}> = [
  { id: "inside", label: "Inside tile" },
  { id: "below", label: "Below tile" },
  { id: "hover", label: "On hover" },
];

const objectPositionOptions: Array<{ id: GalleryMosaicObjectPosition; label: string }> = [
  { id: "center", label: "Center" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

const itemRatioOptions: Array<{ id: GalleryMosaicItemRatio; label: string }> = [
  { id: "inherit", label: "Inherit section ratio" },
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "3:4", label: "3:4" },
];

const interactionModeOptions: Array<{ id: GalleryMosaicInteractionMode; label: string }> = [
  { id: "none", label: "Static tiles" },
  { id: "lightbox", label: "Open lightbox on click" },
];

const interactionZoomOptions: Array<{ id: GalleryMosaicLightboxZoom; label: string }> = [
  { id: "fit", label: "Fit inside dialog" },
  { id: "fill", label: "Fill dialog frame" },
];

const layoutDensityOptions: Array<{ id: GalleryMosaicLayoutDensity; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "compact", label: "Compact" },
  { id: "balanced", label: "Balanced" },
  { id: "dense", label: "Dense" },
];

const motionPresetOptions: Array<{ id: GalleryMosaicMotionPreset; label: string }> = [
  { id: "none", label: "No motion" },
  { id: "fade", label: "Fade in" },
  { id: "slide-up", label: "Slide up" },
];

const itemCountOptions = Array.from({ length: galleryMosaicItemMax }, (_, index) =>
  String(index + 1)
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const rgbColorPattern =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;

type HeaderData = NonNullable<GalleryMosaicData["header"]>;
type InteractionData = NonNullable<GalleryMosaicData["interaction"]>;
type StyleData = NonNullable<GalleryMosaicData["style"]>;
type GalleryMosaicResolvedMediaType = "image" | "video" | "placeholder";
type GalleryItemPreviewState = {
  mediaType: GalleryMosaicResolvedMediaType;
  src?: string;
  label: string;
};
type PendingGalleryMosaicCountReduction = {
  nextCount: number;
  summary: GalleryMosaicCountReductionSummary;
};

const resolvePickerColor = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  if (hexColorPattern.test(value)) return value;
  const rgbMatch = value.match(rgbColorPattern);
  if (!rgbMatch) return fallback;
  const [, red, green, blue] = rgbMatch;
  const toHex = (channel: string) => Number.parseInt(channel, 10).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

function normalizeValue(value: GalleryMosaicData): GalleryMosaicData {
  return normalizeGalleryMosaicData(value);
}

function resolveGalleryMediaKind(media: Pick<MediaRecord, "mimeType"> | undefined) {
  const mimeType = media?.mimeType?.trim().toLowerCase() ?? "";
  if (mimeType.startsWith("video/")) return "video" as const;
  if (mimeType.startsWith("image/")) return "image" as const;
  return null;
}

function resolveGalleryCurrentMediaType(item: GalleryMosaicItem): GalleryMosaicResolvedMediaType {
  if (item.video?.trim()) return "video";
  if (item.image?.trim()) return "image";
  return "placeholder";
}

function resolveGalleryCurrentMediaSummary(item: GalleryMosaicItem) {
  const currentType = resolveGalleryCurrentMediaType(item);
  if (currentType === "video") {
    return item.image?.trim()
      ? {
          label: "Video",
          description: "A saved video is currently active. Clear it to switch back to the image.",
        }
      : {
          label: "Video",
          description: "A saved video is currently active for this item.",
        };
  }
  if (currentType === "image") {
    return {
      label: "Image",
      description: "A saved image is currently active for this item.",
    };
  }
  return {
    label: "Placeholder",
    description: "No image or video asset is set yet.",
  };
}

function resolveGalleryItemPreview(item: GalleryMosaicItem): GalleryItemPreviewState {
  const caption = item.caption?.trim();
  if (item.video?.trim()) {
    return {
      mediaType: "video",
      src: item.video,
      label: caption || "Video asset",
    };
  }
  if (item.image?.trim()) {
    return {
      mediaType: "image",
      src: item.image,
      label: caption || "Image asset",
    };
  }
  return {
    mediaType: "placeholder",
    label: caption || "Media item",
  };
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id?: string;
  mode?: "wizard" | "visual" | "advanced";
  role?: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection
      id={resolvedId}
      mode={mode}
      role={role}
      title={title}
      description={description}
    >
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: GalleryMosaicVariantId;
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
  onPickerChange,
  pickerFallback,
  helperText,
  onClear,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onPickerChange?: (next: string) => void;
  pickerFallback: string;
  helperText?: string;
  onClear?: () => void;
}) {
  const normalizedValue = value?.trim();
  const hasValue = Boolean(normalizedValue);
  const hasCustomValue =
    hasValue &&
    !hexColorPattern.test(normalizedValue ?? "") &&
    !rgbColorPattern.test(normalizedValue ?? "");
  const swatchColor = resolvePickerColor(value, pickerFallback);

  return (
    <WidgetControlRow
      id={id}
      label={label}
      help={helperText}
      path={id.replace("gallery-mosaic.", "")}
      actions={
        onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={!hasValue}>
            Clear
          </Button>
        ) : null
      }
    >
      {(fieldProps) => (
        <div className="space-y-3">
          <div className="grid grid-cols-[2.5rem_1fr] gap-2">
            <Input
              id={fieldProps.id}
              type="color"
              value={swatchColor}
              onChange={(event) => (onPickerChange ?? onChange)(event.target.value)}
              className="h-9 w-10 p-1"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
            <div className="flex min-h-9 flex-wrap items-center gap-2">
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-md border border-border/70 shadow-inner"
                style={{ backgroundColor: swatchColor }}
              />
              <span className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
                {hasCustomValue
                  ? "Saved custom color"
                  : hasValue
                    ? "Selected color"
                    : "Theme default"}
              </span>
            </div>
          </div>
          {hasCustomValue ? (
            <p className="rounded-md border border-dashed border-border/70 bg-muted/40 p-2 text-xs text-muted-foreground">
              A saved custom color is configured. Pick a swatch to replace it, or clear the field.
            </p>
          ) : null}
        </div>
      )}
    </WidgetControlRow>
  );
}

function updateValue(
  value: GalleryMosaicData,
  onChange: (next: GalleryMosaicData) => void,
  updater: (current: GalleryMosaicData) => GalleryMosaicData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: GalleryMosaicData,
  onChange: (next: GalleryMosaicData) => void,
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

function updateInteraction(
  value: GalleryMosaicData,
  onChange: (next: GalleryMosaicData) => void,
  patch: Partial<InteractionData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    interaction: {
      ...current.interaction,
      ...patch,
    },
  }));
}

function updateStyle(
  value: GalleryMosaicData,
  onChange: (next: GalleryMosaicData) => void,
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
  value: GalleryMosaicData,
  onChange: (next: GalleryMosaicData) => void,
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

function applyColorWithExistingAlpha(currentValue: string | undefined, nextHex: string): string {
  const match = currentValue?.match(
    /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/i
  );
  if (!match) {
    return nextHex;
  }

  const alpha = match[1];
  const hex = nextHex.replace("#", "");
  const normalizedHex =
    hex.length === 3
      ? hex
          .split("")
          .map((entry) => `${entry}${entry}`)
          .join("")
      : hex;
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function describeGalleryHeadingStatus(value: GalleryMosaicData) {
  const title = normalizeValue(value).header?.title?.trim();
  return title && title.length > 0 ? title : "Missing section heading";
}

function describeGalleryDescriptionStatus(value: GalleryMosaicData) {
  return normalizeValue(value).header?.description?.trim()
    ? "Helper description is configured."
    : "No helper description configured.";
}

function describeGalleryAltCoverage(items: GalleryMosaicItem[]) {
  const itemsWithMedia = items.filter((item) => item.image?.trim() || item.video?.trim());
  if (itemsWithMedia.length === 0) return "No configured media yet";
  const withAlt = itemsWithMedia.filter((item) => item.alt?.trim()).length;
  return `${withAlt}/${itemsWithMedia.length} media item${
    itemsWithMedia.length === 1 ? "" : "s"
  } have custom alt text`;
}

function describeGalleryPosterCoverage(items: GalleryMosaicItem[]) {
  const videoItems = items.filter((item) => item.video?.trim());
  if (videoItems.length === 0) return "No video items configured";
  const withPoster = videoItems.filter((item) => item.poster?.trim()).length;
  return `${withPoster}/${videoItems.length} video item${
    videoItems.length === 1 ? "" : "s"
  } have poster frames`;
}

function describeGalleryInteractionSummary(value: GalleryMosaicData, items: GalleryMosaicItem[]) {
  const normalized = normalizeValue(value);
  if ((normalized.interaction?.mode ?? "none") !== "lightbox") {
    return "Static tiles";
  }
  const linkedItems = items.filter((item) => item.href?.trim()).length;
  return linkedItems > 0
    ? `Lightbox on unlinked items; ${linkedItems} linked item${
        linkedItems === 1 ? "" : "s"
      } ${linkedItems === 1 ? "keeps" : "keep"} navigation`
    : `Lightbox, ${normalized.interaction?.zoom ?? "fit"} zoom`;
}

function describeGalleryStyleSummary(value: GalleryMosaicData) {
  const normalized = normalizeValue(value);
  return [
    normalized.style?.ratio ?? "4:3",
    normalized.style?.gap ?? "md",
    normalized.style?.radius ?? "lg",
  ].join(" · ");
}

function describeGalleryOverlaySummary(value: GalleryMosaicData) {
  const normalized = normalizeValue(value);
  return normalized.style?.overlay?.trim() ? "Overlay configured" : "Overlay cleared";
}

function updateItem(
  value: GalleryMosaicData,
  onChange: (next: GalleryMosaicData) => void,
  index: number,
  patch: Partial<GalleryMosaicItem>
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeGalleryMosaicItems(current.items);
    if (!items[index]) return current;

    const nextItems = [...items];
    nextItems[index] = {
      ...nextItems[index],
      ...patch,
    };

    return {
      ...current,
      items: nextItems,
    };
  });
}

function setItemCount(
  value: GalleryMosaicData,
  onChange: (next: GalleryMosaicData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeGalleryMosaicItems(current.items, count),
  }));
}

function resolvePendingCountReduction(
  items: GalleryMosaicItem[],
  nextCount: number
): PendingGalleryMosaicCountReduction | null {
  const summary = summarizeGalleryMosaicCountReduction(items, nextCount);
  if (!summary?.hasAuthoredData) return null;
  return {
    nextCount: summary.nextCount,
    summary,
  };
}

function addItem(value: GalleryMosaicData, onChange: (next: GalleryMosaicData) => void) {
  updateValue(value, onChange, (current) => {
    const items = normalizeGalleryMosaicItems(current.items);
    if (items.length >= galleryMosaicItemMax) return current;

    return {
      ...current,
      items: normalizeGalleryMosaicItems(
        [...items, { caption: `Media ${items.length + 1}` }],
        items.length + 1
      ),
    };
  });
}

function removeItem(
  value: GalleryMosaicData,
  onChange: (next: GalleryMosaicData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeGalleryMosaicItems(current.items);
    if (items.length <= 1) return current;

    const removedItem = items[index];
    if (!removedItem) return current;

    const shouldConfirm =
      !(
        removedItem.image?.trim() ||
        removedItem.video?.trim() ||
        removedItem.caption?.trim() ||
        removedItem.href?.trim()
      ) ||
      typeof window === "undefined" ||
      typeof window.confirm !== "function" ||
      window.confirm(
        `Remove ${resolveGalleryMosaicItemRemovalLabel(
          removedItem,
          index
        )}? This removes the saved media, caption, poster, and destination for this item. This cannot be undone.`
      );

    if (!shouldConfirm) {
      return current;
    }

    const nextItems = items.filter((_, currentIndex) => currentIndex !== index);
    return {
      ...current,
      items: normalizeGalleryMosaicItems(nextItems, nextItems.length),
    };
  });
}

function moveItem(
  value: GalleryMosaicData,
  onChange: (next: GalleryMosaicData) => void,
  itemId: string,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeGalleryMosaicItems(current.items);
    const keyedItems = items as Array<GalleryMosaicItem & { id: string }>;
    const nextItems = reorderItemsById(keyedItems, itemId, toIndex);
    if (nextItems === items) return current;

    return {
      ...current,
      items: nextItems,
    };
  });
}

function GalleryItemPreview({ item }: { item: GalleryMosaicItem }) {
  const preview = resolveGalleryItemPreview(item);

  if (preview.mediaType === "image" && preview.src) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/10 p-3">
        <img
          src={preview.src}
          alt={preview.label}
          className="h-16 w-20 rounded-md object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">Image preview</p>
          <p className="truncate text-xs text-muted-foreground">{preview.label}</p>
        </div>
      </div>
    );
  }

  if (preview.mediaType === "video" && preview.src) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/10 p-3">
        <div className="flex h-16 w-20 items-center justify-center rounded-md border bg-muted/30">
          <Video className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Video preview</p>
          <p className="truncate text-xs text-muted-foreground">{preview.label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/10 p-3">
      <div className="flex h-16 w-20 items-center justify-center rounded-md border border-dashed bg-background">
        <FileImage className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">Placeholder preview</p>
        <p className="truncate text-xs text-muted-foreground">{preview.label}</p>
      </div>
    </div>
  );
}

export function GalleryMosaicWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<GalleryMosaicData>) {
  const normalized = normalizeValue(value);
  const items = normalizeGalleryMosaicItems(normalized.items);
  const [pendingCountReduction, setPendingCountReduction] =
    useState<PendingGalleryMosaicCountReduction | null>(null);
  const configuredMediaCount = items.filter((item) => Boolean(item.image || item.video)).length;
  const resolvedVariant = resolveGalleryMosaicVariant(variant);
  const handleCountChange = (next: string) => {
    const nextCount = Number(next);
    if (!Number.isFinite(nextCount)) return;

    const pendingReduction = resolvePendingCountReduction(items, nextCount);
    if (pendingReduction) {
      setPendingCountReduction(pendingReduction);
      return;
    }

    setItemCount(value, onChange, nextCount);
  };

  return (
    <WidgetEditorSection
      id="gallery-mosaic.wizard.starter-media"
      mode="wizard"
      role="setup"
      title="Starter media"
      description="Seed the gallery layout and starter item count. Daily media content lives in Visual."
    >
      <div className="space-y-4">
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />

        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic.wizard.header.title"
          label="Section title"
          path="header.title"
          value={normalized.header?.title ?? "No section title yet"}
        />

        <WidgetControlRow
          id="gallery-mosaic.wizard.items.count"
          label="Initial media count"
          path="items.count"
        >
          {(fieldProps) => (
            <Select value={String(items.length)} onValueChange={handleCountChange}>
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>

        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic.wizard.items.media"
          label="Configured media"
          path="items.count"
          value={`${configuredMediaCount} of ${items.length} item${items.length === 1 ? "" : "s"} currently have media`}
        />
        <p className="text-xs text-muted-foreground">
          After Wizard, use Visual for section title, media selection, captions, destinations, alt
          text, posters, lightbox, overlay, density, and motion controls.
        </p>
        <ConfirmActionDialog
          open={pendingCountReduction !== null}
          onOpenChange={(open) => {
            if (!open) setPendingCountReduction(null);
          }}
          title="Reduce gallery items"
          description={
            pendingCountReduction
              ? describeGalleryMosaicCountReduction(pendingCountReduction.summary)
              : "Reducing the gallery removes saved items from the widget data."
          }
          confirmLabel="Reduce items"
          onConfirm={() => {
            if (!pendingCountReduction) return;
            setItemCount(value, onChange, pendingCountReduction.nextCount);
            setPendingCountReduction(null);
          }}
        >
          Cancel keeps the current media, captions, alt text, posters, and destinations intact.
        </ConfirmActionDialog>
      </div>
    </WidgetEditorSection>
  );
}

export function GalleryMosaicVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<GalleryMosaicData>) {
  const normalized = normalizeValue(value);
  const items = normalizeGalleryMosaicItems(normalized.items);
  const interactionMode = normalized.interaction?.mode ?? "none";
  const [selectedMediaIdsByItemId, setSelectedMediaIdsByItemId] = useState<Record<string, string>>(
    {}
  );
  const [selectedPosterMediaIdsByItemId, setSelectedPosterMediaIdsByItemId] = useState<
    Record<string, string>
  >({});
  const [itemMediaPickerErrors, setItemMediaPickerErrors] = useState<Record<string, string>>({});
  const [pendingCountReduction, setPendingCountReduction] =
    useState<PendingGalleryMosaicCountReduction | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const featureLeftWarning =
    resolveGalleryMosaicVariant(variant) === "feature-left" && items.length === 1
      ? "Feature Left works best with one lead tile plus at least one supporting item."
      : null;
  const linkedLightboxItems =
    interactionMode === "lightbox" ? items.filter((item) => item.href?.trim()).length : 0;

  const setItemMediaError = (itemId: string, message?: string) => {
    setItemMediaPickerErrors((current) => {
      if (!message) {
        const next = { ...current };
        delete next[itemId];
        return next;
      }
      return {
        ...current,
        [itemId]: message,
      };
    });
  };

  const handleItemMediaSelection = async (itemId: string, index: number, nextValue: unknown) => {
    const normalizedItems = normalizeGalleryMosaicItems(value.items);
    const item = normalizedItems[index];
    if (!item?.id) return;

    const mediaId = typeof nextValue === "string" && nextValue.trim().length > 0 ? nextValue : null;
    if (!mediaId) {
      setSelectedMediaIdsByItemId((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setSelectedPosterMediaIdsByItemId((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setItemMediaError(itemId);
      updateItem(value, onChange, index, {
        image: undefined,
        video: undefined,
        poster: undefined,
      });
      return;
    }

    setItemMediaError(itemId);
    try {
      const mediaItems = await listMediaCached({ force: false });
      const media = mediaItems.find((candidate) => candidate.id === mediaId);
      if (!media?.url) {
        throw new Error("gallery_mosaic_media_missing_url");
      }
      const mediaKind = resolveGalleryMediaKind(media);
      if (!mediaKind) {
        throw new Error("gallery_mosaic_media_unsupported");
      }

      const mediaPatch: Partial<GalleryMosaicItem> = {
        image: mediaKind === "image" ? media.url : undefined,
        video: mediaKind === "video" ? media.url : undefined,
      };
      if (mediaKind === "image") {
        mediaPatch.poster = undefined;
        setSelectedPosterMediaIdsByItemId((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
      }

      updateItem(value, onChange, index, mediaPatch);
      setSelectedMediaIdsByItemId((current) => ({
        ...current,
        [itemId]: mediaId,
      }));
    } catch {
      setItemMediaError(itemId, `Item ${index + 1}: failed to resolve selected media.`);
    }
  };

  const handleItemPosterSelection = async (itemId: string, index: number, nextValue: unknown) => {
    const mediaId = typeof nextValue === "string" && nextValue.trim().length > 0 ? nextValue : null;
    if (!mediaId) {
      setSelectedPosterMediaIdsByItemId((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setItemMediaError(itemId);
      updateItem(value, onChange, index, { poster: undefined });
      return;
    }

    setItemMediaError(itemId);
    try {
      const mediaItems = await listMediaCached({ force: false });
      const media = mediaItems.find((candidate) => candidate.id === mediaId);
      if (!media?.url || resolveGalleryMediaKind(media) !== "image") {
        throw new Error("gallery_mosaic_poster_media_invalid");
      }

      updateItem(value, onChange, index, { poster: media.url });
      setSelectedPosterMediaIdsByItemId((current) => ({
        ...current,
        [itemId]: mediaId,
      }));
    } catch {
      setItemMediaError(itemId, `Item ${index + 1}: choose an image asset for the poster.`);
    }
  };

  const clearItemMedia = (index: number, itemId?: string) => {
    if (itemId) {
      setSelectedMediaIdsByItemId((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setSelectedPosterMediaIdsByItemId((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setItemMediaError(itemId);
    }
    updateItem(value, onChange, index, { image: undefined, video: undefined, poster: undefined });
  };

  const clearItemPoster = (index: number, itemId?: string) => {
    if (itemId) {
      setSelectedPosterMediaIdsByItemId((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    }
    updateItem(value, onChange, index, { poster: undefined });
  };

  const clearDragState = () => {
    setDraggingItemId(null);
    setDropIndex(null);
  };

  const handleItemDragStart = (event: DragEvent<HTMLButtonElement>, itemId: string) => {
    event.dataTransfer.setData("text/plain", itemId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingItemId(itemId);
    setDropIndex(null);
  };

  const handleItemDragOver = (event: DragEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    setDropIndex(resolveDropIndexFromPointer(index, event.clientY, rect));
  };

  const handleItemDrop = (event: DragEvent<HTMLButtonElement>, fallbackIndex: number) => {
    event.preventDefault();
    const droppedId = event.dataTransfer.getData("text/plain") || draggingItemId;
    if (!droppedId) {
      clearDragState();
      return;
    }

    moveItem(value, onChange, droppedId, dropIndex ?? fallbackIndex);
    clearDragState();
  };

  const handleItemKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    itemId: string,
    index: number
  ) => {
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      moveItem(value, onChange, itemId, index - 1);
      return;
    }

    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      moveItem(value, onChange, itemId, index + 2);
    }
  };

  const handleCountChange = (next: string) => {
    const nextCount = Number(next);
    if (!Number.isFinite(nextCount)) return;

    const pendingReduction = resolvePendingCountReduction(items, nextCount);
    if (pendingReduction) {
      setPendingCountReduction(pendingReduction);
      return;
    }

    setItemCount(value, onChange, nextCount);
  };

  return (
    <div className="space-y-4">
      <EditorSection
        id="gallery-mosaic.visual.variant-media-structure"
        mode="visual"
        role="visual"
        title="Variant and media structure"
        description="Choose gallery arrangement and deterministic item count."
      >
        <VariantCards value={resolveGalleryMosaicVariant(variant)} onChange={onVariantChange} />

        <WidgetControlRow
          id="gallery-mosaic.items.count"
          label="Items count"
          path="items.count"
          help="Item count grows or trims from the end. Use Add item and Remove for intentional per-item edits."
        >
          {(fieldProps) => (
            <Select value={String(items.length)} onValueChange={handleCountChange}>
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        {featureLeftWarning ? (
          <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {featureLeftWarning}
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        id="gallery-mosaic.visual.header-copy"
        mode="visual"
        role="content"
        title="Header copy"
        description="Edit section title and supporting description."
      >
        <WidgetControlRow id="gallery-mosaic.header.title" label="Title" path="header.title">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={normalized.header?.title ?? ""}
              onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
              placeholder="Gallery highlights"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="gallery-mosaic.header.description"
          label="Description"
          path="header.description"
        >
          {(fieldProps) => (
            <Textarea
              id={fieldProps.id}
              value={normalized.header?.description ?? ""}
              onChange={(event) =>
                updateHeader(value, onChange, { description: event.target.value })
              }
              placeholder="Visual storytelling block with media tiles."
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="gallery-mosaic.visual.media-items-links"
        mode="visual"
        role="content"
        title="Media items and links"
        description="Choose gallery assets, captions, poster frames, and page destinations."
      >
        {items.map((item, index) => {
          const currentMedia = resolveGalleryCurrentMediaSummary(item);
          const showDropBefore = dropIndex === index;
          const showDropAfter = dropIndex === index + 1;
          const stableItemId = item.id ?? `gallery-item-${index + 1}`;
          const selectedMediaId = selectedMediaIdsByItemId[item.id ?? ""];
          const selectedPosterMediaId = selectedPosterMediaIdsByItemId[item.id ?? ""];
          const hasConfiguredMedia = Boolean(item.image?.trim() || item.video?.trim());
          const hasConfiguredPoster = Boolean(item.poster?.trim());
          const showSavedMediaStatus = hasConfiguredMedia && !selectedMediaId;
          const showPosterControls = Boolean(item.video?.trim() || hasConfiguredPoster);
          const showSavedPosterStatus = hasConfiguredPoster && !selectedPosterMediaId;

          return (
            <div key={stableItemId} className="space-y-1 rounded-lg">
              {showDropBefore ? <div className="h-0.5 rounded bg-primary" /> : null}
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Item {index + 1}</p>
                      <Badge variant="outline">Current media: {currentMedia.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{currentMedia.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      draggable
                      data-gallery-drag-handle={stableItemId}
                      onDragStart={(event) => handleItemDragStart(event, stableItemId)}
                      onDragOver={(event) => handleItemDragOver(event, index)}
                      onDrop={(event) => handleItemDrop(event, index)}
                      onDragEnd={clearDragState}
                      onKeyDown={(event) => handleItemKeyDown(event, stableItemId, index)}
                      aria-label={`Reorder item ${index + 1}`}
                      title="Drag to reorder. Keyboard: Alt + Arrow keys."
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveItem(value, onChange, stableItemId, index - 1)}
                      disabled={index === 0}
                    >
                      Move up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveItem(value, onChange, stableItemId, index + 2)}
                      disabled={index === items.length - 1}
                    >
                      Move down
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(value, onChange, index)}
                      disabled={items.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <GalleryItemPreview item={item} />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Media library</p>
                  <MediaPicker
                    value={selectedMediaIdsByItemId[item.id ?? ""] ?? null}
                    onChange={(next) => {
                      if (!item.id) return;
                      void handleItemMediaSelection(item.id, index, next);
                    }}
                    multiple={false}
                    accept={["image/*", "video/*"]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecting an asset updates the current image or video for this item.
                  </p>
                  {showSavedMediaStatus ? (
                    <p className="text-xs text-muted-foreground">
                      Saved {item.video?.trim() ? "video" : "image"} asset is configured. Browse
                      media to replace it or clear media and poster.
                    </p>
                  ) : null}
                  {item.image?.trim() || item.video?.trim() ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => clearItemMedia(index, item.id)}
                    >
                      Clear media and poster
                    </Button>
                  ) : null}
                  {item.id && itemMediaPickerErrors[item.id] ? (
                    <p className="text-xs text-destructive">{itemMediaPickerErrors[item.id]}</p>
                  ) : null}
                </div>

                <WidgetControlRow
                  id={`gallery-mosaic.items.${stableItemId}.caption`}
                  label="Caption"
                  path="items.caption"
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={item.caption ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { caption: event.target.value })
                      }
                      placeholder={`Media ${index + 1}`}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`gallery-mosaic.items.${stableItemId}.alt`}
                  label="Alt text"
                  path="items.alt"
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={item.alt ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { alt: event.target.value })
                      }
                      placeholder={`Gallery item ${index + 1}`}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <LinkDestinationField
                  fieldId={`gallery-mosaic-item-${stableItemId}-destination`}
                  label="Destination page"
                  value={item.href}
                  controlPath="items.href"
                  onChange={(next) => updateItem(value, onChange, index, { href: next })}
                  emptyLabel="No destination"
                  helpText="Pick a site page. Hand-typed links from older edits stay until you replace or clear them."
                  feedback={
                    interactionMode === "lightbox" && item.href?.trim()
                      ? "This item keeps link navigation. Clear the destination to open it in the lightbox instead."
                      : null
                  }
                />
                {showPosterControls ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Poster image</p>
                    <MediaPicker
                      value={selectedPosterMediaId ?? null}
                      onChange={(next) => {
                        if (!item.id) return;
                        void handleItemPosterSelection(item.id, index, next);
                      }}
                      multiple={false}
                      accept={["image/*"]}
                    />
                    <p className="text-xs text-muted-foreground">
                      Choose an image asset used as the video poster frame.
                    </p>
                    {showSavedPosterStatus ? (
                      <p className="text-xs text-muted-foreground">
                        Saved poster image is configured. Browse media to replace it or clear it.
                      </p>
                    ) : null}
                    {!item.video?.trim() && hasConfiguredPoster ? (
                      <p className="text-xs text-muted-foreground">
                        Poster images only display when this item uses a video asset.
                      </p>
                    ) : null}
                    {item.poster?.trim() ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => clearItemPoster(index, item.id)}
                      >
                        Clear poster
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                <WidgetControlRow
                  id={`gallery-mosaic.items.${stableItemId}.objectPosition`}
                  label="Focus point"
                  path="items.objectPosition"
                >
                  {(fieldProps) => (
                    <Select
                      value={item.objectPosition ?? "center"}
                      onValueChange={(next) =>
                        updateItem(value, onChange, index, {
                          objectPosition: next as GalleryMosaicObjectPosition,
                        })
                      }
                    >
                      <SelectTrigger
                        id={fieldProps.id}
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        aria-describedby={fieldProps["aria-describedby"]}
                      >
                        <SelectValue placeholder="Select focus point" />
                      </SelectTrigger>
                      <SelectContent>
                        {objectPositionOptions.map((option) => (
                          <SelectItem
                            key={`gallery-object-position-${option.id}`}
                            value={option.id}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`gallery-mosaic.items.${stableItemId}.ratio`}
                  label="Item ratio"
                  path="items.ratio"
                >
                  {(fieldProps) => (
                    <Select
                      value={item.ratio ?? "inherit"}
                      onValueChange={(next) =>
                        updateItem(value, onChange, index, {
                          ratio: next as GalleryMosaicItemRatio,
                        })
                      }
                    >
                      <SelectTrigger
                        id={fieldProps.id}
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        aria-describedby={fieldProps["aria-describedby"]}
                      >
                        <SelectValue placeholder="Select item ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemRatioOptions.map((option) => (
                          <SelectItem key={`gallery-item-ratio-${option.id}`} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </WidgetControlRow>
              </div>
              {showDropAfter ? <div className="h-0.5 rounded bg-primary" /> : null}
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={() => addItem(value, onChange)}
          disabled={items.length >= galleryMosaicItemMax}
        >
          Add item
        </Button>
      </EditorSection>

      <EditorSection
        id="gallery-mosaic.visual.interaction"
        mode="visual"
        role="content"
        title="Interaction"
        description="Choose whether gallery items stay static or open a widget-local lightbox."
      >
        <WidgetControlRow
          id="gallery-mosaic.interaction.mode"
          label="Interaction mode"
          path="interaction.mode"
        >
          {(fieldProps) => (
            <Select
              value={interactionMode}
              onValueChange={(next) =>
                updateInteraction(value, onChange, {
                  mode: next as GalleryMosaicInteractionMode,
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select interaction mode" />
              </SelectTrigger>
              <SelectContent>
                {interactionModeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="gallery-mosaic.interaction.zoom"
          label="Lightbox zoom"
          path="interaction.zoom"
          help="Lightbox stays off by default so existing gallery payloads keep the current click behavior."
        >
          {(fieldProps) => (
            <Select
              value={normalized.interaction?.zoom ?? "fit"}
              onValueChange={(next) =>
                updateInteraction(value, onChange, {
                  zoom: next as GalleryMosaicLightboxZoom,
                })
              }
              disabled={interactionMode !== "lightbox"}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select lightbox zoom" />
              </SelectTrigger>
              <SelectContent>
                {interactionZoomOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        {linkedLightboxItems > 0 ? (
          <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {linkedLightboxItems} linked item{linkedLightboxItems === 1 ? "" : "s"} still{" "}
            {linkedLightboxItems === 1 ? "uses" : "use"} navigation. Clear each destination to open
            that tile in the lightbox instead.
          </p>
        ) : null}
        {interactionMode === "lightbox" ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
            Admin preview shows lightbox markup as static. Published pages bind the lightbox script;
            linked tiles keep navigation until their destination is cleared.
          </p>
        ) : null}
      </EditorSection>

      <ConfirmActionDialog
        open={pendingCountReduction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCountReduction(null);
        }}
        title="Reduce gallery items"
        description={
          pendingCountReduction
            ? describeGalleryMosaicCountReduction(pendingCountReduction.summary)
            : "Reducing the gallery removes saved items from the widget data."
        }
        confirmLabel="Reduce items"
        onConfirm={() => {
          if (!pendingCountReduction) return;
          setItemCount(value, onChange, pendingCountReduction.nextCount);
          setPendingCountReduction(null);
        }}
      >
        Cancel keeps the current media, captions, alt text, posters, and destinations intact.
      </ConfirmActionDialog>

      <EditorSection
        id="gallery-mosaic.visual.overlay-caption-controls"
        mode="visual"
        role="visual"
        title="Overlay and caption controls"
        description="Adjust caption placement and overlay color for readability."
      >
        <WidgetControlRow
          id="gallery-mosaic.style.captionPosition"
          label="Caption position"
          path="style.captionPosition"
        >
          {(fieldProps) => (
            <Select
              value={normalized.style?.captionPosition ?? "inside"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  captionPosition: next as GalleryMosaicCaptionPosition,
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select caption position" />
              </SelectTrigger>
              <SelectContent>
                {captionPositionOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <ColorField
          id="gallery-mosaic.style.overlay"
          label="Overlay color"
          value={normalized.style?.overlay}
          onChange={(next) => updateStyle(value, onChange, { overlay: next })}
          onPickerChange={(next) =>
            updateStyle(value, onChange, {
              overlay: applyColorWithExistingAlpha(normalized.style?.overlay, next),
            })
          }
          onClear={() => clearStyleField(value, onChange, "overlay")}
          pickerFallback="#0f172a"
          helperText={
            "Swatch changes keep the saved overlay opacity when one exists. The default overlay strength is 35%."
          }
        />
      </EditorSection>

      <EditorSection
        id="gallery-mosaic.visual.layout-style"
        mode="visual"
        role="layout"
        title="Layout style"
        description="Set ratio, spacing, and corner radius for gallery tiles."
      >
        <WidgetControlRow id="gallery-mosaic.style.ratio" label="Ratio" path="style.ratio">
          {(fieldProps) => (
            <Select
              value={normalized.style?.ratio ?? "4:3"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { ratio: next as GalleryMosaicRatio })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select ratio" />
              </SelectTrigger>
              <SelectContent>
                {ratioOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="gallery-mosaic.style.gap" label="Gap" path="style.gap">
          {(fieldProps) => (
            <Select
              value={normalized.style?.gap ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { gap: next as GalleryMosaicGap })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>

        <WidgetControlRow id="gallery-mosaic.style.radius" label="Radius" path="style.radius">
          {(fieldProps) => (
            <Select
              value={normalized.style?.radius ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { radius: next as GalleryMosaicRadius })
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
      </EditorSection>

      <EditorSection
        id="gallery-mosaic.visual.density-motion"
        mode="visual"
        role="visual"
        title="Density and motion"
        description="Choose bounded responsive density presets and reduced-motion-safe entrances."
      >
        <WidgetControlRow
          id="gallery-mosaic.style.layoutDensity"
          label="Layout density"
          path="style.layoutDensity"
          help="Density stays bounded to product presets. Gallery Mosaic does not accept raw per-breakpoint column maps in widget data."
        >
          {(fieldProps) => (
            <Select
              value={normalized.style?.layoutDensity ?? "auto"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  layoutDensity: next as GalleryMosaicLayoutDensity,
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select density" />
              </SelectTrigger>
              <SelectContent>
                {layoutDensityOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="gallery-mosaic.style.motionPreset"
          label="Motion preset"
          path="style.motionPreset"
          help="Motion presets respect reduced-motion preferences and stay off by default for backward compatibility."
        >
          {(fieldProps) => (
            <Select
              value={normalized.style?.motionPreset ?? "none"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  motionPreset: next as GalleryMosaicMotionPreset,
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select motion" />
              </SelectTrigger>
              <SelectContent>
                {motionPresetOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      </EditorSection>
    </div>
  );
}

export function GalleryMosaicAdvancedEditor({
  value,
  variant,
}: WidgetEditorProps<GalleryMosaicData>) {
  const normalized = normalizeValue(value);
  const normalizedItems = normalizeGalleryMosaicItems(normalized.items);
  const linkedItems = normalizedItems.filter((item) => (item.href ?? "").trim().length > 0).length;
  const mediaItems = normalizedItems.filter(
    (item) => (item.image ?? "").trim().length > 0 || (item.video ?? "").trim().length > 0
  ).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Advanced mode is read-only. Use Visual for public-facing Gallery Mosaic media, captions,
        links, interaction, overlay, density, and layout changes.
      </p>

      <EditorSection
        id="gallery-mosaic.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Read-only Gallery Mosaic state for support. Change content and presentation in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-variant"
          label="Variant"
          path="variant"
          value={resolveGalleryMosaicVariant(variant)}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-items"
          label="Media items"
          path="items"
          value={`${normalizedItems.length} ${normalizedItems.length === 1 ? "item" : "items"}`}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-media"
          label="Configured media"
          path="items"
          value={`${mediaItems} ${mediaItems === 1 ? "item" : "items"} with media`}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-links"
          label="Linked items"
          path="items.href"
          value={`${linkedItems} ${linkedItems === 1 ? "destination" : "destinations"}`}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-interaction"
          label="Interaction"
          path="interaction"
          value={describeGalleryInteractionSummary(normalized, normalizedItems)}
        />
      </EditorSection>

      <EditorSection
        id="gallery-mosaic.advanced.style-summary"
        mode="advanced"
        role="summary"
        title="Style summary"
        description="Read-only style summary for the current gallery presentation."
      >
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-style"
          label="Layout style"
          path="style"
          value={describeGalleryStyleSummary(normalized)}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-caption-position"
          label="Caption position"
          path="style.captionPosition"
          value={normalized.style?.captionPosition ?? "inside"}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-overlay"
          label="Overlay"
          path="style.overlay"
          value={describeGalleryOverlaySummary(normalized)}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-density"
          label="Density"
          path="style.layoutDensity"
          value={normalized.style?.layoutDensity ?? "auto"}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-motion"
          label="Motion"
          path="style.motionPreset"
          value={normalized.style?.motionPreset ?? "none"}
        />
      </EditorSection>

      <EditorSection
        id="gallery-mosaic.advanced.accessibility-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Accessibility diagnostics"
        description="Read-only copy and media diagnostics for the published gallery."
      >
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-heading-status"
          label="Section heading"
          path="header.title"
          value={describeGalleryHeadingStatus(normalized)}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-description-status"
          label="Helper copy"
          path="header.description"
          value={describeGalleryDescriptionStatus(normalized)}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-alt-coverage"
          label="Alt text coverage"
          path="items.alt"
          value={describeGalleryAltCoverage(normalizedItems)}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-poster-coverage"
          label="Poster coverage"
          path="items.poster"
          value={describeGalleryPosterCoverage(normalizedItems)}
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-link-lightbox"
          label="Link and lightbox behavior"
          path="interaction"
          value={describeGalleryInteractionSummary(normalized, normalizedItems)}
        />
      </EditorSection>

      <EditorSection
        id="gallery-mosaic.advanced.contract-summary"
        mode="advanced"
        role="summary"
        title="Contract summary"
        description="Editor ownership split for the Gallery Mosaic v2 contract."
      >
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-setup-owner"
          label="Wizard owns"
          path="variant"
          value="One-time layout seed and starter item count."
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-visual-owner"
          label="Visual owns"
          path="header"
          value="Header copy, media items, links, interaction, overlay, layout style, density, and motion."
        />
        <ReadonlyWidgetSummaryRow
          id="gallery-mosaic-advanced-advanced-owner"
          label="Advanced owns"
          path="editorContract"
          value="Read-only runtime diagnostics, style summaries, accessibility checks, and contract ownership."
        />
      </EditorSection>
    </div>
  );
}
