import { type ReactNode, useState } from "react";

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
import { listMediaCached } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";

import { parseCssColorValue } from "../../../../services/theme/cssColorContract";
import {
  footerSocialTypes,
  normalizeFooterImageSrc,
  reorderFooterColumnsAndSlots,
  resolveFooterColumnCount,
  resolveFooterColumnsForVariant,
  resolveFooterSocialLabel,
  resolveFooterSocialType,
  type FooterBackToTop,
  type FooterColumn,
  type FooterContactInfo,
  type FooterData,
  type FooterLink,
  type FooterLinkTarget,
  type FooterSocial,
  type FooterSocialType,
} from "../../../../widgets/core/footer";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions = [
  { id: "columns-2", label: "Columns 2" },
  { id: "columns-3", label: "Columns 3" },
  { id: "minimal", label: "Minimal" },
];

const alignOptions = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const maxWidthOptions = [
  { id: "none", label: "None" },
  { id: "5xl", label: "5xl" },
  { id: "6xl", label: "6xl" },
  { id: "7xl", label: "7xl" },
];

const columnGapOptions = [
  { id: "none", label: "None" },
  { id: "4", label: "Compact" },
  { id: "6", label: "Default" },
  { id: "8", label: "Spacious" },
];

const columnBreakpointOptions = [
  { id: "sm", label: "Small screens" },
  { id: "md", label: "Medium screens" },
  { id: "lg", label: "Large screens" },
];

const paddingXOptions = [
  { id: "none", label: "None" },
  { id: "4", label: "Compact" },
  { id: "6", label: "Default" },
  { id: "8", label: "Spacious" },
];

const sectionPaddingOptions = [
  { id: "none", label: "None" },
  { id: "8", label: "Compact" },
  { id: "10", label: "Default" },
  { id: "12", label: "Spacious" },
];

const borderTopWidthOptions = [
  { id: "0", label: "None" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const fontSizeOptions = [
  { id: "none", label: "None" },
  { id: "xs", label: "Extra small" },
  { id: "sm", label: "Small" },
  { id: "base", label: "Base" },
];

const headingTransformOptions = [
  { id: "none", label: "Normal case" },
  { id: "uppercase", label: "Uppercase" },
  { id: "capitalize", label: "Capitalize" },
];

const linkTargetOptions = [
  { id: "_self", label: "Same tab" },
  { id: "_blank", label: "Open in new tab" },
];

const linkUnderlineOptions = [
  { id: "none", label: "No underline" },
  { id: "hover", label: "Underline on hover" },
  { id: "always", label: "Always underlined" },
];

const linkFontWeightOptions = [
  { id: "normal", label: "Normal" },
  { id: "medium", label: "Medium" },
  { id: "semibold", label: "Semibold" },
];

const linkLetterSpacingOptions = [
  { id: "normal", label: "Normal" },
  { id: "wide", label: "Wide" },
];

const socialTypeOptions = footerSocialTypes.map((type) => ({
  id: type,
  label: resolveFooterSocialLabel(type),
}));

type FooterControlOwnership = "writable" | "readonly" | "action" | "preview";

type FooterControlMetadata = {
  id?: string;
  path?: string;
  ownership?: FooterControlOwnership;
  readOnly?: boolean;
};

const emptySocialLink: FooterSocial = {
  type: "linkedin",
  href: "",
};

const footerSocialProfilePlaceholders: Record<FooterSocialType, string> = {
  linkedin: "company/coderso",
  twitter: "coderso",
  x: "coderso",
  github: "coderso",
  youtube: "coderso",
  facebook: "coderso",
  instagram: "coderso",
  tiktok: "coderso",
  discord: "coderso",
  pinterest: "coderso",
  mastodon: "coderso",
  twitch: "coderso",
  snapchat: "coderso",
  custom: "",
};

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  if (item === undefined) return items;
  next.splice(toIndex, 0, item);
  return next;
};

const controlAttributes = ({ id, path, ownership, readOnly }: FooterControlMetadata) => {
  const controlId = id ?? path;
  if (!controlId) return {};
  const resolvedReadOnly = readOnly === true || ownership === "readonly";
  const resolvedOwnership =
    ownership ?? (resolvedReadOnly ? "readonly" : path ? "writable" : undefined);
  return {
    "data-widget-control": controlId,
    "data-widget-control-path": path,
    "data-widget-control-ownership": resolvedOwnership,
    "data-widget-control-readonly": resolvedReadOnly ? "true" : undefined,
  } satisfies Record<string, string | undefined>;
};

const optionLabel = (options: Array<{ id: string; label: string }>, value: string | undefined) =>
  options.find((option) => option.id === value)?.label ?? (value?.trim() || "Default");

const variantLabel = (value: string | undefined) => optionLabel(variantOptions, value);

const colorDiagnostic = (value: string | undefined) => {
  const parsed = parseCssColorValue(value, "inherited-render");
  if (value === undefined || value === "") return "Theme default";
  return parsed?.normalized ?? "Unsupported saved color";
};

const actionAttributes = (id: string) => controlAttributes({ id, ownership: "action" });

export const resolveEditableFooterColumns = (value: FooterData, variant: string) => {
  const visibleCount = resolveFooterColumnCount(variant);
  const visibleColumns = resolveFooterColumnsForVariant(value.columns, variant);
  const hiddenColumns =
    Array.isArray(value.columns) && value.columns.length > visibleCount
      ? value.columns.slice(visibleCount)
      : [];
  return [...visibleColumns, ...hiddenColumns];
};

const updateFooterBrand = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  patch: Partial<NonNullable<FooterData["brand"]>>
) => {
  onChange({
    ...value,
    brand: {
      ...value.brand,
      ...patch,
    },
  });
};

const updateFooterLegal = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  patch: Partial<NonNullable<FooterData["legal"]>>
) => {
  onChange({
    ...value,
    legal: {
      ...value.legal,
      ...patch,
    },
  });
};

const updateFooterContact = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  patch: Partial<FooterContactInfo>
) => {
  onChange({
    ...value,
    contact: {
      ...value.contact,
      ...patch,
    },
  });
};

const updateFooterBackToTop = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  patch: Partial<FooterBackToTop>
) => {
  onChange({
    ...value,
    backToTop: {
      ...value.backToTop,
      ...patch,
    },
  });
};

const updateFooterLayout = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  patch: Partial<NonNullable<FooterData["layout"]>>
) => {
  onChange({
    ...value,
    layout: {
      ...value.layout,
      ...patch,
    },
  });
};

const updateFooterStyle = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  patch: Partial<NonNullable<FooterData["style"]>>
) => {
  onChange({
    ...value,
    style: {
      ...value.style,
      ...patch,
    },
  });
};

