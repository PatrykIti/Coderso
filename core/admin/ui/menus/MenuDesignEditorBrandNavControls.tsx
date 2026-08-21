import { useEffect, useRef, useState, type ReactNode } from "react";

import { getCachedMedia, listMediaCached, type MediaRecord } from "@/services/mediaClient";

import {
  clearMenuBrandStyleOverride,
  clearMenuBrandStyleBase,
  clearMenuNavLevelStyleBase,
  clearMenuNavLevelStyleOverride,
  patchMenuBrandStyleForDevice,
  patchMenuNavLevelStyleForDevice,
  readMenuBrandStyleOverrideValue,
  readMenuNavLevelStyleBaseValue,
  readMenuNavLevelStyleOverrideValue,
  resolveMenuBrandStyleForDevice,
  resolveMenuControlDefault,
  resolveMenuNavLevelStyle,
  BRAND_STYLE_NUMBER_RANGES,
  NAV_LEVEL_NUMBER_RANGES,
  type BrandStyle,
  type MenuBlockV2,
  type MenuSectionV2,
  type NavLevelStyle,
  type NavLevelStyleLevel,
} from "../../../services/menus/menuDocumentV2";
import {
  menuAppearanceShadows,
  menuAppearanceTextTransforms,
  type MenuAppearanceFontWeight,
} from "../../../services/menus/normalizeMenuAppearance";
import type { PageBreakpoint } from "../../../services/pages/pageDocumentV2";
import { type PageEditorColorSwatch } from "../../../services/pages/pageEditorControlUiModel";
import {
  ColorSwatchControl,
  MediaPickerControl,
  SegmentedControl,
  SliderControl,
} from "../pages/editorControls";

import {
  textTransformLabels,
  shadowLabels,
  ITEM_DIVIDER_STYLE_OPTIONS,
  dividerStyleLabels,
  NAV_INDICATOR_OPTIONS,
  indicatorLabels,
  FLYOUT_ANIMATION_OPTIONS,
  flyoutAnimationLabels,
  SUBMENU_PLACEMENT_OPTIONS,
  submenuPlacementLabels,
  LINK_ALIGN_OPTIONS,
  linkAlignLabels,
  FONT_WEIGHT_INHERIT,
  fontWeightOptions,
  fontWeightLabels,
  toSwatchValue,
  DEFAULT_BRAND_ICON_COLOR,
  DEFAULT_BRAND_ICON_SIZE,
  isMenuOverrideDevice,
  MenuResponsiveControlShell,
  ControlDefaultHint,
} from "./MenuDesignEditorControls";
import { patchBlock, NavLevelInheritBadge, type UpdateDoc } from "./MenuDesignEditorBarPanel";

export function BrandLogoPicker({
  block,
  updateDoc,
}: {
  block: MenuBlockV2;
  updateDoc: UpdateDoc;
}) {
  const patch = patchBlock(updateDoc);
  const currentSrc =
    block.type === "brand" && typeof block.props.image?.src === "string"
      ? block.props.image.src
      : "";
  const [assets, setAssets] = useState<readonly MediaRecord[] | null>(() => getCachedMedia());
  const requestRef = useRef(0);
  const selectedAssetId = currentSrc
    ? (assets?.find((asset) => asset.url === currentSrc)?.id ?? null)
    : null;

  useEffect(() => {
    if (!currentSrc || assets) return;
    let active = true;
    listMediaCached()
      .then((items) => {
        if (active) setAssets(items);
      })
      .catch(() => {
        // The picker dialog owns media load errors; the stored value is kept.
      });
    return () => {
      active = false;
    };
  }, [assets, currentSrc]);

  const writeSrc = (url: string | null) =>
    patch(block.id, (current) => {
      if (current.type !== "brand") return current;
      if (!url) {
        const { image: _removed, ...rest } = current.props;
        return { ...current, props: rest };
      }
      return {
        ...current,
        props: { ...current.props, image: { ...(current.props.image ?? {}), src: url } },
      };
    });

  const handlePickerChange = (next: unknown) => {
    if (typeof next !== "string" || next.length === 0) {
      writeSrc(null);
      return;
    }
    requestRef.current += 1;
    const requestId = requestRef.current;
    void listMediaCached()
      .then((items) => {
        if (requestId !== requestRef.current) return;
        setAssets(items);
        const match = items.find((item) => item.id === next);
        if (match) writeSrc(match.url);
      })
      .catch(() => {
        // Resolution failed: never write an asset id into the src URL path.
      });
  };

  return (
    <MediaPickerControl
      label="Logo image"
      accept={["image/*"]}
      value={selectedAssetId}
      onChange={handlePickerChange}
    />
  );
}

