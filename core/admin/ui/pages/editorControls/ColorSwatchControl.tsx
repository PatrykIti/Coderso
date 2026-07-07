import {
  getPageEditorColorPalette,
  type PageEditorColorSwatch,
} from "../../../../services/pages/pageEditorControlUiModel";
import {
  colorAlpha,
  composeHexColor,
  normalizeAdminColorValue,
  parseColorValue,
  pickerHexFor,
} from "../../shared/colorValue";
import {
  editorControlFocusClassFor,
  editorControlLabelClassFor,
  editorPanelInputClass,
  editorPanelSwatchBorderClass,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";
import { SliderControl } from "./SliderControl";

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
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
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
 * Token-backed swatch row plus native color picker, an opacity slider, and a
 * commit-on-blur custom hex/rgba affordance that authors AND round-trips
 * alpha-capable colors (`#rrggbbaa` like `#0812209e`, `rgba()`, `hsla()`). The
 * native picker edits the base color while the slider owns alpha, so editing one
 * never drops the other; the text field accepts any value the shared
 * `normalizeAdminColorValue` boundary mirror allows (canonicalizing a leading-dot
 * alpha `.84` -> `0.84` on emit) and reverts unknown input. Unknown stored values
 * stay untouched (custom state, no swatch pressed) until the user picks a new
 * color; this control never mutates the stored value on mount. With
 * `allowTransparent`, a leading "Transparent"
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
  tone,
}: ColorSwatchControlProps) => {
  const resolvedTone = useEditorControlTone(tone);
  const focusClass = editorControlFocusClassFor(resolvedTone);
  const idleSwatchBorderClass =
    resolvedTone === "light"
      ? editorPanelSwatchBorderClass
      : "border-white/15 hover:border-white/45";
  const normalizedValue = value.trim().toLowerCase();
  const transparentActive = normalizedValue.length === 0;
  // Parse the stored value once so the picker (base color), the opacity slider
  // (alpha), and the hex/rgba text field stay in sync and round-trip alpha.
  const parsed = parseColorValue(value);
  const alpha = colorAlpha(parsed);
  const baseHex = pickerHexFor(parsed, "#000000");
  // The picker + opacity slider can only faithfully round-trip hex/rgb kinds;
  // token/keyword/hsla/unknown values keep the raw text and disable the slider.
  const alphaRepresentable = parsed.kind === "hex" || parsed.kind === "rgb";
  const commitDraft = (input: HTMLInputElement) => {
    const draft = input.value.trim();
    if (draft === value) return;
    const safe = normalizeAdminColorValue(draft);
    if (!safe) {
      // Reject-unknown -> revert to the prior value (unchanged behavior).
      input.value = value;
      return;
    }
    // A hex draft is re-emitted through the canonical composer so a byte-identical
    // lowercase `#rrggbb[aa]` is stored; rgba/hsla/token/keyword pass through the
    // already-canonicalized (leading-dot alpha -> `0.`) normalizer output.
    const safeParsed = parseColorValue(safe);
    const emit =
      safeParsed.kind === "hex" ? composeHexColor(safeParsed.baseHex, safeParsed.alpha) : safe;
    onChange(emit);
  };
  return (
    <div className="grid gap-1" data-page-editor-control="color-swatch">
      <span className={editorControlLabelClassFor(resolvedTone)}>{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
        {allowTransparent ? (
          <button
            type="button"
            aria-pressed={transparentActive}
            aria-label={`${label}: Transparent`}
            title="Transparent"
            disabled={disabled}
            data-page-editor-color-swatch="transparent"
            className={`size-7 rounded-lg border-2 transition-shadow disabled:cursor-not-allowed disabled:opacity-50 ${focusClass} ${
              transparentActive
                ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]"
                : idleSwatchBorderClass
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
              className={`size-7 rounded-lg border-2 transition-shadow disabled:cursor-not-allowed disabled:opacity-50 ${focusClass} ${
                active
                  ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]"
                  : idleSwatchBorderClass
              }`}
              style={{ backgroundColor: swatch.previewValue ?? swatch.value }}
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
              value={baseHex}
              className={`size-7 cursor-pointer rounded-lg border-2 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                resolvedTone === "light" ? "border-border" : "border-white/15"
              } ${focusClass}`}
              onChange={(event) => onChange(composeHexColor(event.target.value, alpha))}
            />
            <input
              key={value}
              type="text"
              aria-label={`${label} hex value`}
              disabled={disabled}
              data-page-editor-color-hex={label}
              defaultValue={value}
              placeholder="#rrggbbaa"
              spellCheck={false}
              className={`w-28 rounded-md px-2 py-1 font-mono text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                resolvedTone === "light"
                  ? editorPanelInputClass
                  : "border border-white/15 bg-white/10 text-slate-100 placeholder:text-slate-500"
              } ${focusClass}`}
              onBlur={(event) => commitDraft(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitDraft(event.currentTarget);
              }}
            />
          </>
        ) : null}
      </div>
      {allowCustom ? (
        <>
          <SliderControl
            label="Color opacity"
            min={0}
            max={100}
            step={1}
            unit="%"
            value={Math.round(alpha * 100)}
            disabled={disabled || !alphaRepresentable}
            tone={resolvedTone}
            onChange={(pct) => onChange(composeHexColor(baseHex, pct / 100))}
          />
          {alphaRepresentable ? null : (
            <p
              data-page-editor-color-hint={label}
              className={`text-xs ${
                resolvedTone === "light" ? "text-muted-foreground" : "text-slate-400"
              }`}
            >
              Token/keyword color — opacity slider unavailable.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
};
