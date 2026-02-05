import { useState } from "react";

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
import { MediaPicker } from "@/ui/media/MediaPicker";

import type { HeroData } from "../../../../widgets/core/hero";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions = [
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

const isValidHref = (value: string | undefined) =>
  !value || value.startsWith("/") || value.startsWith("http");

const isValidMediaUrl = (value: string | undefined) =>
  !value || value.startsWith("http") || value.startsWith("/");

const mediaSourceOptions = [
  { id: "library", label: "Media library" },
  { id: "external", label: "External URL" },
] as const;

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
  const source: HeroMediaSource = media.source ?? "external";
  const accept =
    mediaType === "image"
      ? ["image/*"]
      : mediaType === "video"
        ? ["video/*"]
        : undefined;

  const handleSourceChange = (next: HeroMediaSource) => {
    setLookupError(null);
    if (next === "library") {
      onChange({ source: next, assetId: undefined, src: undefined });
    } else {
      onChange({ source: next, assetId: undefined });
    }
  };

  const handleAssetChange = async (value: unknown) => {
    const assetId = typeof value === "string" ? value : null;
    if (!assetId) {
      onChange({ assetId: undefined, src: undefined });
      return;
    }
    onChange({ assetId, source: "library" });
    setLookupError(null);
    try {
      const items = await listMedia();
      const match = items.find((item) => item.id === assetId);
      if (match) {
        onChange({
          src: match.url,
          alt:
            media.alt && media.alt.trim().length > 0
              ? media.alt
              : match.alt ?? match.title ?? match.originalName ?? "",
        });
      }
    } catch (err) {
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
  const media = value.media ?? { type: "none", source: "external" };
  const mediaType: HeroMediaType = media.type ?? "none";
  const ctaMode: CtaMode = value.secondaryCta ? "dual" : "single";
  const updateMedia = (patch: Partial<HeroData["media"]>) =>
    update({ media: { ...media, ...patch } });

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
  const secondary = value.secondaryCta ?? { label: "", href: "" };
  const media = value.media ?? { type: "none", source: "external" };
  const mediaType: HeroMediaType = media.type ?? "none";
  const showMediaFields = variant !== "centered";
  const updateMedia = (patch: Partial<HeroData["media"]>) =>
    update({ media: { ...media, ...patch } });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Hero variant</p>
        <div className="grid gap-2 md:grid-cols-3">
          {variantOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onVariantChange?.(option.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition",
                variant === option.id
                  ? "border-primary/60 bg-primary/5 text-primary"
                  : "border-border bg-background hover:border-primary/40"
              )}
            >
              <div className="font-semibold">{option.label}</div>
              <div className="text-xs text-muted-foreground">
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Body text</p>
        <Textarea
          value={value.body ?? ""}
          onChange={(event) => update({ body: event.target.value })}
          placeholder="Explain the key benefit."
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Secondary CTA Label</p>
          <Input
            value={secondary.label}
            onChange={(event) =>
              update({ secondaryCta: { ...secondary, label: event.target.value } })
            }
            placeholder="Learn more"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Secondary CTA URL</p>
          <Input
            value={secondary.href}
            onChange={(event) =>
              update({ secondaryCta: { ...secondary, href: event.target.value } })
            }
            placeholder="/learn"
          />
        </div>
      </div>
      {showMediaFields ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">Media type</p>
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
        </>
      ) : null}
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
  const updateMedia = (patch: Partial<HeroData["media"]>) =>
    update({
      media: {
        type: value.media?.type ?? "none",
        ...value.media,
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

  const primaryHref = value.primaryCta?.href;
  const secondaryHref = value.secondaryCta?.href;
  return (
    <div className="space-y-4">
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
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary CTA Label</p>
          <Input
            value={value.primaryCta?.label ?? ""}
            onChange={(event) => updatePrimary({ label: event.target.value })}
            placeholder="Get started"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary CTA URL</p>
          <Input
            value={primaryHref ?? ""}
            onChange={(event) => updatePrimary({ href: event.target.value })}
            placeholder="/start"
          />
          {!isValidHref(primaryHref) ? (
            <p className="text-xs text-destructive">
              Use a relative path or full URL.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Secondary CTA Label</p>
          <Input
            value={value.secondaryCta?.label ?? ""}
            onChange={(event) => updateSecondary({ label: event.target.value })}
            placeholder="Learn more"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Secondary CTA URL</p>
          <Input
            value={secondaryHref ?? ""}
            onChange={(event) => updateSecondary({ href: event.target.value })}
            placeholder="/learn"
          />
          {!isValidHref(secondaryHref) ? (
            <p className="text-xs text-destructive">
              Use a relative path or full URL.
            </p>
          ) : null}
        </div>
      </div>
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
      <div className="space-y-2">
        <p className="text-sm font-medium">Background color</p>
        <Input
          value={value.background?.color ?? ""}
          onChange={(event) => updateBackground({ color: event.target.value })}
          placeholder="transparent"
        />
      </div>
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
      <div className="space-y-2">
        <p className="text-sm font-medium">Media type</p>
        <Select
          value={value.media?.type ?? "none"}
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
      {value.media?.type !== "none" ? (
        <>
          <HeroMediaSourceFields
            media={value.media ?? { type: "none", source: "external" }}
            mediaType={value.media?.type ?? "none"}
            onChange={updateMedia}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Media alt text</p>
            <Input
              value={value.media?.alt ?? ""}
              onChange={(event) => updateMedia({ alt: event.target.value })}
              placeholder="Describe the media"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Media ratio</p>
            <Select
              value={value.media?.ratio ?? "16:9"}
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
              value={value.media?.overlay ?? ""}
              onChange={(event) => updateMedia({ overlay: event.target.value })}
              placeholder="rgba(0,0,0,0.2)"
            />
          </div>
        </>
      ) : null}
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
