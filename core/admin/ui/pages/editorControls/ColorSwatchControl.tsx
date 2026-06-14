import {
  getPageEditorColorPalette,
  type PageEditorColorSwatch,
} from "../../../../services/pages/pageEditorControlUiModel";
import { editorControlFocusClass, editorControlLabelClass } from "./controlChrome";

export type ColorSwatchControlProps = {
  label: string;
  value: string;
  /** Emits the picked color string, or `null` when "Transparent" clears it. */
  onChange: (value: string | null) => void;
  /** Token-backed palette; defaults to the design-token palette. */
  palette?: readonly PageEditorColorSwatch[];
  /** When false, only palette swatches are offered (registry `swatch` input). */
  allowCustom?: boolean;
  /**
   * Offers a leading "Transparent" swatch that clears the stored value
   * (`onChange(null)`). Keep disabled for non-nullable stored colors.
   */
  allowTransparent?: boolean;
  disabled?: boolean;
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const isHexColor = (value: string) => HEX_COLOR_PATTERN.test(value.trim());

/** Native color inputs require `#rrggbb`; expand `#rgb` and fail safe to black. */
const toSafeHexColor = (value: string): string => {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#000000";
};

/**
 * Checkerboard glyph for the "Transparent" swatch so an empty value reads as
 * "no color" instead of white.
 */
const transparentSwatchStyle = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(45deg, rgba(100,116,139,0.55) 25%, transparent 25%, transparent 75%, rgba(100,116,139,0.55) 75%), linear-gradient(45deg, rgba(100,116,139,0.55) 25%, transparent 25%, transparent 75%, rgba(100,116,139,0.55) 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 4px 4px",
} as const;

/**
 * Token-backed swatch row plus native color picker and a commit-on-blur custom
 * hex affordance. Unknown stored values stay untouched (custom state, no
 * swatch pressed) until the user picks a new color; this control never mutates
 * the stored value on mount. With `allowTransparent`, a leading "Transparent"
 * swatch clears the stored value (`onChange(null)`) and shows as selected
 * while the value is empty.
 */
export const ColorSwatchControl = ({
  label,
  value,
  onChange,
  palette = getPageEditorColorPalette(),
  allowCustom = true,
  allowTransparent = true,
  disabled = false,
}: ColorSwatchControlProps) => {
  const normalizedValue = value.trim().toLowerCase();
  const transparentActive = normalizedValue.length === 0;
  const commitHexDraft = (input: HTMLInputElement) => {
    const draft = input.value.trim();
    if (draft === value) return;
    if (isHexColor(draft)) {
      onChange(draft.toLowerCase());
      return;
    }
    input.value = value;
  };
  return (
    <div className="grid gap-1" data-page-editor-control="color-swatch">
      <span className={editorControlLabelClass}>{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
        {allowTransparent ? (
          <button
            type="button"
            aria-pressed={transparentActive}
            aria-label={`${label}: Transparent`}
            title="Transparent"
            disabled={disabled}
            data-page-editor-color-swatch="transparent"
            className={`size-7 rounded-lg border-2 transition-shadow disabled:cursor-not-allowed disabled:opacity-50 ${editorControlFocusClass} ${
              transparentActive
                ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]"
                : "border-white/15 hover:border-white/45"
            }`}
            style={transparentSwatchStyle}
            onClick={() => {
              if (!disabled && !transparentActive) onChange(null);
            }}
          />
        ) : null}
        {palette.map((swatch) => {
          const active = swatch.value.trim().toLowerCase() === normalizedValue;
          return (
            <button
              key={swatch.id}
              type="button"
              aria-pressed={active}
              aria-label={`${label}: ${swatch.label}`}
              title={swatch.label}
              disabled={disabled}
              data-page-editor-color-swatch={swatch.id}
              className={`size-7 rounded-lg border-2 transition-shadow disabled:cursor-not-allowed disabled:opacity-50 ${editorControlFocusClass} ${
                active
                  ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]"
                  : "border-white/15 hover:border-white/45"
              }`}
              style={{ backgroundColor: swatch.value }}
              onClick={() => {
                if (!disabled && !active) onChange(swatch.value);
              }}
            />
          );
        })}
        {allowCustom ? (
          <>
            <input
              type="color"
              aria-label={`Custom ${label}`}
              disabled={disabled}
              data-page-editor-color-picker={label}
              value={toSafeHexColor(value)}
              className={`size-7 cursor-pointer rounded-lg border-2 border-white/15 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50 ${editorControlFocusClass}`}
              onChange={(event) => onChange(event.target.value)}
            />
            <input
              key={value}
              type="text"
              aria-label={`${label} hex value`}
              disabled={disabled}
              data-page-editor-color-hex={label}
              defaultValue={value}
              placeholder="#000000"
              spellCheck={false}
              className={`w-20 rounded-md border border-white/15 bg-white/10 px-2 py-1 font-mono text-xs text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 ${editorControlFocusClass}`}
              onBlur={(event) => commitHexDraft(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitHexDraft(event.currentTarget);
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
};