const clearFooterStyle = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  key: keyof NonNullable<FooterData["style"]>
) => {
  const { [key]: _removed, ...nextStyle } = value.style ?? {};
  onChange({
    ...value,
    style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
  });
};

const updateFooterSocial = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  updater: (items: FooterSocial[]) => FooterSocial[]
) => {
  const next = updater(Array.isArray(value.social) ? value.social : []);
  onChange({ ...value, social: next });
};

const updateColumn = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  variant: string,
  index: number,
  patch: Partial<FooterColumn>
) => {
  const columns = resolveEditableFooterColumns(value, variant);
  const nextColumns = [...columns];
  nextColumns[index] = { ...nextColumns[index], ...patch };
  onChange({ ...value, columns: nextColumns });
};

const updateColumnLink = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  variant: string,
  columnIndex: number,
  linkIndex: number,
  patch: Partial<FooterLink>
) => {
  const columns = resolveEditableFooterColumns(value, variant);
  const nextColumns = [...columns];
  const target = nextColumns[columnIndex];
  const links = Array.isArray(target.links) ? [...target.links] : [];
  const base = links[linkIndex] ?? { label: "Link", href: "", target: "_self" };
  links[linkIndex] = {
    label: patch.label ?? base.label,
    href: patch.href ?? base.href,
    target: patch.target ?? base.target,
  };
  nextColumns[columnIndex] = { ...target, links };
  onChange({ ...value, columns: nextColumns });
};

const moveColumnLink = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  variant: string,
  columnIndex: number,
  linkIndex: number,
  direction: -1 | 1
) => {
  const columns = resolveEditableFooterColumns(value, variant);
  const nextColumns = [...columns];
  const target = nextColumns[columnIndex];
  const links = Array.isArray(target.links) ? [...target.links] : [];
  nextColumns[columnIndex] = {
    ...target,
    links: moveItem(links, linkIndex, linkIndex + direction),
  };
  onChange({ ...value, columns: nextColumns });
};

const addColumnLink = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  variant: string,
  columnIndex: number
) => {
  const columns = resolveEditableFooterColumns(value, variant);
  const nextColumns = [...columns];
  const target = nextColumns[columnIndex];
  const links = Array.isArray(target.links) ? [...target.links] : [];
  links.push({ label: `Link ${links.length + 1}`, href: "", target: "_self" });
  nextColumns[columnIndex] = { ...target, links };
  onChange({ ...value, columns: nextColumns });
};

const removeColumnLink = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  variant: string,
  columnIndex: number,
  linkIndex: number
) => {
  const columns = resolveEditableFooterColumns(value, variant);
  const nextColumns = [...columns];
  const target = nextColumns[columnIndex];
  const links = Array.isArray(target.links) ? [...target.links] : [];
  nextColumns[columnIndex] = {
    ...target,
    links: links.filter((_, index) => index !== linkIndex),
  };
  onChange({ ...value, columns: nextColumns });
};

function readFooterSocialProfile(type: string | undefined, href: string | undefined) {
  const socialType = resolveFooterSocialType(type);
  if (socialType === "custom" || typeof href !== "string" || href.trim().length === 0) return "";

  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const parts = parsed.pathname.split("/").filter(Boolean);

    switch (socialType) {
      case "linkedin":
        if (host !== "linkedin.com") return "";
        if ((parts[0] === "company" || parts[0] === "in") && parts[1]) {
          return `${parts[0]}/${parts[1]}`;
        }
        return "";
      case "twitter":
      case "x":
        return host === "x.com" || host === "twitter.com" ? (parts[0] ?? "") : "";
      case "github":
        return host === "github.com" ? (parts[0] ?? "") : "";
      case "youtube":
        return host === "youtube.com" ? (parts[0]?.replace(/^@/, "") ?? "") : "";
      case "facebook":
        return host === "facebook.com" ? (parts[0] ?? "") : "";
      case "instagram":
        return host === "instagram.com" ? (parts[0] ?? "") : "";
      case "tiktok":
        return host === "tiktok.com" ? (parts[0]?.replace(/^@/, "") ?? "") : "";
      case "discord":
        if (host === "discord.gg") return parts[0] ?? "";
        if (host === "discord.com" && parts[0] === "invite") return parts[1] ?? "";
        return "";
      case "pinterest":
        return host === "pinterest.com" ? (parts[0] ?? "") : "";
      case "mastodon":
        return parts[0]?.replace(/^@/, "") ?? "";
      case "twitch":
        return host === "twitch.tv" ? (parts[0] ?? "") : "";
      case "snapchat":
        return host === "snapchat.com" && parts[0] === "add" ? (parts[1] ?? "") : "";
    }
  } catch {
    return "";
  }
}

function buildFooterSocialHref(type: FooterSocialType, profile: string | undefined) {
  if (type === "custom") return "";
  const trimmedProfile = typeof profile === "string" ? profile.trim() : "";
  if (!trimmedProfile) return "";

  let profileSource = trimmedProfile;
  if (/^https?:\/\//i.test(trimmedProfile)) {
    profileSource = readFooterSocialProfile(type, trimmedProfile);
    if (!profileSource) return "";
  }

  const handle = profileSource.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
  if (!handle) return "";

  switch (type) {
    case "linkedin": {
      const parts = handle.split("/").filter(Boolean);
      if ((parts[0] === "company" || parts[0] === "in") && parts[1]) {
        return `https://www.linkedin.com/${parts[0]}/${encodeURIComponent(parts[1])}`;
      }
      return `https://www.linkedin.com/company/${encodeURIComponent(handle)}`;
    }
    case "twitter":
    case "x":
      return `https://x.com/${encodeURIComponent(handle)}`;
    case "github":
      return `https://github.com/${encodeURIComponent(handle.split("/")[0] ?? "")}`;
    case "youtube":
      return `https://www.youtube.com/@${encodeURIComponent(handle)}`;
    case "facebook":
      return `https://www.facebook.com/${encodeURIComponent(handle)}`;
    case "instagram":
      return `https://www.instagram.com/${encodeURIComponent(handle)}`;
    case "tiktok":
      return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
    case "discord":
      return `https://discord.gg/${encodeURIComponent(handle)}`;
    case "pinterest":
      return `https://www.pinterest.com/${encodeURIComponent(handle)}`;
    case "mastodon":
      return `https://mastodon.social/@${encodeURIComponent(handle)}`;
    case "twitch":
      return `https://www.twitch.tv/${encodeURIComponent(handle)}`;
    case "snapchat":
      return `https://www.snapchat.com/add/${encodeURIComponent(handle)}`;
  }
}

