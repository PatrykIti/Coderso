import { useId } from "react";

import { clampPageEditorSliderValue } from "../../../../services/pages/pageEditorControlUiModel";
import {
  editorControlLabelClassFor,
  editorControlValueClassFor,
  editorPanelSliderAccentClass,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";

export type SliderControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
};

const formatSliderValue = (value: number, unit: string) =>
  `${Number.isFinite(value) ? value : 0}${unit}`;

/**
 * Bounded slider with a visible value readout. The native range input keeps
 * keyboard accessibility (arrow keys) and every emitted value is clamped to
 * the registry bounds; this primitive never renders native number arrows.
 */
export const SliderControl = ({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
  disabled = false,
  tone,
}: SliderControlProps) => {
  const resolvedTone = useEditorControlTone(tone);
  const inputId = useId();
  const clamped = clampPageEditorSliderValue(value, { min, max });
  return (
    <div className="grid gap-1" data-page-editor-control="slider">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className={editorControlLabelClassFor(resolvedTone)}>
          {label}
        </label>
        <output htmlFor={inputId} className={editorControlValueClassFor(resolvedTone)}>
          {formatSliderValue(clamped, unit)}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        disabled={disabled}
        data-page-editor-slider={label}
        className={`h-1.5 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          resolvedTone === "light" ? editorPanelSliderAccentClass : "accent-white"
        }`}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(clampPageEditorSliderValue(next, { min, max }));
        }}
      />
    </div>
  );
};
