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

import {
  footerColumnSlotIds,
  footerSocialTypes,
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
import { WidgetEditorSection } from "./WidgetEditorControls";

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
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm">
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
}: {
  label: string;
  description?: string;
  value: string;
  onValueChange: (next: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
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
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
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
}: {
  value: FooterData;
  onChange: (next: FooterData) => void;
}) {
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const savedLogo = value.brand?.logoUrl?.trim() ?? "";

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
    <div className="space-y-3 rounded-md border bg-muted/10 p-3">
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
      {savedLogo ? (
        <div className="flex items-center gap-3 rounded-md border bg-background p-2">
          <img
            src={savedLogo}
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
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback?: string;
  onClear?: () => void;
}) {
  return (
    <SharedColorControl
      label={label}
      value={value}
      onChange={onChange}
      onClear={onClear}
      placeholder={placeholder}
      pickerFallback={pickerFallback}
    />
  );
}

function FooterVariantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <LabeledSelectField
      label="Footer variant"
      value={value}
      onValueChange={(next) => onChange?.(next)}
      options={variantOptions}
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
      <FieldLabel label="Brand name">
        <Input
          value={value.brand?.logoText ?? ""}
          onChange={(event) => updateFooterBrand(value, onChange, { logoText: event.target.value })}
          placeholder="Coderso"
        />
      </FieldLabel>
      <FieldLabel label="Tagline">
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
        />
      ) : null}
      <FieldLabel label="Copyright">
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
          <FieldLabel label="Privacy label">
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
            />
          ) : null}
        </div>
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-semibold">Terms link</p>
          <FieldLabel label="Terms label">
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
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ColumnsQuickSetup({
  value,
  onChange,
  variant,
}: {
  value: FooterData;
  onChange: (next: FooterData) => void;
  variant: string;
}) {
  const visibleCount = resolveFooterColumnCount(variant);
  const visibleColumns = resolveFooterColumnsForVariant(value.columns, variant).slice(
    0,
    visibleCount
  );

  return (
    <div className="space-y-4">
      {variant === "minimal" ? (
        <p className="text-xs text-muted-foreground">
          Minimal footer reuses the first column links as a compact inline row. Extra columns stay
          preserved in Visual mode.
        </p>
      ) : null}
      {visibleColumns.map((column, index) => {
        const firstLink = column.links[0] ?? { label: "", href: "" };
        const hiddenLinkCount = Math.max(column.links.length - 1, 0);
        return (
          <div key={`${column.title}-${index}`} className="space-y-3 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Column {index + 1}
            </p>
            <FieldLabel label={`Column ${index + 1} title`}>
              <Input
                value={column.title}
                onChange={(event) =>
                  updateColumn(value, onChange, variant, index, {
                    title: event.target.value,
                  })
                }
                placeholder={`Column ${index + 1} title`}
              />
            </FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <FieldLabel label={`Column ${index + 1} first link label`}>
                <Input
                  value={firstLink.label}
                  onChange={(event) =>
                    updateColumnLink(value, onChange, variant, index, 0, {
                      label: event.target.value,
                    })
                  }
                  placeholder="First link label"
                />
              </FieldLabel>
              <LinkDestinationField
                fieldId={`footer-wizard-column-${index + 1}-first-link`}
                label={`Column ${index + 1} first link destination`}
                value={firstLink.href}
                onChange={(next) =>
                  updateColumnLink(value, onChange, variant, index, 0, {
                    href: next,
                  })
                }
                emptyLabel="No destination"
                helpText="Pick a page for this starter footer link. Saved custom destinations stay replace-or-clear compatible."
              />
            </div>
            {hiddenLinkCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {hiddenLinkCount} additional {hiddenLinkCount === 1 ? "link stays" : "links stay"}{" "}
                available in Visual mode.
              </p>
            ) : null}
          </div>
        );
      })}
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
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => moveSocial(index, 1)}
                  disabled={index === visibleItems.length - 1}
                >
                  Move down
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeSocial(index)}>
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
              />
              {selectedType === "custom" ? (
                <LinkDestinationField
                  fieldId={`footer-social-${index + 1}-custom-destination`}
                  label="Custom destination"
                  value={item.href}
                  onChange={(next) => updateSocial(index, { href: next })}
                  emptyLabel="No custom destination"
                  helpText="Pick a site page for this custom social/community link. Saved custom destinations stay replace-or-clear compatible."
                />
              ) : (
                <FieldLabel
                  label="Profile name"
                  description="The editor builds the safe profile destination from this value."
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
                >
                  Clear saved destination
                </Button>
              </div>
            ) : null}
            {selectedType === "custom" ? (
              <FieldLabel label="Accessible label">
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
      >
        Add social
      </Button>
    </div>
  );
}

