import { type ReactNode } from "react";
import { ArrowDown, ArrowUp, EyeOff, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  clearMenuSectionBase,
  clearMenuSectionOverride,
  patchMenuSectionForDevice,
  readMenuSectionBaseValue,
  readMenuSectionOverrideValue,
  resolveMenuBlockVisibleForDevice,
  resolveMenuSectionAppearanceForDevice,
  MENU_BAR_LAYOUT_NUMBER_RANGES,
  type MenuBarLayout,
  type MenuBlockType,
  type MenuBlockV2,
  type MenuDocumentV2,
  type NavLevelStyleLevel,
} from "../../../services/menus/menuDocumentV2";
import {
  menuAppearanceAlignments,
  menuAppearanceNumberRanges,
  menuAppearanceShadows,
} from "../../../services/menus/normalizeMenuAppearance";
import type { PageBreakpoint } from "../../../services/pages/pageDocumentV2";
import { type PageEditorColorSwatch } from "../../../services/pages/pageEditorControlUiModel";
import { SHELL_APPEARANCE_DEFAULTS } from "../../../site/siteShellCss";
import {
  ColorSwatchControl,
  SegmentedControl,
  SliderControl,
  ToggleSwitch,
} from "../pages/editorControls";
import {
  editorPanelOptionActiveClass,
  useEditorControlTone,
} from "../pages/editorControls/controlChrome";

import {
  MENU_BLOCK_LABELS,
  ADD_BLOCK_TYPES,
  DEVICE_LABELS,
  alignmentLabels,
  shadowLabels,
  toSwatchValue,
  ShadowValueField,
  isMenuOverrideDevice,
  MenuResponsiveControlShell,
  ControlDefaultHint,
} from "./MenuDesignEditorControls";

// --- control panels ---------------------------------------------------------

export type UpdateDoc = (updater: (doc: MenuDocumentV2) => MenuDocumentV2) => void;

/**
 * Device-forked layout writer (TASK-501-03): Desktop/Tablet write the base
 * `section.layout`; Mobile writes the SPARSE `responsive.mobile.layout`
 * override. `patchMenuSectionForDevice` honors `undefined` ⇒
 * delete-key-from-target on BOTH device paths (base-key delete on
 * desktop/tablet; override-leaf delete + prune chain on mobile — never an own
 * `undefined` key), matching the previous flat delete-on-undefined semantics.
 */
export const setLayoutField =
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

export const patchBlock =
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