const moveFooterColumn = (
  value: FooterData,
  variant: string,
  fromIndex: number,
  toIndex: number,
  onBlockPatch?: WidgetEditorProps<FooterData>["onBlockPatch"]
) => {
  if (!onBlockPatch) return;
  onBlockPatch((current) => {
    const next = reorderFooterColumnsAndSlots({
      columns: Array.isArray(current.data.columns)
        ? (current.data.columns as FooterColumn[])
        : value.columns,
      slots: current.slots,
      variant,
      fromIndex,
      toIndex,
    });
    return {
      ...current,
      data: {
        ...current.data,
        columns: next.columns,
      },
      slots: next.slots,
    };
  });
};

function FieldLabel({
  label,
  description,
  children,
  id,
  path,
  ownership,
  readOnly,
}: {
  label: string;
  description?: string;
  children: ReactNode;
} & FooterControlMetadata) {
  return (
    <label className="space-y-1 text-sm" {...controlAttributes({ id, path, ownership, readOnly })}>
      <span className="font-medium text-foreground">{label}</span>
      {description ? (
        <span className="block text-xs text-muted-foreground">{description}</span>
      ) : null}
      {children}
    </label>
  );
}

function LabeledSelectField({
  label,
  description,
  value,
  onValueChange,
  options,
  id,
  path,
  ownership,
  readOnly,
}: {
  label: string;
  description?: string;
  value: string;
  onValueChange: (next: string) => void;
  options: Array<{ id: string; label: string }>;
} & FooterControlMetadata) {
  return (
    <div className="space-y-2" {...controlAttributes({ id, path, ownership, readOnly })}>
      <p className="text-sm font-medium">{label}</p>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
  id,
  path,
  ownership,
  readOnly,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
} & FooterControlMetadata) {
  return (
    <div
      className="flex items-start justify-between gap-3 rounded-lg border p-3"
      {...controlAttributes({ id, path, ownership, readOnly })}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function BrandLogoField({
  value,
  onChange,
  path = "brand.logoUrl",
}: {
  value: FooterData;
  onChange: (next: FooterData) => void;
  path?: string;
}) {
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const savedLogo = value.brand?.logoUrl?.trim() ?? "";
  const safeSavedLogo = normalizeFooterImageSrc(savedLogo);

  const handleMediaChange = async (nextValue: unknown) => {
    const mediaId = typeof nextValue === "string" ? nextValue : null;
    setMediaError(null);

    if (!mediaId) {
      setSelectedMediaId(null);
      updateFooterBrand(value, onChange, { logoUrl: "" });
      return;
    }

    try {
      const items = await listMediaCached({ force: false });
      const media = items.find((item) => item.id === mediaId);
      if (!media?.url) throw new Error("missing_footer_logo_url");
      setSelectedMediaId(mediaId);
      updateFooterBrand(value, onChange, { logoUrl: media.url });
    } catch {
      setSelectedMediaId(null);
      setMediaError("Failed to resolve selected logo media.");
    }
  };

  return (
    <div
      className="space-y-3 rounded-md border bg-muted/10 p-3"
      {...controlAttributes({ id: "footer.brand.logoUrl", path })}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Logo image</p>
          <p className="text-xs text-muted-foreground">
            Pick a Media Library image. Saved image paths stay compatible and can be replaced or
            cleared.
          </p>
        </div>
        {savedLogo ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedMediaId(null);
              setMediaError(null);
              updateFooterBrand(value, onChange, { logoUrl: "" });
            }}
          >
            Clear logo
          </Button>
        ) : null}
      </div>
      {safeSavedLogo ? (
        <div className="flex items-center gap-3 rounded-md border bg-background p-2">
          <img
            src={safeSavedLogo}
            alt={value.brand?.logoAlt?.trim() || value.brand?.logoText?.trim() || "Footer logo"}
            className="h-10 w-20 rounded border object-contain"
            loading="lazy"
          />
          <p className="text-xs text-muted-foreground">
            {selectedMediaId
              ? "Using the selected Media Library image."
              : "A saved logo image is configured. Browse media to replace it or clear the logo."}
          </p>
        </div>
      ) : savedLogo ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p>
            A saved logo URL is not safe for preview or public rendering. Replace it with a Media
            Library image or clear the logo.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No logo image selected.</p>
      )}
      <MediaPicker
        value={selectedMediaId}
        onChange={(next) => {
          void handleMediaChange(next);
        }}
        multiple={false}
        accept={["image/*"]}
      />
      {mediaError ? <p className="text-xs text-destructive">{mediaError}</p> : null}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback = "#111827",
  onClear,
  id,
  path,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback?: string;
  onClear?: () => void;
} & FooterControlMetadata) {
  return (
    <div {...controlAttributes({ id, path })}>
      <SharedColorControl
        label={label}
        value={value}
        onChange={onChange}
        onClear={onClear}
        placeholder={placeholder}
        pickerFallback={pickerFallback}
        showValueInput={false}
        colorProfile="inherited-render"
      />
    </div>
  );
}

function FooterVariantSelect({
  value,
  onChange,
  path = "variant",
  ownership,
}: {
  value: string;
  onChange?: (next: string) => void;
  path?: string;
  ownership?: FooterControlOwnership;
}) {
  return (
    <LabeledSelectField
      label="Footer variant"
      value={value}
      onValueChange={(next) => onChange?.(next)}
      options={variantOptions}
      id="footer.variant"
      path={path}
      ownership={ownership}
    />
  );
}

function BrandEditor({
  value,
  onChange,
}: {
  value: FooterData;
  onChange: (next: FooterData) => void;
}) {
  return (
    <div className="space-y-3">
      <FieldLabel label="Brand name" id="footer.brand.logoText" path="brand.logoText">
        <Input
          value={value.brand?.logoText ?? ""}
          onChange={(event) => updateFooterBrand(value, onChange, { logoText: event.target.value })}
          placeholder="Coderso"
        />
      </FieldLabel>
      <FieldLabel label="Tagline" id="footer.brand.tagline" path="brand.tagline">
        <Input
          value={value.brand?.tagline ?? ""}
          onChange={(event) => updateFooterBrand(value, onChange, { tagline: event.target.value })}
          placeholder="Build confidently with modular content."
        />
      </FieldLabel>
      <BrandLogoField value={value} onChange={onChange} />
      <FieldLabel
        label="Logo alt text"
        description="Used when the footer shows a logo image without visible brand copy."
        id="footer.brand.logoAlt"
        path="brand.logoAlt"
      >
        <Input
          value={value.brand?.logoAlt ?? ""}
          onChange={(event) => updateFooterBrand(value, onChange, { logoAlt: event.target.value })}
          placeholder="Coderso logo"
        />
      </FieldLabel>
    </div>
  );
}

