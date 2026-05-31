import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";

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

import {
  logoCloudDefaults,
  logoCloudLogoMax,
  normalizeLogoCloudData,
  normalizeLogoCloudLogos,
  resolveLogoCloudVariant,
  type LogoCloudAlignment,
  type LogoCloudData,
  type LogoCloudGap,
  type LogoCloudHeaderAlign,
  type LogoCloudHeaderSize,
  type LogoCloudHeight,
  type LogoCloudLinkTarget,
  type LogoCloudLogo,
  type LogoCloudMotionMode,
  type LogoCloudRowMode,
  type LogoCloudTileBorderWidth,
  type LogoCloudTileRadius,
  type LogoCloudVariantId,
} from "../../../../widgets/core/logoCloud";
import { normalizeWidgetSafeHref } from "../../../../widgets/core/widgetSafeHref";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl, describeSharedColorControlState } from "./SharedColorControl";

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
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const gapOptions: Array<{ id: LogoCloudGap; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const alignmentOptions: Array<{ id: LogoCloudAlignment; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
];

const headerAlignOptions: Array<{ id: LogoCloudHeaderAlign; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
];

const headerSizeOptions: Array<{ id: LogoCloudHeaderSize; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

const rowModeOptions: Array<{ id: LogoCloudRowMode; label: string }> = [
  { id: "wrap", label: "Wrapped rows" },
  { id: "single-row", label: "Single row scroll" },
];

const motionModeOptions: Array<{ id: LogoCloudMotionMode; label: string }> = [
  { id: "static", label: "Static" },
  { id: "marquee", label: "Marquee" },
];

const tileRadiusOptions: Array<{ id: LogoCloudTileRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
  { id: "full", label: "Full" },
];

const tileBorderWidthOptions: Array<{ id: LogoCloudTileBorderWidth; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Standard" },
  { id: "md", label: "Heavy" },
];

const linkTargetOptions: Array<{ id: LogoCloudLinkTarget; label: string }> = [
  { id: "same-tab", label: "Same tab" },
  { id: "new-tab", label: "New tab" },
];

const logoCountOptions = Array.from({ length: logoCloudLogoMax }, (_, index) => String(index + 1));

type HeaderData = NonNullable<LogoCloudData["header"]>;
type CtaData = NonNullable<LogoCloudData["cta"]>;
type StyleData = NonNullable<LogoCloudData["style"]>;
type PendingLogoRemoval = {
  logo: LogoCloudLogo;
  index: number;
  editVersion: number;
} | null;
type LogoDragState = {
  logoKey: string;
  fromIndex: number;
  editVersion: number;
} | null;
type CommitLogoEditResult = {
  next: LogoCloudData;
  pendingRemoval?: PendingLogoRemoval;
};
type CommitLogoEditOptions = {
  structural?: boolean;
};
type CommitLogoMutation = (
  updater: (current: LogoCloudData) => LogoCloudData,
  options?: { structural?: boolean }
) => void;
type LogoMediaPickerChange =
  | { kind: "select"; assetId: string }
  | { kind: "clear" }
  | { kind: "invalid" };

function normalizeValue(value: LogoCloudData): LogoCloudData {
  return normalizeLogoCloudData(value);
}

const isValidLogoCloudImageUrl = (value: string | undefined) =>
  !value?.trim() ||
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHttp: true,
  }) !== undefined;

function resolveLogoMediaPickerChange(value: unknown): LogoMediaPickerChange {
  if (value === null) return { kind: "clear" };
  if (typeof value === "string" && value.trim().length > 0) {
    return { kind: "select", assetId: value.trim() };
  }
  return { kind: "invalid" };
}

function resolveLogoRowKey(index: number, logo: LogoCloudLogo) {
  return logo.id?.trim() || `index:${index}`;
}

function resolveLogoDragKey(index: number, logo: LogoCloudLogo) {
  return resolveLogoRowKey(index, logo);
}

function resolveLogoPreviewLabel(logo: LogoCloudLogo, index: number) {
  return logo.alt?.trim() || logo.name?.trim() || `Logo ${index + 1}`;
}

