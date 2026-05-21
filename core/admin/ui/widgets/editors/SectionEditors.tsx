import { useRef, useState } from "react";

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
import { isApiClientError } from "@/services/apiClient";
import { listMediaCached } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";

import {
  isCompatibleSectionMediaUrl,
  isValidSectionMediaUrl,
  sanitizeSectionAnchorId,
  type SectionBackgroundMediaBlendMode,
  type SectionBackgroundMediaFit,
  type SectionBackgroundMediaPosition,
  type SectionBackgroundMediaSource,
  type SectionBackgroundMediaType,
  type SectionContainerWidth,
  type SectionDescriptionSize,
  type SectionGap,
  type SectionHeadingAlign,
  type SectionHeadingLevel,
  type SectionLabelSize,
  type SectionLayerOrder,
  type SectionTitleSize,
  normalizeSectionData,
  resolveSectionVariant,
  sectionDefaults,
  type SectionBorderWidth,
  type SectionData,
  type SectionElement,
  type SectionMaxWidth,
  type SectionMinHeight,
  type SectionPaddingBlock,
  type SectionPaddingInline,
  type SectionRadius,
  type SectionRegionColumns,
  type SectionRegionFlow,
  type SectionVariantId,
} from "../../../../widgets/core/section";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { SharedColorFieldInputs, hasClearableFieldValue } from "./ClearableFields";
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

const minHeightOptions: Array<{ id: SectionMinHeight; label: string }> = [
  { id: "none", label: "No minimum" },
  { id: "compact", label: "Compact band" },
  { id: "hero", label: "Hero" },
  { id: "screen", label: "Screen" },
];

const regionFlowOptions: Array<{ id: SectionRegionFlow; label: string }> = [
  { id: "stack", label: "Stack" },
  { id: "row", label: "Row" },
  { id: "grid", label: "Grid" },
];

const regionColumnOptions: Array<{ id: SectionRegionColumns; label: string }> = [
  { id: "1", label: "1 column" },
  { id: "2", label: "2 columns" },
  { id: "3", label: "3 columns" },
  { id: "4", label: "4 columns" },
  { id: "5", label: "5 columns" },
  { id: "6", label: "6 columns" },
  { id: "7", label: "7 columns" },
  { id: "8", label: "8 columns" },
];

const gapOptions: Array<{ id: SectionGap; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
];

const headingLevelOptions: Array<{ id: SectionHeadingLevel; label: string }> = [
  { id: "h1", label: "H1" },
  { id: "h2", label: "H2" },
  { id: "h3", label: "H3" },
  { id: "h4", label: "H4" },
  { id: "h5", label: "H5" },
  { id: "h6", label: "H6" },
];

const headingAlignOptions: Array<{ id: SectionHeadingAlign; label: string }> = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const labelSizeOptions: Array<{ id: SectionLabelSize; label: string }> = [
  { id: "xs", label: "Compact" },
  { id: "sm", label: "Default" },
  { id: "md", label: "Large" },
];

const titleSizeOptions: Array<{ id: SectionTitleSize; label: string }> = [
  { id: "xl", label: "XL" },
  { id: "2xl", label: "2XL" },
  { id: "3xl", label: "3XL" },
];

const descriptionSizeOptions: Array<{ id: SectionDescriptionSize; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "base", label: "Default" },
  { id: "lg", label: "Large" },
];

