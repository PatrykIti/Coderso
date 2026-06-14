import { useCallback } from "react";

import {
  menuAppearanceAlignments,
  menuAppearanceDropdownDirections,
  menuAppearanceFontWeights,
  menuAppearanceMobileModes,
  menuAppearanceNumberRanges,
  menuAppearanceShadows,
  menuAppearanceTextTransforms,
  type MenuAppearance,
  type MenuAppearanceFontWeight,
} from "../../../services/menus/normalizeMenuAppearance";
import { SHELL_APPEARANCE_DEFAULTS } from "../../../site/siteShellCss";
import type { PageEditorHostAppearancePanelProps } from "../pages/PageEditor";
import {
  ColorSwatchControl,
  SegmentedControl,
  SliderControl,
  ToggleSwitch,
} from "../pages/editorControls";

/**
 * Menu appearance floating-panel content (TASK-458-03): every
 * `MenuAppearance` field exposed through the SHARED page-editor control
 * primitives — color swatches with transparent as a first-class swatch,
 * segmented enum selectors, bounded sliders, and a real toggle switch.
 * Edits patch `settings.menuAppearance` on the editor document draft, so
 * they ride the same save/publish discipline as page props.
 */

const FONT_WEIGHT_INHERIT = "inherit" as const;

const fontWeightOptions = [
  FONT_WEIGHT_INHERIT,
  ...menuAppearanceFontWeights.map((weight) => String(weight)),
];

