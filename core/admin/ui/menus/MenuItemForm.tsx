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

const NO_PAGES_VALUE = "no-pages";

export type MenuItemFormValue = {
  id: string;
  label: string;
  linkType: "page" | "url";
  pageId: string;
  href: string;
  parentId: string | null;
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
          <p className="text-xs text-rose-500">{errors.label}</p>
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
            <p className="text-xs text-rose-500">{errors.link}</p>
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
            <p className="text-xs text-rose-500">{errors.link}</p>
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
    </form>
  );
}
