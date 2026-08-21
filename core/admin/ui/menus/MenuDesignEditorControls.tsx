import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { RotateCcw, type LucideProps } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { resolveStoredMenuNavExtras } from "../../../services/menus/menuNavExtras";
import {
  buildMenuDocumentV2FromLegacy,
  createDefaultMenuDocumentV2,
  resolveMenuControlDefault,
  resolveStoredMenuDocument,
  type MenuBlockType,
  type MenuControlDefaultLevel,
  type MenuDocumentV2,
  type MenuResponsiveBreakpoint,
  type MenuSectionV2,
} from "../../../services/menus/menuDocumentV2";
import {
  menuAppearanceFontWeights,
  resolveStoredMenuAppearance,
} from "../../../services/menus/normalizeMenuAppearance";
import type { PageBreakpoint } from "../../../services/pages/pageDocumentV2";
import { loadFullTimelineIcons } from "../../../services/renderContracts/timelineIcons";
import {
  editorControlFocusClassFor,
  editorGhostButtonClassFor,
  editorPanelOptionActiveClass,
  useEditorControlTone,
} from "../pages/editorControls/controlChrome";

// --- undo/redo reducer atom -------------------------------------------------

export type HistoryState = {
  doc: MenuDocumentV2;
  past: MenuDocumentV2[];
  future: MenuDocumentV2[];
  dirty: boolean;
};

export type HistoryAction =
  | { type: "update"; updater: (doc: MenuDocumentV2) => MenuDocumentV2 }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; doc: MenuDocumentV2 }
  | { type: "hydrate"; doc: MenuDocumentV2 }
  | { type: "markSaved" };

export const HISTORY_LIMIT = 50;

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
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
export const seedMenuDocument = (settings: unknown): MenuDocumentV2 =>
  resolveStoredMenuDocument(settings) ??
  buildMenuDocumentV2FromLegacy(
    resolveStoredMenuAppearance(settings),
    resolveStoredMenuNavExtras(settings)
  ) ??
  createDefaultMenuDocumentV2();

// --- labels -----------------------------------------------------------------

export const MENU_BLOCK_LABELS: Record<MenuBlockType, string> = {
  "nav-items": "Navigation items",
  brand: "Brand",
  search: "Search",
  account: "Account",
  language: "Language",
  "cta-button": "Button",
  divider: "Divider",
  spacer: "Spacer",
};

export const ADD_BLOCK_TYPES: MenuBlockType[] = [
  "nav-items",
  "brand",
  "cta-button",
  "divider",
  "spacer",
];

export const DEVICE_LABELS: Record<PageBreakpoint, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

