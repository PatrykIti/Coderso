import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { editorControlFocusClass, editorControlLabelClass } from "./controlChrome";

export type ComboboxControlOption = {
  /** Stored value token (e.g. a form id). */
  value: string;
  /** English display label (e.g. the form name). */
  label: string;
};

export type ComboboxControlProps = {
  label: string;
  /** Current stored value, or `null` when nothing is selected. */
  value: string | null;
  /** Resolved options for the dynamic source (id -> label). */
  options: readonly ComboboxControlOption[];
  /** Emits the picked option value, or `null` from the "None" row. */
  onChange: (value: string | null) => void;
  /** Closed-trigger copy while no value is selected. */
  placeholder?: string;
  /** Offers a leading "None" row that clears the stored value to `null`. */
  allowNull?: boolean;
  /** Options are still resolving; the list shows a loading state. */
  loading?: boolean;
  /** Copy when the search yields no matching options. */
  emptyMessage?: string;
  disabled?: boolean;
};

const NONE_OPTION_ID = "__none__";

const matchesQuery = (option: ComboboxControlOption, query: string) =>
  option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query);

/**
 * Searchable single-select picker for unbounded reference lists on the dark
 * floating toolbar (TASK-456; the single shared owner of the page editor
 * combobox primitive — dynamic-source controls like the form picker and the
 * collection pickers must reuse it unchanged). The trigger is a
 * `role="combobox"` button opening a popover with a filter input and a
 * keyboard-accessible listbox (Arrow/Home/End to move, Enter to commit,
 * Escape to close). Emits the stored option VALUE, never the display label.
 *
 * A stored value that is missing from the options (a deleted referenced
 * resource) is marked as dangling on the trigger and rendered as an explicit
 * non-committable row, so the stale reference stays visible instead of
 * silently displaying as unset.
 */
export const ComboboxControl = ({
  label,
  value,
  options,
  onChange,
  placeholder = "Pick an option",
  allowNull = false,
  loading = false,
  emptyMessage = "No matches found.",
  disabled = false,
}: ComboboxControlProps) => {
  const baseId = useId().replace(/:/g, "");
  const listboxId = `${baseId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedOption = value === null ? null : (options.find((o) => o.value === value) ?? null);
  const danglingValue = value !== null && !loading && !selectedOption ? value : null;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(
    () =>
      normalizedQuery.length === 0
        ? options
        : options.filter((option) => matchesQuery(option, normalizedQuery)),
    [normalizedQuery, options]
  );
  // The committable rows in render order: the "None" row (when allowed and
  // not filtered away) followed by the matching options. The dangling row is
  // never committable, so it never enters this list.
  const rows = useMemo<ComboboxControlOption[]>(
    () => [
      ...(allowNull && normalizedQuery.length === 0
        ? [{ value: NONE_OPTION_ID, label: "None" }]
        : []),
      ...filteredOptions,
    ],
    [allowNull, filteredOptions, normalizedQuery]
  );

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const openList = () => {
    if (disabled) return;
    setQuery("");
    // Rest the active row on the current selection so Enter is a no-op pick.
    const selectedRow = value === null ? 0 : options.findIndex((o) => o.value === value);
    setActiveIndex(value !== null && selectedRow >= 0 ? selectedRow + (allowNull ? 1 : 0) : 0);
    setOpen(true);
  };

  const commitRow = (row: ComboboxControlOption | undefined) => {
    if (!row) return;
    const nextValue = row.value === NONE_OPTION_ID ? null : row.value;
    setOpen(false);
    if (nextValue !== value) onChange(nextValue);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(rows.length - 1, index + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, rows.length - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitRow(rows[Math.min(activeIndex, rows.length - 1)]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  const triggerText = selectedOption
    ? selectedOption.label
    : danglingValue
      ? `Missing: ${danglingValue}`
      : placeholder;

  return (
    <div ref={rootRef} className="relative grid min-w-0 gap-1" data-page-editor-control="combobox">
      <span className={editorControlLabelClass} id={`${baseId}-label`}>
        {label}
      </span>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-labelledby={`${baseId}-label`}
        disabled={disabled}
        data-page-editor-combobox-trigger={label}
        data-page-editor-combobox-dangling={danglingValue ?? undefined}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-left text-sm font-normal normal-case tracking-normal disabled:cursor-not-allowed disabled:opacity-50 ${editorControlFocusClass} ${
          danglingValue ? "text-amber-300" : selectedOption ? "text-slate-100" : "text-slate-400"
        }`}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <span className="truncate">{triggerText}</span>
        <span aria-hidden="true" className="shrink-0 text-[10px] text-slate-400">
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 grid gap-1 rounded-md border border-white/15 bg-slate-900 p-1 shadow-xl"
          data-page-editor-combobox-popover={label}
        >
          <input
            ref={searchRef}
            type="text"
            role="searchbox"
            aria-label={`Search ${label}`}
            aria-controls={listboxId}
            aria-activedescendant={
              rows.length > 0
                ? `${baseId}-option-${Math.min(activeIndex, rows.length - 1)}`
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
            placeholder="Search..."
            className={`rounded border border-white/15 bg-white/10 px-2 py-1 text-sm font-normal text-slate-100 placeholder:text-slate-500 ${editorControlFocusClass}`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
          />
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="max-h-48 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.5)_transparent]"
          >
            {danglingValue ? (
              <li
                role="option"
                aria-selected="true"
                aria-disabled="true"
                data-page-editor-combobox-option="__dangling__"
                className="cursor-not-allowed rounded px-2 py-1.5 text-xs text-amber-300"
              >
                Missing: {danglingValue}
              </li>
            ) : null}
            {loading ? (
              <li
                className="px-2 py-1.5 text-xs text-slate-400"
                data-page-editor-combobox-state="loading"
              >
                Loading options...
              </li>
            ) : rows.length === 0 ? (
              <li
                className="px-2 py-1.5 text-xs text-slate-400"
                data-page-editor-combobox-state="empty"
              >
                {emptyMessage}
              </li>
            ) : (
              rows.map((row, index) => {
                const isNoneRow = row.value === NONE_OPTION_ID;
                const selected = isNoneRow ? value === null : row.value === value;
                const active = index === Math.min(activeIndex, rows.length - 1);
                return (
                  <li
                    key={row.value}
                    id={`${baseId}-option-${index}`}
                    role="option"
                    aria-selected={selected}
                    data-page-editor-combobox-option={isNoneRow ? "none" : row.value}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        selected
                          ? "bg-white font-semibold text-slate-950"
                          : active
                            ? "bg-white/15 text-white"
                            : isNoneRow
                              ? "text-slate-400 hover:bg-white/10 hover:text-white"
                              : "text-slate-200 hover:bg-white/10 hover:text-white"
                      }`}
                      onPointerEnter={() => setActiveIndex(index)}
                      onClick={() => commitRow(row)}
                    >
                      {row.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
