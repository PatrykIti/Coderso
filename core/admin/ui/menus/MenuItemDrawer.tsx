import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { MenuItemRecord } from "@/services/menusClient";
import type { PageSummary } from "@/services/pagesClient";
import {
  MenuItemForm,
  type MenuItemFormValue,
} from "@/ui/menus/MenuItemForm";

export type MenuItemDraft = MenuItemRecord & {
  linkType: "page" | "url";
  pageId: string;
  href: string;
};

type MenuItemDrawerProps = {
  item: MenuItemDraft | null;
  pages: PageSummary[];
  parentOptions: Array<{ id: string; label: string }>;
  disabledParentIds?: Set<string>;
  onClose: () => void;
  onSave: (item: MenuItemDraft) => void;
  onDelete: (item: MenuItemDraft) => void;
};

const toFormValue = (item: MenuItemDraft | null): MenuItemFormValue => {
  if (!item) {
    return {
      id: "",
      label: "",
      linkType: "page",
      pageId: "",
      href: "",
      parentId: null,
    };
  }

  return {
    id: item.id,
    label: item.label,
    linkType: item.linkType,
    pageId: item.pageId ?? "",
    href: item.href ?? "",
    parentId: item.parentId ?? null,
  };
};

function MenuItemDrawerContent({
  item,
  pages,
  parentOptions,
  disabledParentIds,
  onClose,
  onSave,
  onDelete,
}: MenuItemDrawerProps) {
  const [draft, setDraft] = useState<MenuItemFormValue>(() => toFormValue(item));
  const [errors, setErrors] = useState<{ label?: string; link?: string } | null>(
    null
  );

  const isEditing = Boolean(item?.id);

  const canDelete = Boolean(item?.id);

  const title = item?.id ? "Edit Menu Item" : "Add Menu Item";

  const validate = () => {
    const nextErrors: { label?: string; link?: string } = {};
    if (!draft.label.trim()) {
      nextErrors.label = "Navigation label is required.";
    }
    if (draft.linkType === "page") {
      if (!draft.pageId) {
        nextErrors.link = "Select a page to link.";
      }
    } else if (!draft.href.trim()) {
      nextErrors.link = "URL is required for custom links.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!item) return;
    if (!validate()) return;
    onSave({
      ...item,
      label: draft.label.trim(),
      linkType: draft.linkType,
      pageId: draft.linkType === "page" ? draft.pageId : "",
      href: draft.linkType === "url" ? draft.href : "",
      parentId: draft.parentId ?? null,
    });
  };

  const helperText = useMemo(() => {
    if (!item) return "Select a menu item to edit details.";
    if (draft.linkType === "page" && pages.length === 0) {
      return "Create at least one page to link a menu item.";
    }
    return "Update the selected menu item settings.";
  }, [item, draft.linkType, pages.length]);

  if (!item) {
    return (
      <div className="flex h-full flex-col justify-center text-sm text-muted-foreground">
        {helperText}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{helperText}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          ×
        </Button>
      </div>
      <Separator className="my-4" />
      <div className="flex-1 overflow-y-auto pr-1">
        <MenuItemForm
          value={draft}
          pages={pages}
          parentOptions={parentOptions}
          disabledParentIds={disabledParentIds}
          errors={errors ?? undefined}
          onChange={setDraft}
        />
      </div>
      <Separator className="my-4" />
      <div className="space-y-3">
        <Button className="w-full" onClick={handleSave}>
          {isEditing ? "Update Item" : "Add Item"}
        </Button>
        {canDelete ? (
          <Button
            variant="ghost"
            className="w-full text-rose-600"
            onClick={() => onDelete(item)}
          >
            Delete Item
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function MenuItemDrawer(props: MenuItemDrawerProps) {
  const key = props.item?.id ?? "menu-item-empty";
  return <MenuItemDrawerContent key={key} {...props} />;
}
