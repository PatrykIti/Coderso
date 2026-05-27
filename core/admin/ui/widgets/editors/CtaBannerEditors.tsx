import { type ReactNode, useRef, useState } from "react";

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
import { isApiClientError } from "@/services/apiClient";
import { listMediaCached } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { cn } from "@/lib/utils";

import { ConfirmActionDialog } from "../../shared/ConfirmActionDialog";
import {
  ctaBannerDefaults,
  normalizeCtaBannerData,
  resolveCtaBannerVariant,
  type CtaActionIcon,
  type CtaBackgroundMediaFit,
  type CtaBackgroundMediaPosition,
  type CtaBackgroundMediaType,
  type CtaBannerAction,
  type CtaBannerBorderWidth,
  type CtaBannerData,
  type CtaBannerPadding,
  type CtaBannerRadius,
  type CtaBannerVariantId,
  type CtaButtonRadius,
  type CtaButtonSize,
  type CtaMotionPreset,
} from "../../../../widgets/core/ctaBanner";
import { normalizeWidgetSafeHref } from "../../../../widgets/core/widgetSafeHref";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { resolveColorPickerValue } from "./ClearableFields";
import { LinkDestinationField } from "./LinkDestinationField";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

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

const buttonRadiusOptions: Array<{ id: string; label: string }> = [
  { id: "__default__", label: "Default (rounded-md)" },
  { id: "inherit", label: "Match banner radius" },
  { id: "none", label: "None" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
  { id: "2xl", label: "2XL" },
  { id: "pill", label: "Pill" },
];

const buttonSizeOptions: Array<{ id: CtaButtonSize; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

const actionIconOptions: Array<{ id: CtaActionIcon; label: string }> = [
  { id: "none", label: "None" },
  { id: "arrow-right", label: "Arrow right" },
  { id: "chevron-right", label: "Chevron right" },
  { id: "external-link", label: "External link" },
];

const mediaTypeOptions: Array<{ id: CtaBackgroundMediaType; label: string }> = [
  { id: "none", label: "None" },
  { id: "image", label: "Image" },
];

const mediaFitOptions: Array<{ id: CtaBackgroundMediaFit; label: string }> = [
  { id: "cover", label: "Cover" },
  { id: "contain", label: "Contain" },
];

const mediaPositionOptions: Array<{ id: CtaBackgroundMediaPosition; label: string }> = [
  { id: "center", label: "Center" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
];

const motionOptions: Array<{ id: CtaMotionPreset; label: string }> = [
  { id: "none", label: "Static" },
  { id: "fade-in", label: "Fade in" },
  { id: "slide-up", label: "Slide up" },
];

const ctaBannerPalettePresets = [
  {
    id: "light",
    label: "Light",
    style: {
      text: "#0f172a",
      border: "#e2e8f0",
      badgeBackground: "#1d4ed8",
      badgeText: "#ffffff",
      primaryButtonBg: "#1d4ed8",
      primaryButtonText: "#ffffff",
      primaryButtonBorder: "transparent",
      secondaryButtonBg: "transparent",
      secondaryButtonText: "#0f172a",
      secondaryButtonBorder: "#e2e8f0",
    },
    background: {
      color: "#f8fafc",
    },
  },
  {
    id: "dark",
    label: "Dark",
    style: {
      text: "#f8fafc",
      border: "#334155",
      badgeBackground: "#38bdf8",
      badgeText: "#082f49",
      primaryButtonBg: "#38bdf8",
      primaryButtonText: "#082f49",
      primaryButtonBorder: "transparent",
      secondaryButtonBg: "transparent",
      secondaryButtonText: "#f8fafc",
      secondaryButtonBorder: "#334155",
    },
    background: {
      color: "#0f172a",
    },
  },
  {
    id: "brand",
    label: "Brand",
    style: {
      text: "#1e3a8a",
      border: "#93c5fd",
      badgeBackground: "#1d4ed8",
      badgeText: "#eff6ff",
      primaryButtonBg: "#1d4ed8",
      primaryButtonText: "#eff6ff",
      primaryButtonBorder: "transparent",
      secondaryButtonBg: "transparent",
      secondaryButtonText: "#1e3a8a",
      secondaryButtonBorder: "#93c5fd",
    },
    background: {
      color: "#eff6ff",
    },
  },
] as const;

const ctaHrefOptions = {
  allowRelative: true,
  allowHash: true,
  allowHttp: true,
} as const;

const linearGradientPattern =
  /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)$/;
const defaultGradientStart = "#0f172a";
const defaultGradientEnd = "#475569";
const defaultGradientAngle = 135;

type ContentData = NonNullable<CtaBannerData["content"]>;
type ActionsData = NonNullable<CtaBannerData["actions"]>;
type StyleData = NonNullable<CtaBannerData["style"]>;
type BackgroundData = NonNullable<CtaBannerData["background"]>;
type BackgroundMediaData = NonNullable<BackgroundData["media"]>;

function normalizeValue(value: CtaBannerData): CtaBannerData {
  return normalizeCtaBannerData(value);
}

function EditorSection({
  id,
  mode = "visual",
  role = "visual",
  title,
  description,
  children,
}: {
  id: string;
  mode?: EditorMode;
  role?: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
      {children}
    </WidgetEditorSection>
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

function GradientField({
  id,
  label,
  value,
  onChange,
  onClear,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
}) {
  const parsed = value?.match(linearGradientPattern);
  const angle =
    parsed && Number.isFinite(Number(parsed[1])) ? Number(parsed[1]) : defaultGradientAngle;
  const start = parsed ? parsed[2] : defaultGradientStart;
  const end = parsed ? parsed[3] : defaultGradientEnd;

  const emit = (nextAngle: number, nextStart: string, nextEnd: string) => {
    onChange(`linear-gradient(${nextAngle}deg, ${nextStart}, ${nextEnd})`);
  };

  return (
    <WidgetControlRow
      id={id}
      label={label}
      actions={
        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={!value?.trim()}>
          Clear
        </Button>
      }
    >
      {(fieldProps) => (
        <div className="space-y-2 rounded-md border p-3">
          <div
            className="h-10 rounded-md border border-border/70"
            style={{ backgroundImage: `linear-gradient(${angle}deg, ${start}, ${end})` }}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Start color</p>
              <Input
                type="color"
                value={resolveColorPickerValue(start, defaultGradientStart)}
                onChange={(event) => emit(angle, event.target.value, end)}
                className="h-9 w-full p-1"
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">End color</p>
              <Input
                type="color"
                value={resolveColorPickerValue(end, defaultGradientEnd)}
                onChange={(event) => emit(angle, start, event.target.value)}
                className="h-9 w-full p-1"
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Angle</span>
              <span>{Math.round(angle)}deg</span>
            </div>
            <Input
              id={fieldProps.id}
              type="range"
              min={0}
              max={360}
              step={1}
              value={angle}
              onChange={(event) => emit(Number(event.target.value), start, end)}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          </div>
        </div>
      )}
    </WidgetControlRow>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
  onClear,
  pickerFallback,
  allowTransparent = false,
  treatAsThemeDefaultValues,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  pickerFallback: string;
  allowTransparent?: boolean;
  treatAsThemeDefaultValues?: string[];
}) {
  const normalizedValue = value?.trim();
  const isTransparent = normalizedValue === "transparent";
  const themeDefaultValues = new Set(
    (treatAsThemeDefaultValues ?? [])
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
  const isThemeDefaultValue = normalizedValue ? themeDefaultValues.has(normalizedValue) : false;
  const hasValue = typeof value === "string" && value.trim().length > 0;
  const hasCustomValue =
    hasValue &&
    !isTransparent &&
    !isThemeDefaultValue &&
    !/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(normalizedValue ?? "");
  const swatchValue = resolveColorPickerValue(value, pickerFallback);

  return (
    <WidgetControlRow
      id={id}
      label={label}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasValue || isThemeDefaultValue}
        >
          Clear
        </Button>
      }
    >
      {(fieldProps) => (
        <div className="space-y-3">
          <div className="grid grid-cols-[2.75rem_1fr] gap-3">
            <Input
              id={fieldProps.id}
              type="color"
              value={swatchValue}
              onChange={(event) => onChange(event.target.value)}
              className="h-10 w-11 p-1"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
            <div className="flex min-h-10 flex-wrap items-center gap-2">
              <span className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
                {isTransparent
                  ? "Transparent"
                  : hasCustomValue
                    ? "Saved custom color"
                    : hasValue && !isThemeDefaultValue
                      ? "Selected color"
                      : "Theme default"}
              </span>
              {allowTransparent ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onChange("transparent")}
                >
                  Use transparent
                </Button>
              ) : null}
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

function updateBackground(
  value: CtaBannerData,
  onChange: (next: CtaBannerData) => void,
  patch: Partial<BackgroundData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    background: {
      ...current.background,
      ...patch,
    },
  }));
}

function updateBackgroundMedia(
  value: CtaBannerData,
  onChange: (next: CtaBannerData) => void,
  patch: Partial<BackgroundMediaData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    background: {
      ...current.background,
      media: {
        ...current.background?.media,
        ...patch,
      },
    },
  }));
}

