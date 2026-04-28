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
};

type ParentOption = {
  id: string;
  label: string;
};

type MenuItemFormProps = {
  value: MenuItemFormValue;
  pages: PageSummary[];
  parentOptions: ParentOption[];
  disabledParentIds?: Set<string>;
  errors?: { label?: string; link?: string };
  onChange: (next: MenuItemFormValue) => void;
};

export function MenuItemForm({
  value,
  pages,
  parentOptions,
  disabledParentIds,
  errors,
  onChange,
}: MenuItemFormProps) {
  const normalizedIcon = value.icon.trim();

  const handleLinkTypeChange = (next: "page" | "url") => {
    onChange({
      ...value,
      linkType: next,
      pageId: next === "page" ? value.pageId : "",
      href: next === "url" ? value.href : "",
    });
  };

  return (
    <form className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Navigation Label</label>
        <Input
          value={value.label}
          onChange={(event) => onChange({ ...value, label: event.target.value })}
          placeholder="Menu label"
        />
        {errors?.label ? (
          <p className="text-xs text-destructive">{errors.label}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Text displayed in the menu.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Link Type</label>
        <div className="flex gap-2 rounded-lg bg-muted p-1">
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
      </div>

      {value.linkType === "page" ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Page</label>
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
            <p className="text-xs text-muted-foreground">
              Choose an existing page to link.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-medium">URL Path</label>
          <Input
            value={value.href}
            onChange={(event) => onChange({ ...value, href: event.target.value })}
            placeholder="https://"
          />
          {errors?.link ? (
            <p className="text-xs text-destructive">{errors.link}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Use a full URL for external links.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Parent Item</label>
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
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Visibility</label>
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
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Badge Label</label>
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
        <p className="text-xs text-muted-foreground">
          Optional pill shown next to the menu label.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Badge Tone</label>
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
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
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
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Icon Name</label>
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
          Optional runtime icon token such as <code>sparkles</code>. Keep the
          token simple and lowercase; the active menu presenter decides which
          icon names it can render.
        </p>
        {normalizedIcon ? (
          <p className="text-xs text-muted-foreground">
            Current token: <code>{normalizedIcon}</code>
          </p>
        ) : null}
      </div>
    </form>
  );
}
