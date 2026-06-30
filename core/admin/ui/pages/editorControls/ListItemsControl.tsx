import { Plus, Trash2 } from "lucide-react";

import { createPageListItem, type PageListItemV2 } from "../../../../services/pages/pageDocumentV2";
import {
  editorButtonClassFor,
  editorControlFocusClassFor,
  editorControlLabelClassFor,
  editorGhostButtonClassFor,
  editorPanelInputClass,
  editorPanelSubInputClass,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";

export type ListItemsControlProps = {
  label: string;
  /** Stored list items (owner shapes: plain strings or `{ label, href }`). */
  value: readonly unknown[];
  /** Emits the full next items array in the owner stored shapes. */
  onChange: (items: PageListItemV2[]) => void;
  disabled?: boolean;
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
};

type ListItemRow = { label: string; href: string };

/**
 * Structured items editor for the list block on the dark floating toolbar
 * (client-readiness FIX: footer link columns). Each stored item maps to a row
 * with a label and an optional free-form link URL; rows with a link target
 * commit the `{ label, href }` link-item shape and rows without one commit the
 * legacy plain string, so plain-text items keep their stored shape untouched.
 * Link items stay panel-only: the inline canvas contract excludes them.
 */
export const ListItemsControl = ({
  label,
  value,
  onChange,
  disabled = false,
  tone,
}: ListItemsControlProps) => {
  const resolvedTone = useEditorControlTone(tone);
  const focusClass = editorControlFocusClassFor(resolvedTone);
  const inputClass =
    resolvedTone === "light"
      ? editorPanelInputClass
      : "border border-white/15 bg-white/10 text-slate-100 placeholder:text-slate-500";
  const subInputClass =
    resolvedTone === "light"
      ? editorPanelSubInputClass
      : "border border-white/15 bg-white/5 text-slate-200 placeholder:text-slate-500";
  const rows: ListItemRow[] = value.map((item) => {
    if (typeof item === "string") return { label: item, href: "" };
    if (item && typeof item === "object") {
      const record = item as { label?: unknown; href?: unknown };
      return {
        label: typeof record.label === "string" ? record.label : "",
        href: typeof record.href === "string" ? record.href : "",
      };
    }
    return { label: "", href: "" };
  });

  const commitRows = (nextRows: readonly ListItemRow[]) => {
    onChange(nextRows.map((row) => createPageListItem(row.label, row.href)));
  };

  const patchRow = (index: number, patch: Partial<ListItemRow>) => {
    commitRows(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="grid gap-1.5" data-page-editor-control="list-items">
      <span className={editorControlLabelClassFor(resolvedTone)}>{label}</span>
      <div className="grid gap-1.5">
        {rows.map((row, index) => (
          <div
            // Rows are positional (items have no ids); index keys keep focus
            // stable because edits never reorder rows.
            key={index}
            className="flex items-center gap-1.5"
            data-page-editor-list-item-row={index}
          >
            <div className="grid min-w-0 flex-1 gap-1">
              <input
                className={`w-full rounded-md px-2 py-1.5 text-sm ${inputClass} ${focusClass}`}
                value={row.label}
                placeholder={`Item ${index + 1}`}
                aria-label={`Item ${index + 1} label`}
                disabled={disabled}
                onChange={(event) => patchRow(index, { label: event.target.value })}
              />
              <input
                className={`w-full rounded-md px-2 py-1 text-xs ${subInputClass} ${focusClass}`}
                value={row.href}
                placeholder="Link URL (optional)"
                aria-label={`Item ${index + 1} link URL`}
                disabled={disabled}
                onChange={(event) => patchRow(index, { href: event.target.value })}
              />
            </div>
            <button
              type="button"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${editorGhostButtonClassFor(
                resolvedTone
              )} ${focusClass}`}
              aria-label={`Remove item ${index + 1}`}
              disabled={disabled}
              onClick={() => commitRows(rows.filter((_, rowIndex) => rowIndex !== index))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`flex h-7 items-center justify-center gap-1 rounded-md text-xs font-semibold ${editorButtonClassFor(
          resolvedTone
        )} ${focusClass}`}
        disabled={disabled}
        onClick={() => commitRows([...rows, { label: "", href: "" }])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </button>
    </div>
  );
};