function LegalEditor({
  value,
  onChange,
  showTargets,
  showVisibilityToggle,
}: {
  value: FooterData;
  onChange: (next: FooterData) => void;
  showTargets?: boolean;
  showVisibilityToggle?: boolean;
}) {
  return (
    <div className="space-y-3">
      {showVisibilityToggle ? (
        <SwitchField
          label="Show legal strip"
          description="Hide the legal row without deleting its current copyright or link data."
          checked={value.legal?.enabled !== false}
          onCheckedChange={(checked) => updateFooterLegal(value, onChange, { enabled: checked })}
          id="footer.legal.enabled"
          path="legal.enabled"
        />
      ) : null}
      <FieldLabel label="Copyright" id="footer.legal.copyright" path="legal.copyright">
        <Input
          value={value.legal?.copyright ?? ""}
          onChange={(event) =>
            updateFooterLegal(value, onChange, { copyright: event.target.value })
          }
          placeholder="© 2026 Company name"
        />
      </FieldLabel>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-semibold">Privacy link</p>
          <FieldLabel
            label="Privacy label"
            id="footer.legal.privacyLabel"
            path="legal.privacyLabel"
          >
            <Input
              value={value.legal?.privacyLabel ?? ""}
              onChange={(event) =>
                updateFooterLegal(value, onChange, { privacyLabel: event.target.value })
              }
              placeholder="Privacy"
            />
          </FieldLabel>
          <LinkDestinationField
            fieldId="footer-legal-privacy"
            label="Privacy destination"
            value={value.legal?.privacy}
            controlPath="legal.privacy"
            onChange={(next) => updateFooterLegal(value, onChange, { privacy: next })}
            emptyLabel="No privacy destination"
            helpText="Pick the page that explains the privacy policy. Saved custom destinations stay replace-or-clear compatible."
          />
          {showTargets ? (
            <LabeledSelectField
              label="Link target"
              value={value.legal?.privacyTarget ?? "_self"}
              onValueChange={(next) =>
                updateFooterLegal(value, onChange, { privacyTarget: next as FooterLinkTarget })
              }
              options={linkTargetOptions}
              id="footer.legal.privacyTarget"
              path="legal.privacyTarget"
            />
          ) : null}
        </div>
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-semibold">Terms link</p>
          <FieldLabel label="Terms label" id="footer.legal.termsLabel" path="legal.termsLabel">
            <Input
              value={value.legal?.termsLabel ?? ""}
              onChange={(event) =>
                updateFooterLegal(value, onChange, { termsLabel: event.target.value })
              }
              placeholder="Terms"
            />
          </FieldLabel>
          <LinkDestinationField
            fieldId="footer-legal-terms"
            label="Terms destination"
            value={value.legal?.terms}
            controlPath="legal.terms"
            onChange={(next) => updateFooterLegal(value, onChange, { terms: next })}
            emptyLabel="No terms destination"
            helpText="Pick the page that explains terms of use. Saved custom destinations stay replace-or-clear compatible."
          />
          {showTargets ? (
            <LabeledSelectField
              label="Link target"
              value={value.legal?.termsTarget ?? "_self"}
              onValueChange={(next) =>
                updateFooterLegal(value, onChange, { termsTarget: next as FooterLinkTarget })
              }
              options={linkTargetOptions}
              id="footer.legal.termsTarget"
              path="legal.termsTarget"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SocialLinksEditor({
  value,
  onChange,
  limit,
}: {
  value: FooterData;
  onChange: (next: FooterData) => void;
  limit?: number;
}) {
  const items = Array.isArray(value.social) ? value.social : [];
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  const updateSocial = (index: number, patch: Partial<FooterSocial>) => {
    updateFooterSocial(value, onChange, (social) => {
      const next = [...social];
      const base = next[index] ?? emptySocialLink;
      const nextType = patch.type ?? base.type;
      const nextItem: FooterSocial = {
        type: nextType,
        href: patch.href ?? base.href,
      };
      const nextLabel =
        patch.label ?? (resolveFooterSocialType(nextType) === "custom" ? base.label : undefined);
      if (resolveFooterSocialType(nextType) === "custom" && nextLabel) {
        nextItem.label = nextLabel;
      }
      next[index] = nextItem;
      return next;
    });
  };

  const updateSocialType = (index: number, nextType: string) => {
    const item = visibleItems[index] ?? emptySocialLink;
    const currentType = resolveFooterSocialType(item.type);
    const profile = readFooterSocialProfile(currentType, item.href);
    const resolvedNextType = resolveFooterSocialType(nextType);
    updateSocial(index, {
      type: resolvedNextType,
      href:
        resolvedNextType === "custom"
          ? item.href
          : buildFooterSocialHref(resolvedNextType, profile),
      label:
        resolvedNextType === "custom" ? resolveFooterSocialLabel(item.type, item.label) : undefined,
    });
  };

  const addSocial = () => {
    updateFooterSocial(value, onChange, (social) => {
      if (typeof limit === "number" && social.length >= limit) return social;
      return [...social, emptySocialLink];
    });
  };

  const moveSocial = (index: number, direction: -1 | 1) => {
    updateFooterSocial(value, onChange, (social) => moveItem(social, index, index + direction));
  };

  const removeSocial = (index: number) => {
    updateFooterSocial(value, onChange, (social) =>
      social.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Choose a platform, then enter only the public profile name or handle. Custom saved
        destinations can be replaced with a page picker or cleared.
      </p>
      {visibleItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">No social links configured.</p>
      ) : null}
      {visibleItems.map((item, index) => {
        const selectedType = resolveFooterSocialType(item.type);
        return (
          <div key={`${item.type}-${index}`} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Social link {index + 1}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => moveSocial(index, -1)}
                  disabled={index === 0}
                  {...actionAttributes(`footer.social.${index}.moveUp`)}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => moveSocial(index, 1)}
                  disabled={index === visibleItems.length - 1}
                  {...actionAttributes(`footer.social.${index}.moveDown`)}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSocial(index)}
                  {...actionAttributes(`footer.social.${index}.remove`)}
                >
                  Remove
                </Button>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <LabeledSelectField
                label="Platform"
                value={selectedType}
                onValueChange={(next) => updateSocialType(index, next)}
                options={socialTypeOptions}
                id={`footer.social.${index}.type`}
                path={`social.${index}.type`}
              />
              {selectedType === "custom" ? (
                <LinkDestinationField
                  fieldId={`footer-social-${index + 1}-custom-destination`}
                  label="Custom destination"
                  value={item.href}
                  controlPath={`social.${index}.href`}
                  onChange={(next) => updateSocial(index, { href: next })}
                  emptyLabel="No custom destination"
                  helpText="Pick a site page for this custom social/community link. Saved custom destinations stay replace-or-clear compatible."
                />
              ) : (
                <FieldLabel
                  label="Profile name"
                  description="The editor builds the safe profile destination from this value."
                  id={`footer.social.${index}.href`}
                  path={`social.${index}.href`}
                >
                  <Input
                    value={readFooterSocialProfile(selectedType, item.href)}
                    onChange={(event) =>
                      updateSocial(index, {
                        href: buildFooterSocialHref(selectedType, event.target.value),
                      })
                    }
                    placeholder={footerSocialProfilePlaceholders[selectedType]}
                  />
                </FieldLabel>
              )}
            </div>
            {selectedType !== "custom" &&
            (item.href ?? "").trim().length > 0 &&
            readFooterSocialProfile(selectedType, item.href).length === 0 ? (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p>
                  A saved destination is still stored for this social link. Replace it with a
                  profile name or clear it before publishing changes.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateSocial(index, { href: "" })}
                  {...actionAttributes(`footer.social.${index}.clearSavedDestination`)}
                >
                  Clear saved destination
                </Button>
              </div>
            ) : null}
            {selectedType === "custom" ? (
              <FieldLabel
                label="Accessible label"
                id={`footer.social.${index}.label`}
                path={`social.${index}.label`}
              >
                <Input
                  value={item.label ?? resolveFooterSocialLabel(item.type, item.label)}
                  onChange={(event) =>
                    updateSocial(index, { type: "custom", label: event.target.value })
                  }
                  placeholder="Community"
                />
              </FieldLabel>
            ) : null}
          </div>
        );
      })}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={addSocial}
        disabled={typeof limit === "number" && visibleItems.length >= limit}
        {...actionAttributes("footer.social.add")}
      >
        Add social
      </Button>
    </div>
  );
}

