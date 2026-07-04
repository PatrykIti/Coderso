import {
  editorControlFocusClassFor,
  editorControlLabelClassFor,
  editorPanelToggleOffClass,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";

export type ToggleSwitchProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
};

/**
 * Boolean switch for the floating toolbar. Renders a real `role="switch"`
 * control with `aria-checked`; native yes/no selects are not acceptable for
 * booleans in the page editor.
 */
export const ToggleSwitch = ({
  label,
  value,
  onChange,
  disabled = false,
  tone,
}: ToggleSwitchProps) => {
  const resolvedTone = useEditorControlTone(tone);
  return (
    <div className="flex items-center justify-between gap-3 py-1" data-page-editor-control="toggle">
      <span className={editorControlLabelClassFor(resolvedTone)}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={disabled}
        data-page-editor-toggle={value ? "on" : "off"}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${editorControlFocusClassFor(
          resolvedTone
        )} ${
          value
            ? "bg-emerald-500"
            : resolvedTone === "light"
              ? editorPanelToggleOffClass
              : "bg-white/20"
        }`}
        onClick={() => {
          if (!disabled) onChange(!value);
        }}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
};