async function resolveLogoMediaAsset(assetId: string) {
  const items = await listMediaCached({ force: false });
  const media = items.find((item) => item.id === assetId);
  if (!media?.url) throw new Error("logo_cloud_media_not_found");
  if (!(media.type === "image" || media.mimeType.trim().toLowerCase().startsWith("image/"))) {
    throw new Error("logo_cloud_media_unsupported");
  }

  return {
    image: media.url,
    alt: media.alt?.trim() || media.title?.trim() || media.originalName?.trim(),
    name: media.title?.trim() || media.originalName?.trim(),
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
  value: LogoCloudVariantId;
  onChange?: (next: string) => void;
  controlPath?: string;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          data-widget-control={`logo-cloud-variant-${option.id}`}
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

function updateCta(
  value: LogoCloudData,
  onChange: (next: LogoCloudData) => void,
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

function clearStyle(
  value: LogoCloudData,
  onChange: (next: LogoCloudData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

function patchLogoCloudLogo(current: LogoCloudData, index: number, patch: Partial<LogoCloudLogo>) {
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
}

function setLogoCountInData(current: LogoCloudData, count: number) {
  return {
    ...current,
    logos: normalizeLogoCloudLogos(current.logos, count),
  };
}

function resolveLogoRemovalLabel(logo: LogoCloudLogo, index: number) {
  return logo.name?.trim() || logo.alt?.trim() || `Logo ${index + 1}`;
}

function confirmLogoCountReduction(logos: LogoCloudLogo[], nextCount: number) {
  if (nextCount >= logos.length) return true;
  if (typeof window === "undefined" || typeof window.confirm !== "function") return true;

  const removed = logos.slice(nextCount);
  if (removed.length === 0) return true;

  const visibleLabels = removed
    .slice(0, 5)
    .map((logo, index) => resolveLogoRemovalLabel(logo, nextCount + index));
  const extraCount = removed.length - visibleLabels.length;
  const extraCopy = extraCount > 0 ? ` and ${extraCount} more` : "";

  return window.confirm(
    `Reduce logo count to ${nextCount}? This removes ${removed.length} logo${
      removed.length === 1 ? "" : "s"
    }: ${visibleLabels.join(", ")}${extraCopy}. This cannot be undone.`
  );
}

function addLogoToData(current: LogoCloudData) {
  const logos = normalizeLogoCloudLogos(current.logos);
  if (logos.length >= logoCloudLogoMax) return current;

  return {
    ...current,
    logos: normalizeLogoCloudLogos(
      [...logos, { name: `Logo ${logos.length + 1}` }],
      logos.length + 1
    ),
  };
}

function moveLogoInData(current: LogoCloudData, fromIndex: number, toIndex: number) {
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
}

function getLogoCloudLinkFeedback(value: string | undefined) {
  if (!value?.trim()) return null;
  const safeHref = normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });
  if (safeHref) return null;
  return "Use a relative path, hash, or full URL. Unsafe links are not rendered publicly.";
}

function getLogoCloudImageFeedback(value: string | undefined) {
  if (!value?.trim()) return null;
  if (isValidLogoCloudImageUrl(value)) return null;
  return "Use a relative path or http/https image URL. Invalid values do not render a logo preview.";
}

function findOptionLabel<T extends string>(
  options: Array<{ id: T; label: string }>,
  value: T | undefined,
  fallback: string
) {
  return options.find((option) => option.id === value)?.label ?? fallback;
}

function describeLogoCloudColor(value: string | undefined) {
  return describeSharedColorControlState({ value }).label;
}

function summarizeLogoCloudImages(logos: LogoCloudLogo[]) {
  const imageCount = logos.filter((logo) => (logo.image ?? "").trim().length > 0).length;
  if (imageCount === 0) return "No logo images selected yet";
  if (imageCount === logos.length) return "Every logo has an image";
  return `${imageCount} of ${logos.length} logos have images`;
}

function summarizeLogoCloudLinks(logos: LogoCloudLogo[], openInNewTab: boolean | undefined) {
  const linkCount = logos.filter((logo) => (logo.href ?? "").trim().length > 0).length;
  if (linkCount === 0) return "Logo tiles are not linked";
  const targetLabel = openInNewTab ? "new tabs" : "the same tab";
  return linkCount === 1
    ? `1 logo link opens in ${targetLabel}`
    : `${linkCount} logos link to ${targetLabel}`;
}

function summarizeLogoCloudCta(cta: CtaData) {
  if (!cta.enabled) return "Hidden";
  if (!(cta.label ?? "").trim() || !(cta.href ?? "").trim()) {
    return "Enabled but missing a label or destination";
  }
  return `Visible, opens in ${cta.target === "new-tab" ? "a new tab" : "the same tab"}`;
}

function summarizeLogoCloudStripBehavior({
  variant,
  style,
  logoCount,
}: {
  variant: LogoCloudVariantId;
  style: StyleData;
  logoCount: number;
}) {
  const savedRow = findOptionLabel(rowModeOptions, style.rowMode, "Wrapped rows");
  const savedMotion = findOptionLabel(motionModeOptions, style.motionMode, "Static");

  if (variant !== "strip") {
    const variantLabel = variantOptions.find((option) => option.id === variant)?.label ?? "Grid";
    return `Effective in ${variantLabel}: not active. Saved Strip settings: ${savedRow} / ${savedMotion}.`;
  }

  if (style.motionMode === "marquee" && logoCount <= 1) {
    return `Effective in Strip: Single row / Static because marquee needs at least 2 logos. Saved Strip settings: ${savedRow} / ${savedMotion}.`;
  }

  const effectiveRow = style.motionMode === "marquee" ? "Single row scroll" : savedRow;
  return `Effective in Strip: ${effectiveRow} / ${savedMotion}.`;
}

function useLogoMediaSelection({
  latestValueRef,
  commitLogoMutation,
}: {
  latestValueRef: MutableRefObject<LogoCloudData>;
  commitLogoMutation: CommitLogoMutation;
}) {
  const requestIdsByLogoRef = useRef<Record<string, number>>({});
  const structureVersionRef = useRef(0);
  const [selectedAssetIdsByLogoKey, setSelectedAssetIdsByLogoKey] = useState<
    Record<string, string>
  >({});
  const [mediaPickerErrorsByLogoKey, setMediaPickerErrorsByLogoKey] = useState<
    Record<string, string>
  >({});

  const setLogoMediaError = (logoKey: string, message?: string) => {
    setMediaPickerErrorsByLogoKey((current) => {
      if (!message) {
        const { [logoKey]: _removed, ...next } = current;
        return next;
      }
      return {
        ...current,
        [logoKey]: message,
      };
    });
  };

  const clearTransientAssetSelection = (index: number, logo: LogoCloudLogo) => {
    const rowKey = resolveLogoRowKey(index, logo);
    setSelectedAssetIdsByLogoKey((current) => {
      const { [rowKey]: _removed, ...next } = current;
      return next;
    });
    setLogoMediaError(rowKey);
  };

  const resolveRequestKey = (index: number, logo: LogoCloudLogo) =>
    `${structureVersionRef.current}:${resolveLogoRowKey(index, logo)}`;

  const invalidateLogoMediaRequest = (index: number, logo: LogoCloudLogo) => {
    const requestKey = resolveRequestKey(index, logo);
    requestIdsByLogoRef.current[requestKey] = (requestIdsByLogoRef.current[requestKey] ?? 0) + 1;
  };

  const invalidateAllLogoMediaRequests = () => {
    structureVersionRef.current += 1;
    requestIdsByLogoRef.current = {};
    setSelectedAssetIdsByLogoKey({});
    setMediaPickerErrorsByLogoKey({});
  };

  const findLogoIndexByRequestKey = (requestKey: string) => {
    const logos = normalizeLogoCloudLogos(latestValueRef.current.logos);
    const rowKey = requestKey.slice(requestKey.indexOf(":") + 1);
    if (!rowKey.startsWith("index:")) {
      return logos.findIndex((item) => item.id === rowKey);
    }
    const fallbackIndex = Number(rowKey.slice("index:".length));
    return Number.isInteger(fallbackIndex) ? fallbackIndex : -1;
  };

  const commitLogoPatch = (index: number, patch: Partial<LogoCloudLogo>) => {
    commitLogoMutation((current) => patchLogoCloudLogo(current, index, patch));
  };

  const getLogoPickerValue = (index: number, logo: LogoCloudLogo) =>
    selectedAssetIdsByLogoKey[resolveLogoRowKey(index, logo)] ?? null;

  const getLogoMediaError = (index: number, logo: LogoCloudLogo) =>
    mediaPickerErrorsByLogoKey[resolveLogoRowKey(index, logo)] ?? null;

  const clearLogoImage = (index: number, logo: LogoCloudLogo) => {
    invalidateLogoMediaRequest(index, logo);
    clearTransientAssetSelection(index, logo);
    commitLogoPatch(index, { image: "" });
  };

  const handleLogoAssetChange = async (
    index: number,
    logo: LogoCloudLogo,
    change: LogoMediaPickerChange
  ) => {
    const rowKey = resolveLogoRowKey(index, logo);

    if (change.kind === "clear") {
      clearLogoImage(index, logo);
      return;
    }
    if (change.kind === "invalid") {
      invalidateLogoMediaRequest(index, logo);
      return;
    }

    const assetId = change.assetId;
    const requestKey = resolveRequestKey(index, logo);
    const requestId = (requestIdsByLogoRef.current[requestKey] ?? 0) + 1;
    requestIdsByLogoRef.current[requestKey] = requestId;
    setSelectedAssetIdsByLogoKey((current) => ({ ...current, [rowKey]: assetId }));
    setLogoMediaError(rowKey);

    try {
      const next = await resolveLogoMediaAsset(assetId);
      if (requestIdsByLogoRef.current[requestKey] !== requestId) return;
      const latestIndex = findLogoIndexByRequestKey(requestKey);
      if (latestIndex < 0) return;
      const latestLogo = normalizeLogoCloudLogos(latestValueRef.current.logos)[latestIndex];
      if (!latestLogo) return;
      commitLogoPatch(latestIndex, {
        image: next.image,
        alt: latestLogo.alt?.trim() ? latestLogo.alt : next.alt,
        name: latestLogo.name?.trim() ? latestLogo.name : next.name,
      });
    } catch (error) {
      clearTransientAssetSelection(index, logo);
      setLogoMediaError(
        rowKey,
        error instanceof Error && error.message === "logo_cloud_media_unsupported"
          ? `Logo ${index + 1}: selected media must be an image asset.`
          : `Logo ${index + 1}: failed to resolve selected media.`
      );
    }
  };

  return {
    commitLogoPatch,
    getLogoMediaError,
    getLogoPickerValue,
    handleLogoAssetChange,
    clearLogoImage,
    invalidateAllLogoMediaRequests,
  };
}

function useLogoCloudEditCoordinator({
  value,
  onChange,
}: {
  value: LogoCloudData;
  onChange: (next: LogoCloudData) => void;
}) {
  const latestValueRef = useRef(value);
  const mediaSelectionRef = useRef<ReturnType<typeof useLogoMediaSelection> | null>(null);
  const editVersionRef = useRef(0);
  const [pendingRemoval, setPendingRemoval] = useState<PendingLogoRemoval>(null);
  const [dragState, setDragState] = useState<LogoDragState>(null);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const commitLogoEdit = (
    updater: (
      current: LogoCloudData,
      nextEditVersion: number
    ) => LogoCloudData | CommitLogoEditResult,
    options: CommitLogoEditOptions = {}
  ) => {
    const current = normalizeValue(latestValueRef.current);
    const nextEditVersion = editVersionRef.current + 1;
    const result = updater(current, nextEditVersion);
    const next = "next" in result ? result.next : result;
    if (next === current) return;
    if (options?.structural) {
      mediaSelectionRef.current?.invalidateAllLogoMediaRequests();
    }
    const normalizedNext = normalizeValue(next);
    editVersionRef.current = nextEditVersion;
    latestValueRef.current = normalizedNext;
    setDragState(null);
    setPendingRemoval("next" in result ? (result.pendingRemoval ?? null) : null);
    onChange(normalizedNext);
  };

  const commitLogoMutation: CommitLogoMutation = (updater, options) => {
    commitLogoEdit((current) => updater(current), options);
  };

  const mediaSelection = useLogoMediaSelection({
    latestValueRef,
    commitLogoMutation,
  });

  useEffect(() => {
    mediaSelectionRef.current = mediaSelection;
  }, [mediaSelection]);

  const removeLogoWithUndo = (index: number) => {
    commitLogoEdit(
      (current, nextEditVersion) => {
        const logos = normalizeLogoCloudLogos(current.logos);
        const removed = logos[index];
        if (!removed || logos.length <= 1) return current;
        return {
          next: {
            ...current,
            logos: normalizeLogoCloudLogos(
              logos.filter((_, currentIndex) => currentIndex !== index),
              logos.length - 1
            ),
          },
          pendingRemoval: {
            logo: removed,
            index,
            editVersion: nextEditVersion,
          },
        };
      },
      { structural: true }
    );
  };

  const restoreRemovedLogo = () => {
    const removal = pendingRemoval;
    if (!removal) return;
    if (removal.editVersion !== editVersionRef.current) {
      setPendingRemoval(null);
      return;
    }
    commitLogoEdit(
      (current) => {
        const logos = normalizeLogoCloudLogos(current.logos);
        const nextLogos = [...logos];
        nextLogos.splice(Math.min(removal.index, nextLogos.length), 0, removal.logo);
        return {
          ...current,
          logos: normalizeLogoCloudLogos(nextLogos, nextLogos.length),
        };
      },
      { structural: true }
    );
  };

  const dismissPendingRemoval = () => {
    setPendingRemoval(null);
  };

  const startLogoDrag = (index: number, logo: LogoCloudLogo) => {
    setDragState({
      logoKey: resolveLogoDragKey(index, logo),
      fromIndex: index,
      editVersion: editVersionRef.current,
    });
  };

  const endLogoDrag = () => {
    setDragState(null);
  };

  const dropLogoAtIndex = (toIndex: number) => {
    const activeDrag = dragState;
    if (!activeDrag) return;
    if (activeDrag.editVersion !== editVersionRef.current) {
      setDragState(null);
      return;
    }
    const current = normalizeLogoCloudLogos(latestValueRef.current.logos);
    const fromIndex = current.findIndex(
      (item, itemIndex) => resolveLogoDragKey(itemIndex, item) === activeDrag.logoKey
    );
    if (fromIndex < 0 || fromIndex === toIndex || toIndex < 0 || toIndex >= current.length) {
      setDragState(null);
      return;
    }
    commitLogoEdit((valueToUpdate) => moveLogoInData(valueToUpdate, fromIndex, toIndex), {
      structural: true,
    });
  };

  return {
    commitLogoMutation,
    mediaSelection,
    pendingRemoval,
    dismissPendingRemoval,
    removeLogoWithUndo,
    restoreRemovedLogo,
    dragState,
    startLogoDrag,
    endLogoDrag,
    dropLogoAtIndex,
  };
}

function LogoCloudImagePreview({ logo, index }: { logo: LogoCloudLogo; index: number }) {
  const src = logo.image?.trim() ?? "";
  const label = resolveLogoPreviewLabel(logo, index);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/10 p-3"
        data-logo-cloud-preview-status="empty"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed bg-background text-xs text-muted-foreground">
          Logo
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Placeholder preview</p>
          <p className="text-xs text-muted-foreground">No image selected yet.</p>
        </div>
      </div>
    );
  }

  if (!isValidLogoCloudImageUrl(src) || failedSrc === src) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/10 p-3"
        data-logo-cloud-preview-status="error"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed bg-background text-xs text-muted-foreground">
          !
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Preview unavailable</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg border bg-muted/10 p-3"
      data-logo-cloud-preview-status="image"
    >
      <img
        src={src}
        alt={label}
        className="h-12 w-12 rounded object-contain"
        loading="lazy"
        onError={() => setFailedSrc(src)}
        onLoad={() => setFailedSrc((current) => (current === src ? null : current))}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">Image preview</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function LogoImageControl({
  logo,
  index,
  mediaSelection,
}: {
  logo: LogoCloudLogo;
  index: number;
  mediaSelection: ReturnType<typeof useLogoMediaSelection>;
}) {
  const imageFeedback = getLogoCloudImageFeedback(logo.image ?? undefined);
  const linkFeedback = getLogoCloudLinkFeedback(logo.href ?? undefined);
  const mediaError = mediaSelection.getLogoMediaError(index, logo);

  return (
    <div className="space-y-3">
      <div
        data-widget-control={`logo-cloud.logo-${index + 1}.name`}
        data-widget-control-path="logos.name"
        data-widget-control-ownership="writable"
        className="space-y-2"
      >
        <p className="text-sm font-medium">Name</p>
        <Input
          value={logo.name ?? ""}
          onChange={(event) => mediaSelection.commitLogoPatch(index, { name: event.target.value })}
          placeholder={`Logo ${index + 1}`}
        />
      </div>

      <LogoCloudImagePreview logo={logo} index={index} />

      <div
        data-widget-control={`logo-cloud.logo-${index + 1}.image`}
        data-widget-control-path="logos.image"
        data-widget-control-ownership="writable"
        className="space-y-2"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Media library</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => mediaSelection.clearLogoImage(index, logo)}
            disabled={!(logo.image ?? "").trim()}
          >
            Clear image
          </Button>
        </div>
        <MediaPicker
          value={mediaSelection.getLogoPickerValue(index, logo)}
          onChange={(next) =>
            void mediaSelection.handleLogoAssetChange(
              index,
              logo,
              resolveLogoMediaPickerChange(next)
            )
          }
          multiple={false}
          accept={["image/*"]}
        />
        <p className="text-xs text-muted-foreground">
          Selecting an asset updates the current image URL for this logo.
        </p>
        {mediaError ? <p className="text-xs text-destructive">{mediaError}</p> : null}
      </div>

      <div
        data-widget-control={`logo-cloud.logo-${index + 1}.image-status`}
        data-widget-control-path="logos.image"
        data-widget-control-ownership="readonly"
        className="space-y-2"
      >
        <p className="text-sm font-medium">Current image</p>
        {(logo.image ?? "").trim().length > 0 ? (
          <p className="rounded-md border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            A logo image is already configured. Pick an image from the Media Library to replace it.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pick a logo image from the Media Library. Existing external images stay read-only.
          </p>
        )}
        {imageFeedback ? (
          <p className="text-xs text-amber-700">
            Saved logo image is not public-safe and will not render. Clear it or pick a Media
            Library image.
          </p>
        ) : null}
      </div>

      <div
        data-widget-control={`logo-cloud.logo-${index + 1}.alt`}
        data-widget-control-path="logos.alt"
        data-widget-control-ownership="writable"
        className="space-y-2"
      >
        <p className="text-sm font-medium">Accessible description</p>
        <Input
          value={logo.alt ?? ""}
          onChange={(event) => mediaSelection.commitLogoPatch(index, { alt: event.target.value })}
          placeholder="Accessible logo name"
        />
      </div>

      <div
        data-widget-control={`logo-cloud.logo-${index + 1}.href`}
        data-widget-control-path="logos.href"
        data-widget-control-ownership="writable"
      >
        <LinkDestinationField
          fieldId={`logo-cloud-logo-${index + 1}-destination`}
          label="Logo destination"
          controlPath="logos.href"
          value={logo.href ?? ""}
          onChange={(next) => mediaSelection.commitLogoPatch(index, { href: next })}
          feedback={linkFeedback}
        />
      </div>
    </div>
  );
}