export function FooterWizardEditor({ value, variant }: WidgetEditorProps<FooterData>) {
  const socialCount = Array.isArray(value.social) ? value.social.length : 0;
  const visibleCount = resolveFooterColumnCount(variant);
  const visibleColumns = resolveFooterColumnsForVariant(value.columns, variant).slice(
    0,
    visibleCount
  );
  const visibleColumnSummary =
    visibleColumns.length > 0
      ? visibleColumns.map((column, index) => column.title || `Column ${index + 1}`).join(", ")
      : "No visible columns";

  return (
    <WidgetEditorSection
      id="footer.wizard.starter-footer"
      mode="wizard"
      role="setup"
      title="Starter footer"
      description="Seed visible columns and social visibility. Brand and legal content live in Visual."
    >
      <div className="space-y-5">
        <ReadonlyWidgetSummaryRow
          id="footer.wizard.variant"
          label="Footer variant"
          path="variant"
          value={`${variantLabel(variant)}. Change the footer variant in Visual mode.`}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Columns quick setup</p>
          <p className="text-xs text-muted-foreground">
            Review visible columns here. Edit column titles, links, order, and hidden columns in
            Visual mode.
          </p>
          <ReadonlyWidgetSummaryRow
            id="footer.wizard.columns"
            label="Visible columns"
            path="columns"
            value={visibleColumnSummary}
          />
          {variant === "minimal" ? (
            <p className="text-xs text-muted-foreground">
              Minimal footer reuses the first column links as a compact inline row. Extra columns
              stay preserved in Visual mode.
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          Use Visual to edit brand logo/text, tagline, copyright, privacy/terms labels, and legal
          destinations.
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Social basics</p>
          <ReadonlyWidgetSummaryRow
            id="footer.wizard.socialEnabled"
            label="Show social links"
            path="socialEnabled"
            value={value.socialEnabled !== false ? "Enabled" : "Disabled"}
          />
          <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
            {socialCount === 0
              ? "Add and edit social profiles in Visual when you are ready to publish them."
              : `${socialCount} saved social profile${socialCount === 1 ? " stays" : "s stay"} preserved. Edit destinations, order, and labels in Visual.`}
          </div>
        </div>
      </div>
    </WidgetEditorSection>
  );
}

export function FooterVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<FooterData>) {
  const visibleCount = resolveFooterColumnCount(variant);
  const visibleColumns = resolveFooterColumnsForVariant(value.columns, variant).slice(
    0,
    visibleCount
  );
  const canMoveColumns = Boolean(onBlockPatch) && visibleCount > 1;

  return (
    <div className="space-y-5">
      <WidgetEditorSection
        id="footer.visual.variant-structure"
        mode="visual"
        role="setup"
        title="Variant and structure"
        description="Choose the daily footer structure without changing existing content."
      >
        <FooterVariantSelect value={variant} onChange={onVariantChange} />
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Runtime columns: {visibleCount}. Footer Visual mode owns the variant selector. Minimal
          reuses the first column links as a compact inline row while preserving hidden columns and
          slots.
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.visual.columns-links"
        mode="visual"
        role="content"
        title="Columns and links"
        description="Edit footer link groups. Column moves are live-only so matching slot payloads move with the visible columns."
      >
        {!canMoveColumns ? (
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Reorder columns in the live editor, where each visible footer region stays paired with
            its saved content.
          </div>
        ) : null}
        <div className="space-y-4">
          {visibleColumns.map((column, columnIndex) => (
            <div key={`${column.title}-${columnIndex}`} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Column {columnIndex + 1}</p>
                  <p className="text-xs text-muted-foreground">
                    Visible region {columnIndex + 1}. Hidden columns stay saved when this layout
                    shows fewer columns.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      moveFooterColumn(value, variant, columnIndex, columnIndex - 1, onBlockPatch)
                    }
                    disabled={!canMoveColumns || columnIndex === 0}
                    {...actionAttributes(`footer.columns.${columnIndex}.moveLeft`)}
                  >
                    Move left
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      moveFooterColumn(value, variant, columnIndex, columnIndex + 1, onBlockPatch)
                    }
                    disabled={!canMoveColumns || columnIndex === visibleColumns.length - 1}
                    {...actionAttributes(`footer.columns.${columnIndex}.moveRight`)}
                  >
                    Move right
                  </Button>
                </div>
              </div>
              <FieldLabel
                label="Column title"
                id={`footer.columns.${columnIndex}.title`}
                path={`columns.${columnIndex}.title`}
              >
                <Input
                  value={column.title}
                  onChange={(event) =>
                    updateColumn(value, onChange, variant, columnIndex, {
                      title: event.target.value,
                    })
                  }
                  placeholder={`Column ${columnIndex + 1} title`}
                />
              </FieldLabel>
              <div className="space-y-3">
                {column.links.map((link, linkIndex) => (
                  <div
                    key={`${link.label}-${linkIndex}`}
                    className="space-y-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Link {linkIndex + 1}</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            moveColumnLink(value, onChange, variant, columnIndex, linkIndex, -1)
                          }
                          disabled={linkIndex === 0}
                          {...actionAttributes(
                            `footer.columns.${columnIndex}.links.${linkIndex}.moveUp`
                          )}
                        >
                          Move up
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            moveColumnLink(value, onChange, variant, columnIndex, linkIndex, 1)
                          }
                          disabled={linkIndex === column.links.length - 1}
                          {...actionAttributes(
                            `footer.columns.${columnIndex}.links.${linkIndex}.moveDown`
                          )}
                        >
                          Move down
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            removeColumnLink(value, onChange, variant, columnIndex, linkIndex)
                          }
                          {...actionAttributes(
                            `footer.columns.${columnIndex}.links.${linkIndex}.remove`
                          )}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <FieldLabel
                        label="Link label"
                        id={`footer.columns.${columnIndex}.links.${linkIndex}.label`}
                        path={`columns.${columnIndex}.links.${linkIndex}.label`}
                      >
                        <Input
                          value={link.label}
                          onChange={(event) =>
                            updateColumnLink(value, onChange, variant, columnIndex, linkIndex, {
                              label: event.target.value,
                            })
                          }
                          placeholder="About"
                        />
                      </FieldLabel>
                      <LinkDestinationField
                        fieldId={`footer-column-${columnIndex + 1}-link-${linkIndex + 1}`}
                        label="Link destination"
                        value={link.href}
                        controlPath={`columns.${columnIndex}.links.${linkIndex}.href`}
                        onChange={(next) =>
                          updateColumnLink(value, onChange, variant, columnIndex, linkIndex, {
                            href: next,
                          })
                        }
                        emptyLabel="No destination"
                        helpText="Pick a page for this footer link. Saved custom destinations stay replace-or-clear compatible."
                      />
                    </div>
                    <LabeledSelectField
                      label="Link target"
                      value={link.target ?? "_self"}
                      onValueChange={(next) =>
                        updateColumnLink(value, onChange, variant, columnIndex, linkIndex, {
                          target: next as FooterLinkTarget,
                        })
                      }
                      options={linkTargetOptions}
                      id={`footer.columns.${columnIndex}.links.${linkIndex}.target`}
                      path={`columns.${columnIndex}.links.${linkIndex}.target`}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addColumnLink(value, onChange, variant, columnIndex)}
                  {...actionAttributes(`footer.columns.${columnIndex}.links.add`)}
                >
                  Add link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.visual.brand-legal"
        mode="visual"
        role="content"
        title="Brand and legal"
        description="Brand text names the footer landmark when present. Privacy and Terms labels stay configurable for localization."
      >
        <BrandEditor value={value} onChange={onChange} />
        <LegalEditor value={value} onChange={onChange} showTargets showVisibilityToggle />
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.visual.utility-strip"
        mode="visual"
        role="content"
        title="Utility strip"
        description="Footer owns contact details and an optional back-to-top action. Add newsletter content from page regions."
      >
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Place newsletter content in the bottom footer region for its own strip, or inside a
          visible footer column when it should sit next to footer links.
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <FieldLabel label="Address" id="footer.contact.address" path="contact.address">
            <Input
              value={value.contact?.address ?? ""}
              onChange={(event) =>
                updateFooterContact(value, onChange, { address: event.target.value })
              }
              placeholder="123 Market Street, San Francisco, CA"
            />
          </FieldLabel>
          <FieldLabel label="Phone" id="footer.contact.phone" path="contact.phone">
            <Input
              value={value.contact?.phone ?? ""}
              onChange={(event) =>
                updateFooterContact(value, onChange, { phone: event.target.value })
              }
              placeholder="+1 415 555 0100"
            />
          </FieldLabel>
          <FieldLabel label="Email" id="footer.contact.email" path="contact.email">
            <Input
              value={value.contact?.email ?? ""}
              onChange={(event) =>
                updateFooterContact(value, onChange, { email: event.target.value })
              }
              placeholder="hello@example.com"
            />
          </FieldLabel>
        </div>
        <SwitchField
          label="Show back-to-top action"
          description="Uses the page top anchor so the browser handles scrolling without extra motion scripts."
          checked={value.backToTop?.enabled === true}
          onCheckedChange={(checked) =>
            updateFooterBackToTop(value, onChange, { enabled: checked })
          }
          id="footer.backToTop.enabled"
          path="backToTop.enabled"
        />
        <FieldLabel label="Back-to-top label" id="footer.backToTop.label" path="backToTop.label">
          <Input
            value={value.backToTop?.label ?? ""}
            onChange={(event) =>
              updateFooterBackToTop(value, onChange, { label: event.target.value })
            }
            placeholder="Back to top"
          />
        </FieldLabel>
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.visual.social-links"
        mode="visual"
        role="content"
        title="Social links and icon style"
        description="Manage footer social visibility and profile destinations with platform-aware fields."
      >
        <SwitchField
          label="Show social links"
          description="Hide social icons without deleting the current platform entries."
          checked={value.socialEnabled !== false}
          onCheckedChange={(checked) => onChange({ ...value, socialEnabled: checked })}
          id="footer.visual.socialEnabled"
          path="socialEnabled"
        />
        <SocialLinksEditor value={value} onChange={onChange} />
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.visual.colors-borders"
        mode="visual"
        role="visual"
        title="Colors and borders"
        description="Use swatches for normal color authoring. Saved custom tokens can be replaced or cleared."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <ColorField
            label="Surface color"
            value={value.style?.surfaceColor}
            onChange={(next) => updateFooterStyle(value, onChange, { surfaceColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "surfaceColor")}
            placeholder="var(--color-bg)"
            pickerFallback="#ffffff"
            id="footer.style.surfaceColor"
            path="style.surfaceColor"
          />
          <ColorField
            label="Border color"
            value={value.style?.borderColor}
            onChange={(next) => updateFooterStyle(value, onChange, { borderColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "borderColor")}
            placeholder="var(--color-border)"
            pickerFallback="#e2e8f0"
            id="footer.style.borderColor"
            path="style.borderColor"
          />
          <ColorField
            label="Text color"
            value={value.style?.textColor}
            onChange={(next) => updateFooterStyle(value, onChange, { textColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "textColor")}
            placeholder="var(--color-text)"
            pickerFallback="#111827"
            id="footer.style.textColor"
            path="style.textColor"
          />
          <ColorField
            label="Heading color"
            value={value.style?.headingColor}
            onChange={(next) => updateFooterStyle(value, onChange, { headingColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "headingColor")}
            placeholder="var(--color-text)"
            pickerFallback="#111827"
            id="footer.style.headingColor"
            path="style.headingColor"
          />
          <ColorField
            label="Link color"
            value={value.style?.linkColor}
            onChange={(next) => updateFooterStyle(value, onChange, { linkColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "linkColor")}
            placeholder="var(--color-text)"
            pickerFallback="#2563eb"
            id="footer.style.linkColor"
            path="style.linkColor"
          />
          <ColorField
            label="Legal text color"
            value={value.style?.legalTextColor}
            onChange={(next) => updateFooterStyle(value, onChange, { legalTextColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "legalTextColor")}
            placeholder="var(--color-text)"
            pickerFallback="#6b7280"
            id="footer.style.legalTextColor"
            path="style.legalTextColor"
          />
          <ColorField
            label="Social icon color"
            value={value.style?.socialColor}
            onChange={(next) => updateFooterStyle(value, onChange, { socialColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "socialColor")}
            placeholder="var(--color-text)"
            pickerFallback="#111827"
            id="footer.style.socialColor"
            path="style.socialColor"
          />
        </div>
        <LabeledSelectField
          label="Top border width"
          value={value.style?.borderTopWidth ?? "1"}
          onValueChange={(next) =>
            updateFooterStyle(value, onChange, {
              borderTopWidth: next as NonNullable<FooterData["style"]>["borderTopWidth"],
            })
          }
          options={borderTopWidthOptions}
          id="footer.style.borderTopWidth"
          path="style.borderTopWidth"
        />
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.visual.typography-links"
        mode="visual"
        role="visual"
        title="Typography and link styling"
        description="Footer link hover, active, underline, and typography controls live here."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <LabeledSelectField
            label="Font size"
            value={value.style?.fontSize ?? "sm"}
            onValueChange={(next) =>
              updateFooterStyle(value, onChange, {
                fontSize: next as NonNullable<FooterData["style"]>["fontSize"],
              })
            }
            options={fontSizeOptions}
            id="footer.style.fontSize"
            path="style.fontSize"
          />
          <LabeledSelectField
            label="Heading transform"
            value={value.style?.headingTransform ?? "uppercase"}
            onValueChange={(next) =>
              updateFooterStyle(value, onChange, {
                headingTransform: next as NonNullable<FooterData["style"]>["headingTransform"],
              })
            }
            options={headingTransformOptions}
            id="footer.style.headingTransform"
            path="style.headingTransform"
          />
          <LabeledSelectField
            label="Link font weight"
            value={value.style?.linkFontWeight ?? "normal"}
            onValueChange={(next) =>
              updateFooterStyle(value, onChange, {
                linkFontWeight: next as NonNullable<FooterData["style"]>["linkFontWeight"],
              })
            }
            options={linkFontWeightOptions}
            id="footer.style.linkFontWeight"
            path="style.linkFontWeight"
          />
          <LabeledSelectField
            label="Link letter spacing"
            value={value.style?.linkLetterSpacing ?? "normal"}
            onValueChange={(next) =>
              updateFooterStyle(value, onChange, {
                linkLetterSpacing: next as NonNullable<FooterData["style"]>["linkLetterSpacing"],
              })
            }
            options={linkLetterSpacingOptions}
            id="footer.style.linkLetterSpacing"
            path="style.linkLetterSpacing"
          />
          <LabeledSelectField
            label="Link underline"
            value={value.style?.linkUnderline ?? "hover"}
            onValueChange={(next) =>
              updateFooterStyle(value, onChange, {
                linkUnderline: next as NonNullable<FooterData["style"]>["linkUnderline"],
              })
            }
            options={linkUnderlineOptions}
            id="footer.style.linkUnderline"
            path="style.linkUnderline"
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <ColorField
            label="Link hover color"
            value={value.style?.linkHoverColor}
            onChange={(next) => updateFooterStyle(value, onChange, { linkHoverColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "linkHoverColor")}
            placeholder="var(--color-primary)"
            pickerFallback="#2563eb"
            id="footer.style.linkHoverColor"
            path="style.linkHoverColor"
          />
          <ColorField
            label="Link active color"
            value={value.style?.linkActiveColor}
            onChange={(next) => updateFooterStyle(value, onChange, { linkActiveColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "linkActiveColor")}
            placeholder="var(--color-primary)"
            pickerFallback="#1d4ed8"
            id="footer.style.linkActiveColor"
            path="style.linkActiveColor"
          />
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.visual.layout-spacing"
        mode="visual"
        role="layout"
        title="Layout and spacing"
        description="Daily footer alignment, width, column gap, breakpoint, and padding controls."
      >
        <div className="space-y-3">
          <LabeledSelectField
            label="Columns alignment"
            description="Controls the text alignment inside the visible footer columns."
            value={value.layout?.align ?? "left"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                align: next as NonNullable<FooterData["layout"]>["align"],
              })
            }
            options={alignOptions}
            id="footer.layout.align"
            path="layout.align"
          />
          <LabeledSelectField
            label="Legal row alignment"
            description="Controls where copyright, legal links, and social actions sit."
            value={value.layout?.legalAlign ?? "right"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                legalAlign: next as NonNullable<FooterData["layout"]>["legalAlign"],
              })
            }
            options={alignOptions}
            id="footer.layout.legalAlign"
            path="layout.legalAlign"
          />
          <LabeledSelectField
            label="Max width"
            value={value.layout?.maxWidth ?? "6xl"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                maxWidth: next as NonNullable<FooterData["layout"]>["maxWidth"],
              })
            }
            options={maxWidthOptions}
            id="footer.layout.maxWidth"
            path="layout.maxWidth"
          />
          <LabeledSelectField
            label="Column gap"
            value={value.layout?.columnGap ?? "6"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                columnGap: next as NonNullable<FooterData["layout"]>["columnGap"],
              })
            }
            options={columnGapOptions}
            id="footer.layout.columnGap"
            path="layout.columnGap"
          />
          <LabeledSelectField
            label="Horizontal padding"
            value={value.layout?.paddingX ?? "6"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                paddingX: next as NonNullable<FooterData["layout"]>["paddingX"],
              })
            }
            options={paddingXOptions}
            id="footer.layout.paddingX"
            path="layout.paddingX"
          />
          <LabeledSelectField
            label="Column breakpoint"
            description="Choose when multi-column variants stop stacking vertically."
            value={value.layout?.columnBreakpoint ?? "md"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                columnBreakpoint: next as NonNullable<FooterData["layout"]>["columnBreakpoint"],
              })
            }
            options={columnBreakpointOptions}
            id="footer.layout.columnBreakpoint"
            path="layout.columnBreakpoint"
          />
          <LabeledSelectField
            label="Section padding"
            value={value.layout?.sectionPaddingY ?? "10"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                sectionPaddingY: next as NonNullable<FooterData["layout"]>["sectionPaddingY"],
              })
            }
            options={sectionPaddingOptions}
            id="footer.layout.sectionPaddingY"
            path="layout.sectionPaddingY"
          />
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.visual.slots-overview"
        mode="visual"
        role="summary"
        title="Slots overview and insertion hints"
        description="Read-only placement guidance for footer nested widgets."
      >
        <ReadonlyWidgetSummaryRow
          id="footer.visual.slots"
          label="Footer slots"
          path="slots"
          value="Column 1, Column 2, Column 3, and Bottom Strip regions are managed on the page canvas."
        />
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            Column regions 1, 2, and 3 render inside the visible footer columns and move with those
            columns in the live editor.
          </li>
          <li>
            The bottom footer region renders in the lower legal/actions strip, or below the compact
            row in Minimal.
          </li>
          <li>
            Compose newsletter widgets through page regions; Footer itself does not submit forms.
          </li>
          <li>Use the page canvas insert menu to place widgets into those regions.</li>
        </ul>
      </WidgetEditorSection>
    </div>
  );
}

