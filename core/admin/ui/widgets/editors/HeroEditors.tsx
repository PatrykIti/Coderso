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
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import {
  ColorContrastNotice,
  ClearableFieldHeader,
  hasClearableFieldValue,
  resolveColorContrastAdvisory,
  resolveColorPickerValue,
  SharedColorFieldInputs,
} from "./ClearableFields";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow as BaseWidgetControlRow,
  WidgetEditorSection,
  type WidgetControlRowProps,
} from "./WidgetEditorControls";

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
  Pick<HeroData, "headline" | "primaryCta">
> = {
  lead: {
    headline: "Grow your audience faster",
    primaryCta: { label: "Join the list", href: "/signup" },
  },
  sales: {
    headline: "Convert more visitors",
    primaryCta: { label: "Book a demo", href: "/demo" },
  },
  info: {
    headline: "Everything you need to know",
    primaryCta: { label: "Learn more", href: "/about" },
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

const heroControlPathById: Record<string, string> = {
  "hero.variant": "variant",
  "hero.badge.enabled": "badge.enabled",
  "hero.badge.label": "badge.label",
  "hero.badge.prefix": "badge.prefix",
  "hero.badge.href": "badge.href",
  "hero.badge.tone": "badge.tone",
  "hero.badge.placement": "badge.placement",
  "hero.headline": "headline",
  "hero.subhead": "subhead",
  "hero.body": "body",
  "hero.cta.layout": "secondaryCta",
  "hero.primaryCta.label": "primaryCta.label",
  "hero.primaryCta.href": "primaryCta.href",
  "hero.style.primaryButtonSize": "style.primaryButtonSize",
  "hero.secondaryCta.label": "secondaryCta.label",
  "hero.secondaryCta.href": "secondaryCta.href",
  "hero.style.secondaryButtonSize": "style.secondaryButtonSize",
  "hero.richHeadline": "richHeadline",
  "hero.richBody": "richBody",
  "hero.socialProof.enabled": "socialProof.enabled",
  "hero.socialProof.rating": "socialProof.rating",
  "hero.socialProof.reviewCount": "socialProof.reviewCount",
  "hero.socialProof.label": "socialProof.label",
  "hero.media.type": "media.type",
  "hero.media.source": "media.source",
  "hero.media.assetId": "media.assetId",
  "hero.media.src": "media.src",
  "hero.media.alt": "media.alt",
  "hero.media.title": "media.title",
  "hero.media.description": "media.description",
  "hero.media.posterSource": "media.posterSource",
  "hero.media.posterAssetId": "media.posterAssetId",
  "hero.media.posterSrc": "media.posterSrc",
  "hero.media.ratio": "media.ratio",
  "hero.media.overlay": "media.overlay",
  "hero.layout.align": "layout.align",
  "hero.layout.maxWidth": "layout.maxWidth",
  "hero.layout.contentWidth": "layout.contentWidth",
  "hero.layout.height": "layout.height",
  "hero.layout.bleed": "layout.bleed",
  "hero.spacing.paddingTop": "spacing.paddingTop",
  "hero.spacing.paddingBottom": "spacing.paddingBottom",
  "hero.style.headlineSize": "style.headlineSize",
  "hero.style.subheadSize": "style.subheadSize",
  "hero.style.bodySize": "style.bodySize",
  "hero.style.cardShadow": "style.cardShadow",
  "hero.style.mediaShadow": "style.mediaShadow",
  "hero.style.buttonShadow": "style.buttonShadow",
  "hero.style.fontFamily": "style.fontFamily",
  "hero.style.headlineWeight": "style.headlineWeight",
  "hero.style.bodyWeight": "style.bodyWeight",
  "hero.style.motion": "style.motion",
  "hero.style.textColor": "style.textColor",
  "hero.style.subheadColor": "style.subheadColor",
  "hero.style.bodyColor": "style.bodyColor",
  "hero.style.borderColor": "style.borderColor",
  "hero.style.primaryButtonBg": "style.primaryButtonBg",
  "hero.style.primaryButtonText": "style.primaryButtonText",
  "hero.style.primaryButtonBorder": "style.primaryButtonBorder",
  "hero.style.secondaryButtonBg": "style.secondaryButtonBg",
  "hero.style.secondaryButtonText": "style.secondaryButtonText",
  "hero.style.secondaryButtonBorder": "style.secondaryButtonBorder",
  "hero.style.mediaBorderColor": "style.mediaBorderColor",
  "hero.style.borderWidth": "style.borderWidth",
  "hero.style.borderRadius": "style.borderRadius",
  "hero.style.mediaBorderWidth": "style.mediaBorderWidth",
  "hero.style.mediaRadius": "style.mediaRadius",
  "hero.background.color": "background.color",
  "hero.background.gradient": "background.gradient",
  "hero.background.media.type": "background.media.type",
  "hero.background.media.source": "background.media.source",
  "hero.background.media.assetId": "background.media.assetId",
  "hero.background.media.src": "background.media.src",
  "hero.background.media.title": "background.media.title",
  "hero.background.media.description": "background.media.description",
  "hero.background.media.posterSource": "background.media.posterSource",
  "hero.background.media.posterAssetId": "background.media.posterAssetId",
  "hero.background.media.posterSrc": "background.media.posterSrc",
  "hero.background.media.overlay": "background.media.overlay",
  "hero.responsive.hideMediaOnMobile": "responsive.hideMediaOnMobile",
};

function WidgetControlRow(props: WidgetControlRowProps) {
  const path = props.path ?? heroControlPathById[props.id];
  return <BaseWidgetControlRow {...props} path={path} />;
}

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
  controlIdPrefix = "hero.media",
  pathPrefix = "media",
}: {
  media: HeroMediaEditorValue;
  mediaType: HeroMediaType;
  onChange: (patch: HeroMediaEditorValue) => void;
  controlIdPrefix?: string;
  pathPrefix?: string;
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
      <WidgetControlRow
        id={`${controlIdPrefix}.source`}
        label="Media source"
        path={`${pathPrefix}.source`}
      >
        {(fieldProps) => (
          <Select
            value={source}
            onValueChange={(next) => handleSourceChange(next as HeroMediaSource)}
          >
            <SelectTrigger
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            >
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
        )}
      </WidgetControlRow>
      {source === "library" ? (
        <WidgetControlRow
          id={`${controlIdPrefix}.assetId`}
          label="Media asset"
          path={`${pathPrefix}.assetId`}
        >
          {() => (
            <div className="space-y-2">
              <MediaPicker
                value={media.assetId ?? null}
                onChange={(value) => void handleAssetChange(value)}
                multiple={false}
                accept={accept}
              />
              {lookupError ? <p className="text-xs text-destructive">{lookupError}</p> : null}
            </div>
          )}
        </WidgetControlRow>
      ) : (
        <WidgetControlRow
          id={`${controlIdPrefix}.src`}
          label="Media URL"
          path={`${pathPrefix}.src`}
        >
          {(fieldProps) => (
            <div className="space-y-2">
              <Input
                id={fieldProps.id}
                value={media.src ?? ""}
                onChange={(event) => onChange({ src: event.target.value })}
                placeholder="https://"
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
              {!isValidMediaUrl(media.src) ? (
                <p className="text-xs text-destructive">Use a relative path or full URL.</p>
              ) : null}
            </div>
          )}
        </WidgetControlRow>
      )}
    </div>
  );
}

