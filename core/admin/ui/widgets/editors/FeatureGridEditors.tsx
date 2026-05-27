import { GripVertical } from "lucide-react";
import { type ReactNode, useState } from "react";

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
import { listMediaCached } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { PostRichTextAdapter } from "@/ui/posts/editor/richtext/PostRichTextAdapter";

import {
  featureGridDefaults,
  featureGridItemMax,
  normalizeFeatureGridData,
  normalizeFeatureGridItems,
  resolveFeatureGridItemCountForVariant,
  resolveFeatureGridVariant,
  type FeatureGridBorderWidth,
  type FeatureGridColumns,
  type FeatureGridData,
  type FeatureGridGap,
  type FeatureGridItem,
  type FeatureGridCardLayout,
  type FeatureGridCardPadding,
  type FeatureGridCardTitleSize,
  type FeatureGridCtaTarget,
  type FeatureGridRadius,
  type FeatureGridDescriptionMode,
  type FeatureGridHeaderSize,
  type FeatureGridHoverEffect,
  type FeatureGridMaxWidth,
  type FeatureGridMediaSize,
  type FeatureGridTextAlign,
  type FeatureGridVariantId,
} from "../../../../widgets/core/featureGrid";
import { normalizeWidgetSafeHref } from "../../../../widgets/core/widgetSafeHref";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { ConfirmActionDialog } from "../../shared/ConfirmActionDialog";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: FeatureGridVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "cards-3",
    label: "Cards 3",
    description: "Three balanced cards for concise feature communication.",
  },
  {
    id: "cards-4",
    label: "Cards 4",
    description: "Four cards to cover more value points in one section.",
  },
  {
    id: "highlight-first",
    label: "Highlight First",
    description: "First card is emphasized to drive attention to key value.",
  },
];

const gapOptions: Array<{ id: FeatureGridGap; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const columnsOptions: Array<{ id: FeatureGridColumns; label: string }> = [
  { id: "2", label: "2 columns" },
  { id: "3", label: "3 columns" },
  { id: "4", label: "4 columns" },
];

const featureGridEmojiOptions = ["⚡", "🧩", "📈", "🔒", "🚀", "✨", "💬", "🎯"];

const borderWidthOptions: Array<{ id: FeatureGridBorderWidth; label: string }> = [
  { id: "0", label: "0px" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const radiusOptions: Array<{ id: FeatureGridRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const textAlignOptions: Array<{ id: FeatureGridTextAlign; label: string }> = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const cardPaddingOptions: Array<{ id: FeatureGridCardPadding; label: string }> = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
  { id: "spacious", label: "Spacious" },
];

const mediaSizeOptions: Array<{ id: FeatureGridMediaSize; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
];

const cardLayoutOptions: Array<{ id: FeatureGridCardLayout; label: string }> = [
  { id: "vertical", label: "Vertical" },
  { id: "horizontal", label: "Horizontal" },
];

const maxWidthOptions: Array<{ id: FeatureGridMaxWidth; label: string }> = [
  { id: "5xl", label: "5xl" },
  { id: "6xl", label: "6xl" },
  { id: "7xl", label: "7xl" },
  { id: "full", label: "Full" },
];

const headerSizeOptions: Array<{ id: FeatureGridHeaderSize; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
];

const cardTitleSizeOptions: Array<{ id: FeatureGridCardTitleSize; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
];

const hoverEffectOptions: Array<{ id: FeatureGridHoverEffect; label: string }> = [
  { id: "none", label: "None" },
  { id: "lift", label: "Lift" },
  { id: "border", label: "Border" },
];

const ctaTargetOptions: Array<{ id: FeatureGridCtaTarget; label: string }> = [
  { id: "same-tab", label: "Same tab" },
  { id: "new-tab", label: "New tab" },
];

const descriptionModeOptions: Array<{ id: FeatureGridDescriptionMode; label: string }> = [
  { id: "plain", label: "Plain" },
  { id: "rich", label: "Rich" },
];

const itemCountOptions = Array.from({ length: featureGridItemMax }, (_, index) =>
  String(index + 1)
);

type HeaderData = NonNullable<FeatureGridData["header"]>;
type StyleData = NonNullable<FeatureGridData["style"]>;

function normalizeValue(value: FeatureGridData): FeatureGridData {
  return normalizeFeatureGridData(value);
}

const isValidFeatureGridImageUrl = (value: string | undefined) =>
  !value ||
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHttp: true,
  }) !== undefined;

const isValidFeatureGridCtaUrl = (value: string | undefined) =>
  !value ||
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  }) !== undefined;

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id?: string;
  mode?: EditorMode;
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
  controlPath = "variant",
}: {
  value: FeatureGridVariantId;
  onChange?: (next: string) => void;
  controlPath?: string;
}) {
  const previewRows: Record<FeatureGridVariantId, number[]> = {
    "cards-3": [1, 1, 1],
    "cards-4": [1, 1, 1, 1],
    "highlight-first": [2, 1, 1],
  };

  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          data-widget-control={`feature-grid-variant-${option.id}`}
          data-widget-control-path={controlPath}
          data-widget-control-ownership={controlPath ? "writable" : "action"}
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
          <span
            aria-hidden="true"
            data-widget-control={`feature-grid-variant-preview-${option.id}`}
            data-widget-control-ownership="preview"
            className="mt-3 block rounded-md border border-border/60 bg-muted/30 p-2"
          >
            <span className="grid grid-cols-4 gap-1">
              {previewRows[option.id].map((span, index) => (
                <span
                  key={`${option.id}-${index + 1}`}
                  className={cn(
                    "h-4 rounded-sm border border-border/60 bg-background",
                    span === 2 ? "col-span-2" : undefined
                  )}
                />
              ))}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function updateValue(
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  updater: (current: FeatureGridData) => FeatureGridData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
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
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
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
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
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
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  index: number,
  patch: Partial<FeatureGridItem>
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFeatureGridItems(current.items);
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

function setItemsCount(
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeFeatureGridItems(current.items, count),
  }));
}