const fontWeightLabels: Record<string, string> = {
  [FONT_WEIGHT_INHERIT]: "Theme",
  "400": "Regular",
  "500": "Medium",
  "600": "Semibold",
  "700": "Bold",
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

const shadowLabels: Record<string, string> = {
  none: "None",
  sm: "Soft",
  md: "Strong",
};

const dropdownDirectionLabels: Record<string, string> = {
  bottom: "Below",
  top: "Above",
};

const mobileModeLabels: Record<string, string> = {
  disclosure: "Collapsed",
  inline: "Inline",
};

/** Default shown for the unset font size (the legacy look inherits it). */
const FONT_SIZE_FALLBACK = 15;

/**
 * Swatch display mapping: the stored first-class `transparent` value shows
 * as the active transparent swatch (the control models transparent as an
 * empty value), every other stored/effective value displays verbatim.
 */
const toSwatchValue = (value: string) => (value === "transparent" ? "" : value);

export function MenuAppearancePanel({
  document,
  updateDocument,
}: PageEditorHostAppearancePanelProps) {
  const appearance = document.settings.menuAppearance ?? {};

  const setField = useCallback(
    <K extends keyof MenuAppearance>(field: K, value: MenuAppearance[K] | undefined) => {
      updateDocument((current) => {
        const nextAppearance: MenuAppearance = { ...(current.settings.menuAppearance ?? {}) };
        if (value === undefined) {
          delete nextAppearance[field];
        } else {
          nextAppearance[field] = value;
        }
        return {
          ...current,
          settings: { ...current.settings, menuAppearance: nextAppearance },
        };
      });
    },
    [updateDocument]
  );

  const setColor = useCallback(
    (field: "surfaceColor" | "linkColor" | "linkHoverColor" | "linkActiveColor" | "borderColor") =>
      (value: string | null) => {
        // Transparent is a first-class stored value, not an unset field.
        setField(field, value === null ? "transparent" : value);
      },
    [setField]
  );

  return (
    <div
      className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]"
      data-menu-appearance-panel="true"
    >
      <ColorSwatchControl
        label="Surface color"
        value={toSwatchValue(appearance.surfaceColor ?? SHELL_APPEARANCE_DEFAULTS.surfaceColor)}
        onChange={setColor("surfaceColor")}
      />
      <ColorSwatchControl
        label="Link color"
        value={toSwatchValue(appearance.linkColor ?? SHELL_APPEARANCE_DEFAULTS.linkColor)}
        onChange={setColor("linkColor")}
      />
      <ColorSwatchControl
        label="Link hover color"
        value={toSwatchValue(appearance.linkHoverColor ?? SHELL_APPEARANCE_DEFAULTS.linkHoverColor)}
        onChange={setColor("linkHoverColor")}
      />
      <ColorSwatchControl
        label="Link active color"
        value={toSwatchValue(appearance.linkActiveColor ?? "transparent")}
        onChange={setColor("linkActiveColor")}
      />
      <ColorSwatchControl
        label="Border color"
        value={toSwatchValue(appearance.borderColor ?? SHELL_APPEARANCE_DEFAULTS.borderColor)}
        onChange={setColor("borderColor")}
      />
      <SegmentedControl
        label="Alignment"
        value={appearance.alignment ?? SHELL_APPEARANCE_DEFAULTS.alignment}
        options={menuAppearanceAlignments}
        optionLabels={alignmentLabels}
        onChange={(next) => setField("alignment", next as MenuAppearance["alignment"])}
      />
      <SliderControl
        label="Item gap"
        value={appearance.itemGap ?? SHELL_APPEARANCE_DEFAULTS.itemGap}
        min={menuAppearanceNumberRanges.itemGap.min}
        max={menuAppearanceNumberRanges.itemGap.max}
        step={1}
        unit="px"
        onChange={(next) => setField("itemGap", next)}
      />
      <SliderControl
        label="Vertical padding"
        value={appearance.paddingY ?? SHELL_APPEARANCE_DEFAULTS.paddingY}
        min={menuAppearanceNumberRanges.paddingY.min}
        max={menuAppearanceNumberRanges.paddingY.max}
        step={1}
        unit="px"
        onChange={(next) => setField("paddingY", next)}
      />
      <SliderControl
        label="Horizontal padding"
        value={appearance.paddingX ?? SHELL_APPEARANCE_DEFAULTS.paddingX}
        min={menuAppearanceNumberRanges.paddingX.min}
        max={menuAppearanceNumberRanges.paddingX.max}
        step={1}
        unit="px"
        onChange={(next) => setField("paddingX", next)}
      />
      <SliderControl
        label="Font size"
        value={appearance.fontSize ?? FONT_SIZE_FALLBACK}
        min={menuAppearanceNumberRanges.fontSize.min}
        max={menuAppearanceNumberRanges.fontSize.max}
        step={1}
        unit="px"
        onChange={(next) => setField("fontSize", next)}
      />
      <SegmentedControl
        label="Font weight"
        value={appearance.fontWeight ? String(appearance.fontWeight) : FONT_WEIGHT_INHERIT}
        options={fontWeightOptions}
        optionLabels={fontWeightLabels}
        onChange={(next) =>
          setField(
            "fontWeight",
            next === FONT_WEIGHT_INHERIT ? undefined : (Number(next) as MenuAppearanceFontWeight)
          )
        }
      />
      <SegmentedControl
        label="Text transform"
        value={appearance.textTransform ?? SHELL_APPEARANCE_DEFAULTS.textTransform}
        options={menuAppearanceTextTransforms}
        optionLabels={textTransformLabels}
        onChange={(next) => setField("textTransform", next as MenuAppearance["textTransform"])}
      />
      <SliderControl
        label="Border width"
        value={appearance.borderWidth ?? SHELL_APPEARANCE_DEFAULTS.borderWidth}
        min={menuAppearanceNumberRanges.borderWidth.min}
        max={menuAppearanceNumberRanges.borderWidth.max}
        step={1}
        unit="px"
        onChange={(next) => setField("borderWidth", next)}
      />
      <SegmentedControl
        label="Shadow"
        value={appearance.shadow ?? SHELL_APPEARANCE_DEFAULTS.shadow}
        options={menuAppearanceShadows}
        optionLabels={shadowLabels}
        onChange={(next) => setField("shadow", next as MenuAppearance["shadow"])}
      />
      <SegmentedControl
        label="Dropdown direction"
        value={appearance.dropdownDirection ?? SHELL_APPEARANCE_DEFAULTS.dropdownDirection}
        options={menuAppearanceDropdownDirections}
        optionLabels={dropdownDirectionLabels}
        onChange={(next) =>
          setField("dropdownDirection", next as MenuAppearance["dropdownDirection"])
        }
      />
      <SegmentedControl
        label="Mobile menu"
        value={appearance.mobileMode ?? SHELL_APPEARANCE_DEFAULTS.mobileMode}
        options={menuAppearanceMobileModes}
        optionLabels={mobileModeLabels}
        onChange={(next) => setField("mobileMode", next as MenuAppearance["mobileMode"])}
      />
      <ToggleSwitch
        label="Sticky header"
        value={appearance.sticky ?? SHELL_APPEARANCE_DEFAULTS.sticky}
        onChange={(next) => setField("sticky", next)}
      />
    </div>
  );
}