function HeroPosterFields({
  media,
  onChange,
  onClear,
  controlIdPrefix = "hero.media",
  pathPrefix = "media",
}: {
  media: HeroMediaEditorValue;
  onChange: (patch: HeroMediaEditorValue) => void;
  onClear: () => void;
  controlIdPrefix?: string;
  pathPrefix?: string;
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
      <ClearableFieldHeader
        label="Video poster image"
        value={media.posterSrc}
        onClear={onClear}
        onRestore={() =>
          onChange({
            posterSource: media.posterSource,
            posterAssetId: media.posterAssetId,
            posterSrc: media.posterSrc,
          })
        }
      />
      <WidgetControlRow
        id={`${controlIdPrefix}.posterSource`}
        label="Poster source"
        path={`${pathPrefix}.posterSource`}
      >
        {(fieldProps) => (
          <Select
            value={posterSource}
            onValueChange={(next) => handleSourceChange(next as HeroMediaSource)}
          >
            <SelectTrigger
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            >
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
        )}
      </WidgetControlRow>
      {posterSource === "library" ? (
        <WidgetControlRow
          id={`${controlIdPrefix}.posterAssetId`}
          label="Poster asset"
          path={`${pathPrefix}.posterAssetId`}
        >
          {() => (
            <div className="space-y-2">
              <MediaPicker
                value={media.posterAssetId ?? null}
                onChange={(value) => void handlePosterAssetChange(value)}
                multiple={false}
                accept={["image/*"]}
              />
              {lookupError ? <p className="text-xs text-destructive">{lookupError}</p> : null}
            </div>
          )}
        </WidgetControlRow>
      ) : (
        <WidgetControlRow
          id={`${controlIdPrefix}.posterSrc`}
          label="Poster image URL"
          path={`${pathPrefix}.posterSrc`}
        >
          {(fieldProps) => (
            <div className="space-y-2">
              <Input
                id={fieldProps.id}
                value={media.posterSrc ?? ""}
                onChange={(event) => onChange({ posterSrc: event.target.value })}
                placeholder="https://"
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
              {!isValidMediaUrl(media.posterSrc) ? (
                <p className="text-xs text-destructive">Use a relative path or full URL.</p>
              ) : null}
            </div>
          )}
        </WidgetControlRow>
      )}
    </div>
  );
}