export const alignmentLabels: Record<string, string> = {
  start: "Start",
  center: "Center",
  end: "End",
  "space-between": "Spread",
};
export const textTransformLabels: Record<string, string> = {
  none: "None",
  uppercase: "Uppercase",
  capitalize: "Capitalize",
};
export const shadowLabels: Record<string, string> = { none: "None", sm: "Soft", md: "Strong" };
export const orientationLabels: Record<string, string> = {
  horizontal: "Horizontal",
  vertical: "Vertical",
};
export const dropdownDirectionLabels: Record<string, string> = { bottom: "Below", top: "Above" };
export const mobileModeLabels: Record<string, string> = {
  disclosure: "Collapsed",
  inline: "Inline",
};
// TASK-506 B1–B5 modern-styling enum option arrays + labels. Option arrays are
// the STORED tokens (never the display label); the leading "Default" sentinel
// is prepended by the seg/toggle helpers (writes `undefined` ⇒ present-only).
export const ITEM_DIVIDER_STYLE_OPTIONS = ["solid", "dashed", "dotted"] as const;
export const dividerStyleLabels: Record<string, string> = {
  solid: "Solid",
  dashed: "Dashed",
  dotted: "Dotted",
};
export const NAV_INDICATOR_OPTIONS = ["none", "underline", "overline"] as const;
export const indicatorLabels: Record<string, string> = {
  none: "None",
  underline: "Underline",
  overline: "Overline",
};
export const FLYOUT_ANIMATION_OPTIONS = ["none", "fade", "slide"] as const;
export const flyoutAnimationLabels: Record<string, string> = {
  none: "None",
  fade: "Fade",
  slide: "Slide",
};
export const SUBMENU_PLACEMENT_OPTIONS = ["right", "bottom", "left"] as const;
export const submenuPlacementLabels: Record<string, string> = {
  right: "Right",
  bottom: "Below",
  left: "Left",
};
// TASK-508 R1(b) — per-level dropdown link ALIGNMENT (levels 1/2). STORED tokens
// only; the `seg` helper prepends the "inherit"⇒"Default" sentinel. Byte-parity
// with menuDocumentV2's NAV_LINK_ALIGNS (same order + literals) so the segmented
// token the editor writes is the model's accepted enum (never fail-soft-dropped).
export const LINK_ALIGN_OPTIONS = ["left", "center", "right"] as const;
export const linkAlignLabels: Record<string, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
};
// TASK-508 R3a — nav-global submenu DIRECTION (governs EVERY flyout depth: the
// level-1 first dropdown AND level-2/3+ nested). Byte-parity with SUBMENU_DIRECTIONS.
export const SUBMENU_DIRECTION_OPTIONS = ["right", "down", "up", "left"] as const;
export const submenuDirectionLabels: Record<string, string> = {
  right: "Right",
  down: "Down",
  up: "Up",
  left: "Left",
};
// TASK-508 R3b — nav-global submenu MODE (flyout overlay vs in-flow accordion).
// Byte-parity with SUBMENU_MODES.
export const SUBMENU_MODE_OPTIONS = ["flyout", "accordion"] as const;
export const submenuModeLabels: Record<string, string> = {
  flyout: "Flyout",
  accordion: "Accordion",
};
export const FONT_WEIGHT_INHERIT = "inherit" as const;
export const fontWeightOptions = [
  FONT_WEIGHT_INHERIT,
  ...menuAppearanceFontWeights.map((w) => String(w)),
];
export const fontWeightLabels: Record<string, string> = {
  [FONT_WEIGHT_INHERIT]: "Theme",
  "400": "Regular",
  "500": "Medium",
  "600": "Semibold",
  "700": "Bold",
};
// TASK-504-04 §8 (defect B2): an UNSET nav `fontSize` emits `font-size:inherit`,
// which the theme resolves to ~16px (menuDocumentCss.ts) — NOT the misleading
// explicit 15 the slider showed before. The slider now displays this true
// inherited size at the unset position + an "Inherited" hint so unset (16) reads
// distinctly from an EXPLICIT 16. DISPLAY only — CSS emission is unchanged.
export const NAV_FONT_SIZE_INHERITED = 16;
export const toSwatchValue = (value: string) => (value === "transparent" ? "" : value);

// --- TASK-520-03 shared brand-icon / shadow chrome --------------------------
// Default icon color/size mirror the 520-01 model defaults (BRAND_STYLE_NUMBER_RANGES.iconSize
// floor is 12; the render fallback size is 24). Present-only: these are DISPLAY seeds for
// the unset controls, never written unless the author moves the control.
export const DEFAULT_BRAND_ICON_COLOR = "currentColor";
export const DEFAULT_BRAND_ICON_SIZE = 24;
/** Kebab lucide name ⇒ human label (mirrors the Timeline picker's humanizer). */
export const humanizeBrandIconName = (name: string) =>
  name.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
/** Lazily-loaded lucide component map (the FULL set, dynamic-imported off the initial bundle). */
export type BrandIconLibrary = {
  components: Record<string, ComponentType<LucideProps>>;
  names: string[];
};

/**
 * TASK-520-03-L01: a raw `box-shadow` value field (base + scrolled). The model
 * (520-01 `normalizeMenuBoxShadowValue`) is the authority — it DROPS anything
 * outside the bounded grammar on save/round-trip, so an invalid value re-reads
 * empty here (visible fail-soft). Live keystrokes ride the in-memory doc; the
 * server re-normalizes on PATCH.
 */