function LogoRemovalUndoNotice({
  pendingRemoval,
  onUndo,
  onDismiss,
}: {
  pendingRemoval: PendingLogoRemoval;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!pendingRemoval) return null;
  const label = pendingRemoval.logo.name?.trim() || "Logo removed";

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/10 p-3"
      data-widget-control="logo-cloud-remove-undo"
      data-widget-control-ownership="action"
    >
      <p className="text-sm text-foreground/80">{label} removed. Undo is available.</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onUndo}>
          Undo
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export function LogoCloudWizardEditor({ value, variant }: WidgetEditorProps<LogoCloudData>) {
  const normalized = normalizeValue(value);
  const logos = normalizeLogoCloudLogos(normalized.logos);
  const resolvedVariant = resolveLogoCloudVariant(variant);

  return (
    <WidgetEditorSection
      id="logo-cloud.wizard.starter-setup"
      mode="wizard"
      role="summary"
      title="Starter overview"
      description="Review the current logo cloud structure before daily editing in Visual."
    >
      <ReadonlyWidgetSummaryRow
        id="logo-cloud.wizard.variant"
        label="Current layout"
        path="variant"
        value={
          variantOptions.find((option) => option.id === resolvedVariant)?.label ?? resolvedVariant
        }
      />

      <ReadonlyWidgetSummaryRow
        id="logo-cloud.wizard.logos.count"
        label="Logo count"
        path="logos.count"
        value={`${logos.length} logo${logos.length === 1 ? "" : "s"}`}
      />

      <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
        Use Visual to change layout, adjust logo count, write the section headline, add logo names,
        upload images, and connect destinations.
      </div>
    </WidgetEditorSection>
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
  const cta = normalized.cta ?? logoCloudDefaults.cta!;
  const style = normalized.style ?? logoCloudDefaults.style!;
  const logos = normalizeLogoCloudLogos(normalized.logos);
  const resolvedVariant = resolveLogoCloudVariant(variant);
  const stripLayoutControlsDisabled = resolvedVariant !== "strip";
  const rowModeDisabled = stripLayoutControlsDisabled || style.motionMode === "marquee";
  const stripBehaviorSummary = summarizeLogoCloudStripBehavior({
    variant: resolvedVariant,
    style,
    logoCount: logos.length,
  });
  const {
    commitLogoMutation,
    mediaSelection,
    pendingRemoval,
    dismissPendingRemoval,
    removeLogoWithUndo,
    restoreRemovedLogo,
    dragState,
    startLogoDrag,
    endLogoDrag,
    dropLogoAtIndex,
  } = useLogoCloudEditCoordinator({
    value,
    onChange,
  });

  return (
    <div className="space-y-4">
      <EditorSection
        id="logo-cloud.visual.structure"
        mode="visual"
        role="layout"
        title="Variant and layout structure"
        description="Choose logo cloud presentation and deterministic logo count."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />

        <div
          data-widget-control="logo-cloud.visual.logos.count"
          data-widget-control-path="logos.count"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Logo count</p>
          <Select
            value={String(logos.length)}
            onValueChange={(next) => {
              const nextCount = Number(next);
              if (!confirmLogoCountReduction(logos, nextCount)) return;
              commitLogoMutation((current) => setLogoCountInData(current, nextCount), {
                structural: true,
              });
            }}
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
        id="logo-cloud.visual.header"
        mode="visual"
        role="content"
        title="Header copy"
        description="Edit section title and optional helper description."
      >
        <div
          data-widget-control="logo-cloud.visual.header.eyebrow"
          data-widget-control-path="header.eyebrow"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Eyebrow</p>
          <Input
            value={header.eyebrow ?? ""}
            onChange={(event) => updateHeader(value, onChange, { eyebrow: event.target.value })}
            placeholder="Our partners"
          />
        </div>
        <div
          data-widget-control="logo-cloud.visual.header.title"
          data-widget-control-path="header.title"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Title</p>
          <Input
            value={header.title}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Trusted by teams worldwide"
          />
        </div>
        <div
          data-widget-control="logo-cloud.visual.header.description"
          data-widget-control-path="header.description"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={header.description}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Showcase partner and client logos."
          />
        </div>
      </EditorSection>

      <EditorSection
        id="logo-cloud.visual.logos"
        mode="visual"
        role="content"
        title="Logos list and links"
        description="Manage logo names, image sources, accessible descriptions, and optional target links."
      >
        <LogoRemovalUndoNotice
          pendingRemoval={pendingRemoval}
          onUndo={restoreRemovedLogo}
          onDismiss={dismissPendingRemoval}
        />

        {logos.map((logo, index) => (
          <div
            key={logo.id}
            className={cn(
              "space-y-3 rounded-lg border p-3",
              dragState?.logoKey === resolveLogoDragKey(index, logo)
                ? "border-primary bg-primary/5"
                : undefined
            )}
            data-widget-control="logo-cloud-logo-card"
            data-widget-control-ownership="preview"
            data-logo-cloud-logo-key={resolveLogoDragKey(index, logo)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              dropLogoAtIndex(index);
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  draggable
                  aria-label={`Drag logo ${index + 1} to reorder`}
                  data-widget-control="logo-cloud-drag-handle"
                  data-widget-control-ownership="action"
                  onDragStart={() => startLogoDrag(index, logo)}
                  onDragEnd={endLogoDrag}
                >
                  Drag
                </Button>
                <p className="text-sm font-semibold">Logo {index + 1}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-widget-control="logo-cloud-move-up"
                  data-widget-control-ownership="action"
                  onClick={() =>
                    commitLogoMutation((current) => moveLogoInData(current, index, index - 1), {
                      structural: true,
                    })
                  }
                  disabled={index === 0}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-widget-control="logo-cloud-move-down"
                  data-widget-control-ownership="action"
                  onClick={() =>
                    commitLogoMutation((current) => moveLogoInData(current, index, index + 1), {
                      structural: true,
                    })
                  }
                  disabled={index === logos.length - 1}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-widget-control="logo-cloud-remove"
                  data-widget-control-ownership="action"
                  onClick={() => removeLogoWithUndo(index)}
                  disabled={logos.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>
            <LogoImageControl logo={logo} index={index} mediaSelection={mediaSelection} />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          data-widget-control="logo-cloud.visual.add-logo"
          data-widget-control-ownership="action"
          onClick={() =>
            commitLogoMutation((current) => addLogoToData(current), { structural: true })
          }
          disabled={logos.length >= logoCloudLogoMax}
        >
          Add logo
        </Button>
      </EditorSection>

      <EditorSection
        id="logo-cloud.visual.cta"
        mode="visual"
        role="content"
        title="Section CTA"
        description="Optionally render one safe CTA below the logo list."
      >
        <div
          data-widget-control="logo-cloud.visual.cta.enabled"
          data-widget-control-path="cta.enabled"
          data-widget-control-ownership="writable"
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">Enable CTA</p>
            <p className="text-xs text-muted-foreground">
              Only complete and safe CTA links render in the public widget.
            </p>
          </div>
          <Switch
            checked={Boolean(cta.enabled)}
            onCheckedChange={(checked) => updateCta(value, onChange, { enabled: Boolean(checked) })}
          />
        </div>

        <div
          data-widget-control="logo-cloud.visual.cta.label"
          data-widget-control-path="cta.label"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">CTA label</p>
          <Input
            value={cta.label ?? ""}
            onChange={(event) => updateCta(value, onChange, { label: event.target.value })}
            placeholder="Get started"
          />
        </div>

        <div
          data-widget-control="logo-cloud.visual.cta.href"
          data-widget-control-path="cta.href"
          data-widget-control-ownership="writable"
        >
          <LinkDestinationField
            fieldId="logo-cloud-cta-destination"
            label="CTA destination"
            controlPath="cta.href"
            value={cta.href ?? ""}
            disabled={!cta.enabled}
            onChange={(next) => updateCta(value, onChange, { href: next })}
            feedback={getLogoCloudLinkFeedback(cta.href ?? undefined)}
          />
        </div>

        <div
          data-widget-control="logo-cloud.visual.cta.target"
          data-widget-control-path="cta.target"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">CTA target</p>
          <Select
            value={cta.target}
            onValueChange={(next) =>
              updateCta(value, onChange, { target: next as LogoCloudLinkTarget })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select CTA target" />
            </SelectTrigger>
            <SelectContent>
              {linkTargetOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        id="logo-cloud.visual.display-style"
        mode="visual"
        role="visual"
        title="Display style"
        description="Control logo sizing, spacing, alignment, and hover behavior."
      >
        <div
          data-widget-control="logo-cloud.visual.logo-height"
          data-widget-control-path="style.logoHeight"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
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

        <div
          data-widget-control="logo-cloud.visual.gap"
          data-widget-control-path="style.gap"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Gap</p>
          <Select
            value={style.gap}
            onValueChange={(next) => updateStyle(value, onChange, { gap: next as LogoCloudGap })}
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

        <div
          data-widget-control="logo-cloud.visual.alignment"
          data-widget-control-path="style.alignment"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
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

        <div
          data-widget-control="logo-cloud.visual.header-align"
          data-widget-control-path="style.headerAlign"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Header alignment</p>
          <Select
            value={style.headerAlign}
            onValueChange={(next) =>
              updateStyle(value, onChange, { headerAlign: next as LogoCloudHeaderAlign })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
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

        <div
          data-widget-control="logo-cloud.visual.header-size"
          data-widget-control-path="style.headerSize"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Header size</p>
          <Select
            value={style.headerSize}
            onValueChange={(next) =>
              updateStyle(value, onChange, { headerSize: next as LogoCloudHeaderSize })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
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
          data-widget-control="logo-cloud.visual.row-mode"
          data-widget-control-path="style.rowMode"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Strip row behavior</p>
          <Select
            value={style.rowMode}
            disabled={rowModeDisabled}
            onValueChange={(next) =>
              updateStyle(value, onChange, { rowMode: next as LogoCloudRowMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select row behavior" />
            </SelectTrigger>
            <SelectContent>
              {rowModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {stripLayoutControlsDisabled
              ? "Saved Strip row behavior is inactive in Grid and Dense variants."
              : style.motionMode === "marquee"
                ? "Marquee always uses a single horizontal track, so row behavior stays locked."
                : "Switch between wrapped rows and a single horizontal scroll row."}
          </p>
        </div>

        <div
          data-widget-control="logo-cloud.visual.motion-mode"
          data-widget-control-path="style.motionMode"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Strip motion</p>
          <Select
            value={style.motionMode}
            disabled={stripLayoutControlsDisabled}
            onValueChange={(next) =>
              updateStyle(value, onChange, { motionMode: next as LogoCloudMotionMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select motion" />
            </SelectTrigger>
            <SelectContent>
              {motionModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {stripLayoutControlsDisabled
              ? "Saved Strip motion is inactive in Grid and Dense variants."
              : "Marquee duplicates logos in a reduced-motion-safe scrolling track and pauses on hover or focus."}
          </p>
        </div>

        <div
          data-widget-control="logo-cloud.visual.strip-effective-summary"
          data-widget-control-path="style.motionMode"
          data-widget-control-ownership="readonly"
          className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
        >
          {stripBehaviorSummary}
        </div>

        <div
          data-widget-control="logo-cloud.visual.tile-radius"
          data-widget-control-path="style.tileRadius"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Tile radius</p>
          <Select
            value={style.tileRadius}
            onValueChange={(next) =>
              updateStyle(value, onChange, { tileRadius: next as LogoCloudTileRadius })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tile radius" />
            </SelectTrigger>
            <SelectContent>
              {tileRadiusOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          data-widget-control="logo-cloud.visual.tile-border-width"
          data-widget-control-path="style.tileBorderWidth"
          data-widget-control-ownership="writable"
          className="space-y-2"
        >
          <p className="text-sm font-medium">Tile border width</p>
          <Select
            value={style.tileBorderWidth}
            onValueChange={(next) =>
              updateStyle(value, onChange, { tileBorderWidth: next as LogoCloudTileBorderWidth })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tile border width" />
            </SelectTrigger>
            <SelectContent>
              {tileBorderWidthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          data-widget-control="logo-cloud.visual.open-links-new-tab"
          data-widget-control-path="style.openLinksInNewTab"
          data-widget-control-ownership="writable"
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">Open logo links in new tab</p>
            <p className="text-xs text-muted-foreground">
              Applies the shared safe-link new-tab behavior to every logo tile link.
            </p>
          </div>
          <Switch
            checked={Boolean(style.openLinksInNewTab)}
            onCheckedChange={(checked) =>
              updateStyle(value, onChange, { openLinksInNewTab: Boolean(checked) })
            }
          />
        </div>

        <div
          data-widget-control="logo-cloud.visual.grayscale"
          data-widget-control-path="style.grayscale"
          data-widget-control-ownership="writable"
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">Grayscale logos</p>
            <p className="text-xs text-muted-foreground">
              Converts logo images to grayscale at rest.
            </p>
          </div>
          <Switch
            checked={style.grayscale}
            onCheckedChange={(checked) =>
              updateStyle(value, onChange, {
                grayscale: Boolean(checked),
                ...(checked ? {} : { hoverColor: false }),
              })
            }
          />
        </div>

        <div
          data-widget-control="logo-cloud.visual.hover-color"
          data-widget-control-path="style.hoverColor"
          data-widget-control-ownership="writable"
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">Colorize on hover</p>
            <p className="text-xs text-muted-foreground">
              {style.grayscale
                ? "Removes grayscale effect when hovering a logo."
                : "Requires grayscale mode. Without grayscale this toggle has no visible effect."}
            </p>
          </div>
          <Switch
            disabled={!style.grayscale}
            checked={Boolean(style.grayscale && style.hoverColor)}
            onCheckedChange={(checked) =>
              updateStyle(value, onChange, { hoverColor: Boolean(checked) })
            }
          />
        </div>

        <SharedColorControl
          controlId="logo-cloud.visual.section-background"
          controlPath="style.sectionBackground"
          label="Section background"
          value={style.sectionBackground}
          onChange={(next) => updateStyle(value, onChange, { sectionBackground: next })}
          onClear={() => clearStyle(value, onChange, "sectionBackground")}
          placeholder="var(--color-surface)"
          pickerFallback="#ffffff"
          showValueInput={false}
        />

        <SharedColorControl
          controlId="logo-cloud.visual.tile-background"
          controlPath="style.tileBackground"
          label="Tile background"
          value={style.tileBackground}
          onChange={(next) => updateStyle(value, onChange, { tileBackground: next })}
          onClear={() => clearStyle(value, onChange, "tileBackground")}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
          showValueInput={false}
        />

        <SharedColorControl
          controlId="logo-cloud.visual.tile-border"
          controlPath="style.tileBorderColor"
          label="Tile border"
          value={style.tileBorderColor}
          onChange={(next) => updateStyle(value, onChange, { tileBorderColor: next })}
          onClear={() => clearStyle(value, onChange, "tileBorderColor")}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
          showValueInput={false}
        />
      </EditorSection>
    </div>
  );
}

export function LogoCloudAdvancedEditor({ value, variant }: WidgetEditorProps<LogoCloudData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveLogoCloudVariant(variant);
  const variantLabel = variantOptions.find((option) => option.id === resolvedVariant)?.label;
  const logos = normalizeLogoCloudLogos(normalized.logos);
  const cta = normalized.cta ?? logoCloudDefaults.cta!;
  const style = normalized.style ?? logoCloudDefaults.style!;

  return (
    <div className="space-y-4">
      <EditorSection
        id="logo-cloud.advanced.layout-summary"
        mode="advanced"
        role="diagnostics"
        title="Layout summary"
        description="Read-only view of how this logo cloud will render. Change layout in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-variant"
          label="Layout"
          path="variant"
          value={variantLabel ?? "Grid"}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-logos-count"
          label="Logos"
          path="logos.count"
          value={`${logos.length} ${logos.length === 1 ? "logo" : "logos"}`}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-logo-height"
          label="Logo height"
          path="style.logoHeight"
          value={findOptionLabel(logoHeightOptions, style.logoHeight, "Medium")}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-spacing"
          label="Spacing"
          path="style.gap"
          value={findOptionLabel(gapOptions, style.gap, "Default")}
        />
      </EditorSection>

      <EditorSection
        id="logo-cloud.advanced.content-summary"
        mode="advanced"
        role="diagnostics"
        title="Content summary"
        description="Read-only health check for logo media, destinations, and the optional CTA."
      >
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-header"
          label="Header"
          path="header"
          value={normalized.header?.title?.trim() ? "Configured" : "No section title"}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-images"
          label="Logo images"
          path="logos"
          value={summarizeLogoCloudImages(logos)}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-links"
          label="Logo destinations"
          path="logos"
          value={summarizeLogoCloudLinks(logos, style.openLinksInNewTab)}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-cta"
          label="Section CTA"
          path="cta"
          value={summarizeLogoCloudCta(cta)}
        />
      </EditorSection>

      <EditorSection
        id="logo-cloud.advanced.presentation-summary"
        mode="advanced"
        role="diagnostics"
        title="Presentation summary"
        description="Read-only style state. Authors replace spacing, motion, and colors in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-alignment"
          label="Alignment"
          path="style.alignment"
          value={findOptionLabel(alignmentOptions, style.alignment, "Center")}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-header-style"
          label="Header style"
          path="style.headerAlign"
          value={`${findOptionLabel(headerAlignOptions, style.headerAlign, "Center")} / ${findOptionLabel(headerSizeOptions, style.headerSize, "Medium")}`}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-strip-behavior"
          label="Strip behavior"
          path="style.rowMode"
          value={summarizeLogoCloudStripBehavior({
            variant: resolvedVariant,
            style,
            logoCount: logos.length,
          })}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-tile-shape"
          label="Tile shape"
          path="style.tileRadius"
          value={`${findOptionLabel(tileRadiusOptions, style.tileRadius, "Large")} corners, ${findOptionLabel(tileBorderWidthOptions, style.tileBorderWidth, "Standard")} border`}
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-logo-filter"
          label="Logo filter"
          path="style.grayscale"
          value={
            style.grayscale
              ? style.hoverColor
                ? "Grayscale with color on hover"
                : "Grayscale"
              : "Full color"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-colors"
          label="Colors"
          path="style"
          value={`Section: ${describeLogoCloudColor(style.sectionBackground)}, tile: ${describeLogoCloudColor(style.tileBackground)}, border: ${describeLogoCloudColor(style.tileBorderColor)}`}
        />
      </EditorSection>

      <EditorSection
        id="logo-cloud.advanced.authoring-boundaries"
        mode="advanced"
        role="summary"
        title="Authoring boundaries"
        description="This tab is intentionally read-only for authors."
      >
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-daily-owner"
          label="Daily editing"
          value="Use Visual for logos, images, destinations, CTA, layout, motion, and colors."
        />
        <ReadonlyWidgetSummaryRow
          id="logo-cloud-advanced-setup-owner"
          label="Starter setup"
          value="Wizard is available only for first setup or explicit Run setup again."
        />
      </EditorSection>
    </div>
  );
}
