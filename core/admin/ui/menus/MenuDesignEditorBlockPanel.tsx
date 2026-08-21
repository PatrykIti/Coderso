import { type ReactNode } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  clearMenuBlockVisibilityOverride,
  clearMenuNavChromeBase,
  clearMenuNavChromeOverride,
  clearMenuSectionBase,
  clearMenuSectionOverride,
  patchMenuNavChromeForDevice,
  patchMenuSectionForDevice,
  readMenuNavChromeBaseValue,
  readMenuNavChromeOverrideValue,
  readMenuSectionBaseValue,
  readMenuSectionOverrideValue,
  resolveMenuBlockVisibleForDevice,
  resolveMenuControlDefault,
  resolveMenuNavChrome,
  resolveMenuSectionAppearanceForDevice,
  setMenuBlockVisibleForDevice,
  MENU_BRAND_TEXT_MAX_LENGTH,
  NAV_CHROME_NUMBER_RANGES,
  NAV_LINK_NUMBER_RANGES,
  type MenuBlockV2,
  type MenuDocumentV2,
  type NavChromeStyle,
  type NavItemsProps,
} from "../../../services/menus/menuDocumentV2";
import {
  menuAppearanceDropdownDirections,
  menuAppearanceMobileModes,
  menuAppearanceNumberRanges,
  menuAppearanceOrientations,
  menuAppearanceTextTransforms,
  type MenuAppearance,
  type MenuAppearanceFontWeight,
} from "../../../services/menus/normalizeMenuAppearance";
import type { PageBreakpoint } from "../../../services/pages/pageDocumentV2";
import {
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
} from "../../../services/pages/pageDocumentV2";
import { type PageEditorColorSwatch } from "../../../services/pages/pageEditorControlUiModel";
import { SHELL_APPEARANCE_DEFAULTS } from "../../../site/siteShellCss";
import {
  ColorSwatchControl,
  SegmentedControl,
  SliderControl,
  ToggleSwitch,
} from "../pages/editorControls";

import {
  MENU_BLOCK_LABELS,
  DEVICE_LABELS,
  textTransformLabels,
  orientationLabels,
  dropdownDirectionLabels,
  mobileModeLabels,
  ITEM_DIVIDER_STYLE_OPTIONS,
  dividerStyleLabels,
  NAV_INDICATOR_OPTIONS,
  indicatorLabels,
  SUBMENU_DIRECTION_OPTIONS,
  submenuDirectionLabels,
  SUBMENU_MODE_OPTIONS,
  submenuModeLabels,
  FONT_WEIGHT_INHERIT,
  fontWeightOptions,
  fontWeightLabels,
  NAV_FONT_SIZE_INHERITED,
  toSwatchValue,
  BrandIconPicker,
  isMenuOverrideDevice,
  MenuResponsiveControlShell,
  ControlDefaultHint,
} from "./MenuDesignEditorControls";
import {
  BrandLogoPicker,
  BrandStyleControls,
  NavLevelControls,
} from "./MenuDesignEditorBrandNavControls";
import { patchBlock, type UpdateDoc } from "./MenuDesignEditorBarPanel";