const backgroundMediaTypeOptions: Array<{
  id: SectionBackgroundMediaType;
  label: string;
}> = [
  { id: "none", label: "None" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
];

const backgroundMediaSourceOptions: Array<{
  id: SectionBackgroundMediaSource;
  label: string;
}> = [
  { id: "library", label: "Media library" },
  { id: "external", label: "External URL" },
];

const backgroundMediaFitOptions: Array<{
  id: SectionBackgroundMediaFit;
  label: string;
}> = [
  { id: "cover", label: "Cover" },
  { id: "contain", label: "Contain" },
];

const backgroundMediaPositionOptions: Array<{
  id: SectionBackgroundMediaPosition;
  label: string;
}> = [
  { id: "center", label: "Center" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

const backgroundMediaBlendModeOptions: Array<{
  id: SectionBackgroundMediaBlendMode;
  label: string;
}> = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
];

const backgroundMediaLayerOrderOptions: Array<{
  id: SectionLayerOrder;
  label: string;
}> = [
  { id: "media-under-overlay", label: "Media under overlay" },
  { id: "overlay-under-media", label: "Overlay under media" },
];

const sectionRegionGapAutoValue = "__match_variant__";

const regionGapOptions: Array<{
  id: SectionGap | typeof sectionRegionGapAutoValue;
  label: string;
}> = [{ id: sectionRegionGapAutoValue, label: "Match variant" }, ...gapOptions];

type HeadingData = NonNullable<SectionData["heading"]>;
type LayoutData = NonNullable<SectionData["layout"]>;
type SemanticsData = NonNullable<SectionData["semantics"]>;
type StyleData = NonNullable<SectionData["style"]>;
type BackgroundMediaData = NonNullable<StyleData["backgroundMedia"]>;

const sectionHeadingDefaults: HeadingData = {
  label: "",
  title: "",
  description: "",
  level: "h2",
  align: "left",
  labelSize: "xs",
  titleSize: "2xl",
  descriptionSize: "sm",
};

const sectionBackgroundMediaDefaults: BackgroundMediaData = {
  type: "none",
  source: "external",
  fit: "cover",
  position: "center",
  opacity: 100,
  blendMode: "normal",
  layerOrder: "media-under-overlay",
};

const clampOpacity = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
};

const clampAngle = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 180;
  return Math.max(0, Math.min(360, Math.round(value ?? 180)));
};

const clampMediaOpacity = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 100;
  return Math.max(0, Math.min(100, Math.round(value ?? 100)));
};

