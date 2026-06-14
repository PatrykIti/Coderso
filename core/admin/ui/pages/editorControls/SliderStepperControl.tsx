import { Minus, Plus } from "lucide-react";

import { clampPageEditorSliderValue } from "../../../../services/pages/pageEditorControlUiModel";
import { editorControlFocusClass } from "./controlChrome";
import { SliderControl } from "./SliderControl";

export type SliderStepperControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const stepperButtonClass = `flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-slate-200 transition-colors hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${editorControlFocusClass}`;

/**
 * Slider paired with clamped stepper buttons for wide bounded ranges such as
 * max width and paddings. There is no native `type="number"` input; precise
 * adjustment happens through the steppers while staying inside registry
 * clamps.
 */
export const SliderStepperControl = ({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
  disabled = false,
}: SliderStepperControlProps) => {
  const clamped = clampPageEditorSliderValue(value, { min, max });
  const stepBy = (direction: -1 | 1) => {
    onChange(clampPageEditorSliderValue(clamped + direction * step, { min, max }));
  };
  return (
    <div
      className="flex items-end gap-2"
      data-page-editor-control="slider-stepper"
      data-page-editor-slider-stepper={label}
    >
      <div className="min-w-0 flex-1">
        <SliderControl
          label={label}
          value={clamped}
          min={min}
          max={max}
          step={step}
          unit={unit}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || clamped <= min}
        className={stepperButtonClass}
        onClick={() => stepBy(-1)}
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || clamped >= max}
        className={stepperButtonClass}
        onClick={() => stepBy(1)}
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};
