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
import { listMedia } from "@/services/mediaClient";
import {
  getUserSetting,
  setUserSetting,
  type HeroPresetSetting,
} from "@/services/userSettingsClient";
import { MediaPicker } from "@/ui/media/MediaPicker";

import type { HeroData } from "../../../../widgets/core/hero";
import type { WidgetEditorProps } from "../../../../widgets/types";

type HeroVariantId = "centered" | "split" | "media-left";

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
];

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
const maxWidthOptions = ["sm", "md", "lg", "xl", "2xl"] as const;
const contentWidthOptions = ["sm", "md", "lg", "xl"] as const;
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

const isValidHref = (value: string | undefined) =>
  !value || value.startsWith("/") || value.startsWith("http");

const isValidMediaUrl = (value: string | undefined) =>
  !value || value.startsWith("http") || value.startsWith("/");

const mediaSourceOptions = [
  { id: "library", label: "Media library" },
  { id: "external", label: "External URL" },
] as const;

const headlineSizeOptions = ["2xl", "3xl", "4xl", "5xl"] as const;
const subheadSizeOptions = ["base", "lg", "xl", "2xl"] as const;
const bodySizeOptions = ["sm", "base", "lg", "xl"] as const;
const buttonSizeOptions = ["sm", "md", "lg"] as const;
const borderWidthOptions = ["0", "1", "2", "3"] as const;
const radiusOptions = ["lg", "xl", "2xl", "3xl"] as const;
const heroPresetLimit = 24;
const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

function HeroMediaSourceFields({
  media,
  mediaType,
  onChange,
}: {
  media: NonNullable<HeroData["media"]>;
  mediaType: HeroMediaType;
  onChange: (patch: Partial<NonNullable<HeroData["media"]>>) => void;
}) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const source: HeroMediaSource = media.source ?? "external";
  const accept =
    mediaType === "image"
      ? ["image/*"]
      : mediaType === "video"
        ? ["video/*"]
        : undefined;

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
      const items = await listMedia();
      if (requestId !== requestIdRef.current) return;
      const match = items.find((item) => item.id === assetId);
      if (match) {
        onChange({
          assetId,
          source: "library",
          src: match.url,
          alt:
            media.alt && media.alt.trim().length > 0
              ? media.alt
              : match.alt ?? match.title ?? match.originalName ?? "",
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
          {lookupError ? (
            <p className="text-xs text-destructive">{lookupError}</p>
          ) : null}
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
            <p className="text-xs text-destructive">
              Use a relative path or full URL.
            </p>
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
            onChange={(event) =>
              update({ primaryCta: { ...primary, label: event.target.value } })
            }
            placeholder="Get started"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary CTA URL</p>
          <Input
            value={primary.href}
            onChange={(event) =>
              update({ primaryCta: { ...primary, href: event.target.value } })
            }
            placeholder="/start"
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
                placeholder="/learn"
              />
            </div>
          </>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Media</p>
        <Select
          value={mediaType}
          onValueChange={(next) =>
            updateMedia({ type: next as HeroMediaType })
          }
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
        <HeroMediaSourceFields
          media={media}
          mediaType={mediaType}
          onChange={updateMedia}
        />
      ) : null}
      {variant === "centered" && mediaType === "image" ? (
        <p className="text-xs text-muted-foreground">
          Centered layout renders the selected image as hero background.
        </p>
      ) : null}
      {variant === "centered" && mediaType === "video" ? (
        <p className="text-xs text-muted-foreground">
          Centered layout does not show inline video. Use Media Right or Media Left
          to display video content.
        </p>
      ) : null}
    </div>
  );
}

const isHeroVariant = (value: string): value is HeroVariantId =>
  variantOptions.some((option) => option.id === value);