const resolveBackgroundMedia = (style: SectionData["style"] | undefined): BackgroundMediaData => {
  const media = style?.backgroundMedia;
  return {
    type: media?.type ?? sectionBackgroundMediaDefaults.type,
    source: media?.source ?? sectionBackgroundMediaDefaults.source,
    assetId: media?.assetId,
    src: media?.src,
    posterSource: media?.posterSource ?? media?.source ?? "library",
    posterAssetId: media?.posterAssetId,
    posterSrc: media?.posterSrc,
    title: media?.title,
    description: media?.description,
    fit: media?.fit ?? sectionBackgroundMediaDefaults.fit,
    position: media?.position ?? sectionBackgroundMediaDefaults.position,
    opacity: clampMediaOpacity(media?.opacity),
    blendMode: media?.blendMode ?? sectionBackgroundMediaDefaults.blendMode,
    layerOrder: media?.layerOrder ?? sectionBackgroundMediaDefaults.layerOrder,
  };
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
        <SharedColorFieldInputs
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          pickerFallback={pickerFallback}
          inputId={fieldProps.id}
          ariaLabelledby={fieldProps["aria-labelledby"]}
          ariaDescribedby={fieldProps["aria-describedby"]}
        />
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

function updateBackgroundMedia(
  value: SectionData,
  onChange: (next: SectionData) => void,
  patch: Partial<BackgroundMediaData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      backgroundMedia: {
        ...resolveBackgroundMedia(current.style),
        ...patch,
      },
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

const resolveBackgroundMediaTypeTransition = (
  current: BackgroundMediaData,
  nextType: SectionBackgroundMediaType
): Partial<BackgroundMediaData> => {
  if (nextType === "none") {
    return {
      type: "none",
      source: current.source ?? "external",
      assetId: undefined,
      src: undefined,
      posterSource: undefined,
      posterAssetId: undefined,
      posterSrc: undefined,
      title: undefined,
      description: undefined,
      fit: current.fit ?? sectionBackgroundMediaDefaults.fit,
      position: current.position ?? sectionBackgroundMediaDefaults.position,
      opacity: current.opacity ?? sectionBackgroundMediaDefaults.opacity,
      blendMode: current.blendMode ?? sectionBackgroundMediaDefaults.blendMode,
      layerOrder: current.layerOrder ?? sectionBackgroundMediaDefaults.layerOrder,
    };
  }

  const source = current.source ?? "external";
  const keepLibrarySelection = current.type === nextType && source === "library";
  const keepExternalSelection =
    source === "external" && isCompatibleSectionMediaUrl(current.src, nextType);
  const keepVideoMetadata = nextType === "video" && current.type === "video";

  return {
    type: nextType,
    source,
    assetId: keepLibrarySelection ? current.assetId : undefined,
    src: keepLibrarySelection || keepExternalSelection ? current.src : undefined,
    posterSource: nextType === "video" ? (current.posterSource ?? "library") : undefined,
    posterAssetId: nextType === "video" && keepVideoMetadata ? current.posterAssetId : undefined,
    posterSrc: nextType === "video" && keepVideoMetadata ? current.posterSrc : undefined,
    title: nextType === "video" && keepVideoMetadata ? current.title : undefined,
    description: nextType === "video" && keepVideoMetadata ? current.description : undefined,
    fit: current.fit ?? sectionBackgroundMediaDefaults.fit,
    position: current.position ?? sectionBackgroundMediaDefaults.position,
    opacity: current.opacity ?? sectionBackgroundMediaDefaults.opacity,
    blendMode: current.blendMode ?? sectionBackgroundMediaDefaults.blendMode,
    layerOrder: current.layerOrder ?? sectionBackgroundMediaDefaults.layerOrder,
  };
};

function SectionBackgroundMediaSourceFields({
  media,
  mediaType,
  onChange,
}: {
  media: BackgroundMediaData;
  mediaType: Exclude<SectionBackgroundMediaType, "none">;
  onChange: (patch: Partial<BackgroundMediaData>) => void;
}) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const source: SectionBackgroundMediaSource = media.source ?? "external";
  const accept = mediaType === "image" ? ["image/*"] : ["video/*"];

  const handleSourceChange = (next: SectionBackgroundMediaSource) => {
    requestIdRef.current += 1;
    setLookupError(null);
    if (next === "library") {
      onChange({ source: next, assetId: undefined, src: undefined });
    } else {
      onChange({ source: next, assetId: undefined, src: "" });
    }
  };

  const handleAssetChange = async (value: unknown) => {
    const assetId = typeof value === "string" ? value : null;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (!assetId) {
      onChange({ assetId: undefined, src: undefined });
      return;
    }

    onChange({ assetId, source: "library" });
    setLookupError(null);
    try {
      const items = await listMediaCached({ force: true });
      if (requestId !== requestIdRef.current) return;
      const match = items.find((item) => item.id === assetId);
      if (match) {
        onChange({
          assetId,
          source: "library",
          src: match.url,
          ...(mediaType === "video" && (!media.title || media.title.trim().length === 0)
            ? { title: match.title ?? match.originalName ?? "" }
            : {}),
        });
      } else {
        setLookupError("Selected media could not be resolved.");
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLookupError(isApiClientError(error) ? error.message : "Failed to resolve media URL.");
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border/70 p-3">
      <div className="space-y-2">
        <p className="text-sm font-medium">Background media source</p>
        <Select
          value={source}
          onValueChange={(next) => handleSourceChange(next as SectionBackgroundMediaSource)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            {backgroundMediaSourceOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {source === "library" ? (
        <div className="space-y-2">
          <MediaPicker
            value={media.assetId ?? null}
            onChange={(value) => void handleAssetChange(value)}
            multiple={false}
            accept={accept}
          />
          {lookupError ? <p className="text-xs text-destructive">{lookupError}</p> : null}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Background media URL</p>
          <Input
            value={media.src ?? ""}
            onChange={(event) => onChange({ src: event.target.value })}
            placeholder={
              mediaType === "image"
                ? "https://example.com/background.jpg"
                : "https://example.com/background.mp4"
            }
          />
          {!isValidSectionMediaUrl(media.src) ? (
            <p className="text-xs text-destructive">Use a relative path or full URL.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SectionBackgroundPosterFields({
  media,
  onChange,
  onClear,
}: {
  media: BackgroundMediaData;
  onChange: (patch: Partial<BackgroundMediaData>) => void;
  onClear: () => void;
}) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const posterSource: SectionBackgroundMediaSource =
    media.posterSource ?? media.source ?? "library";

  const handlePosterSourceChange = (next: SectionBackgroundMediaSource) => {
    requestIdRef.current += 1;
    setLookupError(null);
    if (next === "library") {
      onChange({ posterSource: next, posterAssetId: undefined, posterSrc: undefined });
    } else {
      onChange({ posterSource: next, posterAssetId: undefined, posterSrc: "" });
    }
  };

  const handlePosterAssetChange = async (value: unknown) => {
    const assetId = typeof value === "string" ? value : null;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (!assetId) {
      onChange({ posterAssetId: undefined, posterSrc: undefined });
      return;
    }

    onChange({ posterAssetId: assetId, posterSource: "library" });
    setLookupError(null);
    try {
      const items = await listMediaCached({ force: true });
      if (requestId !== requestIdRef.current) return;
      const match = items.find((item) => item.id === assetId);
      if (match) {
        onChange({
          posterAssetId: assetId,
          posterSource: "library",
          posterSrc: match.url,
        });
      } else {
        setLookupError("Selected poster image could not be resolved.");
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLookupError(
        isApiClientError(error) ? error.message : "Failed to resolve poster image URL."
      );
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Video poster image</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Poster source</p>
        <Select
          value={posterSource}
          onValueChange={(next) => handlePosterSourceChange(next as SectionBackgroundMediaSource)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            {backgroundMediaSourceOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {posterSource === "library" ? (
        <div className="space-y-2">
          <MediaPicker
            value={media.posterAssetId ?? null}
            onChange={(value) => void handlePosterAssetChange(value)}
            multiple={false}
            accept={["image/*"]}
          />
          {lookupError ? <p className="text-xs text-destructive">{lookupError}</p> : null}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Poster image URL</p>
          <Input
            value={media.posterSrc ?? ""}
            onChange={(event) => onChange({ posterSrc: event.target.value })}
            placeholder="https://example.com/poster.jpg"
          />
          {!isValidSectionMediaUrl(media.posterSrc) ? (
            <p className="text-xs text-destructive">Use a relative path or full URL.</p>
          ) : null}
        </div>
      )}
    </div>
  );
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
  const heading = normalized.heading ?? sectionHeadingDefaults;

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

        <WidgetControlRow id="section.wizard.label" label="Label">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={heading.label ?? ""}
              onChange={(event) => updateHeading(value, onChange, { label: event.target.value })}
              placeholder="Section label (optional)"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.wizard.title" label="Section title">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={heading.title ?? ""}
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
              value={heading.description ?? ""}
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
  const heading = normalized.heading ?? sectionHeadingDefaults;
  const regionFlow = normalized.layout?.regionFlow ?? sectionDefaults.layout?.regionFlow ?? "stack";
  const regionColumnsEnabled = regionFlow === "grid";
  const regionColumnsValue =
    normalized.layout?.regionColumns ?? sectionDefaults.layout?.regionColumns ?? "1";
  const regionGapValue = normalized.layout?.regionGap ?? sectionRegionGapAutoValue;
  const backgroundMedia = resolveBackgroundMedia(normalized.style);
  const backgroundMediaType = backgroundMedia.type ?? "none";
  const handleBackgroundMediaTypeChange = (nextType: SectionBackgroundMediaType) =>
    updateBackgroundMedia(
      value,
      onChange,
      resolveBackgroundMediaTypeTransition(backgroundMedia, nextType)
    );

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
        description="Control heading copy, level, alignment, sizes, and text colors."
        id="section.heading-intro"
      >
        <WidgetControlRow id="section.heading.label" label="Label">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={heading.label ?? ""}
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
              value={heading.title ?? ""}
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
              value={heading.description ?? ""}
              onChange={(event) =>
                updateHeading(value, onChange, { description: event.target.value })
              }
              placeholder="Supportive copy for this section"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.level" label="Heading level">
          {(fieldProps) => (
            <Select
              value={heading.level ?? "h2"}
              onValueChange={(next) => updateHeading(value, onChange, { level: next as SectionHeadingLevel })}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select heading level" />
              </SelectTrigger>
              <SelectContent>
                {headingLevelOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.align" label="Heading alignment">
          {(fieldProps) => (
            <Select
              value={heading.align ?? "left"}
              onValueChange={(next) => updateHeading(value, onChange, { align: next as SectionHeadingAlign })}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select heading alignment" />
              </SelectTrigger>
              <SelectContent>
                {headingAlignOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.labelSize" label="Label size">
          {(fieldProps) => (
            <Select
              value={heading.labelSize ?? "xs"}
              onValueChange={(next) => updateHeading(value, onChange, { labelSize: next as SectionLabelSize })}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select label size" />
              </SelectTrigger>
              <SelectContent>
                {labelSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.titleSize" label="Title size">
          {(fieldProps) => (
            <Select
              value={heading.titleSize ?? "2xl"}
              onValueChange={(next) => updateHeading(value, onChange, { titleSize: next as SectionTitleSize })}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select title size" />
              </SelectTrigger>
              <SelectContent>
                {titleSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.descriptionSize" label="Description size">
          {(fieldProps) => (
            <Select
              value={heading.descriptionSize ?? "sm"}
              onValueChange={(next) =>
                updateHeading(value, onChange, { descriptionSize: next as SectionDescriptionSize })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select description size" />
              </SelectTrigger>
              <SelectContent>
                {descriptionSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <ColorField
          id="section.heading.labelColor"
          label="Label color"
          value={heading.labelColor}
          onChange={(next) => updateHeading(value, onChange, { labelColor: next })}
          onClear={() => updateHeading(value, onChange, { labelColor: undefined })}
          placeholder="var(--color-text)"
          pickerFallback="#475569"
        />

        <ColorField
          id="section.heading.titleColor"
          label="Title color"
          value={heading.titleColor}
          onChange={(next) => updateHeading(value, onChange, { titleColor: next })}
          onClear={() => updateHeading(value, onChange, { titleColor: undefined })}
          placeholder="var(--color-text)"
          pickerFallback="#111827"
        />

        <ColorField
          id="section.heading.descriptionColor"
          label="Description color"
          value={heading.descriptionColor}
          onChange={(next) => updateHeading(value, onChange, { descriptionColor: next })}
          onClear={() => updateHeading(value, onChange, { descriptionColor: undefined })}
          placeholder="var(--color-text)"
          pickerFallback="#475569"
        />

        <p className="text-xs text-muted-foreground">
          Section titles default to `h2`. Choose `h1` only when this band owns the primary page heading.
        </p>
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
                updateSemantics(value, onChange, {
                  anchorId: sanitizeSectionAnchorId(event.target.value),
                })
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
        description="Choose bounded width, height, flow, and spacing tokens instead of raw CSS values."
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

          <WidgetControlRow id="section.layout.minHeight" label="Minimum height">
            {(fieldProps) => (
              <Select
                value={normalized.layout?.minHeight ?? sectionDefaults.layout?.minHeight ?? "none"}
                onValueChange={(next) =>
                  updateLayout(value, onChange, { minHeight: next as SectionMinHeight })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select minimum height" />
                </SelectTrigger>
                <SelectContent>
                  {minHeightOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.regionFlow" label="Region flow">
            {(fieldProps) => (
              <Select
                value={regionFlow}
                onValueChange={(next) =>
                  updateLayout(value, onChange, {
                    regionFlow: next as SectionRegionFlow,
                    regionColumns:
                      next === "grid"
                        ? ((normalized.layout?.regionColumns ??
                            sectionDefaults.layout?.regionColumns ??
                            "1") as SectionRegionColumns)
                        : "1",
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select region flow" />
                </SelectTrigger>
                <SelectContent>
                  {regionFlowOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.regionColumns" label="Grid columns">
            {(fieldProps) => (
              <Select
                value={regionColumnsValue}
                disabled={!regionColumnsEnabled}
                onValueChange={(next) =>
                  updateLayout(value, onChange, { regionColumns: next as SectionRegionColumns })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select grid columns" />
                </SelectTrigger>
                <SelectContent>
                  {regionColumnOptions.map((option) => (
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

          <WidgetControlRow id="section.layout.headingGap" label="Heading gap">
            {(fieldProps) => (
              <Select
                value={normalized.layout?.headingGap ?? sectionDefaults.layout?.headingGap ?? "md"}
                onValueChange={(next) =>
                  updateLayout(value, onChange, { headingGap: next as SectionGap })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select heading gap" />
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

          <WidgetControlRow id="section.layout.regionGap" label="Region gap">
            {(fieldProps) => (
              <Select
                value={regionGapValue}
                onValueChange={(next) =>
                  updateLayout(value, onChange, {
                    regionGap:
                      next === sectionRegionGapAutoValue ? undefined : (next as SectionGap),
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select region gap" />
                </SelectTrigger>
                <SelectContent>
                  {regionGapOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        </div>
        <p className="text-xs text-muted-foreground">
          `Wide` keeps the same base wrapper as `Content`; increase max width below when you want a
          visibly wider section without switching to full bleed.
        </p>
        <p className="text-xs text-muted-foreground">
          Grid columns stay inactive until Region flow is set to Grid. Leaving Region gap on Match
          variant keeps the legacy spacing for each Section variant until you choose an explicit
          token.
        </p>
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
          onClear={() => clearStyleField(value, onChange, "gradientFrom")}
          placeholder="#ffffff"
          pickerFallback="#ffffff"
        />

        <ColorField
          id="section.style.gradientTo"
          label="Gradient end"
          value={normalized.style?.gradientTo}
          onChange={(next) => updateStyle(value, onChange, { gradientTo: next })}
          onClear={() => clearStyleField(value, onChange, "gradientTo")}
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
      <WidgetEditorSection
        title="Background media and layers"
        description="Add decorative image or video layers while keeping Section content above the surface."
        id="section.background-media-layers"
      >
        <WidgetControlRow id="section.style.backgroundMedia.type" label="Background media type">
          {(fieldProps) => (
            <Select
              value={backgroundMediaType}
              onValueChange={(next) =>
                handleBackgroundMediaTypeChange(next as SectionBackgroundMediaType)
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select media type" />
              </SelectTrigger>
              <SelectContent>
                {backgroundMediaTypeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        {backgroundMediaType !== "none" ? (
          <>
            <SectionBackgroundMediaSourceFields
              media={backgroundMedia}
              mediaType={backgroundMediaType}
              onChange={(patch) => updateBackgroundMedia(value, onChange, patch)}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <WidgetControlRow id="section.style.backgroundMedia.fit" label="Media fit">
                {(fieldProps) => (
                  <Select
                    value={backgroundMedia.fit ?? "cover"}
                    onValueChange={(next) =>
                      updateBackgroundMedia(value, onChange, {
                        fit: next as SectionBackgroundMediaFit,
                      })
                    }
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select fit" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundMediaFitOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>

              <WidgetControlRow id="section.style.backgroundMedia.position" label="Media position">
                {(fieldProps) => (
                  <Select
                    value={backgroundMedia.position ?? "center"}
                    onValueChange={(next) =>
                      updateBackgroundMedia(value, onChange, {
                        position: next as SectionBackgroundMediaPosition,
                      })
                    }
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundMediaPositionOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>

              <WidgetControlRow id="section.style.backgroundMedia.blendMode" label="Blend mode">
                {(fieldProps) => (
                  <Select
                    value={backgroundMedia.blendMode ?? "normal"}
                    onValueChange={(next) =>
                      updateBackgroundMedia(value, onChange, {
                        blendMode: next as SectionBackgroundMediaBlendMode,
                      })
                    }
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select blend mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundMediaBlendModeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>

              <WidgetControlRow id="section.style.backgroundMedia.layerOrder" label="Layer order">
                {(fieldProps) => (
                  <Select
                    value={backgroundMedia.layerOrder ?? "media-under-overlay"}
                    onValueChange={(next) =>
                      updateBackgroundMedia(value, onChange, {
                        layerOrder: next as SectionLayerOrder,
                      })
                    }
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select layer order" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundMediaLayerOrderOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>

              <WidgetControlRow
                id="section.style.backgroundMedia.opacity"
                label="Media opacity (%)"
              >
                {(fieldProps) => (
                  <Input
                    id={fieldProps.id}
                    type="number"
                    min={0}
                    max={100}
                    value={String(clampMediaOpacity(backgroundMedia.opacity))}
                    onChange={(event) =>
                      updateBackgroundMedia(value, onChange, {
                        opacity: clampMediaOpacity(Number(event.target.value)),
                      })
                    }
                    aria-labelledby={fieldProps["aria-labelledby"]}
                    aria-describedby={fieldProps["aria-describedby"]}
                  />
                )}
              </WidgetControlRow>
            </div>

            {backgroundMediaType === "video" ? (
              <>
                <WidgetControlRow
                  id="section.style.backgroundMedia.title"
                  label="Background video title"
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={backgroundMedia.title ?? ""}
                      onChange={(event) =>
                        updateBackgroundMedia(value, onChange, { title: event.target.value })
                      }
                      placeholder="Ambient background video"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>

                <WidgetControlRow
                  id="section.style.backgroundMedia.description"
                  label="Background video description"
                >
                  {(fieldProps) => (
                    <Textarea
                      id={fieldProps.id}
                      value={backgroundMedia.description ?? ""}
                      onChange={(event) =>
                        updateBackgroundMedia(value, onChange, {
                          description: event.target.value,
                        })
                      }
                      placeholder="Optional notes for this decorative video"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>

                <SectionBackgroundPosterFields
                  media={backgroundMedia}
                  onChange={(patch) => updateBackgroundMedia(value, onChange, patch)}
                  onClear={() =>
                    updateBackgroundMedia(value, onChange, {
                      posterSource: undefined,
                      posterAssetId: undefined,
                      posterSrc: undefined,
                    })
                  }
                />
              </>
            ) : null}
          </>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Background media is decorative only. Section headings and region content stay above media
          and overlay layers.
        </p>
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
                  updateSemantics(value, onChange, {
                    anchorId: sanitizeSectionAnchorId(event.target.value),
                  })
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
