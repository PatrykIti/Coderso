import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { isApiClientError } from "@/services/apiClient";
import { listMediaCached } from "@/services/mediaClient";
import {
  getUserSetting,
  setUserSetting,
  type HeroPresetSetting,
} from "@/services/userSettingsClient";
import { MediaPicker } from "@/ui/media/MediaPicker";

import type {
  HeroBadgePlacement,
  HeroBadgeTone,
  HeroBackgroundMedia,
  HeroData,
  HeroMedia,
} from "../../../../widgets/core/hero";
import { normalizeHeroData, normalizeHeroHref } from "../../../../widgets/core/hero";
import type { WidgetEditorProps } from "../../../../widgets/types";
import {
  ColorContrastNotice,
  ClearableFieldHeader,
  hasClearableFieldValue,
  resolveColorContrastAdvisory,
  resolveColorPickerValue,
  SharedColorFieldInputs,
} from "./ClearableFields";
import { WidgetControlRow, WidgetEditorSection } from "./WidgetEditorControls";

type HeroVariantId = "centered" | "split" | "media-left" | "media-center";

const variantOptions: Array<{
  id: HeroVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "centered",
    label: "Centered",
    description: "Single column hero with centered content.",
  },
  {
    id: "split",
    label: "Media Right",
    description: "Text left, media right.",
  },
  {
    id: "media-left",
    label: "Media Left",
    description: "Media left, text right.",
  },
  {
    id: "media-center",
    label: "Media Center",
    description: "Centered copy with inline showcase media below.",
  },
];

const heroCtaPlaceholderExamples = {
  primary: "/signup",
  secondary: "/examples",
} as const;

const goalOptions = [
  { id: "lead", label: "Lead generation" },
  { id: "sales", label: "Sales" },
  { id: "info", label: "Information" },
] as const;

const goalPresets: Record<
  (typeof goalOptions)[number]["id"],
  Pick<HeroData, "headline" | "subhead" | "body" | "primaryCta" | "secondaryCta">
> = {
  lead: {
    headline: "Grow your audience faster",
    subhead: "Capture more signups with a clear message and CTA.",
    body: "Use a short statement to describe the primary benefit.",
    primaryCta: { label: "Join the list", href: "/signup" },
    secondaryCta: { label: "See examples", href: "/examples" },
  },
  sales: {
    headline: "Convert more visitors",
    subhead: "Lead with the outcome and reduce friction.",
    body: "Highlight the value in one or two lines of supporting copy.",
    primaryCta: { label: "Book a demo", href: "/demo" },
    secondaryCta: { label: "Pricing", href: "/pricing" },
  },
  info: {
    headline: "Everything you need to know",
    subhead: "A concise overview of your offer or product.",
    body: "Use the body to explain the most important details.",
    primaryCta: { label: "Learn more", href: "/about" },
    secondaryCta: { label: "Contact", href: "/contact" },
  },
};

const mediaOptions = [
  { id: "none", label: "No media" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
];

const ctaOptions = [
  { id: "single", label: "Single CTA" },
  { id: "dual", label: "Dual CTA" },
] as const;

const alignOptions = ["left", "center", "right"] as const;
const maxWidthOptions = ["none", "sm", "md", "lg", "xl", "2xl"] as const;
const contentWidthOptions = ["none", "sm", "md", "lg", "xl"] as const;
const spacingOptions = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const;
const ratioOptions = ["16:9", "4:3", "1:1", "3:4"] as const;
type HeroAlign = NonNullable<HeroData["layout"]>["align"];
type HeroMaxWidth = NonNullable<HeroData["layout"]>["maxWidth"];
type HeroContentWidth = NonNullable<HeroData["layout"]>["contentWidth"];
type HeroSpacing = NonNullable<HeroData["spacing"]>["paddingTop"];
type HeroMediaType = NonNullable<HeroData["media"]>["type"];
type HeroMediaSource = NonNullable<HeroData["media"]>["source"];
type CtaMode = (typeof ctaOptions)[number]["id"];
type HeroStyle = NonNullable<HeroData["style"]>;
type HeroHeadlineSize = NonNullable<HeroStyle["headlineSize"]>;
type HeroSubheadSize = NonNullable<HeroStyle["subheadSize"]>;
type HeroBodySize = NonNullable<HeroStyle["bodySize"]>;
type HeroButtonSize = NonNullable<HeroStyle["primaryButtonSize"]>;
type HeroBorderWidth = NonNullable<HeroStyle["borderWidth"]>;
type HeroRadius = NonNullable<HeroStyle["borderRadius"]>;
type HeroShadow = NonNullable<HeroStyle["cardShadow"]>;
type HeroFont = NonNullable<HeroStyle["fontFamily"]>;
type HeroWeight = NonNullable<HeroStyle["headlineWeight"]>;
type HeroMotion = NonNullable<HeroStyle["motion"]>;
type HeroHeight = NonNullable<NonNullable<HeroData["layout"]>["height"]>;
type HeroBleed = NonNullable<NonNullable<HeroData["layout"]>["bleed"]>;
type HeroBackground = NonNullable<HeroData["background"]>;
type HeroSocialProof = NonNullable<HeroData["socialProof"]>;

const badgeToneOptions: Array<{ id: HeroBadgeTone; label: string }> = [
  { id: "neutral", label: "Neutral" },
  { id: "primary", label: "Primary" },
  { id: "success", label: "Success" },
  { id: "warning", label: "Warning" },
];

const badgePlacementOptions: Array<{ id: HeroBadgePlacement; label: string }> = [
  { id: "above-headline", label: "Above headline" },
  { id: "inline-headline", label: "Inline headline" },
];

const isValidHref = (value: string | undefined) => !value || normalizeHeroHref(value) !== undefined;

const isValidMediaUrl = (value: string | undefined) =>
  !value || value.startsWith("http") || value.startsWith("/");

const mediaSourceOptions = [
  { id: "library", label: "Media library" },
  { id: "external", label: "External URL" },
] as const;

const headlineSizeOptions = ["none", "2xl", "3xl", "4xl", "5xl"] as const;
const subheadSizeOptions = ["none", "base", "lg", "xl", "2xl"] as const;
const bodySizeOptions = ["none", "sm", "base", "lg", "xl"] as const;
const buttonSizeOptions = ["none", "sm", "md", "lg"] as const;
const borderWidthOptions = ["0", "1", "2", "3"] as const;
const radiusOptions = ["none", "lg", "xl", "2xl", "3xl"] as const;
const heightOptions = ["auto", "large", "screen"] as const;
const bleedOptions = ["contained", "full-bleed"] as const;
const shadowOptions = ["none", "soft", "medium", "strong"] as const;
const fontFamilyOptions = ["inherit", "sans", "serif", "mono"] as const;
const textWeightOptions = ["normal", "medium", "semibold", "bold"] as const;
const motionOptions = ["none", "fade-in", "slide-up"] as const;
const formatTokenOptionLabel = (option: string) => (option === "none" ? "None" : option);
const heroPresetLimit = 24;
const linearGradientPattern =
  /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)$/;
const defaultGradientStart = "#0f172a";
const defaultGradientEnd = "#475569";
const defaultGradientAngle = 135;
const heroSocialProofAvatarLimit = 5;
const imageUrlPattern = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const videoUrlPattern = /\.(?:m4v|mov|mp4|ogg|webm)(?:[?#].*)?$/i;
const heroPalettePresets = [
  {
    id: "light",
    label: "Light",
    background: { color: "#ffffff" },
    style: {
      textColor: "#111827",
      subheadColor: "#1f2937",
      bodyColor: "#374151",
      borderColor: "#d1d5db",
      primaryButtonBg: "#2563eb",
      primaryButtonText: "#ffffff",
      secondaryButtonBg: "#ffffff",
      secondaryButtonText: "#111827",
      secondaryButtonBorder: "#d1d5db",
    },
  },
  {
    id: "dark",
    label: "Dark",
    background: { color: "#0f172a" },
    style: {
      textColor: "#f8fafc",
      subheadColor: "#e2e8f0",
      bodyColor: "#cbd5e1",
      borderColor: "#1e293b",
      primaryButtonBg: "#38bdf8",
      primaryButtonText: "#082f49",
      secondaryButtonBg: "#0f172a",
      secondaryButtonText: "#f8fafc",
      secondaryButtonBorder: "#334155",
    },
  },
  {
    id: "brand",
    label: "Brand",
    background: { color: "#eff6ff" },
    style: {
      textColor: "#1e3a8a",
      subheadColor: "#1d4ed8",
      bodyColor: "#1e40af",
      borderColor: "#93c5fd",
      primaryButtonBg: "#1d4ed8",
      primaryButtonText: "#eff6ff",
      secondaryButtonBg: "#dbeafe",
      secondaryButtonText: "#1e3a8a",
      secondaryButtonBorder: "#60a5fa",
    },
  },
] as const;

type HeroMediaEditorValue = Partial<HeroMedia> & Partial<HeroBackgroundMedia>;

const isCompatibleExternalMediaUrl = (value: string | undefined, mediaType: HeroMediaType) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }
  const normalized = value.trim();
  if (mediaType === "image") {
    return imageUrlPattern.test(normalized);
  }
  if (mediaType === "video") {
    return videoUrlPattern.test(normalized);
  }
  return false;
};

