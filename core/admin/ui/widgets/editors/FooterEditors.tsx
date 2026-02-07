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

const variantOptions = [
  { id: "columns-2", label: "Columns 2" },
  { id: "columns-3", label: "Columns 3" },
  { id: "minimal", label: "Minimal" },
];

const emptySocialLink: FooterSocial = {
  type: "social",
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

const updateFooterSocial = (
  value: FooterData,
  onChange: (next: FooterData) => void,
  updater: (items: FooterSocial[]) => FooterSocial[]
) => {
  const next = updater(Array.isArray(value.social) ? value.social : []);
  onChange({ ...value, social: next });
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
      <p className="text-sm font-medium">Footer layout</p>
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

export function FooterWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<FooterData>) {
  const visibleCount = resolveFooterColumnCount(variant);
  const columns = resolveEditableFooterColumns(value, variant);
  const visibleColumns = columns.slice(0, visibleCount);
  const visibleSocial = (Array.isArray(value.social) ? value.social : []).slice(0, 2);

  const updateVisibleColumn = (index: number, patch: Partial<FooterColumn>) => {
    const nextColumns = [...columns];
    nextColumns[index] = { ...nextColumns[index], ...patch };
    onChange({ ...value, columns: nextColumns });
  };

  const updateFirstLink = (
    columnIndex: number,
    patch: Partial<{ label: string; href: string }>
  ) => {
    const nextColumns = [...columns];
    const target = nextColumns[columnIndex];
    const links = Array.isArray(target.links) ? [...target.links] : [];
    const base = links[0] ?? { label: "Link", href: "#" };
    links[0] = {
      label: patch.label ?? base.label,
      href: patch.href ?? base.href,
    };
    nextColumns[columnIndex] = { ...target, links };
    onChange({ ...value, columns: nextColumns });
  };

  const updateSocial = (index: number, patch: Partial<FooterSocial>) => {
    const social = Array.isArray(value.social) ? [...value.social] : [];
    const base = social[index] ?? emptySocialLink;
    social[index] = {
      type: patch.type ?? base.type,
      href: patch.href ?? base.href,
    };
    onChange({ ...value, social });
  };

  const addWizardSocial = () => {
    updateFooterSocial(value, onChange, (items) =>
      items.length >= 2 ? items : [...items, emptySocialLink]
    );
  };

  const removeWizardSocial = (index: number) => {
    updateFooterSocial(value, onChange, (items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-5">
      <FooterVariantSelect value={variant} onChange={onVariantChange} />

      <div className="space-y-3">
        <p className="text-sm font-medium">Column quick setup</p>
        <p className="text-xs text-muted-foreground">
          Configure column titles and first links. Full link management is in Advanced.
        </p>
        <div className="space-y-4">
          {visibleColumns.map((column, index) => {
            const firstLink = column.links[0] ?? { label: "", href: "" };
            return (
              <div key={`${column.title}-${index}`} className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Column {index + 1}
                </p>
                <Input
                  value={column.title}
                  onChange={(event) => updateVisibleColumn(index, { title: event.target.value })}
                  placeholder={`Column ${index + 1} title`}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={firstLink.label}
                    onChange={(event) =>
                      updateFirstLink(index, { label: event.target.value })
                    }
                    placeholder="First link label"
                  />
                  <Input
                    value={firstLink.href}
                    onChange={(event) =>
                      updateFirstLink(index, { href: event.target.value })
                    }
                    placeholder="First link URL"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Legal basics</p>
        <div className="space-y-2">
          <Input
            value={value.legal?.copyright ?? ""}
            onChange={(event) =>
              updateFooterLegal(value, onChange, { copyright: event.target.value })
            }
            placeholder="© 2026 Company name"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={value.legal?.privacy ?? ""}
              onChange={(event) =>
                updateFooterLegal(value, onChange, { privacy: event.target.value })
              }
              placeholder="Privacy URL"
            />
            <Input
              value={value.legal?.terms ?? ""}
              onChange={(event) =>
                updateFooterLegal(value, onChange, { terms: event.target.value })
              }
              placeholder="Terms URL"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Social basics</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addWizardSocial}
            disabled={visibleSocial.length >= 2}
          >
            Add social
          </Button>
        </div>
        <div className="space-y-2">
          {visibleSocial.map((item, index) => (
            <div key={`${item.type}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input
                value={item.type}
                onChange={(event) => updateSocial(index, { type: event.target.value })}
                placeholder="Type (e.g. linkedin)"
              />
              <Input
                value={item.href}
                onChange={(event) => updateSocial(index, { href: event.target.value })}
                placeholder="Social URL"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeWizardSocial(index)}
              >
                Remove
              </Button>
            </div>
          ))}
          {visibleSocial.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Add at least one social link for quick footer setup.
            </p>
          ) : null}
        </div>
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
  const visibleColumns = resolveFooterColumnsForVariant(value.columns, variant);
  const social = Array.isArray(value.social) ? value.social : [];

  const updateSocial = (index: number, patch: Partial<FooterSocial>) => {
    updateFooterSocial(value, onChange, (items) => {
      const next = [...items];
      const base = next[index] ?? emptySocialLink;
      next[index] = {
        type: patch.type ?? base.type,
        href: patch.href ?? base.href,
      };
      return next;
    });
  };

  const addVisualSocial = () => {
    updateFooterSocial(value, onChange, (items) => [...items, emptySocialLink]);
  };

  const removeVisualSocial = (index: number) => {
    updateFooterSocial(value, onChange, (items) =>
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Variant and structure</p>
        <FooterVariantSelect value={variant} onChange={onVariantChange} />
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Runtime columns: {visibleCount}.  
          Use Advanced mode for full per-column link editing.
        </div>
        <div className="space-y-2">
          {visibleColumns.map((column, index) => (
            <div
              key={`${column.title}-${index}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{column.title}</span>
              <span className="text-muted-foreground">
                {column.links.length} {column.links.length === 1 ? "link" : "links"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Legal strip</p>
        <Input
          value={value.legal?.copyright ?? ""}
          onChange={(event) =>
            updateFooterLegal(value, onChange, { copyright: event.target.value })
          }
          placeholder="© 2026 Company name"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={value.legal?.privacy ?? ""}
            onChange={(event) =>
              updateFooterLegal(value, onChange, { privacy: event.target.value })
            }
            placeholder="Privacy URL"
          />
          <Input
            value={value.legal?.terms ?? ""}
            onChange={(event) =>
              updateFooterLegal(value, onChange, { terms: event.target.value })
            }
            placeholder="Terms URL"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Social links</p>
          <Button type="button" size="sm" variant="outline" onClick={addVisualSocial}>
            Add social
          </Button>
        </div>
        {social.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No social links configured yet.
          </p>
        ) : null}
        <div className="space-y-2">
          {social.map((item, index) => (
            <div key={`${item.type}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input
                value={item.type}
                onChange={(event) => updateSocial(index, { type: event.target.value })}
                placeholder="Type"
              />
              <Input
                value={item.href}
                onChange={(event) => updateSocial(index, { href: event.target.value })}
                placeholder="URL"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeVisualSocial(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FooterAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<FooterData>) {
  const visibleCount = resolveFooterColumnCount(variant);
  const columns = resolveEditableFooterColumns(value, variant);
  const visibleColumns = columns.slice(0, visibleCount);
  const social = Array.isArray(value.social) ? value.social : [];

  const updateColumn = (index: number, patch: Partial<FooterColumn>) => {
    const nextColumns = [...columns];
    nextColumns[index] = { ...nextColumns[index], ...patch };
    onChange({ ...value, columns: nextColumns });
  };

  const updateColumnLink = (
    columnIndex: number,
    linkIndex: number,
    patch: Partial<{ label: string; href: string }>
  ) => {
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

  const addColumnLink = (columnIndex: number) => {
    const nextColumns = [...columns];
    const target = nextColumns[columnIndex];
    const links = Array.isArray(target.links) ? [...target.links] : [];
    links.push({ label: `Link ${links.length + 1}`, href: "#" });
    nextColumns[columnIndex] = { ...target, links };
    onChange({ ...value, columns: nextColumns });
  };

  const removeColumnLink = (columnIndex: number, linkIndex: number) => {
    const nextColumns = [...columns];
    const target = nextColumns[columnIndex];
    const links = Array.isArray(target.links) ? [...target.links] : [];
    nextColumns[columnIndex] = {
      ...target,
      links: links.filter((_, index) => index !== linkIndex),
    };
    onChange({ ...value, columns: nextColumns });
  };

  const updateSocial = (index: number, patch: Partial<FooterSocial>) => {
    updateFooterSocial(value, onChange, (items) => {
      const next = [...items];
      const base = next[index] ?? emptySocialLink;
      next[index] = {
        type: patch.type ?? base.type,
        href: patch.href ?? base.href,
      };
      return next;
    });
  };

  const addSocial = () => {
    updateFooterSocial(value, onChange, (items) => [...items, emptySocialLink]);
  };

  const removeSocial = (index: number) => {
    updateFooterSocial(value, onChange, (items) =>
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Columns and links</p>
        <div className="space-y-4">
          {visibleColumns.map((column, columnIndex) => (
            <div key={`${column.title}-${columnIndex}`} className="space-y-2 rounded-lg border p-3">
              <Input
                value={column.title}
                onChange={(event) => updateColumn(columnIndex, { title: event.target.value })}
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
                        updateColumnLink(columnIndex, linkIndex, {
                          label: event.target.value,
                        })
                      }
                      placeholder="Label"
                    />
                    <Input
                      value={link.href}
                      onChange={(event) =>
                        updateColumnLink(columnIndex, linkIndex, {
                          href: event.target.value,
                        })
                      }
                      placeholder="URL"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeColumnLink(columnIndex, linkIndex)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addColumnLink(columnIndex)}
                >
                  Add link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Social links</p>
        <div className="space-y-2">
          {social.map((item, index) => (
            <div key={`${item.type}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input
                value={item.type}
                onChange={(event) => updateSocial(index, { type: event.target.value })}
                placeholder="Type"
              />
              <Input
                value={item.href}
                onChange={(event) => updateSocial(index, { href: event.target.value })}
                placeholder="URL"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeSocial(index)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addSocial}>
            Add social
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Legal strip</p>
        <Input
          value={value.legal?.copyright ?? ""}
          onChange={(event) =>
            updateFooterLegal(value, onChange, { copyright: event.target.value })
          }
          placeholder="© 2026 Company name"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={value.legal?.privacy ?? ""}
            onChange={(event) =>
              updateFooterLegal(value, onChange, { privacy: event.target.value })
            }
            placeholder="Privacy URL"
          />
          <Input
            value={value.legal?.terms ?? ""}
            onChange={(event) =>
              updateFooterLegal(value, onChange, { terms: event.target.value })
            }
            placeholder="Terms URL"
          />
        </div>
      </div>
    </div>
  );
}