const cloneHeroData = (value: HeroData): HeroData =>
  JSON.parse(JSON.stringify(value)) as HeroData;

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
      data: candidate.data as Record<string, unknown>,
      updatedAt:
        typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
          ? candidate.updatedAt
          : new Date(0).toISOString(),
    };
    byName.set(name.toLowerCase(), preset);
  }
  return Array.from(byName.values()).slice(0, heroPresetLimit);
};

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-background/50 p-3">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback = "#111827",
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => onChange(event.target.value)}
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
  const style = value.style ?? {};
  const mediaType: HeroMediaType = media.type ?? "none";
  const [presets, setPresets] = useState<HeroPresetSetting[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isPresetSaving, setIsPresetSaving] = useState(false);

  const selectedVariant = isHeroVariant(variant) ? variant : "centered";
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
  const updatePrimary = (patch: Partial<HeroData["primaryCta"]>) =>
    update({
      primaryCta: {
        label: value.primaryCta?.label ?? "",
        href: value.primaryCta?.href ?? "",
        ...value.primaryCta,
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

  useEffect(() => {
    let active = true;
    setPresetsLoading(true);
    setPresetsError(null);
    getUserSetting("widgets.hero.presets")
      .then((response) => {
        if (!active) return;
        setPresets(sanitizeHeroPresetList(response.value));
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
    if (!normalizedName) {
      setPresetsError("Preset name is required.");
      return;
    }
    if (
      presets.some(
        (entry) => entry.name.toLowerCase() === normalizedName.toLowerCase()
      )
    ) {
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
      data: cloneHeroData(value) as Record<string, unknown>,
      updatedAt: new Date().toISOString(),
    };
    const saved = await persistPresets([...presets, nextPreset]);
    if (!saved) return;
    setPresetName("");
    setIsPresetDialogOpen(false);
  };

  const handleApplyPreset = (preset: HeroPresetSetting) => {
    onVariantChange?.(preset.variant);
    onChange({ ...value, ...(cloneHeroData(preset.data as HeroData) as HeroData) });
  };

  const handleUpdatePreset = async (presetNameToUpdate: string) => {
    const next = presets.map((entry) =>
      entry.name.toLowerCase() === presetNameToUpdate.toLowerCase()
        ? {
            ...entry,
            variant: selectedVariant,
            data: cloneHeroData(value) as Record<string, unknown>,
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
    await persistPresets(next);
  };

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and Presets"
        description="Choose hero orientation and save reusable configurations."
      >
        <div className="grid gap-2 md:grid-cols-3">
          {variantOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onVariantChange?.(option.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition",
                variant === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:border-primary/50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{option.label}</p>
                <Badge variant={variant === option.id ? "default" : "outline"}>
                  {variant === option.id ? "Selected" : "Pick"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
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
        {presetsLoading ? (
          <p className="text-xs text-muted-foreground">Loading presets...</p>
        ) : presets.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No presets yet. Save your current setup as a starting point.
          </p>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
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
                    onClick={() => void handleDeletePreset(preset.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {presetsError ? (
          <p className="text-xs text-destructive">{presetsError}</p>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Content"
        description="Edit all copy shown in this Hero block."
      >
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
          <p className="text-sm font-medium">Body</p>
          <Textarea
            value={value.body ?? ""}
            onChange={(event) => update({ body: event.target.value })}
            placeholder="Explain the key benefit."
          />
        </div>
      </EditorSection>

      <EditorSection
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
              placeholder="/start"
            />
            {!isValidHref(primary.href) ? (
              <p className="text-xs text-destructive">
                Use a relative path or full URL.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary button size</p>
            <Select
              value={style.primaryButtonSize ?? "md"}
              onValueChange={(next) =>
                updateStyle({ primaryButtonSize: next as HeroButtonSize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {buttonSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
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
                  onChange={(event) =>
                    updateSecondary({ label: event.target.value })
                  }
                  placeholder="Learn more"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Secondary CTA URL</p>
                <Input
                  value={secondary.href}
                  onChange={(event) =>
                    updateSecondary({ href: event.target.value })
                  }
                  placeholder="/learn"
                />
                {!isValidHref(secondary.href) ? (
                  <p className="text-xs text-destructive">
                    Use a relative path or full URL.
                  </p>
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
                        {option}
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
        title="Media"
        description="Control media source, frame ratio, and overlay."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Media type</p>
          <Select
            value={mediaType}
            onValueChange={(next) => updateMedia({ type: next as HeroMediaType })}
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
            <div className="space-y-2">
              <p className="text-sm font-medium">Media alt text</p>
              <Input
                value={media.alt ?? ""}
                onChange={(event) => updateMedia({ alt: event.target.value })}
                placeholder="Describe the media"
              />
            </div>
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
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Media overlay</p>
              <Input
                value={media.overlay ?? ""}
                onChange={(event) => updateMedia({ overlay: event.target.value })}
                placeholder="rgba(0,0,0,0.2)"
              />
            </div>
          </>
        ) : null}
        {variant === "centered" && mediaType === "image" ? (
          <p className="text-xs text-muted-foreground">
            Centered layout uses the selected image as background.
          </p>
        ) : null}
        {variant === "centered" && mediaType === "video" ? (
          <p className="text-xs text-muted-foreground">
            Centered layout does not render inline video. Use split or media-left.
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
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
                  {option}
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
              onValueChange={(next) =>
                updateStyle({ headlineSize: next as HeroHeadlineSize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {headlineSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Subhead size</p>
            <Select
              value={style.subheadSize ?? "xl"}
              onValueChange={(next) =>
                updateStyle({ subheadSize: next as HeroSubheadSize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {subheadSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Body size</p>
            <Select
              value={style.bodySize ?? "base"}
              onValueChange={(next) =>
                updateStyle({ bodySize: next as HeroBodySize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {bodySizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Colors and Borders"
        description="Fine-tune text, button, and frame styling."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <ColorField
            label="Headline color"
            value={style.textColor}
            onChange={(next) => updateStyle({ textColor: next })}
            placeholder="var(--color-text)"
          />
          <ColorField
            label="Subhead color"
            value={style.subheadColor}
            onChange={(next) => updateStyle({ subheadColor: next })}
            placeholder="rgba(17, 24, 39, 0.8)"
          />
          <ColorField
            label="Body color"
            value={style.bodyColor}
            onChange={(next) => updateStyle({ bodyColor: next })}
            placeholder="rgba(17, 24, 39, 0.7)"
          />
          <ColorField
            label="Card border color"
            value={style.borderColor}
            onChange={(next) => updateStyle({ borderColor: next })}
            placeholder="var(--color-border)"
          />
          <ColorField
            label="Primary button background"
            value={style.primaryButtonBg}
            onChange={(next) => updateStyle({ primaryButtonBg: next })}
            placeholder="var(--color-primary)"
          />
          <ColorField
            label="Primary button text"
            value={style.primaryButtonText}
            onChange={(next) => updateStyle({ primaryButtonText: next })}
            placeholder="var(--color-bg)"
          />
          <ColorField
            label="Primary button border"
            value={style.primaryButtonBorder}
            onChange={(next) => updateStyle({ primaryButtonBorder: next })}
            placeholder="transparent"
          />
          <ColorField
            label="Secondary button background"
            value={style.secondaryButtonBg}
            onChange={(next) => updateStyle({ secondaryButtonBg: next })}
            placeholder="transparent"
          />
          <ColorField
            label="Secondary button text"
            value={style.secondaryButtonText}
            onChange={(next) => updateStyle({ secondaryButtonText: next })}
            placeholder="var(--color-text)"
          />
          <ColorField
            label="Secondary button border"
            value={style.secondaryButtonBorder}
            onChange={(next) => updateStyle({ secondaryButtonBorder: next })}
            placeholder="var(--color-border)"
          />
          <ColorField
            label="Media frame border color"
            value={style.mediaBorderColor}
            onChange={(next) => updateStyle({ mediaBorderColor: next })}
            placeholder="var(--color-border)"
          />
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
                    {option}
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
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Media border width</p>
            <Select
              value={style.mediaBorderWidth ?? "1"}
              onValueChange={(next) =>
                updateStyle({ mediaBorderWidth: next as HeroBorderWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                {borderWidthOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Background"
        description="Style hero surface background."
      >
        <ColorField
          label="Background color"
          value={value.background?.color}
          onChange={(next) => updateBackground({ color: next })}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Background gradient</p>
          <Input
            value={value.background?.gradient ?? ""}
            onChange={(event) => updateBackground({ gradient: event.target.value })}
            placeholder="linear-gradient(...)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Background image</p>
          <Input
            value={value.background?.image ?? ""}
            onChange={(event) => updateBackground({ image: event.target.value })}
            placeholder="https://"
          />
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
              The preset stores current variant, copy, CTA, media, typography,
              colors, borders, and background settings.
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPresetDialogOpen(false)}
            >
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
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Advanced mode exposes technical layout controls only.
      </p>
      <EditorSection
        title="Hero Layout"
        description="Control alignment, max width, and internal spacing."
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
                  {option}
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
              onValueChange={(next) =>
                updateLayout({ maxWidth: next as HeroMaxWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                {maxWidthOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Content width</p>
            <Select
              value={value.layout?.contentWidth ?? "lg"}
              onValueChange={(next) =>
                updateLayout({ contentWidth: next as HeroContentWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                {contentWidthOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Padding top</p>
            <Select
              value={value.spacing?.paddingTop ?? "xl"}
              onValueChange={(next) =>
                updateSpacing({ paddingTop: next as HeroSpacing })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select padding" />
              </SelectTrigger>
              <SelectContent>
                {spacingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Padding bottom</p>
            <Select
              value={value.spacing?.paddingBottom ?? "xl"}
              onValueChange={(next) =>
                updateSpacing({ paddingBottom: next as HeroSpacing })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select padding" />
              </SelectTrigger>
              <SelectContent>
                {spacingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Background"
        description="Set the hero surface background values."
      >
        <ColorField
          label="Background color"
          value={value.background?.color}
          onChange={(next) => updateBackground({ color: next })}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Background gradient</p>
          <Input
            value={value.background?.gradient ?? ""}
            onChange={(event) =>
              updateBackground({ gradient: event.target.value })
            }
            placeholder="linear-gradient(...)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Background image</p>
          <Input
            value={value.background?.image ?? ""}
            onChange={(event) => updateBackground({ image: event.target.value })}
            placeholder="https://"
          />
        </div>
      </EditorSection>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Hide media on mobile</p>
          <p className="text-xs text-muted-foreground">
            Keep the hero focused on copy and CTA.
          </p>
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