/**
 * Brand style controls, mode-gated + device-forked (§3). Text mode ⇒ font size /
 * weight / color / transform / letter-spacing; image mode ⇒ height / max-width.
 * Every control is wrapped by `MenuResponsiveControlShell` (device Base/Override/
 * Inherited badge + per-breakpoint Reset). Values are RESOLVED for display; the
 * override badge reads the RAW responsive record. A control at its default omits
 * the key (sparse — legacy byte-identity), so a "Theme" font weight DELETES it.
 */
export function BrandStyleControls({
  block,
  section,
  device,
  palette,
  updateDoc,
}: {
  block: MenuBlockV2;
  /** The owning section — feeds the F2 provider (KEY-based "base" theme default). */
  section: MenuSectionV2 | undefined;
  device: PageBreakpoint;
  palette: readonly PageEditorColorSwatch[];
  updateDoc: UpdateDoc;
}) {
  if (block.type !== "brand") return null;
  const brandStyle = resolveMenuBrandStyleForDevice(block, device);
  const brandOverride = (key: keyof BrandStyle) =>
    isMenuOverrideDevice(device) &&
    readMenuBrandStyleOverrideValue(block, device, key) !== undefined;
  // F1: the brand base record is BLOCK-scoped (`block.props.style`), so hasOwn is
  // read directly here (no section-side reader). `section` is required by the F2
  // provider which serves the "base" theme-default domain KEY-based.
  const brandBaseValue = (key: keyof BrandStyle) =>
    block.type === "brand" && block.props.style?.[key] !== undefined;
  const brandIsSet = (key: keyof BrandStyle) =>
    isMenuOverrideDevice(device) ? brandOverride(key) : brandBaseValue(key);
  const setBrand = <K extends keyof BrandStyle>(key: K, value: BrandStyle[K] | undefined) =>
    updateDoc((current) =>
      patchMenuBrandStyleForDevice(current, block.id, device, {
        [key]: value,
      } as Partial<BrandStyle>)
    );
  const resetBrand = (key: keyof BrandStyle) => () =>
    updateDoc((current) =>
      isMenuOverrideDevice(device)
        ? clearMenuBrandStyleOverride(current, block.id, device, key)
        : current
    );
  const resetBrandBase = (key: keyof BrandStyle) => () =>
    updateDoc((current) => clearMenuBrandStyleBase(current, block.id, key));
  const brandStyleControl = (key: keyof BrandStyle, label: string, node: ReactNode) => (
    <MenuResponsiveControlShell
      device={device}
      override={brandOverride(key)}
      hasBaseValue={brandBaseValue(key)}
      label={label}
      onReset={resetBrand(key)}
      onResetBase={resetBrandBase(key)}
    >
      <div className="grid gap-1">
        {node}
        <ControlDefaultHint
          section={section}
          device={device}
          level="base"
          propKey={key}
          isSet={brandIsSet(key)}
        />
      </div>
    </MenuResponsiveControlShell>
  );

  // TASK-520-03-L02: icon mode ⇒ icon color/size (present-only; alpha via 519).
  if (block.props.mode === "icon") {
    return (
      <>
        {brandStyleControl(
          "iconColor",
          "Icon color",
          <ColorSwatchControl
            label="Icon color"
            palette={palette}
            value={toSwatchValue(brandStyle.iconColor ?? DEFAULT_BRAND_ICON_COLOR)}
            onChange={(value) => setBrand("iconColor", value === null ? "transparent" : value)}
          />
        )}
        {brandStyleControl(
          "iconSize",
          "Icon size",
          <SliderControl
            label="Icon size"
            value={brandStyle.iconSize ?? DEFAULT_BRAND_ICON_SIZE}
            min={BRAND_STYLE_NUMBER_RANGES.iconSize.min}
            max={BRAND_STYLE_NUMBER_RANGES.iconSize.max}
            step={1}
            unit="px"
            onChange={(next) => setBrand("iconSize", next)}
          />
        )}
      </>
    );
  }
  return block.props.mode === "text" ? (
    <>
      {brandStyleControl(
        "fontSize",
        "Brand font size",
        <SliderControl
          label="Brand font size"
          value={brandStyle.fontSize ?? BRAND_STYLE_NUMBER_RANGES.fontSize.min}
          min={BRAND_STYLE_NUMBER_RANGES.fontSize.min}
          max={BRAND_STYLE_NUMBER_RANGES.fontSize.max}
          step={1}
          unit="px"
          onChange={(next) => setBrand("fontSize", next)}
        />
      )}
      {brandStyleControl(
        "fontWeight",
        "Brand font weight",
        <SegmentedControl
          label="Brand font weight"
          value={brandStyle.fontWeight ? String(brandStyle.fontWeight) : FONT_WEIGHT_INHERIT}
          options={fontWeightOptions}
          optionLabels={fontWeightLabels}
          onChange={(next) =>
            setBrand(
              "fontWeight",
              next === FONT_WEIGHT_INHERIT ? undefined : (Number(next) as MenuAppearanceFontWeight)
            )
          }
        />
      )}
      {brandStyleControl(
        "color",
        "Brand color",
        <ColorSwatchControl
          label="Brand color"
          palette={palette}
          value={toSwatchValue(brandStyle.color ?? "inherit")}
          onChange={(value) => setBrand("color", value === null ? undefined : value)}
        />
      )}
      {brandStyleControl(
        "textTransform",
        "Brand text transform",
        <SegmentedControl
          label="Brand text transform"
          value={brandStyle.textTransform ?? "none"}
          options={menuAppearanceTextTransforms}
          optionLabels={textTransformLabels}
          onChange={(next) => setBrand("textTransform", next as BrandStyle["textTransform"])}
        />
      )}
      {brandStyleControl(
        "letterSpacing",
        "Letter spacing",
        <SliderControl
          label="Letter spacing"
          value={brandStyle.letterSpacing ?? 0}
          min={BRAND_STYLE_NUMBER_RANGES.letterSpacing.min}
          max={BRAND_STYLE_NUMBER_RANGES.letterSpacing.max}
          step={1}
          unit="px"
          onChange={(next) => setBrand("letterSpacing", next)}
        />
      )}
    </>
  ) : (
    <>
      {brandStyleControl(
        "height",
        "Logo height",
        <SliderControl
          label="Logo height"
          value={brandStyle.height ?? BRAND_STYLE_NUMBER_RANGES.height.min}
          min={BRAND_STYLE_NUMBER_RANGES.height.min}
          max={BRAND_STYLE_NUMBER_RANGES.height.max}
          step={1}
          unit="px"
          onChange={(next) => setBrand("height", next)}
        />
      )}
      {brandStyleControl(
        "maxWidth",
        "Logo max width",
        <SliderControl
          label="Logo max width"
          value={brandStyle.maxWidth ?? BRAND_STYLE_NUMBER_RANGES.maxWidth.max}
          min={BRAND_STYLE_NUMBER_RANGES.maxWidth.min}
          max={BRAND_STYLE_NUMBER_RANGES.maxWidth.max}
          step={1}
          unit="px"
          onChange={(next) => setBrand("maxWidth", next)}
        />
      )}
    </>
  );
}