export function FooterWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<FooterData>) {
  return (
    <WidgetEditorSection
      id="footer.wizard.starter-footer"
      mode="wizard"
      role="setup"
      title="Starter footer"
      description="Seed visible columns, brand, legal text, and social links."
    >
      <div className="space-y-5">
        <FooterVariantSelect value={variant} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Columns quick setup</p>
          <p className="text-xs text-muted-foreground">
            Configure titles and the first link for each visible column. Additional links stay
            preserved and remain editable in Visual mode.
          </p>
          <ColumnsQuickSetup value={value} onChange={onChange} variant={variant} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Brand basics</p>
          <BrandEditor value={value} onChange={onChange} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Legal basics</p>
          <LegalEditor value={value} onChange={onChange} showVisibilityToggle />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Social basics</p>
          <SwitchField
            label="Show social links"
            description="Hide social icons without deleting the current platform entries."
            checked={value.socialEnabled !== false}
            onCheckedChange={(checked) => onChange({ ...value, socialEnabled: checked })}
          />
          <SocialLinksEditor value={value} onChange={onChange} limit={8} />
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
      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Variant and structure</p>
        <FooterVariantSelect value={variant} onChange={onVariantChange} />
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Runtime columns: {visibleCount}. Footer Visual mode owns the variant selector. Minimal
          reuses the first column links as a compact inline row while preserving hidden columns and
          slots.
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Columns and links</p>
        <p className="text-xs text-muted-foreground">
          Link order is editable here. Column moves are allowed only through the live block patch
          path so the matching `column-1`, `column-2`, and `column-3` slot payloads move with the
          visible columns.
        </p>
        {!canMoveColumns ? (
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Column reorder is read-only in static previews because slot remapping requires the live
            footer block patch path.
          </div>
        ) : null}
        <div className="space-y-4">
          {visibleColumns.map((column, columnIndex) => (
            <div key={`${column.title}-${columnIndex}`} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Column {columnIndex + 1}</p>
                  <p className="text-xs text-muted-foreground">
                    Slot owner: `{footerColumnSlotIds[columnIndex] ?? `column-${columnIndex + 1}`}`
                    . Hidden columns remain preserved when the active variant shows fewer columns.
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
                  >
                    Move right
                  </Button>
                </div>
              </div>
              <FieldLabel label="Column title">
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
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <FieldLabel label="Link label">
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
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addColumnLink(value, onChange, variant, columnIndex)}
                >
                  Add link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Brand and legal</p>
        <p className="text-xs text-muted-foreground">
          Brand text names the footer landmark when present. Privacy and Terms labels stay
          configurable for localization.
        </p>
        <BrandEditor value={value} onChange={onChange} />
        <LegalEditor value={value} onChange={onChange} showTargets showVisibilityToggle />
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Utility strip</p>
        <p className="text-xs text-muted-foreground">
          Newsletter stays composition-only: place the existing Newsletter widget into a footer slot
          instead of storing submission config in Footer JSON. Address/contact fields below are
          read-only, and back-to-top stays an anchor-only action.
        </p>
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Recommended newsletter placement: `bottom` for a dedicated lower strip, or one of the
          visible column slots when the page needs it inline with footer links.
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <FieldLabel label="Address">
            <Input
              value={value.contact?.address ?? ""}
              onChange={(event) =>
                updateFooterContact(value, onChange, { address: event.target.value })
              }
              placeholder="123 Market Street, San Francisco, CA"
            />
          </FieldLabel>
          <FieldLabel label="Phone">
            <Input
              value={value.contact?.phone ?? ""}
              onChange={(event) =>
                updateFooterContact(value, onChange, { phone: event.target.value })
              }
              placeholder="+1 415 555 0100"
            />
          </FieldLabel>
          <FieldLabel label="Email">
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
          description="Uses a plain `#top` anchor so the browser handles scrolling without hidden motion scripts."
          checked={value.backToTop?.enabled === true}
          onCheckedChange={(checked) =>
            updateFooterBackToTop(value, onChange, { enabled: checked })
          }
        />
        <FieldLabel label="Back-to-top label">
          <Input
            value={value.backToTop?.label ?? ""}
            onChange={(event) =>
              updateFooterBackToTop(value, onChange, { label: event.target.value })
            }
            placeholder="Back to top"
          />
        </FieldLabel>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Social links and icon style</p>
        <SwitchField
          label="Show social links"
          description="Hide social icons without deleting the current platform entries."
          checked={value.socialEnabled !== false}
          onCheckedChange={(checked) => onChange({ ...value, socialEnabled: checked })}
        />
        <SocialLinksEditor value={value} onChange={onChange} />
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Colors and borders</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <ColorField
            label="Surface color"
            value={value.style?.surfaceColor}
            onChange={(next) => updateFooterStyle(value, onChange, { surfaceColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "surfaceColor")}
            placeholder="var(--color-bg)"
            pickerFallback="#ffffff"
          />
          <ColorField
            label="Border color"
            value={value.style?.borderColor}
            onChange={(next) => updateFooterStyle(value, onChange, { borderColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "borderColor")}
            placeholder="var(--color-border)"
            pickerFallback="#e2e8f0"
          />
          <ColorField
            label="Text color"
            value={value.style?.textColor}
            onChange={(next) => updateFooterStyle(value, onChange, { textColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "textColor")}
            placeholder="var(--color-text)"
            pickerFallback="#111827"
          />
          <ColorField
            label="Heading color"
            value={value.style?.headingColor}
            onChange={(next) => updateFooterStyle(value, onChange, { headingColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "headingColor")}
            placeholder="var(--color-text)"
            pickerFallback="#111827"
          />
          <ColorField
            label="Link color"
            value={value.style?.linkColor}
            onChange={(next) => updateFooterStyle(value, onChange, { linkColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "linkColor")}
            placeholder="var(--color-text)"
            pickerFallback="#2563eb"
          />
          <ColorField
            label="Legal text color"
            value={value.style?.legalTextColor}
            onChange={(next) => updateFooterStyle(value, onChange, { legalTextColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "legalTextColor")}
            placeholder="var(--color-text)"
            pickerFallback="#6b7280"
          />
          <ColorField
            label="Social icon color"
            value={value.style?.socialColor}
            onChange={(next) => updateFooterStyle(value, onChange, { socialColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "socialColor")}
            placeholder="var(--color-text)"
            pickerFallback="#111827"
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
        />
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Typography and link styling</p>
        <p className="text-xs text-muted-foreground">
          Footer link hover, active, underline, and typography controls live here. Container spacing
          and alignment stay in Advanced.
        </p>
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
          />
          <ColorField
            label="Link active color"
            value={value.style?.linkActiveColor}
            onChange={(next) => updateFooterStyle(value, onChange, { linkActiveColor: next })}
            onClear={() => clearFooterStyle(value, onChange, "linkActiveColor")}
            placeholder="var(--color-primary)"
            pickerFallback="#1d4ed8"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Slots overview and insertion hints</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            `column-1`, `column-2`, and `column-3` render inside the visible footer columns and move
            with those columns when reorder happens in the live editor.
          </li>
          <li>
            `bottom` renders in the lower legal/actions strip, or below the compact row in Minimal.
          </li>
          <li>Compose newsletter widgets through slots; Footer does not own submission routes.</li>
          <li>Use the Insert dialog on canvas to place widgets into those slots.</li>
        </ul>
      </div>
    </div>
  );
}

export function FooterAdvancedEditor({ value, onChange }: WidgetEditorProps<FooterData>) {
  return (
    <div className="space-y-5">
      <WidgetEditorSection
        id="footer.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Read-only footer structure and slot ownership overview."
      >
        <dl className="grid gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <dt className="font-medium text-foreground">Columns</dt>
            <dd>{value.columns?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Social links</dt>
            <dd>{value.social?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Legal row</dt>
            <dd>{value.legal?.enabled === false ? "Hidden" : "Visible"}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Back to top</dt>
            <dd>{value.backToTop?.enabled ? "Enabled" : "Disabled"}</dd>
          </div>
        </dl>
      </WidgetEditorSection>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Layout tokens</p>
        <p className="text-xs text-muted-foreground">
          Technical layout controls stay in Advanced. Footer keeps one control per line here so
          every token is labeled explicitly.
        </p>
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
          />
          <LabeledSelectField
            label="Legal row alignment"
            description="Controls where the lower copyright, legal links, and social actions sit."
            value={value.layout?.legalAlign ?? "right"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                legalAlign: next as NonNullable<FooterData["layout"]>["legalAlign"],
              })
            }
            options={alignOptions}
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
          />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border p-4 text-xs text-muted-foreground">
        Visibility, container tokens, block-level spacing, and background overrides are controlled
        in the global Advanced panel above this editor.
      </div>
    </div>
  );
}
