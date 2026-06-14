import { PanelsTopLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiClientError } from "@/services/apiClient";
import type { MenuSummary } from "@/services/menusClient";
import type { PageTemplateSummary } from "@/services/pageTemplatesClient";
import { AdminLink } from "@/ui/shared/AdminLink";

/**
 * "Site shell" card (TASK-455): picks the published navigation menu and the
 * published footer page-template rendered around every public Page v2 page.
 * Values write through the existing settings PATCH route
 * (`site.navigationMenuId` / `site.footerTemplateId`). Presentational only;
 * hosted by the Menus-surface `SiteShellDialog` since TASK-458-01 (the
 * Settings page no longer mounts it).
 */

const NONE_OPTION_VALUE = "none";

export type SiteShellPickerOption = {
  value: string;
  label: string;
  published: boolean;
};

export type SiteShellFieldErrors = {
  navigationMenuId?: string | null;
  footerTemplateId?: string | null;
};

export type SiteShellValues = {
  navigationMenuId: string | null;
  footerTemplateId: string | null;
};

/**
 * Published records are first-class options. A currently selected but
 * unpublished record stays listed (marked "not published — hidden on site")
 * so an existing choice never disappears from its own picker; draft records
 * are otherwise excluded because they would not render publicly anyway.
 */
export const buildSiteShellMenuOptions = (
  menus: MenuSummary[],
  currentId: string | null
): SiteShellPickerOption[] => {
  const options: SiteShellPickerOption[] = menus
    .filter((menu) => menu.status === "published")
    .map((menu) => ({ value: menu.id, label: menu.name, published: true }));

  if (currentId && !options.some((option) => option.value === currentId)) {
    const selected = menus.find((menu) => menu.id === currentId);
    options.push({
      value: currentId,
      label: selected ? selected.name : "Unknown menu",
      published: false,
    });
  }

  return options;
};

export const buildSiteShellTemplateOptions = (
  templates: PageTemplateSummary[],
  currentId: string | null
): SiteShellPickerOption[] => {
  const options: SiteShellPickerOption[] = templates
    .filter((template) => template.status === "published")
    .map((template) => ({ value: template.id, label: template.name, published: true }));

  if (currentId && !options.some((option) => option.value === currentId)) {
    const selected = templates.find((template) => template.id === currentId);
    options.push({
      value: currentId,
      label: selected ? selected.name : "Unknown template",
      published: false,
    });
  }

  return options;
};

/**
 * Maps the machine-readable `site_shell_*` errors from the settings PATCH
 * route onto the picker that caused them; unrelated errors map to no inline
 * field error (the page-level alert handles them).
 */
export const resolveSiteShellFieldErrors = (error: unknown): SiteShellFieldErrors => {
  if (!isApiClientError(error)) return {};
  if (error.code === "site_shell_menu_not_found") {
    return { navigationMenuId: "This menu no longer exists. Pick another menu or None." };
  }
  if (error.code === "site_shell_template_not_found") {
    return { footerTemplateId: "This template no longer exists. Pick another template or None." };
  }
  return {};
};

const toSelectValue = (value: string | null) => value ?? NONE_OPTION_VALUE;

const fromSelectValue = (value: string) => (value === NONE_OPTION_VALUE ? null : value);

const optionLabel = (option: SiteShellPickerOption) =>
  option.published ? option.label : `${option.label} (not published — hidden on site)`;

type SiteShellPickerProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string | null;
  options: SiteShellPickerOption[];
  error?: string | null;
  disabled?: boolean;
  onChange: (next: string | null) => void;
};

const SiteShellPicker = ({
  id,
  label,
  placeholder,
  value,
  options,
  error,
  disabled,
  onChange,
}: SiteShellPickerProps) => (
  <div className="space-y-2" data-site-shell-field={id}>
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </label>
    <Select
      value={toSelectValue(value)}
      onValueChange={(next) => onChange(fromSelectValue(next))}
      disabled={disabled}
    >
      <SelectTrigger className="w-full" aria-invalid={error ? true : undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_OPTION_VALUE}>None</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {optionLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error ? (
      <p className="text-xs text-destructive" data-site-shell-error={id}>
        {error}
      </p>
    ) : null}
  </div>
);

export type SiteShellCardProps = {
  values: SiteShellValues;
  menus: MenuSummary[];
  templates: PageTemplateSummary[];
  errors?: SiteShellFieldErrors;
  disabled?: boolean;
  onChange: (next: SiteShellValues) => void;
};

export function SiteShellCard({
  values,
  menus,
  templates,
  errors,
  disabled,
  onChange,
}: SiteShellCardProps) {
  const menuOptions = buildSiteShellMenuOptions(menus, values.navigationMenuId);
  const templateOptions = buildSiteShellTemplateOptions(templates, values.footerTemplateId);

  return (
    <Card className="border-border/60" data-site-shell-card="true">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PanelsTopLeft className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Site shell</CardTitle>
            <CardDescription>
              Global navigation menu and footer template rendered on every public page.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <SiteShellPicker
            id="navigation-menu"
            label="Navigation menu"
            placeholder="Select navigation menu"
            value={values.navigationMenuId}
            options={menuOptions}
            error={errors?.navigationMenuId}
            disabled={disabled}
            onChange={(next) => onChange({ ...values, navigationMenuId: next })}
          />
          <SiteShellPicker
            id="footer-template"
            label="Footer template"
            placeholder="Select footer template"
            value={values.footerTemplateId}
            options={templateOptions}
            error={errors?.footerTemplateId}
            disabled={disabled}
            onChange={(next) => onChange({ ...values, footerTemplateId: next })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Only published menus and published page templates render publicly. Unpublishing or
          deleting the selected record hides that part of the shell without breaking the site.
        </p>
        {menuOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            No published menus yet. Create and publish one in
            <AdminLink
              className="ml-1 text-primary underline-offset-4 hover:underline"
              href="/admin/menus"
            >
              Menus
            </AdminLink>
            .
          </div>
        ) : null}
        {templateOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            No published page templates yet. Create and publish one in
            <AdminLink
              className="ml-1 text-primary underline-offset-4 hover:underline"
              href="/admin/advanced/page-templates"
            >
              Page Templates
            </AdminLink>
            .
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