function updateSurfaceColor(
  value: CtaBannerData,
  onChange: (next: CtaBannerData) => void,
  nextColor: string
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      background: nextColor,
    },
    background: {
      ...current.background,
      color: nextColor,
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

function clearBackgroundField(
  value: CtaBannerData,
  onChange: (next: CtaBannerData) => void,
  key: keyof BackgroundData
) {
  updateValue(value, onChange, (current) => {
    const background = { ...(current.background ?? {}) };
    delete background[key];
    return {
      ...current,
      background,
      style:
        key === "color"
          ? (() => {
              const nextStyle = { ...(current.style ?? {}) };
              delete nextStyle.background;
              return nextStyle;
            })()
          : current.style,
    };
  });
}

function getCtaHrefWarning(rawHref: string | undefined) {
  const raw = (rawHref ?? "").trim();
  if (!raw) return null;
  return normalizeWidgetSafeHref(raw, ctaHrefOptions)
    ? null
    : "Use a relative path, hash, or http/https URL.";
}

function getBackgroundImageWarning(rawSrc: string | undefined) {
  const raw = (rawSrc ?? "").trim();
  if (!raw) return null;
  return normalizeWidgetSafeHref(raw, {
    allowRelative: true,
    allowHttp: true,
  })
    ? null
    : "Saved background image is not public-safe and will not render. Clear it or pick a Media Library image.";
}

function ReadonlyDiagnosticRows({
  rows,
}: {
  rows: Array<{ label: string; value: string | undefined }>;
}) {
  return (
    <dl className="grid gap-2 rounded-md border bg-muted/30 p-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-3">
          <dt className="font-medium text-foreground">{row.label}</dt>
          <dd className="max-w-[60%] break-words text-right text-muted-foreground">
            {row.value?.trim() ? row.value : "Theme default"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ActionFields({
  kind,
  title,
  action,
  onPatch,
  showToggle = false,
}: {
  kind: "primary" | "secondary" | "tertiary";
  title: string;
  action: CtaBannerAction | undefined;
  onPatch: (patch: Partial<CtaBannerAction>) => void;
  showToggle?: boolean;
}) {
  const resolvedAction = action ?? {
    label: "",
    href: "",
    enabled: false,
    openInNewTab: false,
    icon: "none",
  };
  const warning = getCtaHrefWarning(resolvedAction.href);
  const isEnabled = resolvedAction.enabled !== false;

  return (
    <div className="space-y-3 rounded-md border p-3" data-cta-action-editor={kind}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        {showToggle ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Enabled</span>
            <Switch checked={isEnabled} onCheckedChange={(next) => onPatch({ enabled: next })} />
          </label>
        ) : null}
      </div>

      {showToggle && !isEnabled ? (
        <p className="text-xs text-muted-foreground">
          Hidden in runtime, but label and URL stay saved until you clear them.
        </p>
      ) : null}

      <label className="space-y-1">
        <span className="text-sm font-medium">Label</span>
        <Input
          value={resolvedAction.label ?? ""}
          onChange={(event) => onPatch({ label: event.target.value })}
          placeholder={
            title === "Tertiary CTA"
              ? "No thanks"
              : title === "Primary CTA"
                ? "Get started"
                : "Contact sales"
          }
        />
      </label>

      <LinkDestinationField
        fieldId={`cta-banner-${kind}-destination`}
        label="Destination"
        controlPath={`actions.${kind}Cta.href`}
        value={resolvedAction.href ?? ""}
        disabled={showToggle && !isEnabled}
        onChange={(next) => onPatch({ href: next })}
        feedback={warning}
        feedbackTone="destructive"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <span className="text-sm font-medium">Target</span>
          <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
            <span>Open in new tab</span>
            <Switch
              checked={Boolean(resolvedAction.openInNewTab)}
              onCheckedChange={(next) => onPatch({ openInNewTab: next })}
            />
          </label>
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium">Icon</span>
          <Select
            value={resolvedAction.icon ?? "none"}
            onValueChange={(next) => onPatch({ icon: next as CtaActionIcon })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select icon" />
            </SelectTrigger>
            <SelectContent>
              {actionIconOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function BackgroundMediaFields({
  media,
  onChange,
}: {
  media: Partial<BackgroundMediaData>;
  onChange: (patch: Partial<BackgroundMediaData>) => void;
}) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const source = media.source ?? "external";
  const hasSavedImage = (media.src ?? "").trim().length > 0;
  const backgroundImageWarning = getBackgroundImageWarning(media.src);

  const handleAssetChange = async (value: unknown) => {
    const assetId = typeof value === "string" ? value : null;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (!assetId) {
      onChange({ assetId: undefined, source: "external", src: undefined });
      return;
    }
    onChange({ assetId, source: "library" });
    setLookupError(null);
    try {
      const items = await listMediaCached({ force: false });
      if (requestId !== requestIdRef.current) return;
      const match = items.find((item) => item.id === assetId);
      if (match) {
        onChange({
          assetId,
          source: "library",
          src: match.url,
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
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Background image</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ assetId: undefined, source: "external", src: undefined })}
            disabled={!hasSavedImage}
          >
            Clear image
          </Button>
        </div>
        <MediaPicker
          value={source === "library" ? (media.assetId ?? null) : null}
          onChange={(value) => void handleAssetChange(value)}
          multiple={false}
          accept={["image/*"]}
        />
        {hasSavedImage ? (
          <p className="rounded-md border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            A background image is already configured. Pick an image from the Media Library to
            replace it.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pick a background image from the Media Library. Existing external images stay read-only.
          </p>
        )}
        {backgroundImageWarning ? (
          <p className="text-xs text-amber-700">{backgroundImageWarning}</p>
        ) : null}
        {lookupError ? <p className="text-xs text-destructive">{lookupError}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <span className="text-sm font-medium">Image fit</span>
          <Select
            value={media.fit ?? "cover"}
            onValueChange={(next) => onChange({ fit: next as CtaBackgroundMediaFit })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select fit" />
            </SelectTrigger>
            <SelectContent>
              {mediaFitOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium">Image position</span>
          <Select
            value={media.position ?? "center"}
            onValueChange={(next) => onChange({ position: next as CtaBackgroundMediaPosition })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              {mediaPositionOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function CtaBannerWizardEditor({ value, variant }: WidgetEditorProps<CtaBannerData>) {
  const normalized = normalizeValue(value);

  return (
    <WidgetEditorSection
      id="cta-banner.wizard.starter-conversion"
      mode="wizard"
      role="setup"
      title="Starter conversion"
      description="Review the current banner layout and headline. Daily CTA editing happens in Visual."
    >
      <div className="space-y-4">
        <ReadonlyWidgetSummaryRow
          id="cta-banner.wizard.variant"
          label="Banner layout"
          path="variant"
          value={
            variantOptions.find((option) => option.id === resolveCtaBannerVariant(variant))
              ?.label ?? "Centered"
          }
        />

        <ReadonlyWidgetSummaryRow
          id="cta-banner.wizard.content.title"
          label="Headline"
          path="content.title"
          value={normalized.content?.title ?? "No headline yet"}
        />

        <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          Use Visual for CTA labels, destinations, visibility toggles, button styling, background
          media, and motion.
        </div>
      </div>
    </WidgetEditorSection>
  );
}

export function CtaBannerVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CtaBannerData>) {
  const normalized = normalizeValue(value);
  const primary = normalized.actions?.primaryCta;
  const secondary = normalized.actions?.secondaryCta;
  const tertiary = normalized.actions?.tertiaryCta;
  const backgroundMedia = normalized.background?.media ?? {
    type: "none" as const,
    source: "external" as const,
    fit: "cover" as const,
    position: "center" as const,
  };

  return (
    <div className="space-y-4">
      <EditorSection
        id="cta-banner.visual.variant-layout"
        mode="visual"
        role="layout"
        title="Variant and layout structure"
        description="Choose CTA layout variant for this conversion strip."
      >
        <VariantCards value={resolveCtaBannerVariant(variant)} onChange={onVariantChange} />
        <p className="text-xs text-muted-foreground">
          Full-width lives in the shared block Layout panel. CTA Banner only removes its own
          redundant inner width constraint.
        </p>
        <div className="space-y-1">
          <span className="text-sm font-medium">Padding</span>
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

      <EditorSection
        id="cta-banner.visual.content-copy"
        mode="visual"
        role="content"
        title="Content copy"
        description="Edit badge, title, support line, and visibility."
      >
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

        <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
          <span>Show description</span>
          <Switch
            checked={normalized.content?.showDescription !== false}
            onCheckedChange={(next) => updateContent(value, onChange, { showDescription: next })}
          />
        </label>
      </EditorSection>

      <EditorSection
        id="cta-banner.visual.actions"
        mode="visual"
        role="content"
        title="Actions"
        description="Configure CTA labels, URLs, targets, icons, and intentional visibility."
      >
        <ActionFields
          kind="primary"
          key={`primary-${primary?.href ?? ""}`}
          title="Primary CTA"
          action={primary}
          onPatch={(patch) =>
            updateActions(value, onChange, {
              primaryCta: {
                ...primary,
                ...patch,
              },
            })
          }
        />

        <ActionFields
          kind="secondary"
          key={`secondary-${secondary?.href ?? ""}`}
          title="Secondary CTA"
          action={secondary}
          showToggle
          onPatch={(patch) =>
            updateActions(value, onChange, {
              secondaryCta: {
                ...secondary,
                ...patch,
              },
            })
          }
        />

        <ActionFields
          kind="tertiary"
          key={`tertiary-${tertiary?.href ?? ""}`}
          title="Tertiary CTA"
          action={tertiary}
          showToggle
          onPatch={(patch) =>
            updateActions(value, onChange, {
              tertiaryCta: {
                ...tertiary,
                ...patch,
              },
            })
          }
        />
      </EditorSection>

      <EditorSection
        id="cta-banner.visual.colors-borders"
        mode="visual"
        role="visual"
        title="Colors and Borders"
        description="Set content palette plus CTA-local button emphasis, border, and radius."
      >
        <div className="space-y-2 rounded-md border border-border/70 p-3">
          <p className="text-sm font-medium">CTA Banner palettes</p>
          <div className="flex flex-wrap gap-2">
            {ctaBannerPalettePresets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  updateValue(value, onChange, (current) => ({
                    ...current,
                    style: {
                      ...current.style,
                      ...preset.style,
                    },
                    background: {
                      ...current.background,
                      ...preset.background,
                    },
                  }))
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Applying a palette writes explicit CTA Banner colors. You can still override any field
            afterwards.
          </p>
        </div>
        <ColorField
          id="cta-banner.style.text"
          label="Text color"
          value={normalized.style?.text}
          onChange={(next) => updateStyle(value, onChange, { text: next })}
          onClear={() => clearStyleField(value, onChange, "text")}
          pickerFallback="#0f172a"
          treatAsThemeDefaultValues={["var(--color-text)"]}
        />
        <ColorField
          id="cta-banner.style.badgeBackground"
          label="Badge background"
          value={normalized.style?.badgeBackground}
          onChange={(next) => updateStyle(value, onChange, { badgeBackground: next })}
          onClear={() => clearStyleField(value, onChange, "badgeBackground")}
          pickerFallback="#1d4ed8"
          treatAsThemeDefaultValues={["var(--color-primary)"]}
        />
        <ColorField
          id="cta-banner.style.badgeText"
          label="Badge text"
          value={normalized.style?.badgeText}
          onChange={(next) => updateStyle(value, onChange, { badgeText: next })}
          onClear={() => clearStyleField(value, onChange, "badgeText")}
          pickerFallback="#ffffff"
          treatAsThemeDefaultValues={["var(--color-bg)"]}
        />
        <ColorField
          id="cta-banner.style.primaryButtonBg"
          label="Primary button background"
          value={normalized.style?.primaryButtonBg}
          onChange={(next) => updateStyle(value, onChange, { primaryButtonBg: next })}
          onClear={() => clearStyleField(value, onChange, "primaryButtonBg")}
          pickerFallback="#1d4ed8"
          treatAsThemeDefaultValues={["var(--color-primary)"]}
        />
        <ColorField
          id="cta-banner.style.primaryButtonText"
          label="Primary button text"
          value={normalized.style?.primaryButtonText}
          onChange={(next) => updateStyle(value, onChange, { primaryButtonText: next })}
          onClear={() => clearStyleField(value, onChange, "primaryButtonText")}
          pickerFallback="#ffffff"
          treatAsThemeDefaultValues={["var(--color-bg)"]}
        />
        <ColorField
          id="cta-banner.style.primaryButtonBorder"
          label="Primary button border"
          value={normalized.style?.primaryButtonBorder}
          onChange={(next) => updateStyle(value, onChange, { primaryButtonBorder: next })}
          onClear={() => clearStyleField(value, onChange, "primaryButtonBorder")}
          pickerFallback="#ffffff"
          allowTransparent
        />
        <ColorField
          id="cta-banner.style.secondaryButtonBg"
          label="Secondary button background"
          value={normalized.style?.secondaryButtonBg}
          onChange={(next) => updateStyle(value, onChange, { secondaryButtonBg: next })}
          onClear={() => clearStyleField(value, onChange, "secondaryButtonBg")}
          pickerFallback="#ffffff"
          allowTransparent
        />
        <ColorField
          id="cta-banner.style.secondaryButtonText"
          label="Secondary button text"
          value={normalized.style?.secondaryButtonText}
          onChange={(next) => updateStyle(value, onChange, { secondaryButtonText: next })}
          onClear={() => clearStyleField(value, onChange, "secondaryButtonText")}
          pickerFallback="#0f172a"
          treatAsThemeDefaultValues={["var(--color-text)"]}
        />
        <ColorField
          id="cta-banner.style.secondaryButtonBorder"
          label="Secondary button border"
          value={normalized.style?.secondaryButtonBorder}
          onChange={(next) => updateStyle(value, onChange, { secondaryButtonBorder: next })}
          onClear={() => clearStyleField(value, onChange, "secondaryButtonBorder")}
          pickerFallback="#e2e8f0"
          treatAsThemeDefaultValues={["var(--color-border)"]}
        />
        <ColorField
          id="cta-banner.style.border"
          label="Border color"
          value={normalized.style?.border}
          onChange={(next) => updateStyle(value, onChange, { border: next })}
          onClear={() => clearStyleField(value, onChange, "border")}
          pickerFallback="#e2e8f0"
          treatAsThemeDefaultValues={["var(--color-border)"]}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <span className="text-sm font-medium">Border width</span>
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
          <div className="space-y-1">
            <span className="text-sm font-medium">Banner radius</span>
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
          <div className="space-y-1">
            <span className="text-sm font-medium">Button radius</span>
            <Select
              value={normalized.style?.buttonRadius ?? "__default__"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  buttonRadius: next === "__default__" ? undefined : (next as CtaButtonRadius),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select radius" />
              </SelectTrigger>
              <SelectContent>
                {buttonRadiusOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Primary button size</span>
            <Select
              value={normalized.style?.primaryButtonSize ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { primaryButtonSize: next as CtaButtonSize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {buttonSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Secondary button size</span>
            <Select
              value={normalized.style?.secondaryButtonSize ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { secondaryButtonSize: next as CtaButtonSize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {buttonSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Contrast guidance</p>
          <p className="mt-1">
            Title and support copy: check readability against the banner surface.
          </p>
          <p className="mt-1">Primary CTA: verify button text stays readable on its background.</p>
          <p className="mt-1">
            Secondary CTA: verify border/button contrast still reads as intentional.
          </p>
        </div>
      </EditorSection>

      <EditorSection
        id="cta-banner.visual.background-motion"
        mode="visual"
        role="visual"
        title="Background and motion"
        description="Use background color, gradient, media, and optional CSS-safe motion."
      >
        <ColorField
          id="cta-banner.background.color"
          label="Background color"
          value={normalized.background?.color ?? normalized.style?.background}
          onChange={(next) => updateSurfaceColor(value, onChange, next)}
          onClear={() => clearBackgroundField(value, onChange, "color")}
          pickerFallback="#f8fafc"
          allowTransparent
          treatAsThemeDefaultValues={["var(--color-surface)"]}
        />

        <GradientField
          id="cta-banner.background.gradient"
          label="Background gradient"
          value={normalized.background?.gradient}
          onChange={(next) => updateBackground(value, onChange, { gradient: next })}
          onClear={() => clearBackgroundField(value, onChange, "gradient")}
        />

        <div className="space-y-1">
          <span className="text-sm font-medium">Background media type</span>
          <Select
            value={backgroundMedia.type ?? "none"}
            onValueChange={(next) =>
              updateBackgroundMedia(value, onChange, {
                type: next as CtaBackgroundMediaType,
                source: next === "image" ? (backgroundMedia.source ?? "external") : "external",
                assetId: next === "image" ? backgroundMedia.assetId : undefined,
                src: next === "image" ? backgroundMedia.src : undefined,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select media type" />
            </SelectTrigger>
            <SelectContent>
              {mediaTypeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {backgroundMedia.type === "image" ? (
          <BackgroundMediaFields
            media={backgroundMedia}
            onChange={(patch) => updateBackgroundMedia(value, onChange, patch)}
          />
        ) : null}

        <div className="space-y-1">
          <span className="text-sm font-medium">Entrance motion</span>
          <Select
            value={normalized.motion?.preset ?? "none"}
            onValueChange={(next) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                motion: {
                  ...current.motion,
                  preset: next as CtaMotionPreset,
                },
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select motion" />
            </SelectTrigger>
            <SelectContent>
              {motionOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Motion stays CSS-only and reduced-motion safe. Keep it static if the page does not need
            animation.
          </p>
        </div>
      </EditorSection>
    </div>
  );
}

export function CtaBannerAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<CtaBannerData>) {
  const normalized = normalizeValue(value);
  const [pendingSupportAction, setPendingSupportAction] = useState<"normalize" | "reset" | null>(
    null
  );
  const styleRows = [
    {
      label: "Background",
      value: normalized.background?.color ?? normalized.style?.background,
    },
    { label: "Text", value: normalized.style?.text },
    { label: "Border", value: normalized.style?.border },
    { label: "Primary button border", value: normalized.style?.primaryButtonBorder },
    { label: "Secondary button border", value: normalized.style?.secondaryButtonBorder },
  ];
  const configuredActionCount = [
    normalized.actions?.primaryCta,
    normalized.actions?.secondaryCta,
    normalized.actions?.tertiaryCta,
  ].filter(
    (action) => action?.enabled !== false && (action?.label?.trim() || action?.href?.trim())
  ).length;
  const runtimeRows = [
    { label: "Variant", value: resolveCtaBannerVariant(variant) },
    { label: "Actions", value: `${configuredActionCount} configured` },
    {
      label: "Background media",
      value:
        normalized.background?.media?.type === "image"
          ? normalized.background.media.source === "library"
            ? "Media Library image"
            : "Saved external image"
          : "Not configured",
    },
    { label: "Motion", value: normalized.motion?.preset ?? "none" },
  ];

  return (
    <div className="space-y-4">
      <EditorSection
        id="cta-banner.advanced.style-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Style diagnostics"
        description="Read-only resolved CTA banner colors. Visual owns color editing."
      >
        <ReadonlyDiagnosticRows rows={styleRows} />
      </EditorSection>

      <EditorSection
        id="cta-banner.advanced.authoring-boundaries"
        mode="advanced"
        role="summary"
        title="Normalization and safeguards"
        description="Confirmed support actions for deterministic CTA banner repair."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPendingSupportAction("normalize")}
          >
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => setPendingSupportAction("reset")}>
            Reset to defaults
          </Button>
        </div>
      </EditorSection>

      <EditorSection
        id="cta-banner.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Human diagnostics only. Advanced does not show raw CTA banner JSON."
      >
        <ReadonlyDiagnosticRows rows={runtimeRows} />
      </EditorSection>

      <ConfirmActionDialog
        open={pendingSupportAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSupportAction(null);
        }}
        title={
          pendingSupportAction === "reset"
            ? "Reset CTA banner to defaults?"
            : "Normalize CTA banner data?"
        }
        description={
          pendingSupportAction === "reset"
            ? "Replace this CTA banner configuration with the default content and style values."
            : "Apply schema-owned fallbacks and remove unsupported CTA banner values."
        }
        confirmLabel={pendingSupportAction === "reset" ? "Reset to defaults" : "Normalize now"}
        onConfirm={() => {
          if (pendingSupportAction === "reset") {
            onChange(ctaBannerDefaults);
          } else if (pendingSupportAction === "normalize") {
            onChange(normalizeValue(value));
          }
          setPendingSupportAction(null);
        }}
      />
    </div>
  );
}
