import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  PanelRight,
  Plus,
  Redo2,
  Rocket,
  Save,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import {
  getCachedMenuDetail,
  getMenuWithItemsCached,
  publishMenu,
  updateMenu,
} from "@/services/menusClient";
import { listPagesCached } from "@/services/pagesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { resolveStoredMenuNavExtras } from "../../../services/menus/menuNavExtras";
import {
  buildMenuDocumentV2FromLegacy,
  createDefaultMenuBlock,
  createDefaultMenuDocumentV2,
  deleteMenuBlock,
  findMenuBlock,
  insertMenuBlock,
  reorderMenuBlock,
  resolveStoredMenuDocument,
  type MenuBarLayout,
  type MenuBlockType,
  type MenuBlockV2,
  type MenuDocumentV2,
} from "../../../services/menus/menuDocumentV2";
import {
  menuAppearanceAlignments,
  menuAppearanceDropdownDirections,
  menuAppearanceFontWeights,
  menuAppearanceMobileModes,
  menuAppearanceNumberRanges,
  menuAppearanceShadows,
  menuAppearanceTextTransforms,
  resolveStoredMenuAppearance,
  type MenuAppearance,
  type MenuAppearanceFontWeight,
} from "../../../services/menus/normalizeMenuAppearance";
import { mapMenuNodesToNavigationItems } from "../../../services/navigation/navigationMenuMapping";
import type { PageBreakpoint } from "../../../services/pages/pageDocumentV2";
import { pageButtonVariants } from "../../../services/pages/pageDocumentV2";
import {
  SITE_MENU_DOC_ATTRIBUTE,
  buildMenuDocumentPreviewCss,
} from "../../../site/menuDocumentCss";
import { SHELL_APPEARANCE_DEFAULTS } from "../../../site/siteShellCss";
import type { NavigationItem } from "../../../widgets/core/navigation";
import { DeviceSwitcher } from "../pages/DeviceSwitcher";
import {
  ColorSwatchControl,
  MediaPickerControl,
  SegmentedControl,
  SliderControl,
  ToggleSwitch,
} from "../pages/editorControls";
import { EditorControlToneContext } from "../pages/editorControls/controlChrome";
import { CanvasEditor } from "../shared/CanvasEditor";

/**
 * MenuDesignEditor (TASK-499-03): the Design tab's Pages-identical editor — a
 * THIN host over the shared `CanvasEditor` shell + the shared `editorControls`
 * primitives, editing `menuDocumentV2` directly. It renders a dotted canvas of
 * the `menu-bar` blocks (click-to-select, innermost wins), a single floating
 * control panel that swaps menu control primitives per selected block, an
 * "Add block" rail, and the existing menu Save/Publish lifecycle. The
 * `nav-items` block BINDS the published item tree (read-only) — never
 * duplicating item data.
 *
 * Undo/Redo is a SINGLE `useReducer` atom (doc + past + future + dirty) so an
 * edit, undo, and redo never read a stale document from a nested setState
 * closure. History is bounded (menu-scoped) and host-owned, so regressions stay
 * on the menu surface and cannot reach the Pages editor.
 *
 * The Pages **Layers** overlay is intentionally scoped out and served by the
 * "Blocks" list in `MenuBarPanel` (select + reorder + remove over the single
 * `menu-bar`): a menu document is one shallow section, so a full Layers tree
 * would be redundant chrome — the one deliberate, documented narrowing of
 * "Pages-identical".
 */

// --- undo/redo reducer atom -------------------------------------------------

type HistoryState = {
  doc: MenuDocumentV2;
  past: MenuDocumentV2[];
  future: MenuDocumentV2[];
  dirty: boolean;
};

type HistoryAction =
  | { type: "update"; updater: (doc: MenuDocumentV2) => MenuDocumentV2 }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; doc: MenuDocumentV2 }
  | { type: "hydrate"; doc: MenuDocumentV2 }
  | { type: "markSaved" };

