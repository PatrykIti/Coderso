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
import { FileImage, GripVertical, Video } from "lucide-react";
import { reorderItemsById, resolveDropIndexFromPointer } from "@/ui/posts/editor/blocks/blockDnD";

import {
  exportGalleryMosaicConfig,
  galleryMosaicDefaults,
  galleryMosaicItemMax,
  importGalleryMosaicConfig,
  normalizeGalleryMosaicData,
  normalizeGalleryMosaicItems,
  resolveGalleryMosaicVariant,
  type GalleryMosaicCaptionPosition,
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
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

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
          description: "Video URL is currently active. Clear it to switch back to the image URL.",
        }
      : {
          label: "Video",
          description: "Video URL is currently active for this item.",
        };
  }
  if (currentType === "image") {
    return {
      label: "Image",
      description: "Image URL is currently active for this item.",
    };
  }
  return {
    label: "Placeholder",
    description: "No image or video URL is set yet.",
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
  label,
  value,
  onChange,
  onPickerChange,
  placeholder,
  pickerFallback,
  onClear,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onPickerChange?: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader
        label={label}
        value={value}
        onClear={onClear}
        onRestoreValue={onChange}
      />
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => (onPickerChange ?? onChange)(event.target.value)}
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

function addItem(value: GalleryMosaicData, onChange: (next: GalleryMosaicData) => void) {
  updateValue(value, onChange, (current) => {
    const items = normalizeGalleryMosaicItems(current.items);
    if (items.length >= galleryMosaicItemMax) return current;

    return {
      ...current,
      items: normalizeGalleryMosaicItems(
        [...items, { caption: `Media ${items.length + 1}`, href: "#" }],
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
      window.confirm(`Remove item ${index + 1}? This action cannot be undone.`);

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

function DiagnosticsSnapshot({ value }: { value: GalleryMosaicData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
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

function TechnicalStyleSummary({ value }: { value: GalleryMosaicData }) {
  const normalized = normalizeValue(value);
  const style = normalized.style ?? galleryMosaicDefaults.style;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Visual owns the current shared style fields.</p>
        <p className="text-xs text-muted-foreground">
          Ratio, gap, radius, caption position, and overlay stay editable in Visual for Gallery
          Mosaic. Advanced remains diagnostic-only so shared fields do not have two competing
          editors.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <dt className="font-medium text-foreground">Ratio</dt>
          <dd>{style?.ratio ?? "4:3"}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Gap</dt>
          <dd>{style?.gap ?? "md"}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Radius</dt>
          <dd>{style?.radius ?? "lg"}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Caption</dt>
          <dd>{style?.captionPosition ?? "inside"}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Density</dt>
          <dd>{style?.layoutDensity ?? "auto"}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Motion</dt>
          <dd>{style?.motionPreset ?? "none"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="font-medium text-foreground">Overlay</dt>
          <dd>{style?.overlay ?? "cleared"}</dd>
        </div>
      </dl>
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
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [mediaPickerError, setMediaPickerError] = useState<string | null>(null);

  const handleMediaSelection = async (nextValue: unknown) => {
    const ids = Array.isArray(nextValue) ? nextValue.map(String) : [];
    setSelectedMediaIds(ids);
    setMediaPickerError(null);
    if (ids.length === 0) return;
    try {
      const mediaItems = await listMediaCached({ force: false });
      const mediaById = new Map(mediaItems.map((item) => [item.id, item]));
      let unsupportedSelection = false;
      updateValue(value, onChange, (current) => {
        const currentItems = normalizeGalleryMosaicItems(
          current.items,
          Math.max(ids.length, items.length)
        );
        const nextItems = [...currentItems];
        ids.forEach((id, index) => {
          const media = mediaById.get(id);
          const mediaKind = resolveGalleryMediaKind(media);
          if (!media?.url || !mediaKind) {
            unsupportedSelection = true;
            return;
          }
          nextItems[index] = {
            ...nextItems[index],
            image: mediaKind === "image" ? media.url : undefined,
            video: mediaKind === "video" ? media.url : undefined,
            caption:
              media.title?.trim() ||
              media.caption?.trim() ||
              media.originalName?.trim() ||
              nextItems[index]?.caption ||
              `Media ${index + 1}`,
          };
        });
        return {
          ...current,
          items: normalizeGalleryMosaicItems(nextItems, nextItems.length),
        };
      });
      if (unsupportedSelection) {
        setMediaPickerError("Gallery Mosaic currently supports image and video assets only.");
      }
    } catch {
      setMediaPickerError("Failed to resolve selected media.");
    }
  };

  return (
    <WidgetEditorSection
      id="gallery-mosaic.wizard.starter-media"
      mode="wizard"
      role="setup"
      title="Starter media"
      description="Seed the gallery layout, heading, and initial media selection."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Gallery layout</p>
          <Select
            value={resolveGalleryMosaicVariant(variant)}
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
            placeholder="Gallery highlights"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Initial media count</p>
          <Select
            value={String(items.length)}
            onValueChange={(next) => setItemCount(value, onChange, Number(next))}
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
          <p className="text-sm font-medium">Media library</p>
          <MediaPicker
            value={selectedMediaIds}
            onChange={(next) => {
              void handleMediaSelection(next);
            }}
            multiple
            accept={["image/*", "video/*"]}
            maxItems={galleryMosaicItemMax}
          />
          <p className="text-xs text-muted-foreground">
            Selected media is saved as public image or video URLs in gallery items.
          </p>
          <p className="text-xs text-muted-foreground">
            After Wizard, use Visual for per-item alt, poster, lightbox, density, and motion
            controls, or Advanced to import/export JSON.
          </p>
          {mediaPickerError ? <p className="text-xs text-destructive">{mediaPickerError}</p> : null}
        </div>
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
  const [itemMediaPickerErrors, setItemMediaPickerErrors] = useState<Record<string, string>>({});
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
      setItemMediaError(itemId);
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

      updateItem(value, onChange, index, {
        image: mediaKind === "image" ? media.url : undefined,
        video: mediaKind === "video" ? media.url : undefined,
      });
      setSelectedMediaIdsByItemId((current) => ({
        ...current,
        [itemId]: mediaId,
      }));
    } catch {
      setItemMediaError(itemId, `Item ${index + 1}: failed to resolve selected media.`);
    }
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

    if (nextCount >= items.length) {
      setItemCount(value, onChange, nextCount);
      return;
    }

    const removedItems = items.slice(nextCount);
    const shouldConfirm =
      !removedItems.some(
        (item) =>
          item.image?.trim() || item.video?.trim() || item.caption?.trim() || item.href?.trim()
      ) ||
      typeof window === "undefined" ||
      typeof window.confirm !== "function" ||
      window.confirm(
        `Reducing the item count will remove the last ${removedItems.length} gallery item${
          removedItems.length === 1 ? "" : "s"
        }. Continue?`
      );

    if (!shouldConfirm) {
      return;
    }

    setItemCount(value, onChange, nextCount);
  };

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and media structure"
        description="Choose gallery arrangement and deterministic item count."
      >
        <VariantCards value={resolveGalleryMosaicVariant(variant)} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Items count</p>
          <Select value={String(items.length)} onValueChange={handleCountChange}>
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
          <p className="text-xs text-muted-foreground">
            Item count grows or trims from the end. Use Add item and Remove for intentional per-item
            edits.
          </p>
        </div>
        {featureLeftWarning ? (
          <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {featureLeftWarning}
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Header copy"
        description="Edit section title and supporting description."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.header?.title ?? ""}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Gallery highlights"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.header?.description ?? ""}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Visual storytelling block with media tiles."
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Media items and links"
        description="Manage image/video URLs, captions, and target links."
      >
        {items.map((item, index) => {
          const currentMedia = resolveGalleryCurrentMediaSummary(item);
          const showDropBefore = dropIndex === index;
          const showDropAfter = dropIndex === index + 1;
          const stableItemId = item.id ?? `gallery-item-${index + 1}`;

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
                    Selecting an asset updates the current image or video URL for this item.
                  </p>
                  {item.id && itemMediaPickerErrors[item.id] ? (
                    <p className="text-xs text-destructive">{itemMediaPickerErrors[item.id]}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Image URL</p>
                  <Input
                    value={item.image ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { image: event.target.value })
                    }
                    placeholder="https://cdn.example.com/photo.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Video URL</p>
                  <Input
                    value={item.video ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { video: event.target.value })
                    }
                    placeholder="https://cdn.example.com/clip.mp4"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Caption</p>
                  <Input
                    value={item.caption ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { caption: event.target.value })
                    }
                    placeholder={`Media ${index + 1}`}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Alt text</p>
                  <Input
                    value={item.alt ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { alt: event.target.value })
                    }
                    placeholder={`Gallery item ${index + 1}`}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Link URL</p>
                  <Input
                    value={item.href ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { href: event.target.value })
                    }
                    placeholder="#"
                  />
                  {interactionMode === "lightbox" && item.href?.trim() ? (
                    <p className="text-xs text-muted-foreground">
                      This item keeps link navigation. Clear the link URL to open it in the lightbox
                      instead.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Poster image URL</p>
                  <Input
                    value={item.poster ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { poster: event.target.value })
                    }
                    placeholder="https://cdn.example.com/poster.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Focus point</p>
                  <Select
                    value={item.objectPosition ?? "center"}
                    onValueChange={(next) =>
                      updateItem(value, onChange, index, {
                        objectPosition: next as GalleryMosaicObjectPosition,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select focus point" />
                    </SelectTrigger>
                    <SelectContent>
                      {objectPositionOptions.map((option) => (
                        <SelectItem key={`gallery-object-position-${option.id}`} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Item ratio</p>
                  <Select
                    value={item.ratio ?? "inherit"}
                    onValueChange={(next) =>
                      updateItem(value, onChange, index, {
                        ratio: next as GalleryMosaicItemRatio,
                      })
                    }
                  >
                    <SelectTrigger>
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
                </div>
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
        title="Interaction"
        description="Choose whether gallery items stay static or open a widget-local lightbox."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Interaction mode</p>
          <Select
            value={interactionMode}
            onValueChange={(next) =>
              updateInteraction(value, onChange, {
                mode: next as GalleryMosaicInteractionMode,
              })
            }
          >
            <SelectTrigger>
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
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Lightbox zoom</p>
          <Select
            value={normalized.interaction?.zoom ?? "fit"}
            onValueChange={(next) =>
              updateInteraction(value, onChange, {
                zoom: next as GalleryMosaicLightboxZoom,
              })
            }
            disabled={interactionMode !== "lightbox"}
          >
            <SelectTrigger>
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
          <p className="text-xs text-muted-foreground">
            Lightbox stays off by default so existing gallery payloads keep the current click
            behavior.
          </p>
        </div>

        {linkedLightboxItems > 0 ? (
          <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {linkedLightboxItems} linked item{linkedLightboxItems === 1 ? "" : "s"} still use
            navigation. Clear each Link URL to open that tile in the lightbox instead.
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Overlay and caption controls"
        description="Adjust caption placement and overlay color for readability."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Caption position</p>
          <Select
            value={normalized.style?.captionPosition ?? "inside"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                captionPosition: next as GalleryMosaicCaptionPosition,
              })
            }
          >
            <SelectTrigger>
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
        </div>

        <ColorField
          label="Overlay color"
          value={normalized.style?.overlay}
          onChange={(next) => updateStyle(value, onChange, { overlay: next })}
          onPickerChange={(next) =>
            updateStyle(value, onChange, {
              overlay: applyColorWithExistingAlpha(normalized.style?.overlay, next),
            })
          }
          onClear={() => clearStyleField(value, onChange, "overlay")}
          placeholder="rgba(15, 23, 42, 0.35)"
          pickerFallback="#0f172a"
        />
      </EditorSection>

      <EditorSection
        title="Layout style"
        description="Set ratio, spacing, and corner radius for gallery tiles."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Ratio</p>
          <Select
            value={normalized.style?.ratio ?? "4:3"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { ratio: next as GalleryMosaicRatio })
            }
          >
            <SelectTrigger>
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
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Gap</p>
          <Select
            value={normalized.style?.gap ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { gap: next as GalleryMosaicGap })
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
          <p className="text-sm font-medium">Radius</p>
          <Select
            value={normalized.style?.radius ?? "lg"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { radius: next as GalleryMosaicRadius })
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
      </EditorSection>

      <EditorSection
        title="Density and motion"
        description="Choose bounded responsive density presets and reduced-motion-safe entrances."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Layout density</p>
          <Select
            value={normalized.style?.layoutDensity ?? "auto"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                layoutDensity: next as GalleryMosaicLayoutDensity,
              })
            }
          >
            <SelectTrigger>
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
          <p className="text-xs text-muted-foreground">
            Density stays bounded to product presets. Gallery Mosaic does not accept raw
            per-breakpoint column maps in widget data.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Motion preset</p>
          <Select
            value={normalized.style?.motionPreset ?? "none"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                motionPreset: next as GalleryMosaicMotionPreset,
              })
            }
          >
            <SelectTrigger>
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
          <p className="text-xs text-muted-foreground">
            Motion presets respect reduced-motion preferences and stay off by default for backward
            compatibility.
          </p>
        </div>
      </EditorSection>
    </div>
  );
}

export function GalleryMosaicAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<GalleryMosaicData>) {
  const normalized = normalizeValue(value);
  const [configDraft, setConfigDraft] = useState(() => exportGalleryMosaicConfig(normalized));
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const handleExportConfig = () => {
    const nextDraft = exportGalleryMosaicConfig(normalizeValue(value));
    setConfigDraft(nextDraft);
    setConfigError(null);
    setConfigStatus("Exported the current config to the JSON field.");
  };

  const handleImportConfig = () => {
    const result = importGalleryMosaicConfig(configDraft);
    if (!result.ok) {
      setConfigStatus(null);
      setConfigError(`Import error: ${result.code}${result.path ? ` at ${result.path}` : ""}`);
      return;
    }

    onChange(result.data);
    setConfigDraft(exportGalleryMosaicConfig(result.data));
    setConfigError(null);
    setConfigStatus("Imported Gallery Mosaic config.");
  };

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical ratio and layout tokens"
        description="Visual owns the live shared style fields for Gallery Mosaic. Advanced stays diagnostic-only."
      >
        <TechnicalStyleSummary value={value} />
      </EditorSection>

      <EditorSection
        title="Configuration import and export"
        description="Use the schema-owned JSON payload for safe Gallery Mosaic import/export."
      >
        <Textarea
          value={configDraft}
          onChange={(event) => {
            setConfigDraft(event.target.value);
            setConfigError(null);
            setConfigStatus(null);
          }}
          placeholder="Paste a Gallery Mosaic JSON config."
          rows={12}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleExportConfig}>
            Export current config
          </Button>
          <Button type="button" variant="outline" onClick={handleImportConfig}>
            Import config
          </Button>
        </div>
        {configError ? <p className="text-xs text-destructive">{configError}</p> : null}
        {configStatus ? <p className="text-xs text-muted-foreground">{configStatus}</p> : null}
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic fallback data for media items and styles."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const next = normalizeValue(value);
              onChange(next);
              setConfigDraft(exportGalleryMosaicConfig(next));
              setConfigError(null);
              setConfigStatus("Normalized the current Gallery Mosaic config.");
            }}
          >
            Normalize now
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onChange(galleryMosaicDefaults);
              setConfigDraft(exportGalleryMosaicConfig(galleryMosaicDefaults));
              setConfigError(null);
              setConfigStatus("Reset Gallery Mosaic to defaults.");
            }}
          >
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
