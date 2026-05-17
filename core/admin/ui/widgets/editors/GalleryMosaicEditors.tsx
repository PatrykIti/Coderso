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
import { cn } from "@/lib/utils";
import { listMediaCached } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";

import {
  galleryMosaicDefaults,
  galleryMosaicItemMax,
  normalizeGalleryMosaicData,
  normalizeGalleryMosaicItems,
  resolveGalleryMosaicVariant,
  type GalleryMosaicCaptionPosition,
  type GalleryMosaicData,
  type GalleryMosaicGap,
  type GalleryMosaicItem,
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

const itemCountOptions = Array.from({ length: galleryMosaicItemMax }, (_, index) =>
  String(index + 1)
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const rgbColorPattern =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;

type HeaderData = NonNullable<GalleryMosaicData["header"]>;
type StyleData = NonNullable<GalleryMosaicData["style"]>;

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
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
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
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeGalleryMosaicItems(current.items);
    if (toIndex < 0 || toIndex >= items.length) return current;

    const nextItems = [...items];
    const [item] = nextItems.splice(fromIndex, 1);
    if (!item) return current;
    nextItems.splice(toIndex, 0, item);

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
      updateValue(value, onChange, (current) => {
        const currentItems = normalizeGalleryMosaicItems(
          current.items,
          Math.max(ids.length, items.length)
        );
        const nextItems = [...currentItems];
        ids.forEach((id, index) => {
          const media = mediaById.get(id);
          if (!media?.url) return;
          nextItems[index] = {
            ...nextItems[index],
            image: media.url,
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
    } catch {
      setMediaPickerError("Failed to resolve selected media.");
    }
  };

  return (
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
          accept={["image/*"]}
          maxItems={galleryMosaicItemMax}
        />
        <p className="text-xs text-muted-foreground">
          Selected media is saved as public image URLs in gallery items.
        </p>
        {mediaPickerError ? <p className="text-xs text-destructive">{mediaPickerError}</p> : null}
      </div>
    </div>
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

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and media structure"
        description="Choose gallery arrangement and deterministic item count."
      >
        <VariantCards value={resolveGalleryMosaicVariant(variant)} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Items count</p>
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
        {items.map((item, index) => (
          <div
            key={item.id ?? `gallery-item-${index + 1}`}
            className="space-y-3 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Item {index + 1}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveItem(value, onChange, index, index - 1)}
                  disabled={index === 0}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveItem(value, onChange, index, index + 1)}
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
              <p className="text-sm font-medium">Link URL</p>
              <Input
                value={item.href ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { href: event.target.value })
                }
                placeholder="#"
              />
            </div>
          </div>
        ))}

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
    </div>
  );
}

export function GalleryMosaicAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<GalleryMosaicData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical ratio and layout tokens"
        description="Low-level style tokens for ratio, spacing, radius, and captions."
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
        <div className="space-y-2">
          <p className="text-sm font-medium">Overlay token</p>
          <Input
            value={normalized.style?.overlay ?? ""}
            onChange={(event) => updateStyle(value, onChange, { overlay: event.target.value })}
            placeholder="rgba(15, 23, 42, 0.35)"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic fallback data for media items and styles."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(normalizeValue(value))}>
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => onChange(galleryMosaicDefaults)}>
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