const resolveMediaTypeTransition = (
  current: HeroMediaEditorValue,
  nextType: HeroMediaType
): HeroMediaEditorValue => {
  if (nextType === "none") {
    return {
      type: "none",
      source: "external",
    };
  }

  const source = current.source ?? "external";
  const keepExternalSource =
    source === "external" && isCompatibleExternalMediaUrl(current.src, nextType);

  return {
    type: nextType,
    source,
    assetId: keepExternalSource ? current.assetId : undefined,
    src: keepExternalSource ? current.src : undefined,
    alt: nextType === "image" ? current.alt : undefined,
    posterSource: nextType === "video" ? (current.posterSource ?? "library") : undefined,
    posterAssetId: nextType === "video" && keepExternalSource ? current.posterAssetId : undefined,
    posterSrc: nextType === "video" && keepExternalSource ? current.posterSrc : undefined,
    title: nextType === "video" && keepExternalSource ? current.title : undefined,
    description: nextType === "video" && keepExternalSource ? current.description : undefined,
    ratio: current.ratio,
    overlay: current.overlay,
  };
};

function HeroMediaSourceFields({
  media,
  mediaType,
  onChange,
}: {
  media: HeroMediaEditorValue;
  mediaType: HeroMediaType;
  onChange: (patch: HeroMediaEditorValue) => void;
}) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const source: HeroMediaSource = media.source ?? "external";
  const accept =
    mediaType === "image" ? ["image/*"] : mediaType === "video" ? ["video/*"] : undefined;

  const handleSourceChange = (next: HeroMediaSource) => {
    requestIdRef.current += 1;
    setLookupError(null);
    if (next === "library") {
      onChange({ source: next, assetId: undefined, src: undefined });
    } else {
      onChange({ source: next, assetId: undefined });
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
          ...(mediaType === "image"
            ? {
                alt:
                  media.alt && media.alt.trim().length > 0
                    ? media.alt
                    : (match.alt ?? match.title ?? match.originalName ?? ""),
              }
            : {
                title:
                  media.title && media.title.trim().length > 0
                    ? media.title
                    : (match.title ?? match.originalName ?? ""),
              }),
        });
      } else {
        setLookupError("Selected media could not be resolved.");
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (isApiClientError(err)) {
        setLookupError(err.message);
      } else {
        setLookupError("Failed to resolve media URL.");
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm font-medium">Media source</p>
        <Select
          value={source}
          onValueChange={(next) => handleSourceChange(next as HeroMediaSource)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            {mediaSourceOptions.map((option) => (
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
          <p className="text-sm font-medium">Media URL</p>
          <Input
            value={media.src ?? ""}
            onChange={(event) => onChange({ src: event.target.value })}
            placeholder="https://"
          />
          {!isValidMediaUrl(media.src) ? (
            <p className="text-xs text-destructive">Use a relative path or full URL.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function HeroPosterFields({
  media,
  onChange,
  onClear,
}: {
  media: HeroMediaEditorValue;
  onChange: (patch: HeroMediaEditorValue) => void;
  onClear: () => void;
}) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const posterSource: HeroMediaSource = media.posterSource ?? "library";

  const handleSourceChange = (next: HeroMediaSource) => {
    requestIdRef.current += 1;
    setLookupError(null);
    onChange({
      posterSource: next,
      posterAssetId: undefined,
      posterSrc: undefined,
    });
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
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (isApiClientError(err)) {
        setLookupError(err.message);
      } else {
        setLookupError("Failed to resolve poster image URL.");
      }
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border/70 p-3">
      <ClearableFieldHeader label="Video poster image" value={media.posterSrc} onClear={onClear} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Poster source</p>
        <Select
          value={posterSource}
          onValueChange={(next) => handleSourceChange(next as HeroMediaSource)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            {mediaSourceOptions.map((option) => (
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
            placeholder="https://"
          />
          {!isValidMediaUrl(media.posterSrc) ? (
            <p className="text-xs text-destructive">Use a relative path or full URL.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function HeroVariantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Hero layout</p>
      <Select value={value} onValueChange={(next) => onChange?.(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose layout" />
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
  );
}

export function HeroWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<HeroData>) {
  const [goal, setGoal] = useState<(typeof goalOptions)[number]["id"]>("lead");
  const update = (patch: Partial<HeroData>) => onChange({ ...value, ...patch });
  const primary = value.primaryCta ?? { label: "", href: "" };
  const secondary = value.secondaryCta ?? { label: "", href: "" };
  const media = {
    type: value.media?.type ?? "none",
    source: value.media?.source ?? "external",
    ...value.media,
  };
  const mediaType: HeroMediaType = media.type ?? "none";
  const ctaMode: CtaMode = value.secondaryCta ? "dual" : "single";
  const updateMedia = (patch: Partial<HeroData["media"]>) =>
    update({
      media: {
        type: value.media?.type ?? "none",
        source: value.media?.source ?? "external",
        ...value.media,
        ...patch,
      },
    });
  const handleMediaTypeChange = (nextType: HeroMediaType) =>
    update({
      media: resolveMediaTypeTransition(
        {
          type: value.media?.type ?? "none",
          source: value.media?.source ?? "external",
          posterSource: value.media?.posterSource ?? "library",
          ...value.media,
        },
        nextType
      ) as HeroData["media"],
    });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Goal</p>
        <Select
          value={goal}
          onValueChange={(next) => {
            const selected = next as (typeof goalOptions)[number]["id"];
            setGoal(selected);
            update(goalPresets[selected]);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose goal" />
          </SelectTrigger>
          <SelectContent>
            {goalOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <HeroVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Headline</p>
        <Input
          value={value.headline}
          onChange={(event) => update({ headline: event.target.value })}
          placeholder="Build with confidence"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Subhead</p>
        <Textarea
          value={value.subhead ?? ""}
          onChange={(event) => update({ subhead: event.target.value })}
          placeholder="Short supporting message"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">CTA layout</p>
        <Select
          value={ctaMode}
          onValueChange={(next) => {
            if (next === "single") {
              update({ secondaryCta: undefined });
            } else {
              update({ secondaryCta: secondary });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="CTA layout" />
          </SelectTrigger>
          <SelectContent>
            {ctaOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary CTA Label</p>
          <Input
            value={primary.label}
            onChange={(event) => update({ primaryCta: { ...primary, label: event.target.value } })}
            placeholder="Get started"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary CTA URL</p>
          <Input
            value={primary.href}
            onChange={(event) => update({ primaryCta: { ...primary, href: event.target.value } })}
            placeholder={heroCtaPlaceholderExamples.primary}
          />
        </div>
        {ctaMode === "dual" ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Secondary CTA Label</p>
              <Input
                value={secondary.label}
                onChange={(event) =>
                  update({
                    secondaryCta: { ...secondary, label: event.target.value },
                  })
                }
                placeholder="Learn more"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Secondary CTA URL</p>
              <Input
                value={secondary.href}
                onChange={(event) =>
                  update({
                    secondaryCta: { ...secondary, href: event.target.value },
                  })
                }
                placeholder={heroCtaPlaceholderExamples.secondary}
              />
            </div>
          </>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Media</p>
        <Select
          value={mediaType}
          onValueChange={(next) => handleMediaTypeChange(next as HeroMediaType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select media" />
          </SelectTrigger>
          <SelectContent>
            {mediaOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {mediaType !== "none" ? (
        <HeroMediaSourceFields media={media} mediaType={mediaType} onChange={updateMedia} />
      ) : null}
      {variant === "centered" && mediaType === "image" ? (
        <p className="text-xs text-muted-foreground">
          Centered layout renders the selected image as hero background.
        </p>
      ) : null}
      {variant === "centered" && mediaType === "video" ? (
        <p className="text-xs text-muted-foreground">
          Centered layout does not show inline video. Use Media Right, Media Left, or Media Center
          to display video content.
        </p>
      ) : null}
    </div>
  );
}

const isHeroVariant = (value: string): value is HeroVariantId =>
  variantOptions.some((option) => option.id === value);

const cloneHeroData = (value: HeroData): HeroData => JSON.parse(JSON.stringify(value)) as HeroData;

const sanitizeHeroPresetList = (value: unknown): HeroPresetSetting[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const byName = new Map<string, HeroPresetSetting>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const candidate = entry as Partial<HeroPresetSetting>;
    if (typeof candidate.name !== "string") {
      continue;
    }
    const name = candidate.name.trim();
    if (!name) {
      continue;
    }
    if (typeof candidate.variant !== "string" || !isHeroVariant(candidate.variant)) {
      continue;
    }
    if (!candidate.data || typeof candidate.data !== "object" || Array.isArray(candidate.data)) {
      continue;
    }
    const preset: HeroPresetSetting = {
      name,
      variant: candidate.variant,
      data: cloneHeroData(normalizeHeroData(candidate.data as HeroData)) as Record<string, unknown>,
      updatedAt:
        typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
          ? candidate.updatedAt
          : new Date(0).toISOString(),
    };
    byName.set(name.toLowerCase(), preset);
  }
  return Array.from(byName.values()).slice(0, heroPresetLimit);
};

type HeroPresetImportResult =
  | { ok: true; presets: HeroPresetSetting[]; warnings: string[] }
  | { ok: false; error: string };

const buildHeroPresetExportPayload = (presets: HeroPresetSetting[]) =>
  JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      presets,
    },
    null,
    2
  );

const collectPresetNormalizationPaths = (
  source: unknown,
  normalized: unknown,
  path = ""
): string[] => {
  if (Array.isArray(source)) {
    if (!Array.isArray(normalized)) {
      return [path || "value"];
    }
    const next: string[] = [];
    for (let index = 0; index < source.length; index += 1) {
      next.push(
        ...collectPresetNormalizationPaths(source[index], normalized[index], `${path}[${index}]`)
      );
    }
    return next;
  }

  if (source && typeof source === "object") {
    if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
      return [path || "value"];
    }
    const next: string[] = [];
    for (const [key, value] of Object.entries(source)) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in (normalized as Record<string, unknown>))) {
        next.push(childPath);
        continue;
      }
      next.push(
        ...collectPresetNormalizationPaths(
          value,
          (normalized as Record<string, unknown>)[key],
          childPath
        )
      );
    }
    return next;
  }

  return source === normalized ? [] : [path || "value"];
};

const parseHeroPresetImportText = (
  value: string,
  existingPresets: HeroPresetSetting[]
): HeroPresetImportResult => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "Preset import cannot be empty." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Preset import must be valid JSON." };
  }

  const rawPresets = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { presets?: unknown[] }).presets)
      ? (parsed as { presets: unknown[] }).presets
      : null;

  if (!Array.isArray(rawPresets)) {
    return { ok: false, error: "Preset import must contain a presets array." };
  }

  if (rawPresets.length === 0) {
    return { ok: false, error: "Preset import must include at least one preset." };
  }

  const seenExisting = new Set(existingPresets.map((preset) => preset.name.toLowerCase()));
  const seenImported = new Set<string>();
  const imported: HeroPresetSetting[] = [];
  const warnings: string[] = [];

  for (const entry of rawPresets) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: "Every imported preset must be an object." };
    }
    const candidate = entry as Partial<HeroPresetSetting>;
    if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
      return { ok: false, error: "Every imported preset needs a name." };
    }
    if (typeof candidate.variant !== "string" || !isHeroVariant(candidate.variant)) {
      return { ok: false, error: `Preset "${candidate.name.trim()}" has an invalid Hero variant.` };
    }
    if (!candidate.data || typeof candidate.data !== "object" || Array.isArray(candidate.data)) {
      return { ok: false, error: `Preset "${candidate.name.trim()}" has invalid data.` };
    }

    const normalizedName = candidate.name.trim();
    const dedupeKey = normalizedName.toLowerCase();
    if (seenImported.has(dedupeKey) || seenExisting.has(dedupeKey)) {
      return {
        ok: false,
        error: `Preset name "${normalizedName}" already exists. Remove duplicates before importing.`,
      };
    }

    seenImported.add(dedupeKey);
    const normalizedData = cloneHeroData(normalizeHeroData(candidate.data as HeroData)) as Record<
      string,
      unknown
    >;
    const normalizedPaths = collectPresetNormalizationPaths(candidate.data, normalizedData);
    if (normalizedPaths.length > 0) {
      warnings.push(
        `Preset "${normalizedName}" normalized fields: ${normalizedPaths
          .slice(0, 4)
          .join(", ")}${normalizedPaths.length > 4 ? ", ..." : ""}.`
      );
    }
    imported.push({
      name: normalizedName,
      variant: candidate.variant,
      data: normalizedData,
      updatedAt:
        typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
          ? candidate.updatedAt
          : new Date().toISOString(),
    });
  }

  if (existingPresets.length + imported.length > heroPresetLimit) {
    return {
      ok: false,
      error: `Import would exceed the ${heroPresetLimit} preset limit.`,
    };
  }

  return { ok: true, presets: [...existingPresets, ...imported], warnings };
};

const sortHeroPresets = (presets: HeroPresetSetting[], mode: "updated-desc" | "name-asc") => {
  const next = [...presets];
  if (mode === "name-asc") {
    next.sort((left, right) => left.name.localeCompare(right.name));
    return next;
  }
  next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return next;
};

const applyHeroPalette = (
  value: HeroData,
  paletteId: (typeof heroPalettePresets)[number]["id"]
): HeroData => {
  const preset = heroPalettePresets.find((entry) => entry.id === paletteId);
  if (!preset) return value;
  return {
    ...value,
    background: {
      ...value.background,
      ...preset.background,
    },
    style: {
      ...value.style,
      ...preset.style,
    },
  };
};

const resolveBackgroundMedia = (background: HeroData["background"]): HeroBackgroundMedia => {
  const media = background?.media;
  const legacyImage = background?.image;
  return {
    type: media?.type ?? (legacyImage ? "image" : "none"),
    source: media?.source ?? "external",
    assetId: media?.assetId,
    src: media?.src ?? legacyImage,
    posterSource: media?.posterSource ?? "library",
    posterAssetId: media?.posterAssetId,
    posterSrc: media?.posterSrc,
    title: media?.title,
    description: media?.description,
    overlay: media?.overlay,
  };
};

const resolveHeroSolidBackgroundForContrast = (
  background: HeroData["background"] | undefined
): string | undefined => {
  const media = resolveBackgroundMedia(background);
  if (hasClearableFieldValue(background?.gradient) || media.type !== "none") {
    return undefined;
  }
  return typeof background?.color === "string" && background.color.trim().length > 0
    ? background.color
    : undefined;
};

const resolveHeroContrastSurfaceBackground = ({
  authoredBackground,
  defaultBackground,
  heroBackground,
}: {
  authoredBackground?: string;
  defaultBackground?: string;
  heroBackground?: string;
}) => {
  const normalized = typeof authoredBackground === "string" ? authoredBackground.trim() : undefined;
  if (normalized && normalized !== "transparent") {
    return normalized;
  }
  if (normalized === "transparent") {
    return heroBackground;
  }
  return defaultBackground ?? heroBackground;
};

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function HeroColorField({
  id,
  label,
  value,
  onChange,
  placeholder,
  pickerFallback = "#111827",
  onClear,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback?: string;
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
        <div className="space-y-2">
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
                onChange={(event) => {
                  emit(angle, event.target.value, end);
                }}
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
                onChange={(event) => {
                  emit(angle, start, event.target.value);
                }}
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

export function HeroVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<HeroData>) {
  const update = (patch: Partial<HeroData>) => onChange({ ...value, ...patch });
  const primary = value.primaryCta ?? { label: "", href: "" };
  const secondary = value.secondaryCta ?? { label: "", href: "" };
  const ctaMode: CtaMode = value.secondaryCta ? "dual" : "single";
  const media = {
    type: value.media?.type ?? "none",
    source: value.media?.source ?? "external",
    ...value.media,
  };
  const backgroundMedia = resolveBackgroundMedia(value.background);
  const style = value.style ?? {};
  const mediaType: HeroMediaType = media.type ?? "none";
  const backgroundMediaType: HeroMediaType = backgroundMedia.type ?? "none";
  const badge = {
    enabled: value.badge?.enabled ?? false,
    label: value.badge?.label ?? "",
    href: value.badge?.href ?? "",
    prefix: value.badge?.prefix ?? "",
    tone: value.badge?.tone ?? "neutral",
    placement: value.badge?.placement ?? "above-headline",
  };
  const socialProof = {
    enabled: value.socialProof?.enabled ?? false,
    rating: value.socialProof?.rating ?? "",
    reviewCount: value.socialProof?.reviewCount ?? "",
    label: value.socialProof?.label ?? "",
    avatars: value.socialProof?.avatars ?? [],
  };
  const [presets, setPresets] = useState<HeroPresetSetting[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [isPresetImportDialogOpen, setIsPresetImportDialogOpen] = useState(false);
  const [isPresetExportDialogOpen, setIsPresetExportDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetSearch, setPresetSearch] = useState("");
  const [presetSort, setPresetSort] = useState<"updated-desc" | "name-asc">("updated-desc");
  const [presetImportValue, setPresetImportValue] = useState("");
  const [pendingDeletePreset, setPendingDeletePreset] = useState<HeroPresetSetting | null>(null);
  const [isPresetSaving, setIsPresetSaving] = useState(false);

  const selectedVariant = isHeroVariant(variant) ? variant : "centered";
  const heroSolidBackground = resolveHeroSolidBackgroundForContrast(value.background);
  const hasStyleObject = value.style !== undefined;
  const headlineContrast = resolveColorContrastAdvisory({
    foreground: style.textColor,
    background: heroSolidBackground,
  });
  const bodyContrast = resolveColorContrastAdvisory({
    foreground: style.bodyColor,
    background: heroSolidBackground,
  });
  const primaryButtonContrast = resolveColorContrastAdvisory({
    foreground: style.primaryButtonText,
    background: resolveHeroContrastSurfaceBackground({
      authoredBackground: style.primaryButtonBg,
      defaultBackground: hasStyleObject ? undefined : "var(--color-primary)",
      heroBackground: heroSolidBackground,
    }),
  });
  const secondaryButtonContrast = resolveColorContrastAdvisory({
    foreground: style.secondaryButtonText,
    background: resolveHeroContrastSurfaceBackground({
      authoredBackground: style.secondaryButtonBg,
      heroBackground: heroSolidBackground,
    }),
  });
  const updateLayout = (patch: Partial<HeroData["layout"]>) =>
    update({ layout: { ...value.layout, ...patch } });
  const updateBackground = (patch: Partial<HeroData["background"]>) =>
    update({ background: { ...value.background, ...patch } });
  const updateStyle = (patch: Partial<HeroStyle>) =>
    update({
      style: {
        ...value.style,
        ...patch,
      },
    });
  const clearBackgroundField = (key: keyof HeroBackground) => {
    const { [key]: _removed, ...nextBackground } = value.background ?? {};
    update({ background: Object.keys(nextBackground).length > 0 ? nextBackground : {} });
  };
  const clearStyleField = (key: keyof HeroStyle) => {
    const { [key]: _removed, ...nextStyle } = value.style ?? {};
    update({ style: Object.keys(nextStyle).length > 0 ? nextStyle : {} });
  };
  const clearMediaField = (key: keyof NonNullable<HeroData["media"]>) => {
    const currentMedia = {
      type: value.media?.type ?? "none",
      source: value.media?.source ?? "external",
      posterSource: value.media?.posterSource ?? "library",
      ...value.media,
    };
    const nextMedia: Partial<NonNullable<HeroData["media"]>> = { ...currentMedia };
    delete nextMedia[key];
    update({
      media:
        key === "type"
          ? { type: "none", source: "external" }
          : {
              type: nextMedia.type ?? "none",
              source: nextMedia.source ?? "external",
              assetId: nextMedia.assetId,
              src: nextMedia.src,
              alt: nextMedia.alt,
              posterSource: nextMedia.posterSource,
              posterAssetId: nextMedia.posterAssetId,
              posterSrc: nextMedia.posterSrc,
              title: nextMedia.title,
              description: nextMedia.description,
              ratio: nextMedia.ratio,
              overlay: nextMedia.overlay,
            },
    });
  };
  const updatePrimary = (patch: Partial<HeroData["primaryCta"]>) =>
    update({
      primaryCta: {
        label: value.primaryCta?.label ?? "",
        href: value.primaryCta?.href ?? "",
        ...value.primaryCta,
        ...patch,
      },
    });
  const updateBadge = (patch: Partial<NonNullable<HeroData["badge"]>>) =>
    update({
      badge: {
        enabled: value.badge?.enabled ?? false,
        label: value.badge?.label ?? "",
        href: value.badge?.href ?? "",
        prefix: value.badge?.prefix ?? "",
        tone: value.badge?.tone ?? "neutral",
        placement: value.badge?.placement ?? "above-headline",
        ...patch,
      },
    });
  const updateSocialProof = (patch: Partial<HeroSocialProof>) =>
    update({
      socialProof: {
        enabled: value.socialProof?.enabled ?? false,
        rating: value.socialProof?.rating ?? "",
        reviewCount: value.socialProof?.reviewCount ?? "",
        label: value.socialProof?.label ?? "",
        avatars: value.socialProof?.avatars ?? [],
        ...patch,
      },
    });
  const updateSecondary = (patch: Partial<HeroData["secondaryCta"]>) =>
    update({
      secondaryCta: {
        label: value.secondaryCta?.label ?? "",
        href: value.secondaryCta?.href ?? "",
        ...value.secondaryCta,
        ...patch,
      },
    });
  const updateMedia = (patch: Partial<HeroData["media"]>) =>
    update({
      media: {
        type: value.media?.type ?? "none",
        source: value.media?.source ?? "external",
        ...value.media,
        ...patch,
      },
    });
  const handleMediaTypeChange = (nextType: HeroMediaType) =>
    update({
      media: resolveMediaTypeTransition(
        {
          type: value.media?.type ?? "none",
          source: value.media?.source ?? "external",
          posterSource: value.media?.posterSource ?? "library",
          ...value.media,
        },
        nextType
      ) as HeroData["media"],
    });
  const updateBackgroundMedia = (
    patch: Partial<NonNullable<HeroData["media"]> & HeroBackgroundMedia>
  ) => {
    const next = {
      ...backgroundMedia,
      ...patch,
    };
    const nextType = next.type ?? "none";
    const normalized =
      nextType === "none"
        ? { type: "none" as const, source: next.source ?? "external" }
        : {
            type: nextType,
            source: next.source ?? "external",
            assetId: next.assetId,
            src: next.src,
            posterSource: next.posterSource,
            posterAssetId: next.posterAssetId,
            posterSrc: next.posterSrc,
            title: next.title,
            description: next.description,
            overlay: next.overlay,
          };
    updateBackground({
      media: normalized,
      image: normalized.type === "image" ? normalized.src : undefined,
    });
  };
  const handleBackgroundMediaTypeChange = (nextType: HeroMediaType) =>
    updateBackgroundMedia(resolveMediaTypeTransition(backgroundMedia, nextType));
  const clearBackgroundMediaField = (key: keyof HeroBackgroundMedia) => {
    const nextBackground = value.background ?? {};
    const nextMedia = { ...(nextBackground.media ?? backgroundMedia) };
    delete nextMedia[key];
    updateBackground({
      media: Object.keys(nextMedia).length > 0 ? nextMedia : { type: "none" },
      image: key === "src" ? undefined : nextBackground.image,
    });
  };
  const updateSocialProofAvatar = (
    index: number,
    patch: Partial<NonNullable<HeroSocialProof["avatars"]>[number]>
  ) => {
    const nextAvatars = Array.from({ length: heroSocialProofAvatarLimit }, (_, avatarIndex) => ({
      src: socialProof.avatars[avatarIndex]?.src ?? "",
      alt: socialProof.avatars[avatarIndex]?.alt ?? "",
    }));
    nextAvatars[index] = {
      ...nextAvatars[index],
      ...patch,
    };
    while (
      nextAvatars.length > 0 &&
      !nextAvatars[nextAvatars.length - 1]?.src.trim() &&
      !nextAvatars[nextAvatars.length - 1]?.alt.trim()
    ) {
      nextAvatars.pop();
    }
    updateSocialProof({ avatars: nextAvatars });
  };
  const visiblePresets = sortHeroPresets(
    presets.filter((preset) =>
      preset.name.toLowerCase().includes(presetSearch.trim().toLowerCase())
    ),
    presetSort
  );
  const presetExportPayload = buildHeroPresetExportPayload(presets);

  useEffect(() => {
    let active = true;
    getUserSetting("widgets.hero.presets")
      .then((response) => {
        if (!active) return;
        setPresets(sanitizeHeroPresetList(response.value));
        setPresetsError(null);
      })
      .catch(() => {
        if (!active) return;
        setPresetsError("Failed to load presets.");
      })
      .finally(() => {
        if (!active) return;
        setPresetsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const persistPresets = async (next: HeroPresetSetting[]) => {
    setIsPresetSaving(true);
    try {
      await setUserSetting("widgets.hero.presets", next);
      setPresets(next);
      setPresetsError(null);
      setPresetNotice(null);
      return true;
    } catch {
      setPresetsError("Failed to save presets.");
      return false;
    } finally {
      setIsPresetSaving(false);
    }
  };

  const handleCreatePreset = async () => {
    const normalizedName = presetName.trim();
    setPresetNotice(null);
    if (!normalizedName) {
      setPresetsError("Preset name is required.");
      return;
    }
    if (presets.some((entry) => entry.name.toLowerCase() === normalizedName.toLowerCase())) {
      setPresetsError("Preset name must be unique.");
      return;
    }
    if (presets.length >= heroPresetLimit) {
      setPresetsError(`Only ${heroPresetLimit} presets are allowed.`);
      return;
    }
    const nextPreset: HeroPresetSetting = {
      name: normalizedName,
      variant: selectedVariant,
      data: cloneHeroData(normalizeHeroData(value)) as Record<string, unknown>,
      updatedAt: new Date().toISOString(),
    };
    const saved = await persistPresets([...presets, nextPreset]);
    if (!saved) return;
    setPresetName("");
    setIsPresetDialogOpen(false);
  };

  const handleApplyPreset = (preset: HeroPresetSetting) => {
    onVariantChange?.(preset.variant);
    onChange(cloneHeroData(preset.data as HeroData) as HeroData);
  };

  const handleUpdatePreset = async (presetNameToUpdate: string) => {
    const next = presets.map((entry) =>
      entry.name.toLowerCase() === presetNameToUpdate.toLowerCase()
        ? {
            ...entry,
            variant: selectedVariant,
            data: cloneHeroData(normalizeHeroData(value)) as Record<string, unknown>,
            updatedAt: new Date().toISOString(),
          }
        : entry
    );
    await persistPresets(next);
  };

  const handleDeletePreset = async (presetNameToDelete: string) => {
    const next = presets.filter(
      (entry) => entry.name.toLowerCase() !== presetNameToDelete.toLowerCase()
    );
    const saved = await persistPresets(next);
    if (!saved) return;
    setPendingDeletePreset(null);
  };

  const handleImportPresets = async () => {
    setPresetNotice(null);
    const result = parseHeroPresetImportText(presetImportValue, presets);
    if (!result.ok) {
      setPresetsError(result.error);
      return;
    }
    const saved = await persistPresets(result.presets);
    if (!saved) return;
    setPresetImportValue("");
    setIsPresetImportDialogOpen(false);
    const importSummary = `Imported ${result.presets.length - presets.length} presets.`;
    setPresetNotice(
      result.warnings.length > 0 ? `${importSummary} ${result.warnings.join(" ")}` : importSummary
    );
  };

  return (
    <div className="space-y-4">
      <EditorSection
        id="hero.variant-presets"
        title="Variant and Presets"
        description="Choose hero orientation and save reusable configurations."
      >
        <div className="space-y-2">
          {variantOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onVariantChange?.(option.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition",
                variant === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:border-primary/50"
              )}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
                <Badge className="shrink-0" variant={variant === option.id ? "default" : "outline"}>
                  {variant === option.id ? "Selected" : "Pick"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setPresetName(`${selectedVariant} preset`);
              setIsPresetDialogOpen(true);
            }}
          >
            Add variant preset
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setIsPresetExportDialogOpen(true)}
            disabled={presetsLoading || presets.length === 0}
          >
            Export presets
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setIsPresetImportDialogOpen(true)}
            disabled={presetsLoading}
          >
            Import presets
          </Button>
        </div>
        {!presetsLoading ? (
          <div className="grid gap-2 md:grid-cols-[1fr_14rem]">
            <Input
              value={presetSearch}
              onChange={(event) => setPresetSearch(event.target.value)}
              placeholder="Search presets"
            />
            <Select
              value={presetSort}
              onValueChange={(next) => setPresetSort(next as "updated-desc" | "name-asc")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort presets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated-desc">Recently updated</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {presetsLoading ? (
          <p className="text-xs text-muted-foreground">Loading presets...</p>
        ) : presets.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No presets yet. Save your current setup as a starting point.
          </p>
        ) : (
          <div className="space-y-2">
            {visiblePresets.map((preset) => (
              <div
                key={preset.name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 p-2"
              >
                <div>
                  <p className="text-sm font-medium">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {variantOptions.find((entry) => entry.id === preset.variant)?.label ??
                      preset.variant}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    Apply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isPresetSaving}
                    onClick={() => void handleUpdatePreset(preset.name)}
                  >
                    Update
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={isPresetSaving}
                    onClick={() => setPendingDeletePreset(preset)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {presetNotice ? <p className="text-xs text-muted-foreground">{presetNotice}</p> : null}
        {presetsError ? <p className="text-xs text-destructive">{presetsError}</p> : null}
      </EditorSection>

      <EditorSection
        id="hero.badge-headline"
        title="Badge and headline"
        description="Control the announcement line and primary hero copy."
      >
        <WidgetControlRow id="hero.badge.enabled" label="Show badge">
          {(fieldProps) => (
            <Switch
              checked={badge.enabled}
              onCheckedChange={(checked) => updateBadge({ enabled: checked })}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
        {badge.enabled ? (
          <>
            <WidgetControlRow id="hero.badge.label" label="Badge label">
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  value={badge.label}
                  onChange={(event) => updateBadge({ label: event.target.value })}
                  placeholder="Now shipping"
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow id="hero.badge.prefix" label="Badge prefix">
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  value={badge.prefix}
                  onChange={(event) => updateBadge({ prefix: event.target.value })}
                  placeholder="New"
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow id="hero.badge.href" label="Badge URL">
              {(fieldProps) => (
                <div className="space-y-2">
                  <Input
                    id={fieldProps.id}
                    value={badge.href}
                    onChange={(event) => updateBadge({ href: event.target.value })}
                    placeholder="/launch"
                    aria-labelledby={fieldProps["aria-labelledby"]}
                    aria-describedby={fieldProps["aria-describedby"]}
                  />
                  {!isValidHref(badge.href) ? (
                    <p className="text-xs text-destructive">
                      Use a relative path, hash, or full URL.
                    </p>
                  ) : null}
                </div>
              )}
            </WidgetControlRow>
            <div className="grid gap-3 md:grid-cols-2">
              <WidgetControlRow id="hero.badge.tone" label="Badge tone">
                {(fieldProps) => (
                  <Select
                    value={badge.tone}
                    onValueChange={(next) => updateBadge({ tone: next as HeroBadgeTone })}
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {badgeToneOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>
              <WidgetControlRow id="hero.badge.placement" label="Badge placement">
                {(fieldProps) => (
                  <Select
                    value={badge.placement}
                    onValueChange={(next) => updateBadge({ placement: next as HeroBadgePlacement })}
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select placement" />
                    </SelectTrigger>
                    <SelectContent>
                      {badgePlacementOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>
            </div>
          </>
        ) : null}
        <WidgetControlRow id="hero.headline" label="Headline">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={value.headline}
              onChange={(event) => update({ headline: event.target.value })}
              placeholder="Build with confidence"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow id="hero.subhead" label="Subhead">
          {(fieldProps) => (
            <Textarea
              id={fieldProps.id}
              value={value.subhead ?? ""}
              onChange={(event) => update({ subhead: event.target.value })}
              placeholder="Short supporting message"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow id="hero.body" label="Body">
          {(fieldProps) => (
            <Textarea
              id={fieldProps.id}
              value={value.body ?? ""}
              onChange={(event) => update({ body: event.target.value })}
              placeholder="Explain the key benefit."
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="hero.cta"
        title="CTA"
        description="Manage CTA structure and button appearance."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">CTA layout</p>
          <Select
            value={ctaMode}
            onValueChange={(next) => {
              if (next === "single") {
                update({ secondaryCta: undefined });
              } else {
                update({ secondaryCta: secondary });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="CTA layout" />
            </SelectTrigger>
            <SelectContent>
              {ctaOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary CTA Label</p>
            <Input
              value={primary.label}
              onChange={(event) => updatePrimary({ label: event.target.value })}
              placeholder="Get started"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary CTA URL</p>
            <Input
              value={primary.href}
              onChange={(event) => updatePrimary({ href: event.target.value })}
              placeholder={heroCtaPlaceholderExamples.primary}
            />
            {!isValidHref(primary.href) ? (
              <p className="text-xs text-destructive">Use a relative path or full URL.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary button size</p>
            <Select
              value={style.primaryButtonSize ?? "md"}
              onValueChange={(next) => updateStyle({ primaryButtonSize: next as HeroButtonSize })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {buttonSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {ctaMode === "dual" ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Secondary CTA Label</p>
                <Input
                  value={secondary.label}
                  onChange={(event) => updateSecondary({ label: event.target.value })}
                  placeholder="Learn more"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Secondary CTA URL</p>
                <Input
                  value={secondary.href}
                  onChange={(event) => updateSecondary({ href: event.target.value })}
                  placeholder={heroCtaPlaceholderExamples.secondary}
                />
                {!isValidHref(secondary.href) ? (
                  <p className="text-xs text-destructive">Use a relative path or full URL.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Secondary button size</p>
                <Select
                  value={style.secondaryButtonSize ?? "md"}
                  onValueChange={(next) =>
                    updateStyle({ secondaryButtonSize: next as HeroButtonSize })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {buttonSizeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {formatTokenOptionLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
        </div>
      </EditorSection>

      <EditorSection
        id="hero.rich-copy-social-proof"
        title="Rich copy and social proof"
        description="Add optional sanitized HTML emphasis and a compact trust row without raw scripts."
      >
        <WidgetControlRow id="hero.richHeadline" label="Rich headline HTML">
          {(fieldProps) => (
            <Textarea
              id={fieldProps.id}
              value={value.richHeadline ?? ""}
              onChange={(event) => update({ richHeadline: event.target.value })}
              placeholder="<strong>Build</strong> with confidence"
              rows={4}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow id="hero.richBody" label="Rich body HTML">
          {(fieldProps) => (
            <Textarea
              id={fieldProps.id}
              value={value.richBody ?? ""}
              onChange={(event) => update({ richBody: event.target.value })}
              placeholder="<p>Use <strong>bold</strong>, <em>emphasis</em>, and safe links.</p>"
              rows={5}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
        <p className="text-xs text-muted-foreground">
          Leave rich HTML blank to keep the plain headline/body fields above. Allowed tags are
          sanitized through the shared widget rich-text policy before runtime output.
        </p>
        <WidgetControlRow id="hero.socialProof.enabled" label="Show social proof">
          {(fieldProps) => (
            <Switch
              checked={socialProof.enabled}
              onCheckedChange={(checked) => updateSocialProof({ enabled: checked })}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
        {socialProof.enabled ? (
          <>
            <WidgetControlRow id="hero.socialProof.rating" label="Rating">
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  value={socialProof.rating}
                  onChange={(event) => updateSocialProof({ rating: event.target.value })}
                  placeholder="4.9/5"
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow id="hero.socialProof.reviewCount" label="Review count">
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  value={socialProof.reviewCount}
                  onChange={(event) => updateSocialProof({ reviewCount: event.target.value })}
                  placeholder="2,000+ reviews"
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow id="hero.socialProof.label" label="Social proof label">
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  value={socialProof.label}
                  onChange={(event) => updateSocialProof({ label: event.target.value })}
                  placeholder="Trusted by product and ops teams."
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
            <div className="space-y-3 rounded-md border border-border/70 p-3">
              <p className="text-sm font-medium">Social proof avatars</p>
              <p className="text-xs text-muted-foreground">
                Leave unused rows empty. Avatar URLs follow the same relative-or-full-URL media
                policy as other Hero media fields.
              </p>
              {Array.from({ length: heroSocialProofAvatarLimit }, (_, index) => {
                const avatar = socialProof.avatars[index] ?? { src: "", alt: "" };
                return (
                  <div key={`hero-avatar-${index}`} className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Avatar {index + 1} URL</p>
                      <Input
                        value={avatar.src}
                        onChange={(event) =>
                          updateSocialProofAvatar(index, { src: event.target.value })
                        }
                        placeholder={`https://cdn.example.com/avatar-${index + 1}.jpg`}
                      />
                      {!isValidMediaUrl(avatar.src) ? (
                        <p className="text-xs text-destructive">Use a relative path or full URL.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Avatar {index + 1} alt text</p>
                      <Input
                        value={avatar.alt ?? ""}
                        onChange={(event) =>
                          updateSocialProofAvatar(index, { alt: event.target.value })
                        }
                        placeholder="Reviewer avatar"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </EditorSection>

      <EditorSection
        id="hero.media"
        title="Media"
        description={
          selectedVariant === "centered"
            ? "Centered uses image media as the Hero background. Other variants render media inline."
            : "Inline media is visible in split, media-left, and media-center variants."
        }
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Media type</p>
          <Select
            value={mediaType}
            onValueChange={(next) => handleMediaTypeChange(next as HeroMediaType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select media" />
            </SelectTrigger>
            <SelectContent>
              {mediaOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {mediaType !== "none" ? (
          <>
            <HeroMediaSourceFields media={media} mediaType={mediaType} onChange={updateMedia} />
            {mediaType === "image" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Media alt text</p>
                <Input
                  value={media.alt ?? ""}
                  onChange={(event) => updateMedia({ alt: event.target.value })}
                  placeholder="Describe the media"
                />
              </div>
            ) : null}
            {mediaType === "video" ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Video title</p>
                  <Input
                    value={media.title ?? ""}
                    onChange={(event) => updateMedia({ title: event.target.value })}
                    placeholder="Product demo video"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Video description</p>
                  <Textarea
                    value={media.description ?? ""}
                    onChange={(event) => updateMedia({ description: event.target.value })}
                    placeholder="Optional context for screen readers"
                  />
                </div>
                <HeroPosterFields
                  media={media}
                  onChange={updateMedia}
                  onClear={() =>
                    updateMedia({
                      posterSource: undefined,
                      posterAssetId: undefined,
                      posterSrc: undefined,
                    })
                  }
                />
              </>
            ) : null}
            {selectedVariant !== "centered" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Media ratio</p>
                <Select
                  value={media.ratio ?? "16:9"}
                  onValueChange={(next) => updateMedia({ ratio: next })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratioOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {formatTokenOptionLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {selectedVariant !== "centered" || mediaType === "image" ? (
              <div className="space-y-2">
                <ClearableFieldHeader
                  label="Media overlay"
                  value={media.overlay}
                  onClear={() => clearMediaField("overlay")}
                />
                <Input
                  value={media.overlay ?? ""}
                  onChange={(event) => updateMedia({ overlay: event.target.value })}
                  placeholder="rgba(0,0,0,0.2)"
                />
              </div>
            ) : null}
          </>
        ) : null}
        {selectedVariant === "centered" && mediaType === "image" ? (
          <p className="text-xs text-muted-foreground">
            Centered layout renders the selected image as hero background.
          </p>
        ) : null}
        {selectedVariant === "centered" && mediaType === "video" ? (
          <p className="text-xs text-muted-foreground">
            Centered layout does not render inline video. Switch to Media Right, Media Left, or
            Media Center to display video content.
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        id="hero.typography"
        title="Typography"
        description="Adjust alignment and text scale."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment</p>
          <Select
            value={value.layout?.align ?? "center"}
            onValueChange={(next) => updateLayout({ align: next as HeroAlign })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {formatTokenOptionLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Headline size</p>
            <Select
              value={style.headlineSize ?? "3xl"}
              onValueChange={(next) => updateStyle({ headlineSize: next as HeroHeadlineSize })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {headlineSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Subhead size</p>
            <Select
              value={style.subheadSize ?? "xl"}
              onValueChange={(next) => updateStyle({ subheadSize: next as HeroSubheadSize })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {subheadSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Body size</p>
            <Select
              value={style.bodySize ?? "base"}
              onValueChange={(next) => updateStyle({ bodySize: next as HeroBodySize })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {bodySizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="hero.appearance"
        title="Appearance"
        description="Add bounded shadow, font, and motion presets without custom CSS."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Card shadow</p>
            <Select
              value={style.cardShadow ?? "none"}
              onValueChange={(next) => updateStyle({ cardShadow: next as HeroShadow })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shadow" />
              </SelectTrigger>
              <SelectContent>
                {shadowOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedVariant !== "centered" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Media shadow</p>
              <Select
                value={style.mediaShadow ?? "none"}
                onValueChange={(next) => updateStyle({ mediaShadow: next as HeroShadow })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shadow" />
                </SelectTrigger>
                <SelectContent>
                  {shadowOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatTokenOptionLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium">Button shadow</p>
            <Select
              value={style.buttonShadow ?? "none"}
              onValueChange={(next) => updateStyle({ buttonShadow: next as HeroShadow })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shadow" />
              </SelectTrigger>
              <SelectContent>
                {shadowOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Font family</p>
            <Select
              value={style.fontFamily ?? "inherit"}
              onValueChange={(next) => updateStyle({ fontFamily: next as HeroFont })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select font family" />
              </SelectTrigger>
              <SelectContent>
                {fontFamilyOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "inherit" ? "Inherit" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Headline weight</p>
            <Select
              value={style.headlineWeight ?? "semibold"}
              onValueChange={(next) => updateStyle({ headlineWeight: next as HeroWeight })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select weight" />
              </SelectTrigger>
              <SelectContent>
                {textWeightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Body weight</p>
            <Select
              value={style.bodyWeight ?? "medium"}
              onValueChange={(next) => updateStyle({ bodyWeight: next as HeroWeight })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select weight" />
              </SelectTrigger>
              <SelectContent>
                {textWeightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Entrance motion</p>
            <Select
              value={style.motion ?? "none"}
              onValueChange={(next) => updateStyle({ motion: next as HeroMotion })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select motion" />
              </SelectTrigger>
              <SelectContent>
                {motionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "fade-in" ? "Fade in" : option === "slide-up" ? "Slide up" : "None"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="hero.colors-borders"
        title="Colors and Borders"
        description="Fine-tune text, button, and frame styling."
      >
        <div className="space-y-2 rounded-md border border-border/70 p-3">
          <p className="text-sm font-medium">Hero palettes</p>
          <div className="flex flex-wrap gap-2">
            {heroPalettePresets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange(applyHeroPalette(value, preset.id))}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Applying a palette writes explicit Hero colors. You can still override any field
            manually afterwards.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <HeroColorField
            id="hero.style.textColor"
            label="Headline color"
            value={style.textColor}
            onChange={(next) => updateStyle({ textColor: next })}
            placeholder="var(--color-text)"
          />
          <HeroColorField
            id="hero.style.subheadColor"
            label="Subhead color"
            value={style.subheadColor}
            onChange={(next) => updateStyle({ subheadColor: next })}
            placeholder="rgba(17, 24, 39, 0.8)"
          />
          <HeroColorField
            id="hero.style.bodyColor"
            label="Body color"
            value={style.bodyColor}
            onChange={(next) => updateStyle({ bodyColor: next })}
            placeholder="rgba(17, 24, 39, 0.7)"
          />
          <HeroColorField
            id="hero.style.borderColor"
            label="Card border color"
            value={style.borderColor}
            onChange={(next) => updateStyle({ borderColor: next })}
            placeholder="var(--color-border)"
          />
          <HeroColorField
            id="hero.style.primaryButtonBg"
            label="Primary button background"
            value={style.primaryButtonBg}
            onChange={(next) => updateStyle({ primaryButtonBg: next })}
            onClear={() => clearStyleField("primaryButtonBg")}
            placeholder="var(--color-primary)"
          />
          <HeroColorField
            id="hero.style.primaryButtonText"
            label="Primary button text"
            value={style.primaryButtonText}
            onChange={(next) => updateStyle({ primaryButtonText: next })}
            placeholder="var(--color-bg)"
          />
          <HeroColorField
            id="hero.style.primaryButtonBorder"
            label="Primary button border"
            value={style.primaryButtonBorder}
            onChange={(next) => updateStyle({ primaryButtonBorder: next })}
            placeholder="transparent"
          />
          <HeroColorField
            id="hero.style.secondaryButtonBg"
            label="Secondary button background"
            value={style.secondaryButtonBg}
            onChange={(next) => updateStyle({ secondaryButtonBg: next })}
            onClear={() => clearStyleField("secondaryButtonBg")}
            placeholder="transparent"
          />
          <HeroColorField
            id="hero.style.secondaryButtonText"
            label="Secondary button text"
            value={style.secondaryButtonText}
            onChange={(next) => updateStyle({ secondaryButtonText: next })}
            placeholder="var(--color-text)"
          />
          <HeroColorField
            id="hero.style.secondaryButtonBorder"
            label="Secondary button border"
            value={style.secondaryButtonBorder}
            onChange={(next) => updateStyle({ secondaryButtonBorder: next })}
            placeholder="var(--color-border)"
          />
          {selectedVariant !== "centered" ? (
            <HeroColorField
              id="hero.style.mediaBorderColor"
              label="Media frame border color"
              value={style.mediaBorderColor}
              onChange={(next) => updateStyle({ mediaBorderColor: next })}
              placeholder="var(--color-border)"
            />
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Card border width</p>
            <Select
              value={style.borderWidth ?? "1"}
              onValueChange={(next) => updateStyle({ borderWidth: next as HeroBorderWidth })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                {borderWidthOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Card radius</p>
            <Select
              value={style.borderRadius ?? "3xl"}
              onValueChange={(next) => updateStyle({ borderRadius: next as HeroRadius })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select radius" />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedVariant !== "centered" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Media border width</p>
              <Select
                value={style.mediaBorderWidth ?? "1"}
                onValueChange={(next) => updateStyle({ mediaBorderWidth: next as HeroBorderWidth })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select width" />
                </SelectTrigger>
                <SelectContent>
                  {borderWidthOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatTokenOptionLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {selectedVariant !== "centered" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Media radius</p>
              <Select
                value={style.mediaRadius ?? "2xl"}
                onValueChange={(next) => updateStyle({ mediaRadius: next as HeroRadius })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select radius" />
                </SelectTrigger>
                <SelectContent>
                  {radiusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatTokenOptionLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <div className="space-y-1 rounded-md border border-border/70 p-3">
          <p className="text-sm font-medium">Contrast guidance</p>
          <ColorContrastNotice advisory={headlineContrast} label="Headline" />
          <ColorContrastNotice advisory={bodyContrast} label="Body" />
          <ColorContrastNotice advisory={primaryButtonContrast} label="Primary CTA" />
          <ColorContrastNotice advisory={secondaryButtonContrast} label="Secondary CTA" />
        </div>
      </EditorSection>

      <EditorSection
        id="hero.background"
        title="Background"
        description="Background can use image/video from library or external URL."
      >
        <HeroColorField
          id="hero.background.color"
          label="Background color"
          value={value.background?.color}
          onChange={(next) => updateBackground({ color: next })}
          onClear={() => clearBackgroundField("color")}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
        <GradientField
          id="hero.background.gradient"
          label="Background gradient"
          value={value.background?.gradient}
          onChange={(next) => updateBackground({ gradient: next })}
          onClear={() => clearBackgroundField("gradient")}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Background media type</p>
          <Select
            value={backgroundMediaType}
            onValueChange={(next) => handleBackgroundMediaTypeChange(next as HeroMediaType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select media type" />
            </SelectTrigger>
            <SelectContent>
              {mediaOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {backgroundMediaType !== "none" ? (
          <>
            <HeroMediaSourceFields
              media={backgroundMedia}
              mediaType={backgroundMediaType}
              onChange={updateBackgroundMedia}
            />
            {backgroundMediaType === "video" ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Background video title</p>
                  <Input
                    value={backgroundMedia.title ?? ""}
                    onChange={(event) => updateBackgroundMedia({ title: event.target.value })}
                    placeholder="Ambient background video"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Background video description</p>
                  <Textarea
                    value={backgroundMedia.description ?? ""}
                    onChange={(event) => updateBackgroundMedia({ description: event.target.value })}
                    placeholder="Optional context for screen readers"
                  />
                </div>
                <HeroPosterFields
                  media={backgroundMedia}
                  onChange={updateBackgroundMedia}
                  onClear={() =>
                    updateBackgroundMedia({
                      posterSource: undefined,
                      posterAssetId: undefined,
                      posterSrc: undefined,
                    })
                  }
                />
              </>
            ) : null}
            <div className="space-y-2">
              <ClearableFieldHeader
                label="Background media overlay"
                value={backgroundMedia.overlay}
                onClear={() => clearBackgroundMediaField("overlay")}
              />
              <Input
                value={backgroundMedia.overlay ?? ""}
                onChange={(event) => updateBackgroundMedia({ overlay: event.target.value })}
                placeholder="rgba(0,0,0,0.25)"
              />
            </div>
          </>
        ) : null}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Background media supports both Media Library and external URL.
          </p>
        </div>
      </EditorSection>

      <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Hero preset</DialogTitle>
            <DialogDescription>
              Save the current variant, content, media, and style configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Preset name</p>
              <Input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Homepage Hero"
              />
            </div>
            <div className="rounded-md border border-border/70 bg-muted/30 p-2 text-xs text-muted-foreground">
              The preset stores current variant, copy, CTA, media, typography, colors, borders, and
              background settings.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsPresetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreatePreset()}
              disabled={isPresetSaving}
            >
              Save preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPresetExportDialogOpen} onOpenChange={setIsPresetExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Hero presets</DialogTitle>
            <DialogDescription>
              Copy the JSON below to move Hero presets between environments or teammates.
            </DialogDescription>
          </DialogHeader>
          <Textarea readOnly value={presetExportPayload} className="min-h-64 font-mono text-xs" />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPresetExportDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPresetImportDialogOpen} onOpenChange={setIsPresetImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Hero presets</DialogTitle>
            <DialogDescription>
              Paste a preset export payload or a raw presets array. Duplicate names fail the whole
              import.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={presetImportValue}
            onChange={(event) => setPresetImportValue(event.target.value)}
            placeholder="Paste preset JSON"
            className="min-h-64 font-mono text-xs"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPresetImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleImportPresets()}
              disabled={isPresetSaving}
            >
              Import presets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingDeletePreset)}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePreset(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Hero preset?</DialogTitle>
            <DialogDescription>
              Delete &quot;{pendingDeletePreset?.name}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPendingDeletePreset(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPresetSaving || !pendingDeletePreset}
              onClick={() =>
                pendingDeletePreset && void handleDeletePreset(pendingDeletePreset.name)
              }
            >
              Delete preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function HeroAdvancedEditor({ value, onChange }: WidgetEditorProps<HeroData>) {
  const update = (patch: Partial<HeroData>) => onChange({ ...value, ...patch });
  const updateLayout = (patch: Partial<HeroData["layout"]>) =>
    update({ layout: { ...value.layout, ...patch } });
  const updateSpacing = (patch: Partial<HeroData["spacing"]>) =>
    update({ spacing: { ...value.spacing, ...patch } });
  const updateBackground = (patch: Partial<HeroData["background"]>) =>
    update({ background: { ...value.background, ...patch } });
  const backgroundMedia = resolveBackgroundMedia(value.background);
  const backgroundMediaType: HeroMediaType = backgroundMedia.type ?? "none";
  const clearBackgroundField = (key: keyof HeroBackground) => {
    const { [key]: _removed, ...nextBackground } = value.background ?? {};
    update({ background: Object.keys(nextBackground).length > 0 ? nextBackground : {} });
  };
  const updateBackgroundMedia = (
    patch: Partial<NonNullable<HeroData["media"]> & HeroBackgroundMedia>
  ) => {
    const next = {
      ...backgroundMedia,
      ...patch,
    };
    const nextType = next.type ?? "none";
    const normalized =
      nextType === "none"
        ? { type: "none" as const, source: next.source ?? "external" }
        : {
            type: nextType,
            source: next.source ?? "external",
            assetId: next.assetId,
            src: next.src,
            posterSource: next.posterSource,
            posterAssetId: next.posterAssetId,
            posterSrc: next.posterSrc,
            title: next.title,
            description: next.description,
            overlay: next.overlay,
          };
    updateBackground({
      media: normalized,
      image: normalized.type === "image" ? normalized.src : undefined,
    });
  };
  const handleBackgroundMediaTypeChange = (nextType: HeroMediaType) =>
    updateBackgroundMedia(resolveMediaTypeTransition(backgroundMedia, nextType));
  const clearBackgroundMediaField = (key: keyof HeroBackgroundMedia) => {
    const nextBackground = value.background ?? {};
    const nextMedia = { ...(nextBackground.media ?? backgroundMedia) };
    delete nextMedia[key];
    updateBackground({
      media: Object.keys(nextMedia).length > 0 ? nextMedia : { type: "none" },
      image: key === "src" ? undefined : nextBackground.image,
    });
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Advanced mode exposes technical layout controls only.
      </p>
      <EditorSection
        id="hero.advanced.layout"
        title="Hero Layout"
        description="Control alignment, width, height, full-bleed, and internal Hero spacing."
      >
        <p className="text-xs text-muted-foreground">
          These controls change the Hero card itself. Generic page or builder container padding
          stays outside this widget.
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment</p>
          <Select
            value={value.layout?.align ?? "center"}
            onValueChange={(next) => updateLayout({ align: next as HeroAlign })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {formatTokenOptionLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Max width</p>
            <Select
              value={value.layout?.maxWidth ?? "xl"}
              onValueChange={(next) => updateLayout({ maxWidth: next as HeroMaxWidth })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                {maxWidthOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Content width</p>
            <Select
              value={value.layout?.contentWidth ?? "lg"}
              onValueChange={(next) => updateLayout({ contentWidth: next as HeroContentWidth })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                {contentWidthOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Height</p>
            <Select
              value={value.layout?.height ?? "auto"}
              onValueChange={(next) => updateLayout({ height: next as HeroHeight })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select height" />
              </SelectTrigger>
              <SelectContent>
                {heightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Bleed</p>
            <Select
              value={value.layout?.bleed ?? "contained"}
              onValueChange={(next) => updateLayout({ bleed: next as HeroBleed })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bleed" />
              </SelectTrigger>
              <SelectContent>
                {bleedOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "full-bleed" ? "Full bleed" : "Contained"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Hero content padding top</p>
            <Select
              value={value.spacing?.paddingTop ?? "xl"}
              onValueChange={(next) => updateSpacing({ paddingTop: next as HeroSpacing })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select padding" />
              </SelectTrigger>
              <SelectContent>
                {spacingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Hero content padding bottom</p>
            <Select
              value={value.spacing?.paddingBottom ?? "xl"}
              onValueChange={(next) => updateSpacing({ paddingBottom: next as HeroSpacing })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select padding" />
              </SelectTrigger>
              <SelectContent>
                {spacingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="hero.advanced.background"
        title="Background"
        description="Set color/gradient and optional image or video source."
      >
        <HeroColorField
          id="hero.advanced.background.color"
          label="Background color"
          value={value.background?.color}
          onChange={(next) => updateBackground({ color: next })}
          onClear={() => clearBackgroundField("color")}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
        <GradientField
          id="hero.advanced.background.gradient"
          label="Background gradient"
          value={value.background?.gradient}
          onChange={(next) => updateBackground({ gradient: next })}
          onClear={() => clearBackgroundField("gradient")}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Background media type</p>
          <Select
            value={backgroundMediaType}
            onValueChange={(next) => handleBackgroundMediaTypeChange(next as HeroMediaType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select media type" />
            </SelectTrigger>
            <SelectContent>
              {mediaOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {backgroundMediaType !== "none" ? (
          <>
            <HeroMediaSourceFields
              media={backgroundMedia}
              mediaType={backgroundMediaType}
              onChange={updateBackgroundMedia}
            />
            {backgroundMediaType === "video" ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Background video title</p>
                  <Input
                    value={backgroundMedia.title ?? ""}
                    onChange={(event) => updateBackgroundMedia({ title: event.target.value })}
                    placeholder="Ambient background video"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Background video description</p>
                  <Textarea
                    value={backgroundMedia.description ?? ""}
                    onChange={(event) => updateBackgroundMedia({ description: event.target.value })}
                    placeholder="Optional context for screen readers"
                  />
                </div>
                <HeroPosterFields
                  media={backgroundMedia}
                  onChange={updateBackgroundMedia}
                  onClear={() =>
                    updateBackgroundMedia({
                      posterSource: undefined,
                      posterAssetId: undefined,
                      posterSrc: undefined,
                    })
                  }
                />
              </>
            ) : null}
            <div className="space-y-2">
              <ClearableFieldHeader
                label="Background media overlay"
                value={backgroundMedia.overlay}
                onClear={() => clearBackgroundMediaField("overlay")}
              />
              <Input
                value={backgroundMedia.overlay ?? ""}
                onChange={(event) => updateBackgroundMedia({ overlay: event.target.value })}
                placeholder="rgba(0,0,0,0.25)"
              />
            </div>
          </>
        ) : null}
      </EditorSection>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Hide media on mobile</p>
          <p className="text-xs text-muted-foreground">Keep the hero focused on copy and CTA.</p>
        </div>
        <Switch
          checked={value.responsive?.hideMediaOnMobile ?? false}
          onCheckedChange={(checked) =>
            update({
              responsive: { ...value.responsive, hideMediaOnMobile: checked },
            })
          }
        />
      </div>
    </div>
  );
}