/**
 * Per-level nav control set (§4), bound to `levelStyles[level]` (level 1/2 only;
 * level 0 stays the existing nav base). Writes ride the dedicated 504-01 nested
 * per-device helpers (desktop ⇒ props.levelStyles; tablet/mobile ⇒ the sparse
 * `responsive[bp].navProps.levelStyles`). Two badge axes: the device axis
 * (`MenuResponsiveControlShell`) + the level axis (`NavLevelInheritBadge`).
 * Inheritance is pure CSS cascade — NO runtime merge here; each control writes
 * ONLY its own level's field.
 */
export function NavLevelControls({
  section,
  device,
  level,
  palette,
  updateDoc,
}: {
  section: MenuSectionV2 | undefined;
  device: PageBreakpoint;
  level: NavLevelStyleLevel;
  palette: readonly PageEditorColorSwatch[];
  updateDoc: UpdateDoc;
}) {
  const levelStyle: NavLevelStyle = section ? resolveMenuNavLevelStyle(section, device, level) : {};
  const levelOverride = (key: keyof NavLevelStyle) =>
    section !== undefined &&
    isMenuOverrideDevice(device) &&
    readMenuNavLevelStyleOverrideValue(section, device, level, key) !== undefined;
  // F1 raw DESKTOP-base read (no device guard — desktop base record hasOwn).
  const levelBaseValue = (key: keyof NavLevelStyle) =>
    section !== undefined && readMenuNavLevelStyleBaseValue(section, level, key) !== undefined;
  // F2 `isSet`: device-appropriate RAW own read — NEVER the resolved value, and
  // NEVER `hasBaseValue || override` (the base read is un-guarded, which would
  // wrongly suppress the "Inherited from desktop" hint on an override device).
  const levelIsSet = (key: keyof NavLevelStyle) =>
    isMenuOverrideDevice(device) ? levelOverride(key) : levelBaseValue(key);
  const setLevel = <K extends keyof NavLevelStyle>(key: K, value: NavLevelStyle[K] | undefined) =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target
        ? patchMenuNavLevelStyleForDevice(current, target.id, device, level, {
            [key]: value,
          } as Partial<NavLevelStyle>)
        : current;
    });
  const resetLevel = (key: keyof NavLevelStyle) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target && isMenuOverrideDevice(device)
        ? clearMenuNavLevelStyleOverride(current, target.id, device, level, key)
        : current;
    });
  const resetLevelBase = (key: keyof NavLevelStyle) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target ? clearMenuNavLevelStyleBase(current, target.id, level, key) : current;
    });
  const levelControl = (key: keyof NavLevelStyle, label: string, node: ReactNode) => (
    <MenuResponsiveControlShell
      device={device}
      override={levelOverride(key)}
      hasBaseValue={levelBaseValue(key)}
      label={label}
      onReset={resetLevel(key)}
      onResetBase={resetLevelBase(key)}
    >
      <div className="grid gap-1">
        {node}
        <NavLevelInheritBadge level={level} overridden={levelStyle[key] !== undefined} />
        <ControlDefaultHint
          section={section}
          device={device}
          level={level}
          propKey={key}
          isSet={levelIsSet(key)}
        />
      </div>
    </MenuResponsiveControlShell>
  );
  const swatch = (key: keyof NavLevelStyle, label: string) => (
    <ColorSwatchControl
      label={label}
      palette={palette}
      value={toSwatchValue((levelStyle[key] as string | undefined) ?? "inherit")}
      onChange={(value) => setLevel(key, value === null ? undefined : (value as never))}
    />
  );
  // F2: the thumb now shows the RESOLVED default at the unset position (never the
  // misleading `range.min`); `.min` only if the provider yields nothing resolvable.
  const slider = (key: keyof typeof NAV_LEVEL_NUMBER_RANGES, label: string, unit = "px") => {
    const resolved = levelStyle[key] as number | undefined;
    const fallback = section
      ? (resolveMenuControlDefault(section, device, level, key).value as number | undefined)
      : undefined;
    return (
      <SliderControl
        label={label}
        value={resolved ?? fallback ?? NAV_LEVEL_NUMBER_RANGES[key].min}
        min={NAV_LEVEL_NUMBER_RANGES[key].min}
        max={NAV_LEVEL_NUMBER_RANGES[key].max}
        step={1}
        unit={unit}
        onChange={(next) => setLevel(key, next as never)}
      />
    );
  };
  // TASK-506 B1–B5 enum/bool primitives (three-state: Default / value-A / value-B…).
  // The first option is the unset "Default" sentinel writing `undefined` (clears
  // ⇒ present-only zero bytes ⇒ the F2 hint appears).
  const seg = (
    key: keyof NavLevelStyle,
    label: string,
    options: readonly string[],
    labels: Record<string, string>
  ) => (
    <SegmentedControl
      label={label}
      value={(levelStyle[key] as string | undefined) ?? "inherit"}
      options={["inherit", ...options]}
      optionLabels={{ inherit: "Default", ...labels }}
      onChange={(next) => setLevel(key, next === "inherit" ? undefined : (next as never))}
    />
  );
  const toggle = (key: keyof NavLevelStyle, label: string) => (
    <SegmentedControl
      label={label}
      value={levelStyle[key] === true ? "on" : levelStyle[key] === false ? "off" : "inherit"}
      options={["inherit", "off", "on"]}
      optionLabels={{ inherit: "Default", off: "Off", on: "On" }}
      onChange={(next) =>
        setLevel(key, next === "inherit" ? undefined : ((next === "on") as never))
      }
    />
  );
  return (
    <>
      {levelControl("linkColor", "Link color", swatch("linkColor", "Link color"))}
      {levelControl(
        "linkHoverColor",
        "Hover background",
        swatch("linkHoverColor", "Hover background")
      )}
      {levelControl("linkHoverTextColor", "Hover text", swatch("linkHoverTextColor", "Hover text"))}
      {levelControl(
        "linkActiveColor",
        "Active background",
        swatch("linkActiveColor", "Active background")
      )}
      {levelControl("fontSize", "Font size", slider("fontSize", "Font size"))}
      {levelControl(
        "fontWeight",
        "Font weight",
        <SegmentedControl
          label="Font weight"
          value={levelStyle.fontWeight ? String(levelStyle.fontWeight) : FONT_WEIGHT_INHERIT}
          options={fontWeightOptions}
          optionLabels={fontWeightLabels}
          onChange={(next) =>
            setLevel(
              "fontWeight",
              next === FONT_WEIGHT_INHERIT ? undefined : (Number(next) as MenuAppearanceFontWeight)
            )
          }
        />
      )}
      {levelControl("gap", "Item gap", slider("gap", "Item gap"))}
      {levelControl("paddingX", "Link padding X", slider("paddingX", "Link padding X"))}
      {levelControl("paddingY", "Link padding Y", slider("paddingY", "Link padding Y"))}
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Dropdown container
      </p>
      {levelControl(
        "background",
        "Container background",
        swatch("background", "Container background")
      )}
      {levelControl("borderColor", "Border color", swatch("borderColor", "Border color"))}
      {levelControl("borderWidth", "Border width", slider("borderWidth", "Border width"))}
      {levelControl("radius", "Corner radius", slider("radius", "Corner radius"))}
      {levelControl(
        "shadow",
        "Shadow",
        <SegmentedControl
          label="Shadow"
          value={levelStyle.shadow ?? "none"}
          options={menuAppearanceShadows}
          optionLabels={shadowLabels}
          onChange={(next) => setLevel("shadow", next as NavLevelStyle["shadow"])}
        />
      )}
      {levelControl("minWidth", "Min width", slider("minWidth", "Min width"))}
      {levelControl(
        "containerPaddingX",
        "Container padding X",
        slider("containerPaddingX", "Container padding X")
      )}
      {levelControl(
        "containerPaddingY",
        "Container padding Y",
        slider("containerPaddingY", "Container padding Y")
      )}
      {/* TASK-508 R1(b) — center dropdown text within the >=180px container.
          Present-only, per-level (1/2), per-device via the same setLevel fork. */}
      {levelControl(
        "linkAlign",
        "Link alignment",
        seg("linkAlign", "Link alignment", LINK_ALIGN_OPTIONS, linkAlignLabels)
      )}
      {level === 2 ? (
        <>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nested submenu
          </p>
          {levelControl(
            "submenuPlacement",
            "Submenu placement",
            seg(
              "submenuPlacement",
              "Submenu placement",
              SUBMENU_PLACEMENT_OPTIONS,
              submenuPlacementLabels
            )
          )}
        </>
      ) : null}
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Item separators
      </p>
      {levelControl("itemDividerShow", "Item divider", toggle("itemDividerShow", "Item divider"))}
      {levelControl(
        "itemDividerColor",
        "Divider color",
        swatch("itemDividerColor", "Divider color")
      )}
      {levelControl(
        "itemDividerWidth",
        "Divider width",
        slider("itemDividerWidth", "Divider width")
      )}
      {levelControl(
        "itemDividerStyle",
        "Divider style",
        seg("itemDividerStyle", "Divider style", ITEM_DIVIDER_STYLE_OPTIONS, dividerStyleLabels)
      )}
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Indicator &amp; hover
      </p>
      {levelControl(
        "indicator",
        "Indicator",
        seg("indicator", "Indicator", NAV_INDICATOR_OPTIONS, indicatorLabels)
      )}
      {levelControl(
        "indicatorColor",
        "Indicator color",
        swatch("indicatorColor", "Indicator color")
      )}
      {levelControl(
        "indicatorThickness",
        "Indicator thickness",
        slider("indicatorThickness", "Indicator thickness")
      )}
      {levelControl("indicatorGrow", "Grow on hover", toggle("indicatorGrow", "Grow on hover"))}
      {levelControl(
        "hoverUnderline",
        "Underline on hover",
        toggle("hoverUnderline", "Underline on hover")
      )}
      {levelControl("transitionMs", "Transition", slider("transitionMs", "Transition", "ms"))}
      {levelControl("hoverLift", "Hover lift", slider("hoverLift", "Hover lift"))}
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Caret &amp; flyout
      </p>
      {levelControl("showCaret", "Show caret", toggle("showCaret", "Show caret"))}
      {levelControl(
        "caretRotateOnOpen",
        "Rotate caret on open",
        toggle("caretRotateOnOpen", "Rotate caret on open")
      )}
      {levelControl(
        "flyoutAnimation",
        "Flyout animation",
        seg("flyoutAnimation", "Flyout animation", FLYOUT_ANIMATION_OPTIONS, flyoutAnimationLabels)
      )}
    </>
  );
}
