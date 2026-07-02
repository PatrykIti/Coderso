import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  EyeOff,
  PanelRight,
  Plus,
  Redo2,
  Rocket,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  clearMenuBlockVisibilityOverride,
  clearMenuSectionOverride,
  createDefaultMenuBlock,
  createDefaultMenuDocumentV2,
  deleteMenuBlock,
  findMenuBlock,
  insertMenuBlock,
  patchMenuSectionForDevice,
  readMenuSectionOverrideValue,
  reorderMenuBlock,
  resolveMenuBlockVisibleForDevice,
  resolveMenuSectionAppearanceForDevice,
  resolveStoredMenuDocument,
  setMenuBlockVisibleForDevice,
  type MenuBarLayout,
  type MenuBlockType,
  type MenuBlockV2,
  type MenuDocumentV2,
  type NavItemsProps,
} from "../../../services/menus/menuDocumentV2";
import {
  menuAppearanceAlignments,
  menuAppearanceDropdownDirections,
  menuAppearanceFontWeights,
  menuAppearanceMobileModes,
  menuAppearanceNumberRanges,
  menuAppearanceOrientations,
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
import {
  EditorControlToneContext,
  editorControlFocusClassFor,
  editorGhostButtonClassFor,
  editorPanelOptionActiveClass,
  useEditorControlTone,
} from "../pages/editorControls/controlChrome";
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
 * Per-device overrides (TASK-501-03): APPEARANCE writers are device-forked —
 * with the DeviceSwitcher on Mobile, `setLayoutField`/`setNavField` write a
 * SPARSE `responsive.mobile` record via `patchMenuSectionForDevice` and the
 * per-block visibility toggle writes `setMenuBlockVisibleForDevice`; Desktop
 * AND Tablet write the flat base (tablet overrides deferred). Panels display
 * RESOLVED values (`resolveMenuSectionAppearanceForDevice`) while the
 * `MenuResponsiveControlShell` badge compares against the BASE record and
 * offers an explicit Reset (`clearMenuSectionOverride` — prune-on-clear, no
 * auto-remove-on-equality). Content writes (`patchBlock`) stay FLAT and
 * badge-less on every device. All writes remain event-handler dispatches into
 * the history atom — no setState-in-effect.
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
const orientationLabels: Record<string, string> = {
  horizontal: "Horizontal",
  vertical: "Vertical",
};
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

// --- responsive control shell (TASK-501-03) ----------------------------------

/**
 * Tablet is BASE-mapped for menus (TASK-501 parent scoping decision — tablet
 * overrides are DEFERRED; the canvas maps tablet⇒desktop) — the ONE deliberate
 * divergence from the Pages `ResponsiveControlShell`, where tablet is an
 * override breakpoint. Encoded in this single predicate used by badge +
 * writers + visibility controls.
 */
const isMenuOverrideDevice = (device: PageBreakpoint): device is "mobile" => device === "mobile";

type MenuResponsiveBadgeState = "base" | "override" | "inherited";

const menuResponsiveBadgeDescription = (state: MenuResponsiveBadgeState): string =>
  state === "base"
    ? "Editing the base value (applies to every device)."
    : state === "override"
      ? "Mobile override — this value replaces the desktop value below 640px."
      : "Inherited from desktop. Edit to create a mobile override.";

function MenuResponsiveStateBadge({ state }: { state: MenuResponsiveBadgeState }) {
  const tone = useEditorControlTone();
  const isLight = tone === "light";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          data-menu-responsive-badge={state}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${editorControlFocusClassFor(
            tone
          )} ${
            state === "override"
              ? isLight
                ? editorPanelOptionActiveClass
                : "bg-sky-400/20 text-sky-200"
              : isLight
                ? "bg-muted text-muted-foreground"
                : "bg-white/10 text-slate-400"
          }`}
        >
          {state === "base" ? "Base" : state === "override" ? "Override" : "Inherited"}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
        {menuResponsiveBadgeDescription(state)}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Port of the Pages `ResponsiveControlShell` idiom (module-private to
 * `PageEditor.tsx`, so ported — not imported — with menu-scoped data
 * attributes): wraps every device-forkable APPEARANCE control with a
 * Base/Override/Inherited badge plus an explicit Reset affordance on Mobile.
 * `override` MUST be computed from the BASE record
 * (`readMenuSectionOverrideValue` / the raw block responsive record), never
 * from resolved values — explicit Reset only, NO auto-remove-on-equality.
 * Content controls (brand/cta/utility) are deliberately NOT wrapped: the
 * badge's presence itself communicates "this control forks per device".
 */
function MenuResponsiveControlShell({
  device,
  override,
  label,
  onReset,
  children,
}: {
  device: PageBreakpoint;
  /** Computed from the BASE record by the caller, never from resolved values. */
  override: boolean;
  /** Control label used in the reset affordance accessible name + data hook. */
  label: string;
  onReset: () => void;
  children: ReactNode;
}) {
  const tone = useEditorControlTone();
  const state: MenuResponsiveBadgeState = !isMenuOverrideDevice(device)
    ? "base"
    : override
      ? "override"
      : "inherited";
  return (
    <div className="grid min-w-0 gap-1" data-menu-responsive-field={state}>
      {children}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <MenuResponsiveStateBadge state={state} />
        {state === "override" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Reset ${label} to inherited`}
                data-menu-responsive-reset={label}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${editorGhostButtonClassFor(
                  tone
                )} ${editorControlFocusClassFor(tone)}`}
                onClick={onReset}
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
              Remove the mobile override and inherit the desktop value.
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
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

/**
 * Device-forked layout writer (TASK-501-03): Desktop/Tablet write the base
 * `section.layout`; Mobile writes the SPARSE `responsive.mobile.layout`
 * override. `patchMenuSectionForDevice` honors `undefined` ⇒
 * delete-key-from-target on BOTH device paths (base-key delete on
 * desktop/tablet; override-leaf delete + prune chain on mobile — never an own
 * `undefined` key), matching the previous flat delete-on-undefined semantics.
 */
const setLayoutField =
  (updateDoc: UpdateDoc, device: PageBreakpoint) =>
  <K extends keyof MenuBarLayout>(field: K, value: MenuBarLayout[K] | undefined) => {
    updateDoc((doc) => {
      const section = doc.sections[0];
      if (!section) return doc;
      return patchMenuSectionForDevice(doc, section.id, device, "layout", {
        [field]: value,
      } as MenuBarLayout);
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
  device,
  updateDoc,
  onSelectBlock,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
}: {
  doc: MenuDocumentV2;
  device: PageBreakpoint;
  updateDoc: UpdateDoc;
  onSelectBlock: (id: string) => void;
  onAddBlock: (type: MenuBlockType) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock: (id: string, dir: "up" | "down") => void;
}) {
  const section = doc.sections[0];
  // Panels DISPLAY resolved values (base merged with the mobile override)…
  const layout: MenuBarLayout = section
    ? resolveMenuSectionAppearanceForDevice(section, device).layout
    : {};
  const blocks = section?.blocks ?? [];
  const setField = setLayoutField(updateDoc, device);
  const setColor = (field: "surfaceColor" | "borderColor") => (value: string | null) =>
    setField(field, value === null ? "transparent" : value);
  // …while override DETECTION reads the raw BASE record (Pages split).
  const layoutOverride = (key: keyof MenuBarLayout) =>
    section !== undefined &&
    readMenuSectionOverrideValue(section, "mobile", "layout", key) !== undefined;
  const resetLayout = (key: keyof MenuBarLayout) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target
        ? clearMenuSectionOverride(current, target.id, "mobile", "layout", key)
        : current;
    });

  return (
    <div className="flex flex-col gap-4" data-menu-bar-panel="true">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Menu bar
        </p>
        <div className="grid gap-3">
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("surfaceColor")}
            label="Surface color"
            onReset={resetLayout("surfaceColor")}
          >
            <ColorSwatchControl
              label="Surface color"
              value={toSwatchValue(layout.surfaceColor ?? SHELL_APPEARANCE_DEFAULTS.surfaceColor)}
              onChange={setColor("surfaceColor")}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("borderColor")}
            label="Border color"
            onReset={resetLayout("borderColor")}
          >
            <ColorSwatchControl
              label="Border color"
              value={toSwatchValue(layout.borderColor ?? SHELL_APPEARANCE_DEFAULTS.borderColor)}
              onChange={setColor("borderColor")}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("alignment")}
            label="Alignment"
            onReset={resetLayout("alignment")}
          >
            <SegmentedControl
              label="Alignment"
              value={layout.alignment ?? SHELL_APPEARANCE_DEFAULTS.alignment}
              options={menuAppearanceAlignments}
              optionLabels={alignmentLabels}
              onChange={(next) => setField("alignment", next as MenuBarLayout["alignment"])}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("paddingX")}
            label="Horizontal padding"
            onReset={resetLayout("paddingX")}
          >
            <SliderControl
              label="Horizontal padding"
              value={layout.paddingX ?? SHELL_APPEARANCE_DEFAULTS.paddingX}
              min={menuAppearanceNumberRanges.paddingX.min}
              max={menuAppearanceNumberRanges.paddingX.max}
              step={1}
              unit="px"
              onChange={(next) => setField("paddingX", next)}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("paddingY")}
            label="Vertical padding"
            onReset={resetLayout("paddingY")}
          >
            <SliderControl
              label="Vertical padding"
              value={layout.paddingY ?? SHELL_APPEARANCE_DEFAULTS.paddingY}
              min={menuAppearanceNumberRanges.paddingY.min}
              max={menuAppearanceNumberRanges.paddingY.max}
              step={1}
              unit="px"
              onChange={(next) => setField("paddingY", next)}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("borderWidth")}
            label="Border width"
            onReset={resetLayout("borderWidth")}
          >
            <SliderControl
              label="Border width"
              value={layout.borderWidth ?? SHELL_APPEARANCE_DEFAULTS.borderWidth}
              min={menuAppearanceNumberRanges.borderWidth.min}
              max={menuAppearanceNumberRanges.borderWidth.max}
              step={1}
              unit="px"
              onChange={(next) => setField("borderWidth", next)}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("shadow")}
            label="Shadow"
            onReset={resetLayout("shadow")}
          >
            <SegmentedControl
              label="Shadow"
              value={layout.shadow ?? SHELL_APPEARANCE_DEFAULTS.shadow}
              options={menuAppearanceShadows}
              optionLabels={shadowLabels}
              onChange={(next) => setField("shadow", next as MenuBarLayout["shadow"])}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("sticky")}
            label="Sticky header"
            onReset={resetLayout("sticky")}
          >
            <ToggleSwitch
              label="Sticky header"
              value={layout.sticky ?? SHELL_APPEARANCE_DEFAULTS.sticky}
              onChange={(next) => setField("sticky", next)}
            />
          </MenuResponsiveControlShell>
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
              {resolveMenuBlockVisibleForDevice(block, device) === false ? (
                // Discoverability: a CSS-hidden canvas block stays reachable
                // here — pure render derivation from doc + device (no state).
                <EyeOff
                  role="img"
                  aria-label={`Hidden on ${DEVICE_LABELS[device]}`}
                  data-menu-block-hidden={block.id}
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                />
              ) : null}
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
  doc,
  device,
  updateDoc,
  onRemove,
  onMove,
}: {
  block: MenuBlockV2;
  doc: MenuDocumentV2;
  device: PageBreakpoint;
  updateDoc: UpdateDoc;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  // patchBlock stays FLAT and device-invariant: content writes (brand/cta/
  // utility label/href/variant/logo) are NOT device-forked by contract.
  const patch = patchBlock(updateDoc);

  const section = doc.sections[0];
  // Resolved nav appearance for DISPLAY (base merged with the mobile override;
  // base navProps = the FIRST nav-items block's props, mirroring the CSS
  // pipeline's collectMenuAppearance binding).
  const navProps: NavItemsProps = section
    ? resolveMenuSectionAppearanceForDevice(section, device).navProps
    : {};
  // Override detection reads the raw BASE record, never the resolved merge.
  const navOverride = (key: keyof NavItemsProps) =>
    section !== undefined &&
    readMenuSectionOverrideValue(section, "mobile", "navProps", key) !== undefined;
  const resetNav = (key: keyof NavItemsProps) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target
        ? clearMenuSectionOverride(current, target.id, "mobile", "navProps", key)
        : current;
    });
  /**
   * Device-forked nav appearance writer: Desktop/Tablet ⇒ the FIRST nav-items
   * block's base props; Mobile ⇒ sparse `responsive.mobile.navProps`.
   * NORMATIVE (501-01 §3): `patchMenuSectionForDevice` targets the FIRST
   * nav-items block regardless of which nav-items block is selected — the
   * section-level override record can only represent one nav-items block.
   * `undefined` ⇒ delete-key-from-target on both device paths (the sole
   * emitter today is fontWeight "Theme").
   */
  const setNavField = <K extends keyof NavItemsProps>(
    field: K,
    value: NavItemsProps[K] | undefined
  ) =>
    updateDoc((current) => {
      const target = current.sections[0];
      if (!target) return current;
      return patchMenuSectionForDevice(current, target.id, device, "navProps", {
        [field]: value,
      } as NavItemsProps);
    });

  const visibleOnDevice = resolveMenuBlockVisibleForDevice(block, device);
  const visibilityOverride =
    isMenuOverrideDevice(device) && block.responsive?.mobile?.visibility !== undefined;

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

      {isMenuOverrideDevice(device) ? (
        // Mobile: EVERY block type gets a per-device visibility override
        // toggle (writes the sparse block responsive record).
        <MenuResponsiveControlShell
          device={device}
          override={visibilityOverride}
          label="Visible on mobile"
          onReset={() =>
            updateDoc((current) => clearMenuBlockVisibilityOverride(current, block.id, "mobile"))
          }
        >
          <ToggleSwitch
            label="Visible on mobile"
            value={visibleOnDevice}
            onChange={(next) =>
              updateDoc((current) =>
                setMenuBlockVisibleForDevice(current, block.id, "mobile", next)
              )
            }
          />
        </MenuResponsiveControlShell>
      ) : block.type === "cta-button" || block.type === "divider" || block.type === "spacer" ? (
        // Desktop/Tablet: LEAF blocks only get the FLAT visibility toggle
        // (native blocks carry no flat visibility slot by schema). The inlined
        // three-type check mirrors the module-private MENU_LEAF_BLOCK_TYPES;
        // a vitest divergence guard pins the lists against schema drift.
        // Composable with the mobile override: flat visible:false + mobile
        // override true = "show only on mobile".
        <ToggleSwitch
          label="Visible"
          value={block.visibility?.visible ?? true}
          onChange={(next) =>
            updateDoc((current) => setMenuBlockVisibleForDevice(current, block.id, device, next))
          }
        />
      ) : null}

      {block.type === "nav-items" ? (
        <div className="grid gap-3">
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("orientation")}
            label="Orientation"
            onReset={resetNav("orientation")}
          >
            <SegmentedControl
              label="Orientation"
              value={navProps.orientation ?? "horizontal"}
              options={menuAppearanceOrientations}
              optionLabels={orientationLabels}
              onChange={(next) => setNavField("orientation", next as NavItemsProps["orientation"])}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("itemGap")}
            label="Item gap"
            onReset={resetNav("itemGap")}
          >
            <SliderControl
              label="Item gap"
              value={navProps.itemGap ?? SHELL_APPEARANCE_DEFAULTS.itemGap}
              min={menuAppearanceNumberRanges.itemGap.min}
              max={menuAppearanceNumberRanges.itemGap.max}
              step={1}
              unit="px"
              onChange={(next) => setNavField("itemGap", next)}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("fontSize")}
            label="Font size"
            onReset={resetNav("fontSize")}
          >
            <SliderControl
              label="Font size"
              value={navProps.fontSize ?? FONT_SIZE_FALLBACK}
              min={menuAppearanceNumberRanges.fontSize.min}
              max={menuAppearanceNumberRanges.fontSize.max}
              step={1}
              unit="px"
              onChange={(next) => setNavField("fontSize", next)}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("fontWeight")}
            label="Font weight"
            onReset={resetNav("fontWeight")}
          >
            <SegmentedControl
              label="Font weight"
              value={navProps.fontWeight ? String(navProps.fontWeight) : FONT_WEIGHT_INHERIT}
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
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("textTransform")}
            label="Text transform"
            onReset={resetNav("textTransform")}
          >
            <SegmentedControl
              label="Text transform"
              value={navProps.textTransform ?? SHELL_APPEARANCE_DEFAULTS.textTransform}
              options={menuAppearanceTextTransforms}
              optionLabels={textTransformLabels}
              onChange={(next) =>
                setNavField("textTransform", next as MenuAppearance["textTransform"])
              }
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("linkColor")}
            label="Link color"
            onReset={resetNav("linkColor")}
          >
            <ColorSwatchControl
              label="Link color"
              value={toSwatchValue(navProps.linkColor ?? SHELL_APPEARANCE_DEFAULTS.linkColor)}
              onChange={(value) => setNavField("linkColor", value === null ? "transparent" : value)}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("linkHoverColor")}
            label="Link hover color"
            onReset={resetNav("linkHoverColor")}
          >
            <ColorSwatchControl
              label="Link hover color"
              value={toSwatchValue(
                navProps.linkHoverColor ?? SHELL_APPEARANCE_DEFAULTS.linkHoverColor
              )}
              onChange={(value) =>
                setNavField("linkHoverColor", value === null ? "transparent" : value)
              }
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("linkActiveColor")}
            label="Link active color"
            onReset={resetNav("linkActiveColor")}
          >
            <ColorSwatchControl
              label="Link active color"
              value={toSwatchValue(navProps.linkActiveColor ?? "transparent")}
              onChange={(value) =>
                setNavField("linkActiveColor", value === null ? "transparent" : value)
              }
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("dropdownDirection")}
            label="Dropdown direction"
            onReset={resetNav("dropdownDirection")}
          >
            <SegmentedControl
              label="Dropdown direction"
              value={navProps.dropdownDirection ?? SHELL_APPEARANCE_DEFAULTS.dropdownDirection}
              options={menuAppearanceDropdownDirections}
              optionLabels={dropdownDirectionLabels}
              onChange={(next) =>
                setNavField("dropdownDirection", next as MenuAppearance["dropdownDirection"])
              }
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={navOverride("mobileMode")}
            label="Mobile menu"
            onReset={resetNav("mobileMode")}
          >
            <SegmentedControl
              label="Mobile menu"
              value={navProps.mobileMode ?? SHELL_APPEARANCE_DEFAULTS.mobileMode}
              options={menuAppearanceMobileModes}
              optionLabels={mobileModeLabels}
              onChange={(next) => setNavField("mobileMode", next as MenuAppearance["mobileMode"])}
            />
          </MenuResponsiveControlShell>
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
          deviceContext={{
            value: device,
            // Scope cue: Mobile edits write sparse overrides; Desktop/Tablet
            // edit the base (tablet deferred — base-mapped, TASK-501).
            label: isMenuOverrideDevice(device)
              ? `${DEVICE_LABELS[device]} (overrides)`
              : `${DEVICE_LABELS[device]} (base)`,
          }}
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
                    doc={doc}
                    device={device}
                    updateDoc={updateDoc}
                    onRemove={() => removeMenuBlock(selectedBlock.id)}
                    onMove={(dir) => moveMenuBlock(selectedBlock.id, dir)}
                  />
                ) : (
                  <MenuBarPanel
                    doc={doc}
                    device={device}
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