export function MenuBlockPanel({
  block,
  doc,
  device,
  palette,
  siteName,
  updateDoc,
  onRemove,
  onMove,
  navLevel,
  onNavLevelChange,
}: {
  block: MenuBlockV2;
  doc: MenuDocumentV2;
  device: PageBreakpoint;
  /** Site-resolved swatch palette so preset swatches preview their REAL colors. */
  palette: readonly PageEditorColorSwatch[];
  /** Site name for the brand-text placeholder (the default the front renders). */
  siteName: string | null;
  updateDoc: UpdateDoc;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  /** TASK-504-04 §4: the selected nesting level (0 = nav base; 1/2 = levelStyles).
   * Owned by the top-level component so the canvas force-open stays in sync. */
  navLevel: 0 | 1 | 2;
  onNavLevelChange: (level: 0 | 1 | 2) => void;
}) {
  // patchBlock stays FLAT and device-invariant: content writes (brand/cta/
  // utility label/href/variant/logo/size/target) are NOT device-forked.
  const patch = patchBlock(updateDoc);

  const section = doc.sections[0];
  // Resolved nav appearance for DISPLAY (base merged with the device override;
  // base navProps = the FIRST nav-items block's props, mirroring the CSS
  // pipeline's collectMenuAppearance binding).
  const navProps: NavItemsProps = section
    ? resolveMenuSectionAppearanceForDevice(section, device).navProps
    : {};
  // Override detection reads the raw BASE record for the CURRENT override
  // breakpoint (tablet OR mobile), never the resolved merge, never desktop.
  // TASK-504-01: `NavItemsProps` widened with the non-appearance `levelStyles`
  // member, so its keyof no longer ⊆ `keyof MenuAppearance`. These closures only
  // ever handle FLAT scalar overrides (levelStyles rides the dedicated 504-01
  // nav-level helpers), so they are annotated `keyof MenuAppearance` directly.
  const navOverride = (key: keyof MenuAppearance) =>
    section !== undefined &&
    isMenuOverrideDevice(device) &&
    readMenuSectionOverrideValue(section, device, "navProps", key) !== undefined;
  const resetNav = (key: keyof MenuAppearance) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target && isMenuOverrideDevice(device)
        ? clearMenuSectionOverride(current, target.id, device, "navProps", key)
        : current;
    });
  /**
   * Device-forked nav appearance writer: Desktop ⇒ the FIRST nav-items block's
   * base props; tablet/mobile ⇒ sparse `responsive.{device}.navProps`.
   * NORMATIVE (501-01 §3): `patchMenuSectionForDevice` targets the FIRST
   * nav-items block regardless of which nav-items block is selected — the
   * section-level override record can only represent one nav-items block.
   * `undefined` ⇒ delete-key-from-target on every device path (the sole
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

  /**
   * BASE-writing sibling of setNavField for the DEVICE-DEFINING nav props
   * (`MENU_NAV_DEVICE_DEFINING_KEYS` in menuDocumentV2 — mobileMode +
   * dropdownDirection). These are NOT overridable: they always write the BASE
   * (device literal "desktop") regardless of the current device, so no dead
   * override record is ever stored (the 501 residual this kills). 502-01's
   * write-reject + stored-read migration guarantee `resolved ≡ base` here.
   */
  const setNavBaseField = <K extends keyof NavItemsProps>(field: K, value: NavItemsProps[K]) =>
    updateDoc((current) => {
      const target = current.sections[0];
      if (!target) return current;
      return patchMenuSectionForDevice(current, target.id, "desktop", "navProps", {
        [field]: value,
      } as NavItemsProps);
    });

  // --- TASK-506-04 F1 nav-base (flat scalar) base-reset + F2 hint plumbing -----
  // Base predicate reads the raw DESKTOP base props (no device guard); `isSet`
  // stays the device-appropriate own read so the "Inherited from desktop" hint
  // survives on override devices. Device-defining keys are EXCLUDED (they carry
  // resolution defaults + render un-wrapped).
  const navBaseValue = (key: keyof MenuAppearance) =>
    section !== undefined && readMenuSectionBaseValue(section, "navProps", key) !== undefined;
  const navBaseIsSet = (key: keyof MenuAppearance) =>
    isMenuOverrideDevice(device) ? navOverride(key) : navBaseValue(key);
  const resetNavBase = (key: keyof MenuAppearance) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target ? clearMenuSectionBase(current, target.id, "navProps", key) : current;
    });
  // A nav-base scalar shell = MenuResponsiveControlShell (device Reset + base
  // Reset) + the F2 default hint (level 0). Wraps the existing inline shells.
  const navBaseControl = (key: keyof MenuAppearance, label: string, node: ReactNode) => (
    <MenuResponsiveControlShell
      device={device}
      override={navOverride(key)}
      hasBaseValue={navBaseValue(key)}
      label={label}
      onReset={resetNav(key)}
      onResetBase={resetNavBase(key)}
    >
      <div className="grid gap-1">
        {node}
        <ControlDefaultHint
          section={section}
          device={device}
          level={0}
          propKey={key}
          isSet={navBaseIsSet(key)}
        />
      </div>
    </MenuResponsiveControlShell>
  );

  // --- TASK-506-04 level-0 navChrome (Option B sub-record) — B1/B2/B3/B4 ------
  // DISPLAY value = the RESOLVED per-device merge (base ⊕ device), NOT the raw
  // base, so tablet/mobile controls show the inherited-desktop value. The desktop
  // -base vs responsive branch split lives entirely in `patchMenuNavChromeForDevice`.
  const chromeStyle: NavChromeStyle = section ? resolveMenuNavChrome(section, device) : {};
  const chromeOverride = (key: keyof NavChromeStyle) =>
    section !== undefined &&
    isMenuOverrideDevice(device) &&
    readMenuNavChromeOverrideValue(section, device, key) !== undefined;
  const chromeBaseValue = (key: keyof NavChromeStyle) =>
    section !== undefined && readMenuNavChromeBaseValue(section, key) !== undefined;
  const chromeIsSet = (key: keyof NavChromeStyle) =>
    isMenuOverrideDevice(device) ? chromeOverride(key) : chromeBaseValue(key);
  const setChromeField = <K extends keyof NavChromeStyle>(
    key: K,
    value: NavChromeStyle[K] | undefined
  ) =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target
        ? patchMenuNavChromeForDevice(current, target.id, device, {
            [key]: value,
          } as Partial<NavChromeStyle>)
        : current;
    });
  const resetChrome = (key: keyof NavChromeStyle) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target && isMenuOverrideDevice(device)
        ? clearMenuNavChromeOverride(current, target.id, device, key)
        : current;
    });
  const resetChromeBase = (key: keyof NavChromeStyle) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target ? clearMenuNavChromeBase(current, target.id, key) : current;
    });
  const chromeControl = (key: keyof NavChromeStyle, label: string, node: ReactNode) => (
    <MenuResponsiveControlShell
      device={device}
      override={chromeOverride(key)}
      hasBaseValue={chromeBaseValue(key)}
      label={label}
      onReset={resetChrome(key)}
      onResetBase={resetChromeBase(key)}
    >
      <div className="grid gap-1">
        {node}
        <ControlDefaultHint
          section={section}
          device={device}
          level={0}
          propKey={key}
          isSet={chromeIsSet(key)}
        />
      </div>
    </MenuResponsiveControlShell>
  );
  const chromeSwatch = (key: keyof NavChromeStyle, label: string) => (
    <ColorSwatchControl
      label={label}
      palette={palette}
      value={toSwatchValue((chromeStyle[key] as string | undefined) ?? "inherit")}
      onChange={(value) => setChromeField(key, value === null ? undefined : (value as never))}
    />
  );
  const chromeSlider = (key: keyof typeof NAV_CHROME_NUMBER_RANGES, label: string, unit = "px") => {
    const resolved = chromeStyle[key] as number | undefined;
    const fallback = section
      ? (resolveMenuControlDefault(section, device, 0, key).value as number | undefined)
      : undefined;
    return (
      <SliderControl
        label={label}
        value={resolved ?? fallback ?? NAV_CHROME_NUMBER_RANGES[key].min}
        min={NAV_CHROME_NUMBER_RANGES[key].min}
        max={NAV_CHROME_NUMBER_RANGES[key].max}
        step={1}
        unit={unit}
        onChange={(next) => setChromeField(key, next as never)}
      />
    );
  };
  const chromeSeg = (
    key: keyof NavChromeStyle,
    label: string,
    options: readonly string[],
    labels: Record<string, string>
  ) => (
    <SegmentedControl
      label={label}
      value={(chromeStyle[key] as string | undefined) ?? "inherit"}
      options={["inherit", ...options]}
      optionLabels={{ inherit: "Default", ...labels }}
      onChange={(next) => setChromeField(key, next === "inherit" ? undefined : (next as never))}
    />
  );
  // TASK-508 R3a/R3b — BASE-only writer for the structural nav-GLOBAL keys
  // (submenuDirection / submenuMode). These are >=640 structural axes with NO
  // tablet-delta emitter in menuDocumentCss (collectChromeDeltaRules re-runs
  // navChromeRules, which carries ZERO direction/accordion bytes), so a device
  // override would be DEAD DATA behind a misleading badge/Reset. Hardcode
  // device:"desktop" so the BASE navChrome record is written on ANY active device
  // (like dropdownDirection @setNavBaseField). Clearing to "inherit" ⇒ undefined ⇒
  // present-only ⇒ ZERO bytes (the CSS resolver falls back to the model default).
  const setChromeBaseField = <K extends keyof NavChromeStyle>(
    key: K,
    value: NavChromeStyle[K] | undefined
  ) =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target
        ? patchMenuNavChromeForDevice(current, target.id, "desktop", {
            [key]: value,
          } as Partial<NavChromeStyle>)
        : current;
    });
  const chromeBaseSeg = (
    key: keyof NavChromeStyle,
    label: string,
    options: readonly string[],
    labels: Record<string, string>
  ) => (
    <SegmentedControl
      label={label}
      value={
        (section ? (readMenuNavChromeBaseValue(section, key) as string | undefined) : undefined) ??
        "inherit"
      }
      options={["inherit", ...options]}
      optionLabels={{ inherit: "Default", ...labels }}
      onChange={(next) => setChromeBaseField(key, next === "inherit" ? undefined : (next as never))}
    />
  );
  const chromeToggle = (key: keyof NavChromeStyle, label: string) => (
    <SegmentedControl
      label={label}
      value={chromeStyle[key] === true ? "on" : chromeStyle[key] === false ? "off" : "inherit"}
      options={["inherit", "off", "on"]}
      optionLabels={{ inherit: "Default", off: "Off", on: "On" }}
      onChange={(next) =>
        setChromeField(key, next === "inherit" ? undefined : ((next === "on") as never))
      }
    />
  );

  const visibleOnDevice = resolveMenuBlockVisibleForDevice(block, device);
  const visibilityOverride =
    isMenuOverrideDevice(device) && block.responsive?.[device]?.visibility !== undefined;
  const deviceLabelLower = DEVICE_LABELS[device].toLowerCase();

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
        // Tablet AND Mobile: EVERY block type gets a per-device visibility
        // override toggle (writes the sparse block responsive record).
        <MenuResponsiveControlShell
          device={device}
          override={visibilityOverride}
          label={`Visible on ${deviceLabelLower}`}
          onReset={() =>
            updateDoc((current) => clearMenuBlockVisibilityOverride(current, block.id, device))
          }
        >
          <ToggleSwitch
            label={`Visible on ${deviceLabelLower}`}
            value={visibleOnDevice}
            onChange={(next) =>
              updateDoc((current) => setMenuBlockVisibleForDevice(current, block.id, device, next))
            }
          />
        </MenuResponsiveControlShell>
      ) : block.type === "cta-button" || block.type === "divider" || block.type === "spacer" ? (
        // Desktop only: LEAF blocks get the FLAT visibility toggle (native blocks
        // carry no flat visibility slot by schema). The inlined three-type check
        // mirrors the module-private MENU_LEAF_BLOCK_TYPES; a vitest divergence
        // guard pins the lists against schema drift. Composable with a device
        // override: flat visible:false + tablet/mobile override true =
        // "show only on tablet/mobile".
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
          <SegmentedControl
            label="Nesting level"
            value={String(navLevel)}
            options={["0", "1", "2"]}
            optionLabels={{ "0": "Level 0", "1": "Level 1", "2": "Level 2+" }}
            onChange={(next) => onNavLevelChange(Number(next) as 0 | 1 | 2)}
          />
          {navLevel === 0 ? (
            <>
              {navBaseControl(
                "orientation",
                "Orientation",
                <SegmentedControl
                  label="Orientation"
                  value={navProps.orientation ?? "horizontal"}
                  options={menuAppearanceOrientations}
                  optionLabels={orientationLabels}
                  onChange={(next) =>
                    setNavField("orientation", next as NavItemsProps["orientation"])
                  }
                />
              )}
              {navBaseControl(
                "itemGap",
                "Item gap",
                <SliderControl
                  label="Item gap"
                  value={navProps.itemGap ?? SHELL_APPEARANCE_DEFAULTS.itemGap}
                  min={menuAppearanceNumberRanges.itemGap.min}
                  max={menuAppearanceNumberRanges.itemGap.max}
                  step={1}
                  unit="px"
                  onChange={(next) => setNavField("itemGap", next)}
                />
              )}
              {/* Font size keeps its bespoke `data-menu-font-size-inherited` alias
                  span (a 504 test asserts it) in place of the generic F2 hint, but
                  gains the F1 base-Reset via the shell props below. */}
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("fontSize")}
                hasBaseValue={navBaseValue("fontSize")}
                label="Font size"
                onReset={resetNav("fontSize")}
                onResetBase={resetNavBase("fontSize")}
              >
                <div className="grid gap-1">
                  <SliderControl
                    label="Font size"
                    // TASK-504-04 §8 (defect B2): at the UNSET position show the TRUE
                    // inherited size (16, `font-size:inherit` resolution) — not the
                    // misleading explicit 15 — and flag it inherited below so unset
                    // reads distinctly from an explicit 16. DISPLAY-only: onChange
                    // still writes an explicit value; unset emits nothing.
                    value={navProps.fontSize ?? NAV_FONT_SIZE_INHERITED}
                    min={menuAppearanceNumberRanges.fontSize.min}
                    max={menuAppearanceNumberRanges.fontSize.max}
                    step={1}
                    unit="px"
                    onChange={(next) => setNavField("fontSize", next)}
                  />
                  {navBaseIsSet("fontSize") ? null : (
                    <span
                      data-menu-font-size-inherited="true"
                      className="text-[10px] font-medium text-muted-foreground"
                    >
                      Inherited from theme ({NAV_FONT_SIZE_INHERITED}px)
                    </span>
                  )}
                </div>
              </MenuResponsiveControlShell>
              {navBaseControl(
                "fontWeight",
                "Font weight",
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
              )}
              {navBaseControl(
                "textTransform",
                "Text transform",
                <SegmentedControl
                  label="Text transform"
                  value={navProps.textTransform ?? SHELL_APPEARANCE_DEFAULTS.textTransform}
                  options={menuAppearanceTextTransforms}
                  optionLabels={textTransformLabels}
                  onChange={(next) =>
                    setNavField("textTransform", next as MenuAppearance["textTransform"])
                  }
                />
              )}
              {navBaseControl(
                "linkColor",
                "Link color",
                <ColorSwatchControl
                  label="Link color"
                  palette={palette}
                  value={toSwatchValue(navProps.linkColor ?? SHELL_APPEARANCE_DEFAULTS.linkColor)}
                  onChange={(value) =>
                    setNavField("linkColor", value === null ? "transparent" : value)
                  }
                />
              )}
              {navBaseControl(
                "linkHoverColor",
                "Hover background",
                /* Copy fix (bug 4 secondary): the emission is a state-only background
                   pill (menuDocumentCss linkHoverColor), NOT link color. */
                <ColorSwatchControl
                  label="Hover background"
                  palette={palette}
                  value={toSwatchValue(
                    navProps.linkHoverColor ?? SHELL_APPEARANCE_DEFAULTS.linkHoverColor
                  )}
                  onChange={(value) =>
                    setNavField("linkHoverColor", value === null ? "transparent" : value)
                  }
                />
              )}
              {navBaseControl(
                "linkActiveColor",
                "Active background",
                <ColorSwatchControl
                  label="Active background"
                  palette={palette}
                  value={toSwatchValue(navProps.linkActiveColor ?? "transparent")}
                  onChange={(value) =>
                    setNavField("linkActiveColor", value === null ? "transparent" : value)
                  }
                />
              )}
              {/* TASK-504-04 §4b: hover TEXT color, distinct from the hover
              BACKGROUND control above (504-02 emits `.site-nav-link:hover{color}`).
              Present-only: `null` (default) OMITS `linkHoverTextColor`. */}
              {navBaseControl(
                "linkHoverTextColor",
                "Hover text",
                <ColorSwatchControl
                  label="Hover text"
                  palette={palette}
                  value={toSwatchValue(navProps.linkHoverTextColor ?? "inherit")}
                  onChange={(value) =>
                    setNavField("linkHoverTextColor", value === null ? undefined : value)
                  }
                />
              )}
              {/* TASK-504-04 §5 cheap wins: per-link padding + radius (base scalars,
              present-only via the shared delta channel). */}
              {navBaseControl(
                "linkPaddingX",
                "Link padding X",
                <SliderControl
                  label="Link padding X"
                  // F2: show the RESOLVED default at the unset position (never the
                  // misleading `range.min`), matching the per-level/chrome sliders.
                  value={
                    navProps.linkPaddingX ??
                    (section
                      ? (resolveMenuControlDefault(section, device, 0, "linkPaddingX").value as
                          number | undefined)
                      : undefined) ??
                    NAV_LINK_NUMBER_RANGES.paddingX.min
                  }
                  min={NAV_LINK_NUMBER_RANGES.paddingX.min}
                  max={NAV_LINK_NUMBER_RANGES.paddingX.max}
                  step={1}
                  unit="px"
                  onChange={(next) => setNavField("linkPaddingX", next)}
                />
              )}
              {navBaseControl(
                "linkPaddingY",
                "Link padding Y",
                <SliderControl
                  label="Link padding Y"
                  // F2: resolved default at unset (not `range.min`).
                  value={
                    navProps.linkPaddingY ??
                    (section
                      ? (resolveMenuControlDefault(section, device, 0, "linkPaddingY").value as
                          number | undefined)
                      : undefined) ??
                    NAV_LINK_NUMBER_RANGES.paddingY.min
                  }
                  min={NAV_LINK_NUMBER_RANGES.paddingY.min}
                  max={NAV_LINK_NUMBER_RANGES.paddingY.max}
                  step={1}
                  unit="px"
                  onChange={(next) => setNavField("linkPaddingY", next)}
                />
              )}
              {navBaseControl(
                "linkRadius",
                "Link radius",
                <SliderControl
                  label="Link radius"
                  // F2: resolved default at unset (not `range.min`).
                  value={
                    navProps.linkRadius ??
                    (section
                      ? (resolveMenuControlDefault(section, device, 0, "linkRadius").value as
                          number | undefined)
                      : undefined) ??
                    NAV_LINK_NUMBER_RANGES.radius.min
                  }
                  min={NAV_LINK_NUMBER_RANGES.radius.min}
                  max={NAV_LINK_NUMBER_RANGES.radius.max}
                  step={1}
                  unit="px"
                  onChange={(next) => setNavField("linkRadius", next)}
                />
              )}
              {/* TASK-506-04 B4 pill (LEVEL 0 only) — the floating segmented-nav
                  wrapper on `.site-nav-list`, stored on the navChrome sub-record. */}
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nav pill
              </p>
              {chromeControl(
                "navPillBackground",
                "Pill background",
                chromeSwatch("navPillBackground", "Pill background")
              )}
              {chromeControl(
                "navPillRadius",
                "Pill radius",
                chromeSlider("navPillRadius", "Pill radius")
              )}
              {chromeControl(
                "navPillPaddingX",
                "Pill padding X",
                chromeSlider("navPillPaddingX", "Pill padding X")
              )}
              {chromeControl(
                "navPillPaddingY",
                "Pill padding Y",
                chromeSlider("navPillPaddingY", "Pill padding Y")
              )}
              {/* TASK-506-04 B1 separators (level-0 vertical rule between top-bar items). */}
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Item separators
              </p>
              {chromeControl(
                "itemDividerShow",
                "Item divider",
                chromeToggle("itemDividerShow", "Item divider")
              )}
              {chromeControl(
                "itemDividerColor",
                "Divider color",
                chromeSwatch("itemDividerColor", "Divider color")
              )}
              {chromeControl(
                "itemDividerWidth",
                "Divider width",
                chromeSlider("itemDividerWidth", "Divider width")
              )}
              {chromeControl(
                "itemDividerStyle",
                "Divider style",
                chromeSeg(
                  "itemDividerStyle",
                  "Divider style",
                  ITEM_DIVIDER_STYLE_OPTIONS,
                  dividerStyleLabels
                )
              )}
              {/* TASK-506-04 B2 indicator + hover (level-0). No flyoutAnimation here
                  — it is a levels-1/2 container field (the top bar is never a sublist). */}
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Indicator &amp; hover
              </p>
              {chromeControl(
                "indicator",
                "Indicator",
                chromeSeg("indicator", "Indicator", NAV_INDICATOR_OPTIONS, indicatorLabels)
              )}
              {chromeControl(
                "indicatorColor",
                "Indicator color",
                chromeSwatch("indicatorColor", "Indicator color")
              )}
              {chromeControl(
                "indicatorThickness",
                "Indicator thickness",
                chromeSlider("indicatorThickness", "Indicator thickness")
              )}
              {chromeControl(
                "indicatorGrow",
                "Grow on hover",
                chromeToggle("indicatorGrow", "Grow on hover")
              )}
              {chromeControl(
                "hoverUnderline",
                "Underline on hover",
                chromeToggle("hoverUnderline", "Underline on hover")
              )}
              {chromeControl(
                "transitionMs",
                "Transition",
                chromeSlider("transitionMs", "Transition", "ms")
              )}
              {chromeControl("hoverLift", "Hover lift", chromeSlider("hoverLift", "Hover lift"))}
              {/* TASK-506-04 B3 caret (level-0 group parents; flyoutAnimation excluded). */}
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Caret
              </p>
              {chromeControl("showCaret", "Show caret", chromeToggle("showCaret", "Show caret"))}
              {chromeControl(
                "caretRotateOnOpen",
                "Rotate caret on open",
                chromeToggle("caretRotateOnOpen", "Rotate caret on open")
              )}
              {device !== "mobile" ? (
                // Device-DEFINING (base-writing, NOT overridable): dropdowns exist
                // only >=640px (sublists collapse inline on mobile), so a mobile
                // override would be dead data. Rendered on Desktop/Tablet only, NOT
                // wrapped in MenuResponsiveControlShell — no badge, no Reset.
                <SegmentedControl
                  label="Dropdown direction"
                  value={navProps.dropdownDirection ?? SHELL_APPEARANCE_DEFAULTS.dropdownDirection}
                  options={menuAppearanceDropdownDirections}
                  optionLabels={dropdownDirectionLabels}
                  onChange={(next) =>
                    setNavBaseField(
                      "dropdownDirection",
                      next as MenuAppearance["dropdownDirection"]
                    )
                  }
                />
              ) : null}
              {device === "mobile" ? (
                // Device-DEFINING (base-writing): mobileMode chooses how the mobile
                // viewport behaves — it IS the mobile design, not an override of a
                // desktop value. Rendered on Mobile only; no badge, no Reset.
                <SegmentedControl
                  label="Mobile menu"
                  value={navProps.mobileMode ?? SHELL_APPEARANCE_DEFAULTS.mobileMode}
                  options={menuAppearanceMobileModes}
                  optionLabels={mobileModeLabels}
                  onChange={(next) =>
                    setNavBaseField("mobileMode", next as MenuAppearance["mobileMode"])
                  }
                />
              ) : null}
              {device !== "mobile" ? (
                // TASK-508 R3a/R3b — nav-GLOBAL structural axes. Dropdowns + the
                // flyout<->accordion choice only apply >=640px (sublists collapse
                // inline on mobile), so — exactly like Dropdown direction above —
                // these are Desktop/Tablet-only AND base-DEFINING: both write the
                // BASE navChrome (the CSS submenuDirection/accordion emitters read
                // baseNavChrome in desktopShared; there is NO tablet-delta emitter).
                // Unwrapped (no shell/badge/Reset) — one authored value drives every
                // device >=640; "everything opens down" / "accordion" is ONE switch.
                <>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Submenu
                  </p>
                  {chromeBaseSeg(
                    "submenuDirection",
                    "Open direction",
                    SUBMENU_DIRECTION_OPTIONS,
                    submenuDirectionLabels
                  )}
                  {chromeBaseSeg(
                    "submenuMode",
                    "Submenu mode",
                    SUBMENU_MODE_OPTIONS,
                    submenuModeLabels
                  )}
                </>
              ) : null}
            </>
          ) : (
            <NavLevelControls
              section={section}
              device={device}
              level={navLevel}
              palette={palette}
              updateDoc={updateDoc}
            />
          )}
        </div>
      ) : null}

      {block.type === "brand" ? (
        <div className="grid gap-3">
          {/* TASK-520-03-L02: 3-value mode union (Text / Image / Icon). */}
          <SegmentedControl
            label="Mode"
            value={block.props.mode}
            options={["text", "image", "icon"]}
            optionLabels={{ text: "Text", image: "Image", icon: "Icon" }}
            onChange={(next) =>
              patch(block.id, (current) =>
                current.type === "brand"
                  ? {
                      ...current,
                      props: { ...current.props, mode: next as "text" | "image" | "icon" },
                    }
                  : current
              )
            }
          />
          {/* TASK-520-03-L02: the wordmark text control shows in Text mode AND
              whenever a graphic mode opted into the "Show text alongside" combo. */}
          {block.props.mode === "text" || block.props.showText === true ? (
            // Sparse per-menu override of the site name. Raw keystrokes are
            // written as-is (no per-keystroke trim — it would eat mid-word
            // spaces); the 502-01 normalizer trims + caps on save. maxLength is
            // pinned to the same imported constant (never a magic literal).
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Brand text</span>
              <Input
                aria-label="Brand text"
                maxLength={MENU_BRAND_TEXT_MAX_LENGTH}
                placeholder={siteName ?? "Site name (default)"}
                value={typeof block.props.text === "string" ? block.props.text : ""}
                onChange={(event) =>
                  patch(block.id, (current) => {
                    if (current.type !== "brand") return current;
                    const value = event.target.value;
                    if (value.length === 0) {
                      // sparse contract: empty DELETES the prop (canvas + front
                      // fall back to the site name; the doc round-trips textless).
                      const { text: _removed, ...rest } = current.props;
                      return { ...current, props: rest };
                    }
                    return { ...current, props: { ...current.props, text: value } };
                  })
                }
              />
            </label>
          ) : null}
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
            // TASK-504-04 §7 (defect B1): resolve the picked asset to its URL and
            // store `image.src` — the shape `resolveBrandImageSrc` reads (a bare
            // `assetId` never resolved, so the logo never rendered).
            <BrandLogoPicker block={block} updateDoc={updateDoc} />
          ) : null}
          {/* TASK-520-03-L02: lucide icon picker (icon mode only). Stores the kebab
              name; clearing removes the present-only key. */}
          {block.props.mode === "icon" ? (
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Icon</span>
              <BrandIconPicker
                value={typeof block.props.icon === "string" ? block.props.icon : undefined}
                onChange={(name) =>
                  patch(block.id, (current) => {
                    if (current.type !== "brand") return current;
                    if (!name) {
                      const { icon: _drop, ...rest } = current.props;
                      return { ...current, props: rest };
                    }
                    return { ...current, props: { ...current.props, icon: name } };
                  })
                }
              />
            </label>
          ) : null}
          {/* TASK-520-03-L02: graphic-with-text combo (image/icon modes). Present-only:
              `on` writes `showText:true`; `off` DROPS the key (byte-identical to today). */}
          {block.props.mode === "image" || block.props.mode === "icon" ? (
            <ToggleSwitch
              label="Show text alongside"
              value={block.props.showText === true}
              onChange={(on) =>
                patch(block.id, (current) => {
                  if (current.type !== "brand") return current;
                  if (on) return { ...current, props: { ...current.props, showText: true } };
                  const { showText: _drop, ...rest } = current.props;
                  return { ...current, props: rest };
                })
              }
            />
          ) : null}
          {/* TASK-504-04 §3: mode-gated brand style controls (device-forked). */}
          <BrandStyleControls
            block={block}
            section={section}
            device={device}
            palette={palette}
            updateDoc={updateDoc}
          />
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
          {/* size + target are already validated by the page button pipeline
              (pageDocumentV2 button allow-list) — no schema work. */}
          <SegmentedControl
            label="Size"
            value={typeof block.props.size === "string" ? block.props.size : "md"}
            options={pageButtonSizes}
            optionLabels={{ sm: "Small", md: "Medium", lg: "Large" }}
            onChange={(next) =>
              patch(block.id, (current) =>
                current.type === "cta-button"
                  ? { ...current, props: { ...current.props, size: next } }
                  : current
              )
            }
          />
          <ToggleSwitch
            label="Open in new tab"
            value={block.props.target === "blank"}
            onChange={(next) =>
              patch(block.id, (current) =>
                current.type === "cta-button"
                  ? {
                      ...current,
                      props: {
                        ...current.props,
                        target: (next ? "blank" : "self") as (typeof pageButtonTargets)[number],
                      },
                    }
                  : current
              )
            }
          />
        </div>
      ) : null}

      {block.type === "divider" ? (
        <p className="text-xs text-muted-foreground">
          Renders as a vertical separator line in the menu bar. Use reorder/remove above.
        </p>
      ) : null}
      {block.type === "spacer" ? (
        <p className="text-xs text-muted-foreground">
          This block has no editable options; use reorder/remove above.
        </p>
      ) : null}
    </div>
  );
}