function addItem(value: FeatureGridData, onChange: (next: FeatureGridData) => void) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFeatureGridItems(current.items);
    if (items.length >= featureGridItemMax) return current;

    return {
      ...current,
      items: normalizeFeatureGridItems(
        [...items, { title: `Feature ${items.length + 1}` }],
        items.length + 1
      ),
    };
  });
}

function removeItem(
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFeatureGridItems(current.items);
    if (items.length <= 1) return current;

    const nextItems = items.filter((_, currentIndex) => currentIndex !== index);

    return {
      ...current,
      items: normalizeFeatureGridItems(nextItems, nextItems.length),
    };
  });
}

function moveItem(
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFeatureGridItems(current.items);
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

function buildVariantSyncedFeatureGridData(
  value: FeatureGridData,
  nextVariant: FeatureGridVariantId
): FeatureGridData {
  const current = normalizeValue(value);
  return normalizeValue({
    ...current,
    items: normalizeFeatureGridItems(
      current.items,
      resolveFeatureGridItemCountForVariant(nextVariant)
    ),
    style: {
      ...current.style,
      columns: nextVariant === "highlight-first" ? "3" : nextVariant === "cards-4" ? "4" : "3",
    },
  });
}

function applyVariantDataPatch(
  nextVariant: FeatureGridVariantId,
  nextData: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  onVariantChange?: (next: string) => void,
  onBlockPatch?: WidgetEditorProps<FeatureGridData>["onBlockPatch"]
) {
  if (onBlockPatch) {
    onBlockPatch((current) => ({
      ...current,
      variant: nextVariant,
      data: nextData,
    }));
    return;
  }

  if (!onVariantChange) {
    return;
  }

  onChange(nextData);
  onVariantChange(nextVariant);
}

const findOptionLabel = <T extends string>(
  options: Array<{ id: T; label: string }>,
  value: T | undefined,
  fallback: string
) => options.find((option) => option.id === value)?.label ?? fallback;

const describeFeatureGridColor = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) return "Theme default";
  return /^#[0-9a-f]{3,8}$/i.test(trimmed) ? "Selected swatch" : "Saved custom color";
};

