import type { ReactNode } from "react";

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

import {
  footerSocialTypes,
  resolveFooterColumnCount,
  resolveFooterColumnsForVariant,
  resolveFooterSocialLabel,
  resolveFooterSocialType,
  type FooterColumn,
  type FooterData,
  type FooterLink,
  type FooterLinkTarget,
  type FooterSocial,
} from "../../../../widgets/core/footer";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { SharedColorControl } from "./SharedColorControl";

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
  href: "https://",
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
  const base = links[linkIndex] ?? { label: "Link", href: "#", target: "_self" };
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
  links.push({ label: `Link ${links.length + 1}`, href: "#", target: "_self" });
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
      <FieldLabel label="Logo URL">
        <Input
          value={value.brand?.logoUrl ?? ""}
          onChange={(event) => updateFooterBrand(value, onChange, { logoUrl: event.target.value })}
          placeholder="/media/footer-logo.svg"
        />
      </FieldLabel>
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
          <FieldLabel label="Privacy URL">
            <Input
              value={value.legal?.privacy ?? ""}
              onChange={(event) =>
                updateFooterLegal(value, onChange, { privacy: event.target.value })
              }
              placeholder="/privacy"
            />
          </FieldLabel>
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
          <FieldLabel label="Terms URL">
            <Input
              value={value.legal?.terms ?? ""}
              onChange={(event) =>
                updateFooterLegal(value, onChange, { terms: event.target.value })
              }
              placeholder="/terms"
            />
          </FieldLabel>
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
              <FieldLabel label={`Column ${index + 1} first link URL`}>
                <Input
                  value={firstLink.href}
                  onChange={(event) =>
                    updateColumnLink(value, onChange, variant, index, 0, {
                      href: event.target.value,
                    })
                  }
                  placeholder="First link URL"
                />
              </FieldLabel>
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
        External social links open in a new tab automatically. Relative or hash URLs stay in the
        current tab.
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
                onValueChange={(next) =>
                  updateSocial(index, {
                    type: next,
                    label:
                      next === "custom"
                        ? resolveFooterSocialLabel(item.type, item.label)
                        : undefined,
                  })
                }
                options={socialTypeOptions}
              />
              <FieldLabel label="URL">
                <Input
                  value={item.href}
                  onChange={(event) => updateSocial(index, { href: event.target.value })}
                  placeholder="https://example.com/profile"
                />
              </FieldLabel>
            </div>
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
  );
}

export function FooterVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<FooterData>) {
  const visibleCount = resolveFooterColumnCount(variant);
  const visibleColumns = resolveFooterColumnsForVariant(value.columns, variant).slice(
    0,
    visibleCount
  );

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
          Link order is editable here. Column order stays slot-bound for now so nested slot content
          does not silently detach from `column-1`, `column-2`, or `column-3`.
        </p>
        <div className="space-y-4">
          {visibleColumns.map((column, columnIndex) => (
            <div key={`${column.title}-${columnIndex}`} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Column {columnIndex + 1}</p>
                <p className="text-xs text-muted-foreground">
                  Hidden columns remain preserved when the active variant shows fewer columns.
                </p>
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
                      <FieldLabel label="Link URL">
                        <Input
                          value={link.href}
                          onChange={(event) =>
                            updateColumnLink(value, onChange, variant, columnIndex, linkIndex, {
                              href: event.target.value,
                            })
                          }
                          placeholder="/about"
                        />
                      </FieldLabel>
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
          <li>`column-1`, `column-2`, and `column-3` render inside the visible footer columns.</li>
          <li>
            `bottom` renders in the lower legal/actions strip, or below the compact row in Minimal.
          </li>
          <li>Use the Insert dialog on canvas to place widgets into those slots.</li>
        </ul>
      </div>
    </div>
  );
}

export function FooterAdvancedEditor({ value, onChange }: WidgetEditorProps<FooterData>) {
  return (
    <div className="space-y-5">
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