const HISTORY_LIMIT = 50;

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "update": {
      const next = action.updater(state.doc);
      if (next === state.doc) return state;
      return {
        doc: next,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: [],
        dirty: true,
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1]!;
      return {
        doc: prev,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
        dirty: true,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0]!;
      return {
        doc: next,
        past: [...state.past, state.doc],
        future: state.future.slice(1),
        dirty: true,
      };
    }
    case "reset":
      return { doc: action.doc, past: [], future: [], dirty: false };
    case "hydrate":
      // Authoritative seed from the freshly loaded detail (cold cache). Guarded:
      // never clobbers a draft the user has already started editing.
      if (state.dirty || state.past.length > 0) return state;
      return { doc: action.doc, past: [], future: [], dirty: false };
    case "markSaved":
      return state.dirty ? { ...state, dirty: false } : state;
    default:
      return state;
  }
}

// --- seed contract ----------------------------------------------------------

/**
 * FRESH-MENU SEED CONTRACT (shared with TASK-499-02 §4): an existing stored
 * `document` draft wins; otherwise seed-from-legacy (WITHOUT writing) —
 * `buildMenuDocumentV2FromLegacy` returns `null` for a fresh menu (no appearance
 * AND no extras), so the chain reaches `createDefaultMenuDocumentV2()`
 * (menu-bar ⊃ brand(text)/nav-items/cta-button).
 */
const seedMenuDocument = (settings: unknown): MenuDocumentV2 =>
  resolveStoredMenuDocument(settings) ??
  buildMenuDocumentV2FromLegacy(
    resolveStoredMenuAppearance(settings),
    resolveStoredMenuNavExtras(settings)
  ) ??
  createDefaultMenuDocumentV2();

// --- labels -----------------------------------------------------------------

const MENU_BLOCK_LABELS: Record<MenuBlockType, string> = {
  "nav-items": "Navigation items",
  brand: "Brand",
  search: "Search",
  account: "Account",
  language: "Language",
  "cta-button": "Button",
  divider: "Divider",
  spacer: "Spacer",
};

const ADD_BLOCK_TYPES: MenuBlockType[] = ["nav-items", "brand", "cta-button", "divider", "spacer"];

const DEVICE_LABELS: Record<PageBreakpoint, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

const alignmentLabels: Record<string, string> = {
  start: "Start",
  center: "Center",
  end: "End",
  "space-between": "Spread",
};
const textTransformLabels: Record<string, string> = {
  none: "None",
  uppercase: "Uppercase",
  capitalize: "Capitalize",
};
const shadowLabels: Record<string, string> = { none: "None", sm: "Soft", md: "Strong" };
const dropdownDirectionLabels: Record<string, string> = { bottom: "Below", top: "Above" };
const mobileModeLabels: Record<string, string> = { disclosure: "Collapsed", inline: "Inline" };
const FONT_WEIGHT_INHERIT = "inherit" as const;
const fontWeightOptions = [FONT_WEIGHT_INHERIT, ...menuAppearanceFontWeights.map((w) => String(w))];
const fontWeightLabels: Record<string, string> = {
  [FONT_WEIGHT_INHERIT]: "Theme",
  "400": "Regular",
  "500": "Medium",
  "600": "Semibold",
  "700": "Bold",
};
const FONT_SIZE_FALLBACK = 15;
const toSwatchValue = (value: string) => (value === "transparent" ? "" : value);

// --- selectable canvas ------------------------------------------------------

function SelectableBlock({
  id,
  selected,
  onSelect,
  children,
}: {
  id: string;
  selected: boolean;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div
      data-menu-block-id={id}
      data-menu-block-selected={selected ? "true" : "false"}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id);
      }}
      className={cn(
        "cursor-pointer rounded-lg outline-none transition-shadow",
        selected && "ring-2 ring-primary"
      )}
    >
      {children}
    </div>
  );
}