function HeroVariantSelect({
  value,
  onChange,
  fieldProps,
}: {
  value: string;
  onChange?: (next: string) => void;
  fieldProps?: {
    id: string;
    "aria-labelledby": string;
    "aria-describedby"?: string;
  };
}) {
  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={(next) => onChange?.(next)}>
        <SelectTrigger
          id={fieldProps?.id}
          aria-labelledby={fieldProps?.["aria-labelledby"]}
          aria-describedby={fieldProps?.["aria-describedby"]}
        >
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

  return (
    <div className="space-y-4">
      <EditorSection
        id="hero.wizard.goal-structure"
        mode="wizard"
        role="setup"
        title="Goal and structure"
        description="Seed a usable Hero. Daily presentation changes live in Visual."
      >
        <WidgetControlRow id="hero.goal" label="Goal" ownership="action">
          {(fieldProps) => (
            <Select
              value={goal}
              onValueChange={(next) => {
                const selected = next as (typeof goalOptions)[number]["id"];
                setGoal(selected);
                update(goalPresets[selected]);
              }}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <WidgetControlRow id="hero.variant" label="Initial Hero layout" path="variant">
          {(fieldProps) => (
            <HeroVariantSelect value={variant} onChange={onVariantChange} fieldProps={fieldProps} />
          )}
        </WidgetControlRow>
      </EditorSection>
      <EditorSection
        id="hero.wizard.starter-copy"
        mode="wizard"
        role="setup"
        title="Starter copy"
        description="Seed the headline only. Subheads, body, badges, and rich copy are Visual edits."
      >
        <WidgetControlRow id="hero.headline" label="Headline seed" path="headline">
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
      </EditorSection>
      <EditorSection
        id="hero.wizard.primary-action"
        mode="wizard"
        role="setup"
        title="Primary action seed"
        description="Seed the first CTA. Secondary CTAs and button design are Visual edits."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <WidgetControlRow id="hero.primaryCta.label" label="Primary CTA label">
            {(fieldProps) => (
              <Input
                id={fieldProps.id}
                value={primary.label}
                onChange={(event) =>
                  update({ primaryCta: { ...primary, label: event.target.value } })
                }
                placeholder="Get started"
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.primaryCta.href" label="Primary CTA URL">
            {(fieldProps) => (
              <Input
                id={fieldProps.id}
                value={primary.href}
                onChange={(event) =>
                  update({ primaryCta: { ...primary, href: event.target.value } })
                }
                placeholder={heroCtaPlaceholderExamples.primary}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
            )}
          </WidgetControlRow>
        </div>
      </EditorSection>
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
  const updateSpacing = (patch: Partial<HeroData["spacing"]>) =>
    update({ spacing: { ...value.spacing, ...patch } });
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
        <WidgetControlRow id="hero.variant" label="Hero layout">
          {(fieldProps) => (
            <div
              id={fieldProps.id}
              role="group"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
              className="space-y-2"
            >
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
                    <Badge
                      className="shrink-0"
                      variant={variant === option.id ? "default" : "outline"}
                    >
                      {variant === option.id ? "Selected" : "Pick"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
          )}
        </WidgetControlRow>
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
        <WidgetControlRow id="hero.cta.layout" label="CTA layout">
          {(fieldProps) => (
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
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <div className="grid gap-3 md:grid-cols-2">
          <WidgetControlRow id="hero.primaryCta.label" label="Primary CTA Label">
            {(fieldProps) => (
              <Input
                id={fieldProps.id}
                value={primary.label}
                onChange={(event) => updatePrimary({ label: event.target.value })}
                placeholder="Get started"
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              />
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.primaryCta.href" label="Primary CTA URL">
            {(fieldProps) => (
              <div className="space-y-2">
                <Input
                  id={fieldProps.id}
                  value={primary.href}
                  onChange={(event) => updatePrimary({ href: event.target.value })}
                  placeholder={heroCtaPlaceholderExamples.primary}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
                {!isValidHref(primary.href) ? (
                  <p className="text-xs text-destructive">Use a relative path or full URL.</p>
                ) : null}
              </div>
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.style.primaryButtonSize" label="Primary button size">
            {(fieldProps) => (
              <Select
                value={style.primaryButtonSize ?? "md"}
                onValueChange={(next) => updateStyle({ primaryButtonSize: next as HeroButtonSize })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          {ctaMode === "dual" ? (
            <>
              <WidgetControlRow id="hero.secondaryCta.label" label="Secondary CTA Label">
                {(fieldProps) => (
                  <Input
                    id={fieldProps.id}
                    value={secondary.label}
                    onChange={(event) => updateSecondary({ label: event.target.value })}
                    placeholder="Learn more"
                    aria-labelledby={fieldProps["aria-labelledby"]}
                    aria-describedby={fieldProps["aria-describedby"]}
                  />
                )}
              </WidgetControlRow>
              <WidgetControlRow id="hero.secondaryCta.href" label="Secondary CTA URL">
                {(fieldProps) => (
                  <div className="space-y-2">
                    <Input
                      id={fieldProps.id}
                      value={secondary.href}
                      onChange={(event) => updateSecondary({ href: event.target.value })}
                      placeholder={heroCtaPlaceholderExamples.secondary}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                    {!isValidHref(secondary.href) ? (
                      <p className="text-xs text-destructive">Use a relative path or full URL.</p>
                    ) : null}
                  </div>
                )}
              </WidgetControlRow>
              <WidgetControlRow id="hero.style.secondaryButtonSize" label="Secondary button size">
                {(fieldProps) => (
                  <Select
                    value={style.secondaryButtonSize ?? "md"}
                    onValueChange={(next) =>
                      updateStyle({ secondaryButtonSize: next as HeroButtonSize })
                    }
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
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
                )}
              </WidgetControlRow>
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
                    <WidgetControlRow
                      id={`hero.socialProof.avatars.${index}.src`}
                      label={`Avatar ${index + 1} URL`}
                      path={`socialProof.avatars.${index}.src`}
                    >
                      {(fieldProps) => (
                        <div className="space-y-2">
                          <Input
                            id={fieldProps.id}
                            value={avatar.src}
                            onChange={(event) =>
                              updateSocialProofAvatar(index, { src: event.target.value })
                            }
                            placeholder={`https://cdn.example.com/avatar-${index + 1}.jpg`}
                            aria-labelledby={fieldProps["aria-labelledby"]}
                            aria-describedby={fieldProps["aria-describedby"]}
                          />
                          {!isValidMediaUrl(avatar.src) ? (
                            <p className="text-xs text-destructive">
                              Use a relative path or full URL.
                            </p>
                          ) : null}
                        </div>
                      )}
                    </WidgetControlRow>
                    <WidgetControlRow
                      id={`hero.socialProof.avatars.${index}.alt`}
                      label={`Avatar ${index + 1} alt text`}
                      path={`socialProof.avatars.${index}.alt`}
                    >
                      {(fieldProps) => (
                        <Input
                          id={fieldProps.id}
                          value={avatar.alt ?? ""}
                          onChange={(event) =>
                            updateSocialProofAvatar(index, { alt: event.target.value })
                          }
                          placeholder="Reviewer avatar"
                          aria-labelledby={fieldProps["aria-labelledby"]}
                          aria-describedby={fieldProps["aria-describedby"]}
                        />
                      )}
                    </WidgetControlRow>
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
        <WidgetControlRow id="hero.media.type" label="Media type">
          {(fieldProps) => (
            <Select
              value={mediaType}
              onValueChange={(next) => handleMediaTypeChange(next as HeroMediaType)}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        {mediaType !== "none" ? (
          <>
            <HeroMediaSourceFields media={media} mediaType={mediaType} onChange={updateMedia} />
            {mediaType === "image" ? (
              <WidgetControlRow id="hero.media.alt" label="Media alt text">
                {(fieldProps) => (
                  <Input
                    id={fieldProps.id}
                    value={media.alt ?? ""}
                    onChange={(event) => updateMedia({ alt: event.target.value })}
                    placeholder="Describe the media"
                    aria-labelledby={fieldProps["aria-labelledby"]}
                    aria-describedby={fieldProps["aria-describedby"]}
                  />
                )}
              </WidgetControlRow>
            ) : null}
            {mediaType === "video" ? (
              <>
                <WidgetControlRow id="hero.media.title" label="Video title">
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={media.title ?? ""}
                      onChange={(event) => updateMedia({ title: event.target.value })}
                      placeholder="Product demo video"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow id="hero.media.description" label="Video description">
                  {(fieldProps) => (
                    <Textarea
                      id={fieldProps.id}
                      value={media.description ?? ""}
                      onChange={(event) => updateMedia({ description: event.target.value })}
                      placeholder="Optional context for screen readers"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
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
              <WidgetControlRow id="hero.media.ratio" label="Media ratio">
                {(fieldProps) => (
                  <Select
                    value={media.ratio ?? "16:9"}
                    onValueChange={(next) => updateMedia({ ratio: next })}
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
                        <SelectItem key={option} value={option}>
                          {formatTokenOptionLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>
            ) : null}
            {selectedVariant !== "centered" || mediaType === "image" ? (
              <WidgetControlRow
                id="hero.media.overlay"
                label="Media overlay"
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearMediaField("overlay")}
                    disabled={!hasClearableFieldValue(media.overlay)}
                  >
                    Clear
                  </Button>
                }
              >
                {(fieldProps) => (
                  <Input
                    id={fieldProps.id}
                    value={media.overlay ?? ""}
                    onChange={(event) => updateMedia({ overlay: event.target.value })}
                    placeholder="rgba(0,0,0,0.2)"
                    aria-labelledby={fieldProps["aria-labelledby"]}
                    aria-describedby={fieldProps["aria-describedby"]}
                  />
                )}
              </WidgetControlRow>
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
        id="hero.layout-spacing"
        title="Layout and spacing"
        description="Control Hero card alignment, width, height, bleed, spacing, and mobile media behavior."
        role="layout"
      >
        <WidgetControlRow id="hero.layout.align" label="Alignment">
          {(fieldProps) => (
            <Select
              value={value.layout?.align ?? "center"}
              onValueChange={(next) => updateLayout({ align: next as HeroAlign })}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <div className="grid gap-3 md:grid-cols-2">
          <WidgetControlRow id="hero.layout.maxWidth" label="Max width">
            {(fieldProps) => (
              <Select
                value={value.layout?.maxWidth ?? "xl"}
                onValueChange={(next) => updateLayout({ maxWidth: next as HeroMaxWidth })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.layout.contentWidth" label="Content width">
            {(fieldProps) => (
              <Select
                value={value.layout?.contentWidth ?? "lg"}
                onValueChange={(next) => updateLayout({ contentWidth: next as HeroContentWidth })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.layout.height" label="Height">
            {(fieldProps) => (
              <Select
                value={value.layout?.height ?? "auto"}
                onValueChange={(next) => updateLayout({ height: next as HeroHeight })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.layout.bleed" label="Bleed">
            {(fieldProps) => (
              <Select
                value={value.layout?.bleed ?? "contained"}
                onValueChange={(next) => updateLayout({ bleed: next as HeroBleed })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.spacing.paddingTop" label="Hero content padding top">
            {(fieldProps) => (
              <Select
                value={value.spacing?.paddingTop ?? "xl"}
                onValueChange={(next) => updateSpacing({ paddingTop: next as HeroSpacing })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.spacing.paddingBottom" label="Hero content padding bottom">
            {(fieldProps) => (
              <Select
                value={value.spacing?.paddingBottom ?? "xl"}
                onValueChange={(next) => updateSpacing({ paddingBottom: next as HeroSpacing })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
        </div>
        <WidgetControlRow
          id="hero.responsive.hideMediaOnMobile"
          label="Hide media on mobile"
          help="Keeps mobile Hero output focused on copy and CTA."
        >
          {(fieldProps) => (
            <Switch
              checked={value.responsive?.hideMediaOnMobile ?? false}
              onCheckedChange={(checked) =>
                update({
                  responsive: { ...value.responsive, hideMediaOnMobile: checked },
                })
              }
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="hero.typography"
        title="Typography"
        description="Adjust text scale and weight."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <WidgetControlRow id="hero.style.headlineSize" label="Headline size">
            {(fieldProps) => (
              <Select
                value={style.headlineSize ?? "3xl"}
                onValueChange={(next) => updateStyle({ headlineSize: next as HeroHeadlineSize })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.style.subheadSize" label="Subhead size">
            {(fieldProps) => (
              <Select
                value={style.subheadSize ?? "xl"}
                onValueChange={(next) => updateStyle({ subheadSize: next as HeroSubheadSize })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.style.bodySize" label="Body size">
            {(fieldProps) => (
              <Select
                value={style.bodySize ?? "base"}
                onValueChange={(next) => updateStyle({ bodySize: next as HeroBodySize })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
        </div>
      </EditorSection>

      <EditorSection
        id="hero.appearance"
        title="Appearance"
        description="Add bounded shadow, font, and motion presets without custom CSS."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <WidgetControlRow id="hero.style.cardShadow" label="Card shadow">
            {(fieldProps) => (
              <Select
                value={style.cardShadow ?? "none"}
                onValueChange={(next) => updateStyle({ cardShadow: next as HeroShadow })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          {selectedVariant !== "centered" ? (
            <WidgetControlRow id="hero.style.mediaShadow" label="Media shadow">
              {(fieldProps) => (
                <Select
                  value={style.mediaShadow ?? "none"}
                  onValueChange={(next) => updateStyle({ mediaShadow: next as HeroShadow })}
                >
                  <SelectTrigger
                    id={fieldProps.id}
                    aria-labelledby={fieldProps["aria-labelledby"]}
                    aria-describedby={fieldProps["aria-describedby"]}
                  >
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
              )}
            </WidgetControlRow>
          ) : null}
          <WidgetControlRow id="hero.style.buttonShadow" label="Button shadow">
            {(fieldProps) => (
              <Select
                value={style.buttonShadow ?? "none"}
                onValueChange={(next) => updateStyle({ buttonShadow: next as HeroShadow })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.style.fontFamily" label="Font family">
            {(fieldProps) => (
              <Select
                value={style.fontFamily ?? "inherit"}
                onValueChange={(next) => updateStyle({ fontFamily: next as HeroFont })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.style.headlineWeight" label="Headline weight">
            {(fieldProps) => (
              <Select
                value={style.headlineWeight ?? "semibold"}
                onValueChange={(next) => updateStyle({ headlineWeight: next as HeroWeight })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.style.bodyWeight" label="Body weight">
            {(fieldProps) => (
              <Select
                value={style.bodyWeight ?? "normal"}
                onValueChange={(next) => updateStyle({ bodyWeight: next as HeroWeight })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.style.motion" label="Entrance motion">
            {(fieldProps) => (
              <Select
                value={style.motion ?? "none"}
                onValueChange={(next) => updateStyle({ motion: next as HeroMotion })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select motion" />
                </SelectTrigger>
                <SelectContent>
                  {motionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "fade-in"
                        ? "Fade in"
                        : option === "slide-up"
                          ? "Slide up"
                          : "None"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
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
          <WidgetControlRow id="hero.style.borderWidth" label="Card border width">
            {(fieldProps) => (
              <Select
                value={style.borderWidth ?? "1"}
                onValueChange={(next) => updateStyle({ borderWidth: next as HeroBorderWidth })}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
          <WidgetControlRow id="hero.style.borderRadius" label="Card radius">
            {(fieldProps) => (
              <Select
                value={style.borderRadius ?? "3xl"}
                onValueChange={(next) => updateStyle({ borderRadius: next as HeroRadius })}
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
                    <SelectItem key={option} value={option}>
                      {formatTokenOptionLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
          {selectedVariant !== "centered" ? (
            <WidgetControlRow id="hero.style.mediaBorderWidth" label="Media border width">
              {(fieldProps) => (
                <Select
                  value={style.mediaBorderWidth ?? "1"}
                  onValueChange={(next) =>
                    updateStyle({ mediaBorderWidth: next as HeroBorderWidth })
                  }
                >
                  <SelectTrigger
                    id={fieldProps.id}
                    aria-labelledby={fieldProps["aria-labelledby"]}
                    aria-describedby={fieldProps["aria-describedby"]}
                  >
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
              )}
            </WidgetControlRow>
          ) : null}
          {selectedVariant !== "centered" ? (
            <WidgetControlRow id="hero.style.mediaRadius" label="Media radius">
              {(fieldProps) => (
                <Select
                  value={style.mediaRadius ?? "2xl"}
                  onValueChange={(next) => updateStyle({ mediaRadius: next as HeroRadius })}
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
                      <SelectItem key={option} value={option}>
                        {formatTokenOptionLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </WidgetControlRow>
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
        <WidgetControlRow id="hero.background.media.type" label="Background media type">
          {(fieldProps) => (
            <Select
              value={backgroundMediaType}
              onValueChange={(next) => handleBackgroundMediaTypeChange(next as HeroMediaType)}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        {backgroundMediaType !== "none" ? (
          <>
            <HeroMediaSourceFields
              media={backgroundMedia}
              mediaType={backgroundMediaType}
              onChange={updateBackgroundMedia}
              controlIdPrefix="hero.background.media"
              pathPrefix="background.media"
            />
            {backgroundMediaType === "video" ? (
              <>
                <WidgetControlRow id="hero.background.media.title" label="Background video title">
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={backgroundMedia.title ?? ""}
                      onChange={(event) => updateBackgroundMedia({ title: event.target.value })}
                      placeholder="Ambient background video"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id="hero.background.media.description"
                  label="Background video description"
                >
                  {(fieldProps) => (
                    <Textarea
                      id={fieldProps.id}
                      value={backgroundMedia.description ?? ""}
                      onChange={(event) =>
                        updateBackgroundMedia({ description: event.target.value })
                      }
                      placeholder="Optional context for screen readers"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
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
                  controlIdPrefix="hero.background.media"
                  pathPrefix="background.media"
                />
              </>
            ) : null}
            <WidgetControlRow
              id="hero.background.media.overlay"
              label="Background media overlay"
              actions={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearBackgroundMediaField("overlay")}
                  disabled={!hasClearableFieldValue(backgroundMedia.overlay)}
                >
                  Clear
                </Button>
              }
            >
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  value={backgroundMedia.overlay ?? ""}
                  onChange={(event) => updateBackgroundMedia({ overlay: event.target.value })}
                  placeholder="rgba(0,0,0,0.25)"
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
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

const summarizeHeroValue = (value: unknown) => {
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim().length > 0) return value;
  return "Not configured";
};

const summarizeHeroHrefStatus = (cta: HeroData["primaryCta"]) => {
  if (!cta?.href) return "Not configured";
  return normalizeHeroHref(cta.href) ? "Safe URL" : "Rejected unsafe URL";
};

export function HeroAdvancedEditor({ value, variant }: WidgetEditorProps<HeroData>) {
  const normalized = normalizeHeroData(value);
  const layout = normalized.layout ?? {};
  const spacing = normalized.spacing ?? {};
  const style = normalized.style ?? {};
  const media = normalized.media ?? { type: "none", source: "external" };
  const background = normalized.background ?? {};
  const backgroundMedia = resolveBackgroundMedia(background);
  const runtimePayload = JSON.stringify(normalized, null, 2);
  const videoDiagnostics =
    media.type === "video"
      ? media.title && media.description
        ? "Video title and description provided"
        : "Video title or description missing"
      : "Not required";
  const backgroundVideoDiagnostics =
    backgroundMedia.type === "video"
      ? backgroundMedia.title && backgroundMedia.description
        ? "Background video title and description provided"
        : "Background video title or description missing"
      : "Not required";

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Advanced mode is read-only. Use Visual for public-facing Hero copy, media, layout, spacing,
        color, and background changes.
      </p>
      <EditorSection
        id="hero.advanced.layout-summary"
        mode="advanced"
        role="diagnostics"
        title="Layout summary"
        description="Resolved Hero layout, spacing, and responsive tokens."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.variant"
            label="Variant"
            path="variant"
            value={variant}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.layout.align"
            label="Alignment"
            path="layout.align"
            value={summarizeHeroValue(layout.align)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.layout.maxWidth"
            label="Max width"
            path="layout.maxWidth"
            value={summarizeHeroValue(layout.maxWidth)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.layout.contentWidth"
            label="Content width"
            path="layout.contentWidth"
            value={summarizeHeroValue(layout.contentWidth)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.layout.height"
            label="Height"
            path="layout.height"
            value={summarizeHeroValue(layout.height)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.layout.bleed"
            label="Bleed"
            path="layout.bleed"
            value={summarizeHeroValue(layout.bleed)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.spacing.paddingTop"
            label="Padding top"
            path="spacing.paddingTop"
            value={summarizeHeroValue(spacing.paddingTop)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.spacing.paddingBottom"
            label="Padding bottom"
            path="spacing.paddingBottom"
            value={summarizeHeroValue(spacing.paddingBottom)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.responsive.hideMediaOnMobile"
            label="Hide media on mobile"
            path="responsive.hideMediaOnMobile"
            value={summarizeHeroValue(normalized.responsive?.hideMediaOnMobile)}
          />
        </div>
      </EditorSection>

      <EditorSection
        id="hero.advanced.style-summary"
        mode="advanced"
        role="diagnostics"
        title="Style token summary"
        description="Resolved typography, color, button, border, and shadow tokens."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.headlineSize"
            label="Headline size"
            path="style.headlineSize"
            value={summarizeHeroValue(style.headlineSize)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.subheadSize"
            label="Subhead size"
            path="style.subheadSize"
            value={summarizeHeroValue(style.subheadSize)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.bodySize"
            label="Body size"
            path="style.bodySize"
            value={summarizeHeroValue(style.bodySize)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.textColor"
            label="Headline color"
            path="style.textColor"
            value={summarizeHeroValue(style.textColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.subheadColor"
            label="Subhead color"
            path="style.subheadColor"
            value={summarizeHeroValue(style.subheadColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.bodyColor"
            label="Body color"
            path="style.bodyColor"
            value={summarizeHeroValue(style.bodyColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.primaryButton"
            label="Primary button"
            path="style.primaryButtonBg"
            value={`bg=${summarizeHeroValue(style.primaryButtonBg)}; text=${summarizeHeroValue(
              style.primaryButtonText
            )}; border=${summarizeHeroValue(style.primaryButtonBorder)}; size=${summarizeHeroValue(
              style.primaryButtonSize
            )}`}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.secondaryButton"
            label="Secondary button"
            path="style.secondaryButtonBg"
            value={`bg=${summarizeHeroValue(style.secondaryButtonBg)}; text=${summarizeHeroValue(
              style.secondaryButtonText
            )}; border=${summarizeHeroValue(
              style.secondaryButtonBorder
            )}; size=${summarizeHeroValue(style.secondaryButtonSize)}`}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.cardBorder"
            label="Card border"
            path="style.borderColor"
            value={`color=${summarizeHeroValue(style.borderColor)}; width=${summarizeHeroValue(
              style.borderWidth
            )}; radius=${summarizeHeroValue(style.borderRadius)}`}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.mediaFrame"
            label="Media frame"
            path="style.mediaBorderColor"
            value={`color=${summarizeHeroValue(style.mediaBorderColor)}; width=${summarizeHeroValue(
              style.mediaBorderWidth
            )}; radius=${summarizeHeroValue(style.mediaRadius)}`}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.shadows"
            label="Shadows"
            path="style.cardShadow"
            value={`card=${summarizeHeroValue(style.cardShadow)}; media=${summarizeHeroValue(
              style.mediaShadow
            )}; buttons=${summarizeHeroValue(style.buttonShadow)}`}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.style.typeface"
            label="Typeface"
            path="style.fontFamily"
            value={`family=${summarizeHeroValue(style.fontFamily)}; headline=${summarizeHeroValue(
              style.headlineWeight
            )}; body=${summarizeHeroValue(style.bodyWeight)}`}
          />
        </div>
      </EditorSection>

      <EditorSection
        id="hero.advanced.media-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Media diagnostics"
        description="Normalized media and background media state used by the public renderer."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.media.type"
            label="Media type"
            path="media.type"
            value={summarizeHeroValue(media.type)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.media.source"
            label="Media source"
            path="media.source"
            value={summarizeHeroValue(media.source)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.media.src"
            label="Media URL"
            path="media.src"
            value={summarizeHeroValue(media.src)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.media.alt"
            label="Image alt text"
            path="media.alt"
            value={
              media.type === "image"
                ? summarizeHeroValue(media.alt)
                : "Not required for this media type"
            }
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.media.videoMetadata"
            label="Video metadata"
            path="media.title"
            value={videoDiagnostics}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.background.color"
            label="Background color"
            path="background.color"
            value={summarizeHeroValue(background.color)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.background.gradient"
            label="Background gradient"
            path="background.gradient"
            value={summarizeHeroValue(background.gradient)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.background.media.type"
            label="Background media type"
            path="background.media.type"
            value={summarizeHeroValue(backgroundMedia.type)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.background.media.src"
            label="Background media URL"
            path="background.media.src"
            value={summarizeHeroValue(backgroundMedia.src)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.background.media.overlay"
            label="Background overlay"
            path="background.media.overlay"
            value={summarizeHeroValue(backgroundMedia.overlay)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.background.media.videoMetadata"
            label="Background video metadata"
            path="background.media.title"
            value={backgroundVideoDiagnostics}
          />
        </div>
      </EditorSection>

      <EditorSection
        id="hero.advanced.accessibility-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Accessibility diagnostics"
        description="Safe-link, copy, and sanitized rich-text diagnostics."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.headline"
            label="Headline"
            path="headline"
            value={summarizeHeroValue(normalized.headline)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.primaryCta.href"
            label="Primary CTA href"
            path="primaryCta.href"
            value={summarizeHeroHrefStatus(value.primaryCta)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.secondaryCta.href"
            label="Secondary CTA href"
            path="secondaryCta.href"
            value={summarizeHeroHrefStatus(value.secondaryCta)}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.richHeadline"
            label="Rich headline"
            path="richHeadline"
            value={normalized.richHeadline ? "Sanitized HTML configured" : "Plain headline used"}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.richBody"
            label="Rich body"
            path="richBody"
            value={normalized.richBody ? "Sanitized HTML configured" : "Plain body used"}
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.motion"
            label="Motion preset"
            path="style.motion"
            value={summarizeHeroValue(style.motion)}
          />
        </div>
      </EditorSection>

      <EditorSection
        id="hero.advanced.runtime-payload"
        mode="advanced"
        role="technical"
        title="Runtime payload"
        description="Normalized payload passed to the Hero renderer. This widget stores no secrets."
      >
        <ReadonlyWidgetSummaryRow
          id="hero.advanced.runtime-json"
          label="Normalized data"
          value={
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">
              {runtimePayload}
            </pre>
          }
        />
      </EditorSection>

      <EditorSection
        id="hero.advanced.contract-summary"
        mode="advanced"
        role="summary"
        title="Contract summary"
        description="Editor ownership split for the v2 Hero contract."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.contract.wizard"
            label="Wizard owns"
            value="One-time setup seed: initial layout, headline, and primary CTA."
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.contract.visual"
            label="Visual owns"
            value="Copy, CTA, media, layout, spacing, style, colors, and background."
          />
          <ReadonlyWidgetSummaryRow
            id="hero.advanced.contract.advanced"
            label="Advanced owns"
            value="Read-only diagnostics, token summaries, accessibility checks, and runtime payload."
          />
        </div>
      </EditorSection>
    </div>
  );
}
