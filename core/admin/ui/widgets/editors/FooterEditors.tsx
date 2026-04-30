import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  resolveFooterColumnCount,
  resolveFooterColumnsForVariant,
  type FooterColumn,
  type FooterData,
  type FooterSocial,
} from "../../../../widgets/core/footer";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";

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

const socialTypeOptions = ["linkedin", "twitter", "github", "youtube", "facebook", "instagram"];

const emptySocialLink: FooterSocial = {
  type: "linkedin",
  href: "https://",
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
  patch: Partial<{ label: string; href: string }>
) => {
  const columns = resolveEditableFooterColumns(value, variant);
  const nextColumns = [...columns];
  const target = nextColumns[columnIndex];
  const links = Array.isArray(target.links) ? [...target.links] : [];
  const base = links[linkIndex] ?? { label: "Link", href: "#" };
  links[linkIndex] = {
    label: patch.label ?? base.label,
    href: patch.href ?? base.href,
  };
  nextColumns[columnIndex] = { ...target, links };
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
  links.push({ label: `Link ${links.length + 1}`, href: "#" });
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

function FooterVariantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Footer variant</p>
      <Select value={value} onValueChange={(next) => onChange?.(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose variant" />
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
      {visibleColumns.map((column, index) => {
        const firstLink = column.links[0] ?? { label: "", href: "" };
        return (
          <div key={`${column.title}-${index}`} className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Column {index + 1}
            </p>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Column {index + 1} title</span>
              <Input
                value={column.title}
                onChange={(event) =>
                  updateColumn(value, onChange, variant, index, {
                    title: event.target.value,
                  })
                }
                placeholder={`Column ${index + 1} title`}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">
                  Column {index + 1} first link label
                </span>
                <Input
                  value={firstLink.label}
                  onChange={(event) =>
                    updateColumnLink(value, onChange, variant, index, 0, {
                      label: event.target.value,
                    })
                  }
                  placeholder="First link label"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">
                  Column {index + 1} first link URL
                </span>
                <Input
                  value={firstLink.href}
                  onChange={(event) =>
                    updateColumnLink(value, onChange, variant, index, 0, {
                      href: event.target.value,
                    })
                  }
                  placeholder="First link URL"
                />
              </label>
            </div>
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
      next[index] = {
        type: patch.type ?? base.type,
        href: patch.href ?? base.href,
      };
      return next;
    });
  };

  const addSocial = () => {
    updateFooterSocial(value, onChange, (social) => {
      if (typeof limit === "number" && social.length >= limit) return social;
      return [...social, emptySocialLink];
    });
  };

  const removeSocial = (index: number) => {
    updateFooterSocial(value, onChange, (social) =>
      social.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  return (
    <div className="space-y-2">
      {visibleItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">No social links configured.</p>
      ) : null}
      {visibleItems.map((item, index) => (
        <div key={`${item.type}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-foreground">Social {index + 1} platform</span>
            <Select value={item.type} onValueChange={(next) => updateSocial(index, { type: next })}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {socialTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-foreground">Social {index + 1} URL</span>
            <Input
              value={item.href}
              onChange={(event) => updateSocial(index, { href: event.target.value })}
              placeholder="Social URL"
            />
          </label>
          <Button type="button" size="sm" variant="ghost" onClick={() => removeSocial(index)}>
            Remove
          </Button>
        </div>
      ))}
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

function LegalEditor({
  value,
  onChange,
}: {
  value: FooterData;
  onChange: (next: FooterData) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        value={value.legal?.copyright ?? ""}
        onChange={(event) => updateFooterLegal(value, onChange, { copyright: event.target.value })}
        placeholder="© 2026 Company name"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={value.legal?.privacy ?? ""}
          onChange={(event) => updateFooterLegal(value, onChange, { privacy: event.target.value })}
          placeholder="Privacy URL"
        />
        <Input
          value={value.legal?.terms ?? ""}
          onChange={(event) => updateFooterLegal(value, onChange, { terms: event.target.value })}
          placeholder="Terms URL"
        />
      </div>
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
          Configure titles and first links. Full link editing is available in Visual mode.
        </p>
        <ColumnsQuickSetup value={value} onChange={onChange} variant={variant} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Legal basics</p>
        <LegalEditor value={value} onChange={onChange} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Social basics</p>
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
          Runtime columns: {visibleCount}. Variant controls are owned by Footer Visual mode.
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Columns and links</p>
        <div className="space-y-4">
          {visibleColumns.map((column, columnIndex) => (
            <div key={`${column.title}-${columnIndex}`} className="space-y-2 rounded-lg border p-3">
              <Input
                value={column.title}
                onChange={(event) =>
                  updateColumn(value, onChange, variant, columnIndex, {
                    title: event.target.value,
                  })
                }
                placeholder={`Column ${columnIndex + 1} title`}
              />
              <div className="space-y-2">
                {column.links.map((link, linkIndex) => (
                  <div
                    key={`${link.label}-${linkIndex}`}
                    className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
                  >
                    <Input
                      value={link.label}
                      onChange={(event) =>
                        updateColumnLink(value, onChange, variant, columnIndex, linkIndex, {
                          label: event.target.value,
                        })
                      }
                      placeholder="Label"
                    />
                    <Input
                      value={link.href}
                      onChange={(event) =>
                        updateColumnLink(value, onChange, variant, columnIndex, linkIndex, {
                          href: event.target.value,
                        })
                      }
                      placeholder="URL"
                    />
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
        <p className="text-sm font-semibold">Legal strip</p>
        <LegalEditor value={value} onChange={onChange} />
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Social links and icon style</p>
        <SocialLinksEditor value={value} onChange={onChange} />
        <Input
          value={value.style?.socialColor ?? ""}
          onChange={(event) =>
            updateFooterStyle(value, onChange, { socialColor: event.target.value })
          }
          placeholder="Social color (e.g. #0f172a)"
        />
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Colors and borders</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <ClearableFieldHeader
              label="Surface color"
              value={value.style?.surfaceColor}
              onClear={() => clearFooterStyle(value, onChange, "surfaceColor")}
            />
            <Input
              value={value.style?.surfaceColor ?? ""}
              onChange={(event) =>
                updateFooterStyle(value, onChange, { surfaceColor: event.target.value })
              }
              placeholder="Surface color"
            />
          </div>
          <div className="space-y-1.5">
            <ClearableFieldHeader
              label="Border color"
              value={value.style?.borderColor}
              onClear={() => clearFooterStyle(value, onChange, "borderColor")}
            />
            <Input
              value={value.style?.borderColor ?? ""}
              onChange={(event) =>
                updateFooterStyle(value, onChange, { borderColor: event.target.value })
              }
              placeholder="Border color"
            />
          </div>
          <Input
            value={value.style?.textColor ?? ""}
            onChange={(event) =>
              updateFooterStyle(value, onChange, { textColor: event.target.value })
            }
            placeholder="Text color"
          />
          <Input
            value={value.style?.linkColor ?? ""}
            onChange={(event) =>
              updateFooterStyle(value, onChange, { linkColor: event.target.value })
            }
            placeholder="Link color"
          />
        </div>
        <Select
          value={value.style?.borderTopWidth ?? "1"}
          onValueChange={(next) =>
            updateFooterStyle(value, onChange, {
              borderTopWidth: next as NonNullable<FooterData["style"]>["borderTopWidth"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Top border width" />
          </SelectTrigger>
          <SelectContent>
            {borderTopWidthOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Typography and spacing</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={value.style?.headingColor ?? ""}
            onChange={(event) =>
              updateFooterStyle(value, onChange, { headingColor: event.target.value })
            }
            placeholder="Heading color"
          />
          <Input
            value={value.style?.legalTextColor ?? ""}
            onChange={(event) =>
              updateFooterStyle(value, onChange, { legalTextColor: event.target.value })
            }
            placeholder="Legal text color"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Select
            value={value.style?.fontSize ?? "sm"}
            onValueChange={(next) =>
              updateFooterStyle(value, onChange, {
                fontSize: next as NonNullable<FooterData["style"]>["fontSize"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Font size" />
            </SelectTrigger>
            <SelectContent>
              {fontSizeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.style?.headingTransform ?? "uppercase"}
            onValueChange={(next) =>
              updateFooterStyle(value, onChange, {
                headingTransform: next as NonNullable<FooterData["style"]>["headingTransform"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Heading transform" />
            </SelectTrigger>
            <SelectContent>
              {headingTransformOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.layout?.sectionPaddingY ?? "10"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                sectionPaddingY: next as NonNullable<FooterData["layout"]>["sectionPaddingY"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Section spacing" />
            </SelectTrigger>
            <SelectContent>
              {sectionPaddingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Slots overview and insertion hints</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>`column-1`, `column-2`, `column-3` render inside footer columns.</li>
          <li>`bottom` renders in the lower legal/actions strip.</li>
          <li>Use Insert dialog on canvas to place widgets into those slots.</li>
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
          Technical layout controls. Content and style editing stays in Visual mode.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={value.layout?.align ?? "left"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                align: next as NonNullable<FooterData["layout"]>["align"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Columns alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.layout?.legalAlign ?? "right"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                legalAlign: next as NonNullable<FooterData["layout"]>["legalAlign"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Legal row alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.layout?.maxWidth ?? "6xl"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                maxWidth: next as NonNullable<FooterData["layout"]>["maxWidth"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Max width" />
            </SelectTrigger>
            <SelectContent>
              {maxWidthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.layout?.columnGap ?? "6"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                columnGap: next as NonNullable<FooterData["layout"]>["columnGap"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Column gap" />
            </SelectTrigger>
            <SelectContent>
              {columnGapOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.layout?.sectionPaddingY ?? "10"}
            onValueChange={(next) =>
              updateFooterLayout(value, onChange, {
                sectionPaddingY: next as NonNullable<FooterData["layout"]>["sectionPaddingY"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Section padding" />
            </SelectTrigger>
            <SelectContent>
              {sectionPaddingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border p-4 text-xs text-muted-foreground">
        Visibility, container tokens, block-level spacing, and background overrides are controlled
        in the global Advanced panel above this editor.
      </div>
    </div>
  );
}