function summarizeFeatureGridMedia(items: FeatureGridItem[]) {
  const imageCount = items.filter((item) => (item.image ?? "").trim().length > 0).length;
  const invalidImageCount = items.filter(
    (item) => (item.image ?? "").trim().length > 0 && !isValidFeatureGridImageUrl(item.image)
  ).length;
  const iconCount = items.filter((item) => (item.icon ?? "").trim().length > 0).length;

  if (invalidImageCount > 0) {
    return `${imageCount} cards use images; ${invalidImageCount} need Media Library replacement.`;
  }

  if (imageCount > 0) return `${imageCount} cards use Media Library or saved images.`;
  if (iconCount > 0) return `${iconCount} cards use icon fallbacks.`;
  return "Cards render without image or icon media.";
}

function summarizeFeatureGridCtas(items: FeatureGridItem[]) {
  const enabledItems = items.filter(
    (item) =>
      item.ctaEnabled !== false &&
      ((item.ctaLabel ?? "").trim().length > 0 || (item.ctaHref ?? "").trim().length > 0)
  );
  const invalidDestinations = enabledItems.filter(
    (item) => (item.ctaHref ?? "").trim().length > 0 && !isValidFeatureGridCtaUrl(item.ctaHref)
  ).length;

  if (invalidDestinations > 0) {
    return `${enabledItems.length} card actions enabled; ${invalidDestinations} need destination review.`;
  }

  return enabledItems.length > 0
    ? `${enabledItems.length} card actions enabled.`
    : "No active card actions.";
}

export function FeatureGridWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<FeatureGridData>) {
  const normalized = normalizeValue(value);
  const items = normalizeFeatureGridItems(normalized.items);

  return (
    <WidgetEditorSection
      id="feature-grid.wizard.starter-setup"
      mode="wizard"
      role="setup"
      title="Starter setup"
      description="Pick the starting layout only. Card count, daily copy, and card content live in Visual."
    >
      <div className="space-y-4">
        <div
          data-widget-control="feature-grid.wizard.variant"
          data-widget-control-ownership="action"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Feature grid style</p>
          <Select
            value={resolveFeatureGridVariant(variant)}
            onValueChange={(next) =>
              applyVariantDataPatch(
                next as FeatureGridVariantId,
                buildVariantSyncedFeatureGridData(value, next as FeatureGridVariantId),
                onChange,
                onVariantChange,
                onBlockPatch
              )
            }
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

        <ReadonlyWidgetSummaryRow
          id="feature-grid.wizard.items.count"
          label="Cards count"
          path="items.count"
          value={`${items.length} card${items.length === 1 ? "" : "s"}`}
        />

        <p className="text-xs text-muted-foreground">
          Wizard is one-time starter setup. Use Visual for card count, descriptions, media, CTA
          links, layout, and styling.
        </p>
      </div>
    </WidgetEditorSection>
  );
}