export function ShadowValueField({
  label,
  value,
  placeholder,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1" data-page-editor-control="shadow-value">
      <Input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? <p className="text-[10px] leading-snug text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

/**
 * TASK-520-03-L02: brand ICON picker — a lucide browser reusing the Timeline
 * `loadFullTimelineIcons` dynamic import (the full icon set stays OUT of the
 * initial admin static bundle). Stores the kebab name; an unknown/absent name
 * mirrors the render-time text fallback (no injectable markup). Clearing writes
 * `undefined` (present-only key removal).
 */
export function BrandIconPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (name: string | undefined) => void;
}) {
  const [library, setLibrary] = useState<BrandIconLibrary | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    void loadFullTimelineIcons().then((lib) => {
      if (active) setLibrary(lib);
    });
    return () => {
      active = false;
    };
  }, []);
  const names = library?.names ?? [];
  const components = library?.components;
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, "-");
  const matches = (
    normalizedQuery ? names.filter((name) => name.includes(normalizedQuery)) : names
  ).slice(0, 120);
  const Current = value && components ? components[value] : undefined;
  return (
    <div className="grid gap-2" data-menu-brand-icon-picker="true">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground">
          {Current ? (
            <Current className="h-4 w-4" aria-hidden="true" />
          ) : (
            <span className="text-[10px] leading-none text-muted-foreground" aria-hidden="true">
              —
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground" data-menu-brand-icon-current={value ?? ""}>
          {value
            ? components && !Current
              ? `“${value}” not found`
              : humanizeBrandIconName(value)
            : "No icon selected"}
        </span>
        {value ? (
          <button
            type="button"
            aria-label="Clear icon"
            onClick={() => onChange(undefined)}
            className="ml-auto rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition hover:text-primary"
          >
            Clear
          </button>
        ) : null}
      </div>
      {!components ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Loading icons…</p>
      ) : (
        <>
          <Input
            aria-label="Search brand icons"
            value={query}
            placeholder={`Search ${names.length.toLocaleString()} icons...`}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ScrollArea className="h-48 rounded-md border">
            <div className="grid grid-cols-6 gap-1.5 p-2">
              {matches.map((name) => {
                const Icon = components[name];
                if (!Icon) return null;
                return (
                  <button
                    key={name}
                    type="button"
                    aria-label={humanizeBrandIconName(name)}
                    title={humanizeBrandIconName(name)}
                    data-menu-brand-icon-pick={name}
                    onClick={() => onChange(name)}
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-md border transition",
                      value === name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            {matches.length === 0 ? (
              <p className="px-2 pb-3 text-xs text-muted-foreground">No icons match “{query}”.</p>
            ) : null}
          </ScrollArea>
        </>
      )}
    </div>
  );
}

// --- selectable canvas ------------------------------------------------------

export function SelectableBlock({
  id,
  selected,
  ghost = false,
  onSelect,
  children,
}: {
  id: string;
  selected: boolean;
  /** TASK-502-04: the block is hidden on the current device — dim it to a
   * selectable ghost (opacity + "Hidden" badge) instead of skipping it. */
  ghost?: boolean;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div
      data-menu-block-id={id}
      data-menu-block-ghost={ghost ? "true" : undefined}
      data-menu-block-selected={selected ? "true" : "false"}
      onClick={(event) => {
        // Real leaf previews (cta/divider) render live anchors/buttons; keep the
        // canvas click intercept + preventDefault so a preview link SELECTS the
        // block instead of navigating away from the editor.
        event.stopPropagation();
        event.preventDefault();
        onSelect(id);
      }}
      className={cn(
        // Chrome-safety (TASK-502-04 §2): the canvas frame repaints the SITE
        // `--color-primary`, so the selection ring is pinned to an admin var
        // (NOT `ring-primary`) to stay admin-themed and immune to token paint.
        "relative cursor-pointer rounded-lg outline-none transition-shadow",
        selected && "ring-2 ring-[color:var(--admin-input-ring,#7c3aed)]"
      )}
    >
      {children}
      {ghost ? (
        <span
          aria-hidden="true"
          data-menu-block-hidden-badge="true"
          className="pointer-events-none absolute -top-2 right-1 z-10 rounded-full bg-muted px-1.5 text-[9px] font-semibold uppercase text-muted-foreground shadow-sm"
        >
          Hidden
        </span>
      ) : null}
    </div>
  );
}

/**
 * Canvas visibility presentation (TASK-502-04 §3). The 502-02 preview builder
 * emits NO `[data-menu-block-id]{display:none}` hide rules, so the ghost gate
 * is the SOLE owner of canvas visibility. These rules are DEFENSE IN DEPTH:
 * appended AFTER the builder CSS (later source order + equal specificity) so a
 * stray hide rule reaching the canvas `<style>` can never `display:none` a
 * ghost subtree — force-show only applies to `data-menu-block-ghost` subtrees
 * and is inert against a compliant builder. The nested `[data-block-id]` revert
 * covers real leaf frames (PageBlockFrame) inside a ghost.
 */
export const isMenuOverrideDevice = (device: PageBreakpoint): device is MenuResponsiveBreakpoint =>
  device !== "desktop";

type MenuResponsiveBadgeState = "base" | "override" | "inherited";

/** Per-breakpoint copy (bounded tablet window per `pageResponsiveMediaBounds.tablet`). */
export const menuResponsiveBadgeDescription = (
  state: MenuResponsiveBadgeState,
  device: PageBreakpoint
): string =>
  state === "base"
    ? "Editing the base value (applies to every device)."
    : state === "override"
      ? device === "tablet"
        ? "Tablet override — this value replaces the desktop value between 640px and 1023px."
        : "Mobile override — this value replaces the desktop value below 640px."
      : `Inherited from desktop. Edit to create a ${DEVICE_LABELS[device].toLowerCase()} override.`;

export function MenuResponsiveStateBadge({
  state,
  device,
}: {
  state: MenuResponsiveBadgeState;
  device: PageBreakpoint;
}) {
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
        {menuResponsiveBadgeDescription(state, device)}
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
export function MenuResponsiveControlShell({
  device,
  override,
  hasBaseValue,
  label,
  onReset,
  onResetBase,
  children,
}: {
  device: PageBreakpoint;
  /** Computed from the BASE record by the caller, never from resolved values. */
  override: boolean;
  /**
   * TASK-506-04 F1: does the control's OWN DESKTOP-BASE record carry an explicit
   * value? OPTIONAL — un-migrated callers omit it (+ `onResetBase`) and keep the
   * exact device-only Reset behaviour (501/504 byte-identity). When present on
   * desktop it renders the "Reset to default" base-clear affordance.
   */
  hasBaseValue?: boolean;
  /** Control label used in the reset affordance accessible name + data hook. */
  label: string;
  onReset: () => void;
  /** TASK-506-04 F1: base-clear (desktop). Paired with `hasBaseValue`. */
  onResetBase?: () => void;
  children: ReactNode;
}) {
  const tone = useEditorControlTone();
  const state: MenuResponsiveBadgeState = !isMenuOverrideDevice(device)
    ? "base"
    : override
      ? "override"
      : "inherited";
  // Show Reset for a tablet/mobile override (as before) OR — new — a value
  // authored on the DESKTOP BASE (state === "base", desktop-only by construction).
  const showDeviceReset = state === "override";
  const showBaseReset = state === "base" && hasBaseValue === true && onResetBase != null;
  const showReset = showDeviceReset || showBaseReset;
  return (
    <div className="grid min-w-0 gap-1" data-menu-responsive-field={state}>
      {children}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <MenuResponsiveStateBadge state={state} device={device} />
        {showReset ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={
                  showBaseReset ? `Reset ${label} to default` : `Reset ${label} to inherited`
                }
                // Keep the label-keyed hook stable for existing 501/504 tests; add
                // a distinct `-kind` sub-hook so 506 tests target the base branch.
                data-menu-responsive-reset={label}
                data-menu-responsive-reset-kind={showBaseReset ? "base" : "override"}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${editorGhostButtonClassFor(
                  tone
                )} ${editorControlFocusClassFor(tone)}`}
                onClick={showBaseReset ? onResetBase : onReset}
              >
                <RotateCcw className="h-3 w-3" />
                {showBaseReset ? "Reset to default" : "Reset"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
              {showBaseReset
                ? `Clear the authored ${label.toLowerCase()} and fall back to the theme / inherited default.`
                : `Remove the ${DEVICE_LABELS[device].toLowerCase()} override and inherit the desktop value.`}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

/**
 * TASK-506-04 F2: the single reusable resolved-default hint. Renders ONLY when
 * the control's OWN record is unset, surfacing the EFFECTIVE value + human
 * source from the model provider `resolveMenuControlDefault` (the editor never
 * hardcodes a default). Generalizes the bespoke nav-base `fontSize`
 * "Inherited from theme (16px)" span. Present-only: nothing resolvable ⇒ null.
 * `isSet` MUST be the device-appropriate RAW own read (desktop base OR device
 * override) — NEVER the resolved value, else on an override device an unset
 * field (which resolves to the inherited desktop value) would suppress the
 * mandated "Inherited from desktop" hint.
 */
export function ControlDefaultHint({
  section,
  device,
  level,
  propKey,
  isSet,
}: {
  section: MenuSectionV2 | undefined;
  device: PageBreakpoint;
  level: MenuControlDefaultLevel;
  propKey: string;
  isSet: boolean;
}) {
  if (isSet || !section) return null;
  const { value, sourceLabel } = resolveMenuControlDefault(section, device, level, propKey);
  // TASK-507 FIX B: any resolved default value of `undefined` hides the hint. The
  // gated present-only numerics (indicatorThickness, itemDividerWidth, transitionMs,
  // hoverLift, navPillRadius/PaddingX/PaddingY) intentionally
  // resolve to { value: undefined, sourceLabel: "Off" | "Not applied" } PRECISELY so
  // the hint is HIDDEN — the prior stricter guard (also requiring "Not set") RENDERED
  // them, producing mixed messaging (thumb at range.min while the hint said "Off").
  if (value === undefined) return null;
  return (
    <span
      data-menu-control-default-hint={propKey}
      data-menu-control-default-source={sourceLabel}
      className="text-[10px] font-medium text-muted-foreground"
    >
      {sourceLabel}
    </span>
  );
}