export function MenuBarPanel({
  doc,
  device,
  palette,
  updateDoc,
  onSelectBlock,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
}: {
  doc: MenuDocumentV2;
  device: PageBreakpoint;
  /** Site-resolved swatch palette so preset swatches preview their REAL colors. */
  palette: readonly PageEditorColorSwatch[];
  updateDoc: UpdateDoc;
  onSelectBlock: (id: string) => void;
  onAddBlock: (type: MenuBlockType) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock: (id: string, dir: "up" | "down") => void;
}) {
  const section = doc.sections[0];
  // Panels DISPLAY resolved values (base merged with the device override)…
  const layout: MenuBarLayout = section
    ? resolveMenuSectionAppearanceForDevice(section, device).layout
    : {};
  const blocks = section?.blocks ?? [];
  const setField = setLayoutField(updateDoc, device);
  // TASK-520-03-L01: extended to the scrolled color variants (null ⇒ transparent,
  // same contract as the two base keys).
  const setColor =
    (field: "surfaceColor" | "borderColor" | "surfaceColorScrolled" | "borderColorScrolled") =>
    (value: string | null) =>
      setField(field, value === null ? "transparent" : value);
  // …while override DETECTION reads the raw BASE record for the CURRENT override
  // breakpoint (tablet OR mobile) — never the resolved merge, never desktop.
  const layoutOverride = (key: keyof MenuBarLayout) =>
    section !== undefined &&
    isMenuOverrideDevice(device) &&
    readMenuSectionOverrideValue(section, device, "layout", key) !== undefined;
  const resetLayout = (key: keyof MenuBarLayout) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target && isMenuOverrideDevice(device)
        ? clearMenuSectionOverride(current, target.id, device, "layout", key)
        : current;
    });
  // TASK-506-04 F1: layout base-value predicate + desktop base-clear. Layout keys
  // are `keyof MenuBarLayout ⊆ keyof MenuAppearance`, so they thread the flat
  // `clearMenuSectionBase(..,"layout",..)` / `readMenuSectionBaseValue`. F2 `isSet`
  // stays the device-appropriate own read.
  const layoutBaseValue = (key: keyof MenuBarLayout) =>
    section !== undefined && readMenuSectionBaseValue(section, "layout", key) !== undefined;
  const layoutIsSet = (key: keyof MenuBarLayout) =>
    isMenuOverrideDevice(device) ? layoutOverride(key) : layoutBaseValue(key);
  const resetLayoutBase = (key: keyof MenuBarLayout) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target ? clearMenuSectionBase(current, target.id, "layout", key) : current;
    });
  const layoutControl = (key: keyof MenuBarLayout, label: string, node: ReactNode) => (
    <MenuResponsiveControlShell
      device={device}
      override={layoutOverride(key)}
      hasBaseValue={layoutBaseValue(key)}
      label={label}
      onReset={resetLayout(key)}
      onResetBase={resetLayoutBase(key)}
    >
      <div className="grid gap-1">
        {node}
        <ControlDefaultHint
          section={section}
          device={device}
          level="base"
          propKey={key}
          isSet={layoutIsSet(key)}
        />
      </div>
    </MenuResponsiveControlShell>
  );

  return (
    <div className="flex flex-col gap-4" data-menu-bar-panel="true">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Menu bar
        </p>
        <div className="grid gap-3">
          {layoutControl(
            "surfaceColor",
            "Surface color",
            <ColorSwatchControl
              label="Surface color"
              palette={palette}
              value={toSwatchValue(layout.surfaceColor ?? SHELL_APPEARANCE_DEFAULTS.surfaceColor)}
              onChange={setColor("surfaceColor")}
            />
          )}
          {layoutControl(
            "borderColor",
            "Border color",
            <ColorSwatchControl
              label="Border color"
              palette={palette}
              value={toSwatchValue(layout.borderColor ?? SHELL_APPEARANCE_DEFAULTS.borderColor)}
              onChange={setColor("borderColor")}
            />
          )}
          {layoutControl(
            "alignment",
            "Alignment",
            <SegmentedControl
              label="Alignment"
              value={layout.alignment ?? SHELL_APPEARANCE_DEFAULTS.alignment}
              options={menuAppearanceAlignments}
              optionLabels={alignmentLabels}
              onChange={(next) => setField("alignment", next as MenuBarLayout["alignment"])}
            />
          )}
          {layoutControl(
            "paddingX",
            "Horizontal padding",
            <SliderControl
              label="Horizontal padding"
              value={layout.paddingX ?? SHELL_APPEARANCE_DEFAULTS.paddingX}
              min={menuAppearanceNumberRanges.paddingX.min}
              max={menuAppearanceNumberRanges.paddingX.max}
              step={1}
              unit="px"
              onChange={(next) => setField("paddingX", next)}
            />
          )}
          {layoutControl(
            "paddingY",
            "Vertical padding",
            <SliderControl
              label="Vertical padding"
              value={layout.paddingY ?? SHELL_APPEARANCE_DEFAULTS.paddingY}
              min={menuAppearanceNumberRanges.paddingY.min}
              max={menuAppearanceNumberRanges.paddingY.max}
              step={1}
              unit="px"
              onChange={(next) => setField("paddingY", next)}
            />
          )}
          {layoutControl(
            "borderWidth",
            "Border width",
            <SliderControl
              label="Border width"
              value={layout.borderWidth ?? SHELL_APPEARANCE_DEFAULTS.borderWidth}
              min={menuAppearanceNumberRanges.borderWidth.min}
              max={menuAppearanceNumberRanges.borderWidth.max}
              step={1}
              unit="px"
              onChange={(next) => setField("borderWidth", next)}
            />
          )}
          {layoutControl(
            "shadow",
            "Shadow",
            <SegmentedControl
              label="Shadow"
              value={layout.shadow ?? SHELL_APPEARANCE_DEFAULTS.shadow}
              options={menuAppearanceShadows}
              optionLabels={shadowLabels}
              onChange={(next) => setField("shadow", next as MenuBarLayout["shadow"])}
            />
          )}
          {/* TASK-520-03-L01 G2 — floating-card menu bar: corner radius (present-only,
              NO resolved-default hint since it is held out of MENU_BAR_LAYOUT_KEYS). */}
          {layoutControl(
            "radius",
            "Corner radius",
            <SliderControl
              label="Corner radius"
              value={layout.radius ?? 0}
              min={MENU_BAR_LAYOUT_NUMBER_RANGES.radius.min}
              max={MENU_BAR_LAYOUT_NUMBER_RANGES.radius.max}
              step={1}
              unit="px"
              onChange={(next) => setField("radius", next)}
            />
          )}
          {/* TASK-520-03-L01 G2 — custom box-shadow: OVERRIDES the preset above. An
              invalid value is DROPPED by the 520-01 normalizer on save (re-reads empty). */}
          {layoutControl(
            "shadowCustom",
            "Custom shadow",
            <ShadowValueField
              label="Custom shadow"
              placeholder="e.g. 0 18px 50px rgba(0,0,0,.24)"
              helper="Overrides the shadow preset. Color accepts hex, rgb/rgba, hsl/hsla, var(--color-*) or transparent (same as other color fields)."
              value={layout.shadowCustom ?? ""}
              onChange={(v) => setField("shadowCustom", v.trim() === "" ? undefined : v)}
            />
          )}
          {layoutControl(
            "sticky",
            "Sticky header",
            <ToggleSwitch
              label="Sticky header"
              value={layout.sticky ?? SHELL_APPEARANCE_DEFAULTS.sticky}
              onChange={(next) => setField("sticky", next)}
            />
          )}
          {/* TASK-520-03-L01 G1 — scrolled/floating-state variants. Only meaningful
              while the bar is sticky, so the whole group is gated on `layout.sticky`.
              Every key is present-only (unset ⇒ falls back to the base value at emit)
              and shows NO resolved-default hint (held out of MENU_BAR_LAYOUT_KEYS). */}
          {layout.sticky ? (
            <div className="grid gap-3" data-menu-scrolled-group="true">
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Scrolled state
              </p>
              {layoutControl(
                "surfaceColorScrolled",
                "Scrolled surface",
                <ColorSwatchControl
                  label="Scrolled surface"
                  palette={palette}
                  value={toSwatchValue(
                    layout.surfaceColorScrolled ??
                      layout.surfaceColor ??
                      SHELL_APPEARANCE_DEFAULTS.surfaceColor
                  )}
                  onChange={setColor("surfaceColorScrolled")}
                />
              )}
              {layoutControl(
                "borderColorScrolled",
                "Scrolled border",
                <ColorSwatchControl
                  label="Scrolled border"
                  palette={palette}
                  value={toSwatchValue(
                    layout.borderColorScrolled ??
                      layout.borderColor ??
                      SHELL_APPEARANCE_DEFAULTS.borderColor
                  )}
                  onChange={setColor("borderColorScrolled")}
                />
              )}
              {layoutControl(
                "borderWidthScrolled",
                "Scrolled border width",
                <SliderControl
                  label="Scrolled border width"
                  value={
                    layout.borderWidthScrolled ??
                    layout.borderWidth ??
                    SHELL_APPEARANCE_DEFAULTS.borderWidth
                  }
                  min={menuAppearanceNumberRanges.borderWidth.min}
                  max={menuAppearanceNumberRanges.borderWidth.max}
                  step={1}
                  unit="px"
                  onChange={(next) => setField("borderWidthScrolled", next)}
                />
              )}
              {layoutControl(
                "shadowScrolled",
                "Scrolled shadow preset",
                <SegmentedControl
                  label="Scrolled shadow preset"
                  value={layout.shadowScrolled ?? layout.shadow ?? "none"}
                  options={menuAppearanceShadows}
                  optionLabels={shadowLabels}
                  onChange={(next) =>
                    setField("shadowScrolled", next as MenuBarLayout["shadowScrolled"])
                  }
                />
              )}
              {layoutControl(
                "shadowCustomScrolled",
                "Scrolled custom shadow",
                <ShadowValueField
                  label="Scrolled custom shadow"
                  placeholder="0 18px 50px rgba(0,0,0,.24)"
                  helper="Overrides the scrolled preset."
                  value={layout.shadowCustomScrolled ?? ""}
                  onChange={(v) =>
                    setField("shadowCustomScrolled", v.trim() === "" ? undefined : v)
                  }
                />
              )}
            </div>
          ) : null}
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

// --- TASK-504-04 brand + per-level control sets ------------------------------

/**
 * Level-inheritance badge (orthogonal to the device Base/Override/Inherited
 * badge): does THIS level explicitly set the field, or does it inherit level
 * N-1 via the pure CSS cascade (504-02 emits level 0 → 1 → 2, each only its own
 * overrides)? Reuses the `MenuResponsiveStateBadge` pill chrome.
 */
export function NavLevelInheritBadge({
  level,
  overridden,
}: {
  level: NavLevelStyleLevel;
  overridden: boolean;
}) {
  const tone = useEditorControlTone();
  const isLight = tone === "light";
  return (
    <span
      data-menu-level-field={overridden ? "override" : "inherited"}
      className={`self-start rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
        overridden
          ? isLight
            ? editorPanelOptionActiveClass
            : "bg-sky-400/20 text-sky-200"
          : isLight
            ? "bg-muted text-muted-foreground"
            : "bg-white/10 text-slate-400"
      }`}
    >
      {overridden ? "This level" : `Inherits level ${level - 1}`}
    </span>
  );
}

/**
 * Brand logo picker (defect B1): resolves the picked library asset id to its
 * URL and stores it as `brand.props.image.src` — the SAME `{src}`-resolvable
 * shape `resolveBrandImageSrc` (front + canvas) reads. Mirrors the Pages
 * `ToolbarMediaUrlField`: the stored contract is a URL, never a bare asset id
 * (a bare id never resolves to a `src`, so the logo would never render). The
 * media-list load is a data-fetch effect (NOT setState-from-props), matching the
 * existing item-load effect + the Pages pattern.
 */