function NavItemsPreview({ items, label }: { items: NavigationItem[]; label: string }) {
  return (
    <nav
      className="site-nav"
      aria-label={label.trim() || "Site navigation"}
      data-menu-nav-preview="true"
    >
      <ul className="site-nav-list" data-site-nav-list="true">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">No published menu items yet.</li>
        ) : (
          items.map((item, index) => (
            <li className="site-nav-item" key={`${item.label}-${index}`}>
              <a
                className="site-nav-link"
                href={item.href}
                onClick={(event) => event.preventDefault()}
              >
                {item.label}
              </a>
              {item.children && item.children.length > 0 ? (
                <ul className="site-nav-sublist">
                  {item.children.map((child, childIndex) => (
                    <li key={`${child.label}-${childIndex}`}>
                      <a
                        className="site-nav-link"
                        href={child.href}
                        onClick={(event) => event.preventDefault()}
                      >
                        {child.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </nav>
  );
}

function MenuBlockPreview({
  block,
  items,
  navLabel,
  menuName,
}: {
  block: MenuBlockV2;
  items: NavigationItem[];
  navLabel: string;
  menuName: string;
}) {
  switch (block.type) {
    case "nav-items":
      return <NavItemsPreview items={items} label={navLabel} />;
    case "brand": {
      const href = block.props.href || "/";
      return (
        <a className="site-header-brand" href={href} onClick={(event) => event.preventDefault()}>
          {block.props.mode === "image" && block.props.image
            ? String(block.props.image.alt ?? "") || "Logo"
            : menuName || "Brand"}
        </a>
      );
    }
    case "cta-button": {
      const label = typeof block.props.label === "string" ? block.props.label : "Button";
      return (
        <span className="site-nav-utility" data-menu-cta-preview="true">
          {label}
        </span>
      );
    }
    case "search":
    case "account":
    case "language": {
      const label =
        typeof block.props.label === "string" && block.props.label.trim().length > 0
          ? block.props.label
          : MENU_BLOCK_LABELS[block.type];
      return (
        <span className="site-nav-utility" data-site-nav-utility={block.type}>
          {label}
        </span>
      );
    }
    case "divider":
      return (
        <span className="text-muted-foreground" aria-hidden="true">
          —
        </span>
      );
    case "spacer":
      return <span aria-hidden="true" style={{ display: "inline-block", width: 24 }} />;
    default:
      return null;
  }
}

function MenuDocumentCanvas({
  doc,
  device,
  items,
  navLabel,
  menuName,
  selectedId,
  onSelect,
}: {
  doc: MenuDocumentV2;
  device: PageBreakpoint;
  items: NavigationItem[];
  navLabel: string;
  menuName: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const css = useMemo(() => buildMenuDocumentPreviewCss(doc, device), [doc, device]);
  const blocks = doc.sections[0]?.blocks ?? [];
  return (
    <div
      className="site-header"
      data-menu-document-canvas="true"
      {...{ [SITE_MENU_DOC_ATTRIBUTE]: "true" }}
    >
      <style>{css}</style>
      <div className="site-header-inner">
        {blocks.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            This menu design has no blocks yet. Add one from the panel.
          </p>
        ) : (
          blocks.map((block) => (
            <SelectableBlock
              key={block.id}
              id={block.id}
              selected={block.id === selectedId}
              onSelect={onSelect}
            >
              <MenuBlockPreview
                block={block}
                items={items}
                navLabel={navLabel}
                menuName={menuName}
              />
            </SelectableBlock>
          ))
        )}
      </div>
    </div>
  );
}

// --- control panels ---------------------------------------------------------

type UpdateDoc = (updater: (doc: MenuDocumentV2) => MenuDocumentV2) => void;

const setLayoutField =
  (updateDoc: UpdateDoc) =>
  <K extends keyof MenuBarLayout>(field: K, value: MenuBarLayout[K] | undefined) => {
    updateDoc((doc) => {
      const section = doc.sections[0];
      if (!section) return doc;
      const nextLayout: MenuBarLayout = { ...section.layout };
      if (value === undefined) delete nextLayout[field];
      else nextLayout[field] = value;
      return {
        ...doc,
        sections: doc.sections.map((s, index) => (index === 0 ? { ...s, layout: nextLayout } : s)),
      };
    });
  };

const patchBlock =
  (updateDoc: UpdateDoc) => (id: string, updater: (block: MenuBlockV2) => MenuBlockV2) => {
    updateDoc((doc) => ({
      ...doc,
      sections: doc.sections.map((section, index) =>
        index === 0
          ? { ...section, blocks: section.blocks.map((b) => (b.id === id ? updater(b) : b)) }
          : section
      ),
    }));
  };

function MenuBarPanel({
  doc,
  updateDoc,
  onSelectBlock,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
}: {
  doc: MenuDocumentV2;
  updateDoc: UpdateDoc;
  onSelectBlock: (id: string) => void;
  onAddBlock: (type: MenuBlockType) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock: (id: string, dir: "up" | "down") => void;
}) {
  const layout: MenuBarLayout = doc.sections[0]?.layout ?? {};
  const blocks = doc.sections[0]?.blocks ?? [];
  const setField = setLayoutField(updateDoc);
  const setColor = (field: "surfaceColor" | "borderColor") => (value: string | null) =>
    setField(field, value === null ? "transparent" : value);

  return (
    <div className="flex flex-col gap-4" data-menu-bar-panel="true">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Menu bar
        </p>
        <div className="grid gap-3">
          <ColorSwatchControl
            label="Surface color"
            value={toSwatchValue(layout.surfaceColor ?? SHELL_APPEARANCE_DEFAULTS.surfaceColor)}
            onChange={setColor("surfaceColor")}
          />
          <ColorSwatchControl
            label="Border color"
            value={toSwatchValue(layout.borderColor ?? SHELL_APPEARANCE_DEFAULTS.borderColor)}
            onChange={setColor("borderColor")}
          />
          <SegmentedControl
            label="Alignment"
            value={layout.alignment ?? SHELL_APPEARANCE_DEFAULTS.alignment}
            options={menuAppearanceAlignments}
            optionLabels={alignmentLabels}
            onChange={(next) => setField("alignment", next as MenuBarLayout["alignment"])}
          />
          <SliderControl
            label="Horizontal padding"
            value={layout.paddingX ?? SHELL_APPEARANCE_DEFAULTS.paddingX}
            min={menuAppearanceNumberRanges.paddingX.min}
            max={menuAppearanceNumberRanges.paddingX.max}
            step={1}
            unit="px"
            onChange={(next) => setField("paddingX", next)}
          />
          <SliderControl
            label="Vertical padding"
            value={layout.paddingY ?? SHELL_APPEARANCE_DEFAULTS.paddingY}
            min={menuAppearanceNumberRanges.paddingY.min}
            max={menuAppearanceNumberRanges.paddingY.max}
            step={1}
            unit="px"
            onChange={(next) => setField("paddingY", next)}
          />
          <SliderControl
            label="Border width"
            value={layout.borderWidth ?? SHELL_APPEARANCE_DEFAULTS.borderWidth}
            min={menuAppearanceNumberRanges.borderWidth.min}
            max={menuAppearanceNumberRanges.borderWidth.max}
            step={1}
            unit="px"
            onChange={(next) => setField("borderWidth", next)}
          />
          <SegmentedControl
            label="Shadow"
            value={layout.shadow ?? SHELL_APPEARANCE_DEFAULTS.shadow}
            options={menuAppearanceShadows}
            optionLabels={shadowLabels}
            onChange={(next) => setField("shadow", next as MenuBarLayout["shadow"])}
          />
          <ToggleSwitch
            label="Sticky header"
            value={layout.sticky ?? SHELL_APPEARANCE_DEFAULTS.sticky}
            onChange={(next) => setField("sticky", next)}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add block
        </p>
        <div className="flex flex-wrap gap-1.5" data-menu-add-block-rail="true">
          {ADD_BLOCK_TYPES.map((type) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              data-menu-add-block={type}
              onClick={() => onAddBlock(type)}
            >
              <Plus className="h-3.5 w-3.5" />
              {MENU_BLOCK_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Blocks
        </p>
        <ul className="flex flex-col gap-1" data-menu-blocks-list="true">
          {blocks.map((block, index) => (
            <li
              key={block.id}
              className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1.5"
              data-menu-block-row={block.id}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm"
                onClick={() => onSelectBlock(block.id)}
              >
                {MENU_BLOCK_LABELS[block.type]}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${MENU_BLOCK_LABELS[block.type]} up`}
                disabled={index === 0}
                onClick={() => onMoveBlock(block.id, "up")}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${MENU_BLOCK_LABELS[block.type]} down`}
                disabled={index === blocks.length - 1}
                onClick={() => onMoveBlock(block.id, "down")}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${MENU_BLOCK_LABELS[block.type]}`}
                onClick={() => onRemoveBlock(block.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MenuBlockPanel({
  block,
  updateDoc,
  onRemove,
  onMove,
}: {
  block: MenuBlockV2;
  updateDoc: UpdateDoc;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const patch = patchBlock(updateDoc);

  const setNavField = <K extends keyof MenuAppearance>(
    field: K,
    value: MenuAppearance[K] | undefined
  ) =>
    patch(block.id, (current) => {
      if (current.type !== "nav-items") return current;
      const nextProps: MenuAppearance = { ...current.props };
      if (value === undefined) delete nextProps[field];
      else nextProps[field] = value;
      return { ...current, props: nextProps };
    });

  return (
    <div className="flex flex-col gap-4" data-menu-block-panel={block.type}>
      <div className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {MENU_BLOCK_LABELS[block.type]}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move block up"
          onClick={() => onMove("up")}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move block down"
          onClick={() => onMove("down")}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove block"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {block.type === "nav-items" ? (
        <div className="grid gap-3">
          <SliderControl
            label="Item gap"
            value={block.props.itemGap ?? SHELL_APPEARANCE_DEFAULTS.itemGap}
            min={menuAppearanceNumberRanges.itemGap.min}
            max={menuAppearanceNumberRanges.itemGap.max}
            step={1}
            unit="px"
            onChange={(next) => setNavField("itemGap", next)}
          />
          <SliderControl
            label="Font size"
            value={block.props.fontSize ?? FONT_SIZE_FALLBACK}
            min={menuAppearanceNumberRanges.fontSize.min}
            max={menuAppearanceNumberRanges.fontSize.max}
            step={1}
            unit="px"
            onChange={(next) => setNavField("fontSize", next)}
          />
          <SegmentedControl
            label="Font weight"
            value={block.props.fontWeight ? String(block.props.fontWeight) : FONT_WEIGHT_INHERIT}
            options={fontWeightOptions}
            optionLabels={fontWeightLabels}
            onChange={(next) =>
              setNavField(
                "fontWeight",
                next === FONT_WEIGHT_INHERIT
                  ? undefined
                  : (Number(next) as MenuAppearanceFontWeight)
              )
            }
          />
          <SegmentedControl
            label="Text transform"
            value={block.props.textTransform ?? SHELL_APPEARANCE_DEFAULTS.textTransform}
            options={menuAppearanceTextTransforms}
            optionLabels={textTransformLabels}
            onChange={(next) =>
              setNavField("textTransform", next as MenuAppearance["textTransform"])
            }
          />
          <ColorSwatchControl
            label="Link color"
            value={toSwatchValue(block.props.linkColor ?? SHELL_APPEARANCE_DEFAULTS.linkColor)}
            onChange={(value) => setNavField("linkColor", value === null ? "transparent" : value)}
          />
          <ColorSwatchControl
            label="Link hover color"
            value={toSwatchValue(
              block.props.linkHoverColor ?? SHELL_APPEARANCE_DEFAULTS.linkHoverColor
            )}
            onChange={(value) =>
              setNavField("linkHoverColor", value === null ? "transparent" : value)
            }
          />
          <ColorSwatchControl
            label="Link active color"
            value={toSwatchValue(block.props.linkActiveColor ?? "transparent")}
            onChange={(value) =>
              setNavField("linkActiveColor", value === null ? "transparent" : value)
            }
          />
          <SegmentedControl
            label="Dropdown direction"
            value={block.props.dropdownDirection ?? SHELL_APPEARANCE_DEFAULTS.dropdownDirection}
            options={menuAppearanceDropdownDirections}
            optionLabels={dropdownDirectionLabels}
            onChange={(next) =>
              setNavField("dropdownDirection", next as MenuAppearance["dropdownDirection"])
            }
          />
          <SegmentedControl
            label="Mobile menu"
            value={block.props.mobileMode ?? SHELL_APPEARANCE_DEFAULTS.mobileMode}
            options={menuAppearanceMobileModes}
            optionLabels={mobileModeLabels}
            onChange={(next) => setNavField("mobileMode", next as MenuAppearance["mobileMode"])}
          />
        </div>
      ) : null}

      {block.type === "brand" ? (
        <div className="grid gap-3">
          <SegmentedControl
            label="Mode"
            value={block.props.mode}
            options={["text", "image"]}
            optionLabels={{ text: "Text", image: "Image" }}
            onChange={(next) =>
              patch(block.id, (current) =>
                current.type === "brand"
                  ? { ...current, props: { ...current.props, mode: next as "text" | "image" } }
                  : current
              )
            }
          />
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Link</span>
            <Input
              aria-label="Brand link"
              value={block.props.href}
              onChange={(event) =>
                patch(block.id, (current) =>
                  current.type === "brand"
                    ? { ...current, props: { ...current.props, href: event.target.value } }
                    : current
                )
              }
            />
          </label>
          {block.props.mode === "image" ? (
            <MediaPickerControl
              label="Logo image"
              accept={["image/*"]}
              value={block.props.image?.assetId ?? null}
              onChange={(value) =>
                patch(block.id, (current) =>
                  current.type === "brand"
                    ? {
                        ...current,
                        props: {
                          ...current.props,
                          image: { ...(current.props.image ?? {}), assetId: value },
                        },
                      }
                    : current
                )
              }
            />
          ) : null}
        </div>
      ) : null}

      {block.type === "cta-button" ? (
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Label</span>
            <Input
              aria-label="Button label"
              value={typeof block.props.label === "string" ? block.props.label : ""}
              onChange={(event) =>
                patch(block.id, (current) =>
                  current.type === "cta-button"
                    ? { ...current, props: { ...current.props, label: event.target.value } }
                    : current
                )
              }
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Link</span>
            <Input
              aria-label="Button link"
              value={typeof block.props.href === "string" ? block.props.href : ""}
              onChange={(event) =>
                patch(block.id, (current) =>
                  current.type === "cta-button"
                    ? { ...current, props: { ...current.props, href: event.target.value } }
                    : current
                )
              }
            />
          </label>
          <SegmentedControl
            label="Variant"
            value={typeof block.props.variant === "string" ? block.props.variant : "primary"}
            options={pageButtonVariants}
            onChange={(next) =>
              patch(block.id, (current) =>
                current.type === "cta-button"
                  ? { ...current, props: { ...current.props, variant: next } }
                  : current
              )
            }
          />
        </div>
      ) : null}

      {block.type === "divider" || block.type === "spacer" ? (
        <p className="text-xs text-muted-foreground">
          This block has no editable options; use reorder/remove above.
        </p>
      ) : null}
    </div>
  );
}

// --- editor -----------------------------------------------------------------

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function MenuDesignEditor({ menuId }: { menuId: string }) {
  const { navigate } = useAdminRouter();
  const initial = useMemo(() => getCachedMenuDetail(menuId), [menuId]);
  const [history, dispatch] = useReducer(
    historyReducer,
    initial?.menu.settings,
    (settings): HistoryState => ({
      doc: seedMenuDocument(settings),
      past: [],
      future: [],
      dirty: false,
    })
  );
  const doc = history.doc;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<PageBreakpoint>("desktop");
  const [panelOpen, setPanelOpen] = useState(true);
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [menuName, setMenuName] = useState(initial?.menu.name ?? "Menu design");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDoc = useCallback<UpdateDoc>((updater) => dispatch({ type: "update", updater }), []);

  // Load the published item tree (cache-first) + page slugs to BIND nav-items.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getMenuWithItemsCached(menuId), listPagesCached()])
      .then(([detail, pages]) => {
        if (cancelled || !detail) return;
        const pagePathById = new Map(pages.map((page) => [page.id, page.slug] as const));
        setMenuName(detail.menu.name);
        setItems(
          mapMenuNodesToNavigationItems(detail.items, pagePathById, {
            includeDefaultTarget: true,
          })
        );
        // Cold-cache authoritative seed: if the synchronous cache was empty at
        // mount, adopt the loaded document draft (guarded against clobbering a
        // draft the user already started).
        dispatch({ type: "hydrate", doc: seedMenuDocument(detail.menu.settings) });
      })
      .catch((loadError) => {
        if (!cancelled) setError(resolveErrorMessage(loadError, "Failed to load menu."));
      });
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  const selectedBlock = findMenuBlock(doc, selectedId);
  const navLabel = menuName;

  const addMenuBlock = (type: MenuBlockType) =>
    updateDoc((current) => insertMenuBlock(current, createDefaultMenuBlock(type)));
  const removeMenuBlock = (id: string) => {
    updateDoc((current) => deleteMenuBlock(current, id));
    setSelectedId((current) => (current === id ? null : current));
  };
  const moveMenuBlock = (id: string, dir: "up" | "down") =>
    updateDoc((current) => reorderMenuBlock(current, id, dir));

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateMenu(menuId, { document: doc });
      dispatch({ type: "markSaved" });
    } catch (saveError) {
      setError(resolveErrorMessage(saveError, "Failed to save menu design."));
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      await updateMenu(menuId, { document: doc });
      await publishMenu(menuId);
      dispatch({ type: "markSaved" });
    } catch (publishError) {
      setError(resolveErrorMessage(publishError, "Failed to publish menu design."));
    } finally {
      setIsPublishing(false);
    }
  };

  const discard = () => {
    dispatch({ type: "reset", doc: seedMenuDocument(getCachedMenuDetail(menuId)?.menu.settings) });
    setSelectedId(null);
  };

  return (
    <EditorShell
      breadcrumbs={
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Menus</span>
          <span className="text-sm font-semibold">{menuName}</span>
        </div>
      }
      centerScroll={false}
      contentClassName="h-full"
    >
      <div className="relative flex h-full min-h-0 flex-col bg-background">
        <CanvasEditor
          header={
            <PageHeader
              className="mb-0 shrink-0 px-6 pb-3 pt-4"
              title={menuName}
              breadcrumbs={[
                { label: "Content" },
                { label: "Menus", href: "/menus" },
                { label: menuName },
                { label: "Design" },
              ]}
              actions={
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/menus/${menuId}`)}
                  >
                    Structure
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!history.dirty}
                    onClick={discard}
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => void save()}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPublishing}
                    onClick={() => void publish()}
                  >
                    <Rocket className="h-4 w-4" />
                    {isPublishing ? "Publishing..." : "Publish"}
                  </Button>
                </>
              }
            />
          }
          title="Menu builder"
          badge={
            history.dirty ? (
              <Badge variant="warning" className="text-[10px] font-semibold uppercase">
                Unsaved
              </Badge>
            ) : null
          }
          toolbar={
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Undo"
                disabled={history.past.length === 0}
                onClick={() => dispatch({ type: "undo" })}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Redo"
                disabled={history.future.length === 0}
                onClick={() => dispatch({ type: "redo" })}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
              <DeviceSwitcher value={device} onChange={setDevice} />
              <Button
                type="button"
                variant={panelOpen ? "soft" : "ghost"}
                size="sm"
                onClick={() => setPanelOpen((open) => !open)}
                aria-label={panelOpen ? "Hide panel" : "Show panel"}
                aria-pressed={panelOpen}
              >
                <PanelRight className="h-4 w-4" />
                {panelOpen ? "Hide panel" : "Show panel"}
              </Button>
            </>
          }
          deviceContext={{ value: device, label: DEVICE_LABELS[device] }}
          panelOpen={panelOpen}
          onPanelOpenChange={setPanelOpen}
          panelPosition="right"
          panelAriaLabel="Menu design tools"
          panelDataProps={{ "data-menu-design-panel": "true" }}
          canvas={
            <div
              data-menu-design-canvas-scroller="true"
              className="min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted p-6 lg:p-8"
              style={panelOpen ? { paddingRight: 300 } : undefined}
              onClick={() => setSelectedId(null)}
            >
              {error ? (
                <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <div
                className="mx-auto min-h-full w-full max-w-4xl rounded-2xl bg-card p-4 shadow-soft"
                onClick={(event) => event.stopPropagation()}
              >
                <MenuDocumentCanvas
                  doc={doc}
                  device={device}
                  items={items}
                  navLabel={navLabel}
                  menuName={menuName}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
          }
          panel={
            <EditorControlToneContext.Provider value="light">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {selectedBlock ? (
                  <MenuBlockPanel
                    block={selectedBlock}
                    updateDoc={updateDoc}
                    onRemove={() => removeMenuBlock(selectedBlock.id)}
                    onMove={(dir) => moveMenuBlock(selectedBlock.id, dir)}
                  />
                ) : (
                  <MenuBarPanel
                    doc={doc}
                    updateDoc={updateDoc}
                    onSelectBlock={setSelectedId}
                    onAddBlock={addMenuBlock}
                    onRemoveBlock={removeMenuBlock}
                    onMoveBlock={moveMenuBlock}
                  />
                )}
              </div>
            </EditorControlToneContext.Provider>
          }
          reopenAffordance={
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary"
              aria-label="Show panel"
            >
              <SlidersHorizontal className="size-3.5" /> Show panel
            </button>
          }
        />
      </div>
    </EditorShell>
  );
}

export { seedMenuDocument };
