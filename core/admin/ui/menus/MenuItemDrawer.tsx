import { ChevronDown, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { MenuItemRecord } from "@/services/menusClient";
import type { PageSummary } from "@/services/pagesClient";
import { MenuItemForm, type MenuItemFormValue } from "@/ui/menus/MenuItemForm";
import {
  normalizeMenuItemSettings,
  type MenuItemBadgeTone,
} from "../../../services/menus/menuItemSettings";

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
      visibility: "all",
      badgeLabel: "",
      badgeTone: "default",
      description: "",
      icon: "",
    };
  }

  const settings = normalizeMenuItemSettings(item.settings);

  return {
    id: item.id,
    label: item.label,
    linkType: item.linkType,
    pageId: item.pageId ?? "",
    href: item.href ?? "",
    parentId: item.parentId ?? null,
    visibility: settings.visibility ?? "all",
    badgeLabel: settings.badge?.label ?? "",
    badgeTone: (settings.badge?.tone ?? "default") as MenuItemBadgeTone,
    description: settings.description ?? "",
    icon: settings.icon ?? "",
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
  const [errors, setErrors] = useState<{ label?: string; link?: string } | null>(null);

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
    const badgeLabel = draft.badgeLabel.trim();
    onSave({
      ...item,
      label: draft.label.trim(),
      linkType: draft.linkType,
      pageId: draft.linkType === "page" ? draft.pageId : "",
      href: draft.linkType === "url" ? draft.href : "",
      parentId: draft.parentId ?? null,
      settings: normalizeMenuItemSettings({
        visibility: draft.visibility,
        badge: badgeLabel
          ? {
              label: badgeLabel,
              tone: draft.badgeTone,
            }
          : undefined,
        description: draft.description,
        icon: draft.icon,
      }),
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
          <Button variant="destructive" className="w-full" onClick={() => onDelete(item)}>
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

/**
 * TASK-499-01: always-on "Item settings" inspector for the three-pane frame
 * (and the mobile Sheet). Unlike `MenuItemDrawer` this is LIVE — every edit
 * flows straight through `onChange` (wired to the page's `handleSaveItem`) so
 * parent reparent/reindex + `normalizeMenuItemSettings` are reused unchanged.
 * The "Open in new tab" Switch lives HERE (never in `MenuItemForm`, keeping the
 * `menu-item-form.test.tsx` "no switch" lock green). With no active item it
 * renders the menu-level settings slot (name + theme location).
 */
type MenuItemInspectorProps = {
  activeItem: MenuItemDraft | null;
  pages: PageSummary[];
  parentOptions: Array<{ id: string; label: string }>;
  disabledParentIds?: Set<string>;
  onChange: (item: MenuItemDraft) => void;
  onDelete: (item: MenuItemDraft) => void;
  menuSettingsSlot: React.ReactNode;
};

const toInspectorValue = (item: MenuItemDraft): MenuItemFormValue => {
  const settings = normalizeMenuItemSettings(item.settings);
  return {
    id: item.id,
    label: item.label,
    linkType: item.linkType,
    pageId: item.pageId ?? "",
    href: item.href ?? "",
    parentId: item.parentId ?? null,
    visibility: settings.visibility ?? "all",
    badgeLabel: settings.badge?.label ?? "",
    badgeTone: (settings.badge?.tone ?? "default") as MenuItemBadgeTone,
    description: settings.description ?? "",
    icon: settings.icon ?? "",
    openInNewTab: settings.openInNewTab ?? false,
    variant: settings.variant ?? "link",
  };
};

function MenuItemInspectorContent({
  activeItem,
  pages,
  parentOptions,
  disabledParentIds,
  onChange,
  onDelete,
}: Omit<MenuItemInspectorProps, "menuSettingsSlot"> & { activeItem: MenuItemDraft }) {
  const [draft, setDraft] = useState<MenuItemFormValue>(() => toInspectorValue(activeItem));
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const propagate = (next: MenuItemFormValue) => {
    setDraft(next);
    const badgeLabel = next.badgeLabel.trim();
    onChange({
      ...activeItem,
      label: next.label,
      linkType: next.linkType,
      pageId: next.linkType === "page" ? next.pageId : "",
      href: next.linkType === "url" ? next.href : "",
      parentId: next.parentId ?? null,
      settings: normalizeMenuItemSettings({
        visibility: next.visibility,
        badge: badgeLabel ? { label: badgeLabel, tone: next.badgeTone } : undefined,
        description: next.description,
        icon: next.icon,
        openInNewTab: next.openInNewTab,
        variant: next.variant,
      }),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Item settings</span>
        <Badge variant="soft">{draft.linkType === "page" ? "Page" : "Link"}</Badge>
      </div>

      {/* TASK-499-01 §4: the inspector reads like the prototype's minimal panel —
          PRIMARY fields ordered Label → Link → Open-in-new-tab → Visibility, with
          the heavy legacy controls demoted into a default-closed "Advanced"
          disclosure (not deleted). */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/* PRIMARY — Label + link-type-aware Link control. */}
        <MenuItemForm
          value={draft}
          pages={pages}
          parentOptions={parentOptions}
          disabledParentIds={disabledParentIds}
          onChange={propagate}
          section="primary"
        />

        {/* PRIMARY — Open in new tab lives in the inspector wrapper (not the
            form), keeping the `menu-item-form.test.tsx` "no switch" lock green. */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2.5">
          <div className="text-sm font-medium">Open in new tab</div>
          <Switch
            checked={draft.openInNewTab ?? false}
            onCheckedChange={(checked) => propagate({ ...draft, openInNewTab: checked })}
            aria-label="Open in new tab"
          />
        </div>

        {/* PRIMARY — Visibility. */}
        <MenuItemForm
          value={draft}
          pages={pages}
          parentOptions={parentOptions}
          disabledParentIds={disabledParentIds}
          onChange={propagate}
          section="visibility"
        />

        {/* ADVANCED — collapsible, default-closed: Link Type toggle, Parent,
            Display as, Badge label+tone, Description, Icon. */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60">
            <span>Advanced</span>
            <ChevronDown
              className={cn("size-4 transition-transform", advancedOpen && "rotate-180")}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <MenuItemForm
              value={draft}
              pages={pages}
              parentOptions={parentOptions}
              disabledParentIds={disabledParentIds}
              onChange={propagate}
              section="advanced"
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Separator className="my-4" />
      <Button variant="destructive" className="w-full gap-2" onClick={() => onDelete(activeItem)}>
        <Trash2 className="h-4 w-4" />
        Remove item
      </Button>
    </div>
  );
}

export function MenuItemInspector({
  activeItem,
  menuSettingsSlot,
  ...rest
}: MenuItemInspectorProps) {
  if (!activeItem) return <>{menuSettingsSlot}</>;
  return <MenuItemInspectorContent key={activeItem.id} activeItem={activeItem} {...rest} />;
}
