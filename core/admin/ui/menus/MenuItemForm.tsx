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
import type { PageSummary } from "@/services/pagesClient";
import {
  menuBadgeToneOptions,
  menuVisibilityOptions,
  type MenuItemBadgeTone,
  type MenuItemVariant,
  type MenuItemVisibility,
} from "../../../services/menus/menuItemSettings";

const NO_PAGES_VALUE = "no-pages";

export type MenuItemFormValue = {
  id: string;
  label: string;
  linkType: "page" | "url";
  pageId: string;
  href: string;
  parentId: string | null;
  visibility: MenuItemVisibility;
  badgeLabel: string;
  badgeTone: MenuItemBadgeTone;
  description: string;
  icon: string;
  // TASK-499-01: threaded fail-soft VALUES. The "Open in new tab" Switch lives
  // in `MenuItemInspector` (NOT here — keeps the `menu-item-form.test.tsx`
  // "no switch" lock green); `variant` is the "Display as" segmented control.
  openInNewTab?: boolean;
  variant?: MenuItemVariant;
};

type ParentOption = {
  id: string;
  label: string;
};

/**
 * TASK-499-01 §4: which field group the form renders.
 *  - `"all"` (default): every field, flat — the legacy drawer surface AND the
 *    `menu-item-form.test.tsx` contract. UNCHANGED.
 *  - `"primary"`: the prototype's default panel fields — Navigation Label + the
 *    link-type-aware Link control (page → picker + read-only resolved path;
 *    url → editable mono href). NO link-TYPE toggle, NO Visibility (the
 *    inspector wraps the Switch + Visibility around this group so the order
 *    reads Label → Link → Open-in-new-tab → Visibility like the prototype).
 *  - `"visibility"`: the Visibility select only.
 *  - `"advanced"`: the demoted controls the inspector collapses behind a
 *    default-closed "Advanced" disclosure — Link Type toggle, Parent, Display
 *    as, Badge label+tone, Description, Icon.
 */
export type MenuItemFormSection = "all" | "primary" | "visibility" | "advanced";

type MenuItemFormProps = {
  value: MenuItemFormValue;
  pages: PageSummary[];
  parentOptions: ParentOption[];
  disabledParentIds?: Set<string>;
  errors?: { label?: string; link?: string };
  onChange: (next: MenuItemFormValue) => void;
  section?: MenuItemFormSection;
};

/**
 * Soft inspector row (TASK-479-10-L02): ports the prototype's quiet label +
 * control stack so each field reads in the redesign language. Presentation
 * only — the wrapped controls keep their existing bindings and handlers.
 */
function InspectorRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function MenuItemForm({
  value,
  pages,
  parentOptions,
  disabledParentIds,
  errors,
  onChange,
  section = "all",
}: MenuItemFormProps) {
  const normalizedIcon = value.icon.trim();
  const resolvedPagePath =
    value.pageId && pages.find((page) => page.id === value.pageId)?.slug
      ? `/${pages.find((page) => page.id === value.pageId)?.slug}`
      : "";

  const handleLinkTypeChange = (next: "page" | "url") => {
    onChange({
      ...value,
      linkType: next,
      pageId: next === "page" ? value.pageId : "",
      href: next === "url" ? value.href : "",
    });
  };

  const labelField = (
    <InspectorRow label="Navigation Label">
      <Input
        value={value.label}
        onChange={(event) => onChange({ ...value, label: event.target.value })}
        placeholder="Menu label"
      />
      {errors?.label ? (
        <p className="text-xs text-destructive">{errors.label}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Text displayed in the menu.</p>
      )}
    </InspectorRow>
  );

  const linkTypeToggle = (
    <InspectorRow label="Link Type">
      <div className="flex gap-2 rounded-xl bg-muted p-1">
        <Button
          type="button"
          variant={value.linkType === "page" ? "secondary" : "ghost"}
          className="flex-1"
          onClick={() => handleLinkTypeChange("page")}
        >
          Page
        </Button>
        <Button
          type="button"
          variant={value.linkType === "url" ? "secondary" : "ghost"}
          className="flex-1"
          onClick={() => handleLinkTypeChange("url")}
        >
          Custom URL
        </Button>
      </div>
    </InspectorRow>
  );

  const pagePicker = (
    <InspectorRow label="Page">
      <Select
        value={value.pageId || ""}
        onValueChange={(next) => onChange({ ...value, pageId: next })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select page" />
        </SelectTrigger>
        <SelectContent>
          {pages.length === 0 ? (
            <SelectItem value={NO_PAGES_VALUE} disabled>
              No pages available
            </SelectItem>
          ) : null}
          {pages.map((page) => (
            <SelectItem key={page.id} value={page.id}>
              {page.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors?.link ? (
        <p className="text-xs text-destructive">{errors.link}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Choose an existing page to link.</p>
      )}
    </InspectorRow>
  );

  const urlField = (
    <InspectorRow label="URL Path">
      <Input
        value={value.href}
        onChange={(event) => onChange({ ...value, href: event.target.value })}
        placeholder="https://"
        className="font-mono text-xs"
      />
      {errors?.link ? (
        <p className="text-xs text-destructive">{errors.link}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Use a full URL for external links.</p>
      )}
    </InspectorRow>
  );

  // Read-only resolved page path — shown ONLY in the primary "link" group so a
  // page item surfaces its derived URL beside the picker WITHOUT an editable
  // href that would silently convert it to a url item (§4 LINK SOURCE-OF-TRUTH).
  const resolvedPageUrlField = (
    <InspectorRow label="URL">
      <Input
        value={resolvedPagePath}
        readOnly
        disabled
        placeholder="Resolved from the linked page"
        className="font-mono text-xs"
      />
    </InspectorRow>
  );

  const parentField = (
    <InspectorRow label="Parent Item">
      <Select
        value={value.parentId ?? "root"}
        onValueChange={(next) =>
          onChange({
            ...value,
            parentId: next === "root" ? null : next,
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select parent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="root">No Parent (Top Level)</SelectItem>
          {parentOptions.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              disabled={disabledParentIds?.has(option.id)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </InspectorRow>
  );

  const visibilityField = (
    <InspectorRow label="Visibility">
      <Select
        value={value.visibility}
        onValueChange={(next) =>
          onChange({
            ...value,
            visibility: next as MenuItemVisibility,
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Visibility rule" />
        </SelectTrigger>
        <SelectContent>
          {menuVisibilityOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option === "all"
                ? "Show to everyone"
                : option === "logged_in"
                  ? "Only logged-in users"
                  : "Only logged-out users"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Controls when this link should appear in navigation.
      </p>
    </InspectorRow>
  );

  const displayAsField = (
    <InspectorRow label="Display as">
      <div className="flex gap-2 rounded-xl bg-muted p-1">
        <Button
          type="button"
          variant={(value.variant ?? "link") === "link" ? "secondary" : "ghost"}
          className="flex-1"
          onClick={() => onChange({ ...value, variant: "link" })}
        >
          Link
        </Button>
        <Button
          type="button"
          variant={(value.variant ?? "link") === "button" ? "secondary" : "ghost"}
          className="flex-1"
          onClick={() => onChange({ ...value, variant: "button" })}
        >
          Button
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Render this item as a plain link or a call-to-action button in the theme.
      </p>
    </InspectorRow>
  );

  const badgeLabelField = (
    <InspectorRow label="Badge Label">
      <Input
        value={value.badgeLabel}
        onChange={(event) =>
          onChange({
            ...value,
            badgeLabel: event.target.value,
          })
        }
        placeholder="New"
      />
      <p className="text-xs text-muted-foreground">Optional pill shown next to the menu label.</p>
    </InspectorRow>
  );

  const badgeToneField = (
    <InspectorRow label="Badge Tone">
      <Select
        value={value.badgeTone}
        onValueChange={(next) =>
          onChange({
            ...value,
            badgeTone: next as MenuItemBadgeTone,
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Badge tone" />
        </SelectTrigger>
        <SelectContent>
          {menuBadgeToneOptions.map((tone) => (
            <SelectItem key={tone} value={tone}>
              {tone}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </InspectorRow>
  );

  const descriptionField = (
    <InspectorRow label="Description">
      <Input
        value={value.description}
        onChange={(event) =>
          onChange({
            ...value,
            description: event.target.value,
          })
        }
        placeholder="Optional helper text"
      />
    </InspectorRow>
  );

  const iconField = (
    <InspectorRow label="Icon Name">
      <Input
        value={value.icon}
        onChange={(event) =>
          onChange({
            ...value,
            icon: event.target.value,
          })
        }
        placeholder="e.g. sparkles"
      />
      <p className="text-xs text-muted-foreground">
        Optional runtime icon token such as <code>sparkles</code>. Keep the token simple and
        lowercase; the active menu presenter decides which icon names it can render.
      </p>
      {normalizedIcon ? (
        <p className="text-xs text-muted-foreground">
          Current token: <code>{normalizedIcon}</code>
        </p>
      ) : null}
    </InspectorRow>
  );

  if (section === "primary") {
    return (
      <div className="space-y-4">
        {labelField}
        {value.linkType === "page" ? (
          <>
            {pagePicker}
            {resolvedPageUrlField}
          </>
        ) : (
          urlField
        )}
      </div>
    );
  }

  if (section === "visibility") {
    return <div className="space-y-4">{visibilityField}</div>;
  }

  if (section === "advanced") {
    return (
      <div className="space-y-4">
        {linkTypeToggle}
        {parentField}
        {displayAsField}
        {badgeLabelField}
        {badgeToneField}
        {descriptionField}
        {iconField}
      </div>
    );
  }

  return (
    <form className="space-y-4">
      {labelField}
      {linkTypeToggle}
      {value.linkType === "page" ? pagePicker : urlField}
      {parentField}
      {visibilityField}
      {displayAsField}
      {badgeLabelField}
      {badgeToneField}
      {descriptionField}
      {iconField}
    </form>
  );
}