export function FooterAdvancedEditor({ value, variant }: WidgetEditorProps<FooterData>) {
  return (
    <div className="space-y-5">
      <WidgetEditorSection
        id="footer.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Read-only footer structure and slot ownership overview."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.variant"
            label="Variant"
            path="variant"
            value={optionLabel(variantOptions, variant)}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.columns"
            label="Columns"
            path="columns"
            value={`${value.columns?.length ?? 0} stored columns`}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.social"
            label="Social links"
            path="social"
            value={`${value.social?.length ?? 0} links`}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.legal"
            label="Legal row"
            path="legal"
            value={value.legal?.enabled === false ? "Hidden" : "Visible"}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.backToTop"
            label="Back to top"
            path="backToTop"
            value={value.backToTop?.enabled ? "Enabled" : "Disabled"}
          />
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.advanced.layout-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Layout diagnostics"
        description="Read-only layout values. Change these in Visual under Layout and spacing."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.layout.align"
            label="Columns alignment"
            path="layout.align"
            value={optionLabel(alignOptions, value.layout?.align ?? "left")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.layout.legalAlign"
            label="Legal row alignment"
            path="layout.legalAlign"
            value={optionLabel(alignOptions, value.layout?.legalAlign ?? "right")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.layout.maxWidth"
            label="Max width"
            path="layout.maxWidth"
            value={optionLabel(maxWidthOptions, value.layout?.maxWidth ?? "6xl")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.layout.columnGap"
            label="Column gap"
            path="layout.columnGap"
            value={optionLabel(columnGapOptions, value.layout?.columnGap ?? "6")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.layout.paddingX"
            label="Horizontal padding"
            path="layout.paddingX"
            value={optionLabel(paddingXOptions, value.layout?.paddingX ?? "6")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.layout.columnBreakpoint"
            label="Column breakpoint"
            path="layout.columnBreakpoint"
            value={optionLabel(columnBreakpointOptions, value.layout?.columnBreakpoint ?? "md")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.layout.sectionPaddingY"
            label="Section padding"
            path="layout.sectionPaddingY"
            value={optionLabel(sectionPaddingOptions, value.layout?.sectionPaddingY ?? "10")}
          />
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.advanced.style-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Style diagnostics"
        description="Read-only style values. Change these in Visual under Colors, borders, and Typography."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.surfaceColor"
            label="Surface color"
            path="style.surfaceColor"
            value={colorDiagnostic(value.style?.surfaceColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.borderColor"
            label="Border color"
            path="style.borderColor"
            value={colorDiagnostic(value.style?.borderColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.textColor"
            label="Text color"
            path="style.textColor"
            value={colorDiagnostic(value.style?.textColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.headingColor"
            label="Heading color"
            path="style.headingColor"
            value={colorDiagnostic(value.style?.headingColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.linkColor"
            label="Link color"
            path="style.linkColor"
            value={colorDiagnostic(value.style?.linkColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.legalTextColor"
            label="Legal text color"
            path="style.legalTextColor"
            value={colorDiagnostic(value.style?.legalTextColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.socialColor"
            label="Social icon color"
            path="style.socialColor"
            value={colorDiagnostic(value.style?.socialColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.borderTopWidth"
            label="Top border width"
            path="style.borderTopWidth"
            value={optionLabel(borderTopWidthOptions, value.style?.borderTopWidth ?? "1")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.fontSize"
            label="Font size"
            path="style.fontSize"
            value={optionLabel(fontSizeOptions, value.style?.fontSize ?? "sm")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.headingTransform"
            label="Heading transform"
            path="style.headingTransform"
            value={optionLabel(
              headingTransformOptions,
              value.style?.headingTransform ?? "uppercase"
            )}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.linkUnderline"
            label="Link underline"
            path="style.linkUnderline"
            value={optionLabel(linkUnderlineOptions, value.style?.linkUnderline ?? "hover")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.linkFontWeight"
            label="Link font weight"
            path="style.linkFontWeight"
            value={optionLabel(linkFontWeightOptions, value.style?.linkFontWeight ?? "normal")}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.linkLetterSpacing"
            label="Link letter spacing"
            path="style.linkLetterSpacing"
            value={optionLabel(
              linkLetterSpacingOptions,
              value.style?.linkLetterSpacing ?? "normal"
            )}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.linkHoverColor"
            label="Link hover color"
            path="style.linkHoverColor"
            value={colorDiagnostic(value.style?.linkHoverColor)}
          />
          <ReadonlyWidgetSummaryRow
            id="footer.advanced.style.linkActiveColor"
            label="Link active color"
            path="style.linkActiveColor"
            value={colorDiagnostic(value.style?.linkActiveColor)}
          />
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        id="footer.advanced.support-summary"
        mode="advanced"
        role="summary"
        title="Support summary"
        description="No Footer-specific support mutation is available here."
      >
        <ReadonlyWidgetSummaryRow
          id="footer.advanced.slots"
          label="Footer slots"
          path="slots"
          value="Column and bottom slot payloads are read-only here. Manage nested widgets on the page canvas."
        />
        <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Visibility, container tokens, block-level spacing, and background overrides are handled by
          shared block controls. Footer-specific content, layout, and style changes stay in Visual.
        </p>
      </WidgetEditorSection>
    </div>
  );
}
