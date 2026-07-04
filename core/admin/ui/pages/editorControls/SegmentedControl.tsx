import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  editorControlFocusClassFor,
  editorControlLabelClassFor,
  editorPanelSegmentActiveClass,
  editorPanelSegmentIdleClass,
  editorPanelSegmentTrackClass,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";

export type SegmentedControlProps = {
  label: string;
  value: string;
  options: readonly string[];
  /** English option labels keyed by stored option token. */
  optionLabels?: Readonly<Record<string, string>>;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
  /**
   * Also emit `onChange` when the already-active option is clicked. Device-
   * scoped editor fields use this on tablet/mobile while the value is still
   * inherited: explicitly choosing the inherited value must PIN it as a
   * breakpoint override instead of silently no-opping (phase2 smoke anomaly:
   * Text align "Center" over an inherited center created no override).
   */
  commitActiveOption?: boolean;
};

/**
 * Thin, panel-toned scrollbar for the horizontal option strip. Arbitrary
 * properties because the admin Tailwind setup ships no scrollbar utility.
 */
const segmentedScrollbarClass =
  "[scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.5)_transparent]";

/** `scrollIntoView` is missing in some DOM test environments; fail soft. */
const scrollOptionIntoView = (element: Element | null | undefined) => {
  if (element && typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
};

/**
 * Segmented pill selector for small finite option sets. Emits the stored
 * option token, never the display label, so save payload shapes stay stable.
 *
 * Wide option sets (e.g. heading levels h1-h6) must never push the floating
 * panel grid wider than its cell: the strip is a non-wrapping horizontal
 * scroller (`overflow-x-auto` + scroll snap) and the host column is `min-w-0`,
 * so hidden options stay reachable by scrolling left/right, arrow keys, or
 * focus (which scrolls the focused option into view).
 */
export const SegmentedControl = ({
  label,
  value,
  options,
  optionLabels,
  onChange,
  disabled = false,
  commitActiveOption = false,
  tone,
}: SegmentedControlProps) => {
  const resolvedTone = useEditorControlTone(tone);
  const groupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Keep the selected option visible on mount and whenever selection moves.
    scrollOptionIntoView(groupRef.current?.querySelector('[aria-pressed="true"]'));
  }, [value]);

  const handleGroupKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      !target.hasAttribute("data-page-editor-segmented-option")
    ) {
      return;
    }
    const buttons = Array.from(
      groupRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-page-editor-segmented-option]"
      ) ?? []
    );
    const nextIndex =
      buttons.indexOf(target as HTMLButtonElement) + (event.key === "ArrowRight" ? 1 : -1);
    const next = buttons[nextIndex];
    if (!next) return;
    event.preventDefault();
    next.focus();
    scrollOptionIntoView(next);
  };

  return (
    <div className="grid min-w-0 gap-1" data-page-editor-control="segmented">
      <span className={editorControlLabelClassFor(resolvedTone)}>{label}</span>
      <div
        ref={groupRef}
        role="group"
        aria-label={label}
        className={`flex flex-nowrap snap-x gap-0.5 overflow-x-auto rounded-lg p-0.5 ${
          resolvedTone === "light" ? editorPanelSegmentTrackClass : "bg-white/10"
        } ${segmentedScrollbarClass}`}
        onKeyDown={handleGroupKeyDown}
      >
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              data-page-editor-segmented-option={option}
              disabled={disabled}
              className={`shrink-0 grow snap-start whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${editorControlFocusClassFor(
                resolvedTone
              )} ${
                active
                  ? resolvedTone === "light"
                    ? editorPanelSegmentActiveClass
                    : "bg-white text-slate-950"
                  : resolvedTone === "light"
                    ? editorPanelSegmentIdleClass
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
              onFocus={(event) => scrollOptionIntoView(event.currentTarget)}
              onClick={() => {
                if (!disabled && (!active || commitActiveOption)) onChange(option);
              }}
            >
              {optionLabels?.[option] ?? option}
            </button>
          );
        })}
      </div>
    </div>
  );
};