export function FeatureGridVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<FeatureGridData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveFeatureGridVariant(variant);
  const items = normalizeFeatureGridItems(normalized.items);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Record<string, string | null>>({});
  const [mediaPickerError, setMediaPickerError] = useState<string | null>(null);
  const pendingRemoveItem =
    typeof pendingRemoveIndex === "number" ? items[pendingRemoveIndex] : undefined;

  const handleCardDragStart = (event: React.DragEvent<HTMLButtonElement>, index: number) => {
    event.dataTransfer.setData("text/plain", `feature-grid:${index}`);
    event.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  };

  const handleCardDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleCardDrop = (event: React.DragEvent<HTMLDivElement>, toIndex: number) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData("text/plain");
    const [, rawIndex] = payload.split(":");
    const fromIndex = Number(rawIndex);
    setDraggedIndex(null);
    if (!Number.isInteger(fromIndex) || fromIndex === toIndex) return;
    moveItem(value, onChange, fromIndex, toIndex);
  };

  const handleItemMediaSelection = async (index: number, itemId: string, nextValue: unknown) => {
    const mediaId = typeof nextValue === "string" ? nextValue : null;
    setSelectedMediaIds((current) => ({ ...current, [itemId]: mediaId }));
    setMediaPickerError(null);

    if (!mediaId) {
      updateItem(value, onChange, index, { image: undefined });
      return;
    }

    try {
      const mediaItems = await listMediaCached({ force: false });
      const media = mediaItems.find((item) => item.id === mediaId);
      if (!media?.url) throw new Error("missing_media_url");
      const fallbackAlt =
        media.alt?.trim() ||
        media.title?.trim() ||
        media.caption?.trim() ||
        media.originalName?.trim();
      updateItem(value, onChange, index, {
        image: media.url,
        imageAlt: items[index]?.imageAlt?.trim() ? items[index]?.imageAlt : fallbackAlt,
      });
    } catch {
      setMediaPickerError(`Card ${index + 1}: failed to resolve selected media.`);
    }
  };

  return (
    <div className="space-y-4">
      <EditorSection
        id="feature-grid.visual.structure"
        mode="visual"
        role="layout"
        title="Variant and layout structure"
        description="Choose card arrangement and baseline density for runtime preview."
      >
        <VariantCards
          value={resolvedVariant}
          onChange={(next) =>
            applyVariantDataPatch(
              next as FeatureGridVariantId,
              buildVariantSyncedFeatureGridData(value, next as FeatureGridVariantId),
              onChange,
              onVariantChange,
              onBlockPatch
            )
          }
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div
            data-widget-control="feature-grid.visual.columns"
            data-widget-control-path="style.columns"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Columns</p>
            <Select
              value={
                resolvedVariant === "highlight-first"
                  ? "3"
                  : (normalized.style?.columns ?? featureGridDefaults.style?.columns ?? "3")
              }
              disabled={resolvedVariant === "highlight-first"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { columns: next as FeatureGridColumns })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Columns" />
              </SelectTrigger>
              <SelectContent>
                {columnsOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {resolvedVariant === "highlight-first" ? (
              <p className="text-xs text-muted-foreground">
                Highlight First uses a fixed spotlight layout, so columns stay locked to the shared
                runtime structure.
              </p>
            ) : null}
          </div>

          <div
            data-widget-control="feature-grid.visual.gap"
            data-widget-control-path="style.gap"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Card gap</p>
            <Select
              value={normalized.style?.gap ?? featureGridDefaults.style?.gap ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { gap: next as FeatureGridGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap" />
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
        </div>

        <div
          data-widget-control="feature-grid.visual.items.count"
          data-widget-control-path="items.count"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Cards count</p>
          <Select
            value={String(items.length)}
            onValueChange={(next) => setItemsCount(value, onChange, Number(next))}
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
        id="feature-grid.visual.header-copy"
        mode="visual"
        role="content"
        title="Header copy"
        description="Edit eyebrow, heading, and section description shown above cards."
      >
        <div
          data-widget-control="feature-grid.visual.header.eyebrow"
          data-widget-control-path="header.eyebrow"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Eyebrow</p>
          <Input
            value={normalized.header?.eyebrow ?? ""}
            onChange={(event) => updateHeader(value, onChange, { eyebrow: event.target.value })}
            placeholder="Feature highlights"
          />
        </div>

        <div
          data-widget-control="feature-grid.visual.header.title"
          data-widget-control-path="header.title"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.header?.title ?? ""}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Everything your team needs"
          />
        </div>

        <div
          data-widget-control="feature-grid.visual.header.description"
          data-widget-control-path="header.description"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.header?.description ?? ""}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Use focused cards to explain your strongest product capabilities."
          />
        </div>
      </EditorSection>

      <EditorSection
        id="feature-grid.visual.cards"
        mode="visual"
        role="content"
        title="Feature cards and actions"
        description="Manage card content, visuals, CTA links, and ordering."
      >
        {items.map((item, index) => {
          const itemMediaSelectionKey = item.id ?? `feature-item-${index + 1}`;

          return (
            <div
              key={item.id ?? `feature-item-${index + 1}`}
              className={cn(
                "space-y-3 rounded-lg border p-3",
                draggedIndex === index ? "border-primary/60 bg-primary/5" : undefined
              )}
              onDragOver={handleCardDragOver}
              onDrop={(event) => handleCardDrop(event, index)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Card {index + 1}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    draggable
                    onDragStart={(event) => handleCardDragStart(event, index)}
                    onDragEnd={() => setDraggedIndex(null)}
                    aria-label={`Drag card ${index + 1}`}
                    title={`Drag card ${index + 1}`}
                  >
                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{`Drag card ${index + 1}`}</span>
                  </Button>
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
                    onClick={() => setPendingRemoveIndex(index)}
                    disabled={items.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <div
                    data-widget-control={`feature-grid.visual.items.${index}.title`}
                    data-widget-control-path="items.title"
                    data-widget-control-ownership="writable"
                    className="space-y-2"
                  >
                    <p className="text-sm font-medium">Title</p>
                    <Input
                      value={item.title ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { title: event.target.value })
                      }
                      placeholder={`Feature ${index + 1}`}
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div
                    data-widget-control={`feature-grid.visual.items.${index}.description-mode`}
                    data-widget-control-path="items.descriptionMode"
                    data-widget-control-ownership="writable"
                    className="flex items-center justify-between gap-3"
                  >
                    <p className="text-sm font-medium">Description</p>
                    <Select
                      value={item.descriptionMode ?? "plain"}
                      onValueChange={(next) =>
                        updateItem(value, onChange, index, {
                          descriptionMode: next as FeatureGridDescriptionMode,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Description format" />
                      </SelectTrigger>
                      <SelectContent>
                        {descriptionModeOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div
                    data-widget-control={`feature-grid.visual.items.${index}.description`}
                    data-widget-control-path="items.description"
                    data-widget-control-ownership="writable"
                    className="space-y-2"
                  >
                    {(item.descriptionMode ?? "plain") === "rich" ? (
                      <PostRichTextAdapter
                        value={item.description ?? ""}
                        onChange={(next) =>
                          updateItem(value, onChange, index, { description: next })
                        }
                        toolbarProfile="paragraph"
                        minHeightClassName="min-h-[8rem]"
                        className="bg-muted/30"
                        placeholder="Write concise rich card copy..."
                      />
                    ) : (
                      <Textarea
                        value={item.description ?? ""}
                        onChange={(event) =>
                          updateItem(value, onChange, index, { description: event.target.value })
                        }
                        placeholder="Describe this feature in one short paragraph."
                      />
                    )}
                  </div>
                </div>

                <div
                  data-widget-control={`feature-grid.visual.items.${index}.icon`}
                  data-widget-control-path="items.icon"
                  data-widget-control-ownership="writable"
                  className="space-y-2"
                >
                  <p className="text-sm font-medium">Icon</p>
                  <Input
                    value={item.icon ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { icon: event.target.value })
                    }
                    placeholder="⚡"
                  />
                  <div className="flex flex-wrap gap-2">
                    {featureGridEmojiOptions.map((icon) => (
                      <Button
                        key={`${item.id ?? index}-${icon}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateItem(value, onChange, index, { icon })}
                        aria-pressed={item.icon === icon}
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                </div>

                <div
                  data-widget-control={`feature-grid.visual.items.${index}.image`}
                  data-widget-control-path="items.image"
                  data-widget-control-ownership="writable"
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Feature image</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMediaIds((current) => {
                          const { [itemMediaSelectionKey]: _removed, ...next } = current;
                          return next;
                        });
                        updateItem(value, onChange, index, { image: undefined });
                      }}
                      disabled={!(item.image ?? "").trim()}
                    >
                      Clear image
                    </Button>
                  </div>
                  <MediaPicker
                    value={selectedMediaIds[itemMediaSelectionKey] ?? null}
                    onChange={(next) => {
                      void handleItemMediaSelection(index, itemMediaSelectionKey, next);
                    }}
                    multiple={false}
                    accept={["image/*"]}
                  />
                  {(item.image ?? "").trim().length > 0 ? (
                    <p className="rounded-md border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      A feature image is already configured. Pick an image from the Media Library to
                      replace it.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Pick an image from the Media Library. Existing external images stay read-only.
                    </p>
                  )}
                  {(item.image ?? "").trim().length > 0 &&
                  !isValidFeatureGridImageUrl(item.image) ? (
                    <p className="text-xs text-amber-700">
                      Saved feature image is not public-safe and will not render. Clear it or pick a
                      Media Library image.
                    </p>
                  ) : null}
                  {mediaPickerError?.startsWith(`Card ${index + 1}:`) ? (
                    <p className="text-xs text-destructive">{mediaPickerError}</p>
                  ) : null}
                  <div
                    data-widget-control={`feature-grid.visual.items.${index}.image-alt`}
                    data-widget-control-path="items.imageAlt"
                    data-widget-control-ownership="writable"
                    className="space-y-2"
                  >
                    <Input
                      value={item.imageAlt ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { imageAlt: event.target.value })
                      }
                      placeholder="Describe image for screen readers"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If both image and icon are set, the image is used in preview and runtime.
                  </p>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <div
                    data-widget-control={`feature-grid.visual.items.${index}.cta-enabled`}
                    data-widget-control-path="items.ctaEnabled"
                    data-widget-control-ownership="writable"
                    className="flex items-center justify-between gap-3"
                  >
                    <p className="text-sm font-medium">Enable CTA</p>
                    <Switch
                      checked={item.ctaEnabled !== false}
                      onCheckedChange={(checked) =>
                        updateItem(value, onChange, index, { ctaEnabled: checked })
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div
                      data-widget-control={`feature-grid.visual.items.${index}.cta-label`}
                      data-widget-control-path="items.ctaLabel"
                      data-widget-control-ownership="writable"
                      className="space-y-2"
                    >
                      <p className="text-sm font-medium">CTA label</p>
                      <Input
                        value={item.ctaLabel ?? ""}
                        disabled={item.ctaEnabled === false}
                        onChange={(event) =>
                          updateItem(value, onChange, index, { ctaLabel: event.target.value })
                        }
                        placeholder="Learn more"
                      />
                    </div>

                    <div
                      data-widget-control={`feature-grid.visual.items.${index}.cta-href`}
                      data-widget-control-path="items.ctaHref"
                      data-widget-control-ownership="writable"
                    >
                      <LinkDestinationField
                        fieldId={`feature-grid-card-${index + 1}-cta-destination`}
                        label="CTA destination"
                        value={item.ctaHref ?? ""}
                        controlPath="items.ctaHref"
                        disabled={item.ctaEnabled === false}
                        onChange={(next) => updateItem(value, onChange, index, { ctaHref: next })}
                        feedback={
                          (item.ctaHref ?? "").trim().length > 0 &&
                          !isValidFeatureGridCtaUrl(item.ctaHref)
                            ? "Saved destination is not public-safe and will not render publicly."
                            : null
                        }
                      />
                    </div>

                    <div
                      data-widget-control={`feature-grid.visual.items.${index}.cta-target`}
                      data-widget-control-path="items.ctaTarget"
                      data-widget-control-ownership="writable"
                      className="space-y-2"
                    >
                      <p className="text-sm font-medium">CTA target</p>
                      <Select
                        value={item.ctaTarget ?? "same-tab"}
                        onValueChange={(next) =>
                          updateItem(value, onChange, index, {
                            ctaTarget: next as FeatureGridCtaTarget,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="CTA target" />
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
                  </div>
                  {item.ctaEnabled === false ? (
                    <p className="text-xs text-muted-foreground">
                      CTA copy and URL stay stored while the action is disabled.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={() => addItem(value, onChange)}
          disabled={items.length >= featureGridItemMax}
        >
          Add card
        </Button>
        <ConfirmActionDialog
          open={pendingRemoveIndex !== null}
          onOpenChange={(open) => {
            if (!open) setPendingRemoveIndex(null);
          }}
          title="Remove feature card"
          description={
            pendingRemoveItem
              ? `Remove ${pendingRemoveItem.title ?? `Card ${pendingRemoveIndex! + 1}`}? This cannot be undone.`
              : "Remove this card? This cannot be undone."
          }
          confirmLabel="Remove"
          onConfirm={() => {
            if (pendingRemoveIndex === null) return;
            const pendingItemId =
              items[pendingRemoveIndex]?.id ?? `feature-item-${pendingRemoveIndex + 1}`;
            removeItem(value, onChange, pendingRemoveIndex);
            setSelectedMediaIds((current) => {
              const next = { ...current };
              delete next[pendingItemId];
              return next;
            });
            setPendingRemoveIndex(null);
          }}
        />
      </EditorSection>

      <EditorSection
        id="feature-grid.visual.card-layout"
        mode="visual"
        role="visual"
        title="Card layout and density"
        description="Control card alignment, padding, media sizing, and horizontal flow."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            data-widget-control="feature-grid.visual.card-layout"
            data-widget-control-path="style.cardLayout"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Card layout</p>
            <Select
              value={
                normalized.style?.cardLayout ?? featureGridDefaults.style?.cardLayout ?? "vertical"
              }
              onValueChange={(next) =>
                updateStyle(value, onChange, { cardLayout: next as FeatureGridCardLayout })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Card layout" />
              </SelectTrigger>
              <SelectContent>
                {cardLayoutOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            data-widget-control="feature-grid.visual.text-align"
            data-widget-control-path="style.textAlign"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Text align</p>
            <Select
              value={normalized.style?.textAlign ?? featureGridDefaults.style?.textAlign ?? "left"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { textAlign: next as FeatureGridTextAlign })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Text align" />
              </SelectTrigger>
              <SelectContent>
                {textAlignOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            data-widget-control="feature-grid.visual.card-padding"
            data-widget-control-path="style.cardPadding"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Card padding</p>
            <Select
              value={
                normalized.style?.cardPadding ?? featureGridDefaults.style?.cardPadding ?? "default"
              }
              onValueChange={(next) =>
                updateStyle(value, onChange, { cardPadding: next as FeatureGridCardPadding })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Card padding" />
              </SelectTrigger>
              <SelectContent>
                {cardPaddingOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            data-widget-control="feature-grid.visual.media-size"
            data-widget-control-path="style.mediaSize"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Media size</p>
            <Select
              value={normalized.style?.mediaSize ?? featureGridDefaults.style?.mediaSize ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { mediaSize: next as FeatureGridMediaSize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Media size" />
              </SelectTrigger>
              <SelectContent>
                {mediaSizeOptions.map((option) => (
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
        id="feature-grid.visual.colors"
        mode="visual"
        role="visual"
        title="Colors and borders"
        description="Customize card surface and border presentation."
      >
        <SharedColorControl
          controlId="feature-grid.visual.surface-color"
          controlPath="style.surfaceColor"
          label="Card background"
          value={normalized.style?.surfaceColor}
          onChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
          onClear={() => clearStyleField(value, onChange, "surfaceColor")}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
          showValueInput={false}
        />

        <SharedColorControl
          controlId="feature-grid.visual.border-color"
          controlPath="style.borderColor"
          label="Card border color"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          onClear={() => clearStyleField(value, onChange, "borderColor")}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
          showValueInput={false}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div
            data-widget-control="feature-grid.visual.border-width"
            data-widget-control-path="style.borderWidth"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Border width</p>
            <Select
              value={normalized.style?.borderWidth ?? featureGridDefaults.style?.borderWidth ?? "1"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { borderWidth: next as FeatureGridBorderWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Border width" />
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

          <div
            data-widget-control="feature-grid.visual.radius"
            data-widget-control-path="style.radius"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Corner radius</p>
            <Select
              value={normalized.style?.radius ?? featureGridDefaults.style?.radius ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { radius: next as FeatureGridRadius })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Radius" />
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
      </EditorSection>

      <EditorSection
        id="feature-grid.visual.section-style"
        mode="visual"
        role="visual"
        title="Section typography and container"
        description="Tune section width, background, title scales, and card hover behavior."
      >
        <SharedColorControl
          controlId="feature-grid.visual.section-background"
          controlPath="style.sectionBackground"
          label="Section background"
          value={normalized.style?.sectionBackground}
          onChange={(next) => updateStyle(value, onChange, { sectionBackground: next })}
          onClear={() => clearStyleField(value, onChange, "sectionBackground")}
          placeholder="var(--color-surface)"
          pickerFallback="#ffffff"
          showValueInput={false}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div
            data-widget-control="feature-grid.visual.max-width"
            data-widget-control-path="style.maxWidth"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Container width</p>
            <Select
              value={normalized.style?.maxWidth ?? featureGridDefaults.style?.maxWidth ?? "6xl"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { maxWidth: next as FeatureGridMaxWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Container width" />
              </SelectTrigger>
              <SelectContent>
                {maxWidthOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            data-widget-control="feature-grid.visual.header-size"
            data-widget-control-path="style.headerSize"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Header size</p>
            <Select
              value={normalized.style?.headerSize ?? featureGridDefaults.style?.headerSize ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { headerSize: next as FeatureGridHeaderSize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Header size" />
              </SelectTrigger>
              <SelectContent>
                {headerSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            data-widget-control="feature-grid.visual.card-title-size"
            data-widget-control-path="style.cardTitleSize"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Card title size</p>
            <Select
              value={
                normalized.style?.cardTitleSize ?? featureGridDefaults.style?.cardTitleSize ?? "md"
              }
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  cardTitleSize: next as FeatureGridCardTitleSize,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Card title size" />
              </SelectTrigger>
              <SelectContent>
                {cardTitleSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            data-widget-control="feature-grid.visual.hover-effect"
            data-widget-control-path="style.hoverEffect"
            data-widget-control-ownership="writable"
            className="space-y-2"
          >
            <p className="text-sm font-medium">Hover effect</p>
            <Select
              value={
                normalized.style?.hoverEffect ?? featureGridDefaults.style?.hoverEffect ?? "none"
              }
              onValueChange={(next) =>
                updateStyle(value, onChange, { hoverEffect: next as FeatureGridHoverEffect })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Hover effect" />
              </SelectTrigger>
              <SelectContent>
                {hoverEffectOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>
    </div>
  );
}

export function FeatureGridAdvancedEditor({ value, variant }: WidgetEditorProps<FeatureGridData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveFeatureGridVariant(variant);
  const items = normalizeFeatureGridItems(normalized.items);
  const style = normalized.style ?? featureGridDefaults.style ?? {};
  const variantLabel = variantOptions.find((option) => option.id === resolvedVariant)?.label;

  return (
    <div className="space-y-4">
      <EditorSection
        id="feature-grid.advanced.layout-summary"
        mode="advanced"
        role="diagnostics"
        title="Layout summary"
        description="Read-only view of how this grid will render. Change layout in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-variant"
          label="Layout"
          path="variant"
          value={variantLabel ?? "Cards 3"}
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-cards-count"
          label="Cards"
          path="items.count"
          value={`${items.length} ${items.length === 1 ? "card" : "cards"}`}
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-columns"
          label="Desktop rhythm"
          path="style.columns"
          value={
            resolvedVariant === "highlight-first"
              ? "Spotlight layout with secondary cards"
              : `${style.columns ?? "3"} column layout`
          }
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-gap"
          label="Card spacing"
          path="style.gap"
          value={findOptionLabel(gapOptions, style.gap, "Default")}
        />
      </EditorSection>

      <EditorSection
        id="feature-grid.advanced.content-summary"
        mode="advanced"
        role="diagnostics"
        title="Content summary"
        description="Read-only health check for card copy, media, and destinations."
      >
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-header"
          label="Header"
          path="header"
          value={normalized.header?.title ? "Configured" : "No section title"}
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-media"
          label="Media"
          path="items"
          value={summarizeFeatureGridMedia(items)}
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-actions"
          label="Card actions"
          path="items"
          value={summarizeFeatureGridCtas(items)}
        />
      </EditorSection>

      <EditorSection
        id="feature-grid.advanced.presentation-summary"
        mode="advanced"
        role="diagnostics"
        title="Presentation summary"
        description="Read-only style state. Authors replace colors and spacing in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-card-layout"
          label="Card layout"
          path="style.cardLayout"
          value={findOptionLabel(cardLayoutOptions, style.cardLayout, "Vertical")}
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-card-density"
          label="Density"
          path="style.cardPadding"
          value={findOptionLabel(cardPaddingOptions, style.cardPadding, "Default")}
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-card-background"
          label="Card background"
          path="style.surfaceColor"
          value={describeFeatureGridColor(style.surfaceColor)}
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-border"
          label="Border"
          path="style.borderColor"
          value={`${findOptionLabel(borderWidthOptions, style.borderWidth, "1px")} border, ${findOptionLabel(radiusOptions, style.radius, "Large")} corners, ${describeFeatureGridColor(style.borderColor)}`}
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-section-background"
          label="Section background"
          path="style.sectionBackground"
          value={describeFeatureGridColor(style.sectionBackground)}
        />
      </EditorSection>

      <EditorSection
        id="feature-grid.advanced.authoring-boundaries"
        mode="advanced"
        role="summary"
        title="Authoring boundaries"
        description="This tab is intentionally read-only for authors."
      >
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-daily-owner"
          label="Daily editing"
          value="Use Visual for card copy, media, actions, layout, spacing, and colors."
        />
        <ReadonlyWidgetSummaryRow
          id="feature-grid-advanced-setup-owner"
          label="Starter setup"
          value="Wizard is available only for first setup or explicit Run setup again."
        />
      </EditorSection>
    </div>
  );
}
