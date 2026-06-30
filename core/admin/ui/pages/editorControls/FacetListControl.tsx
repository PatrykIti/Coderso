import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  getAllowedListingFilterOperators,
  getListingFacetDefaultOperator,
  type ListingFacetConfig,
  type ListingFacetKind,
} from "../../../../services/search/filterContract";
import { pageFiltersFacetKinds } from "../../../../services/pages/pageDocumentV2";
import {
  editorButtonClassFor,
  editorControlFocusClassFor,
  editorControlLabelClassFor,
  editorGhostButtonClassFor,
  editorPanelInputClass,
  editorPanelRowClass,
  editorPanelSelectClass,
  editorPanelSubInputClass,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";

export type FacetListControlProps = {
  label: string;
  /** Stored facet configs (canonical `ListingFacetConfig` shapes). */
  value: readonly unknown[];
  /** Emits the full next facets array in the owner stored shapes. */
  onChange: (facets: ListingFacetConfig[]) => void;
  disabled?: boolean;
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
};

const inputClassFor = (tone: EditorControlTone) =>
  `w-full rounded-md px-2 py-1.5 text-sm ${
    tone === "light"
      ? editorPanelInputClass
      : "border border-white/15 bg-white/10 text-slate-100 placeholder:text-slate-500"
  } ${editorControlFocusClassFor(tone)}`;
const subInputClassFor = (tone: EditorControlTone) =>
  `w-full rounded-md px-2 py-1 text-xs ${
    tone === "light"
      ? editorPanelSubInputClass
      : "border border-white/15 bg-white/5 text-slate-200 placeholder:text-slate-500"
  } ${editorControlFocusClassFor(tone)}`;
const selectClassFor = (tone: EditorControlTone) =>
  `w-full rounded-md px-2 py-1.5 text-xs ${
    tone === "light"
      ? editorPanelSelectClass
      : "border border-white/15 bg-white/10 text-slate-100 [&>option]:bg-slate-900"
  } ${editorControlFocusClassFor(tone)}`;

const facetKindLabels: Record<ListingFacetKind, string> = {
  checkbox: "Checkbox",
  radio: "Radio",
  taxonomy: "Taxonomy",
  range: "Range",
  "date-range": "Date range",
  sort: "Sort",
};

const optionBackedKinds = new Set<ListingFacetKind>(["checkbox", "radio", "taxonomy"]);

const isFacetKind = (value: unknown): value is ListingFacetKind =>
  typeof value === "string" && (pageFiltersFacetKinds as readonly string[]).includes(value);

const readText = (value: unknown): string => (typeof value === "string" ? value : "");

type FacetRecord = Record<string, unknown>;

const toFacetRecord = (value: unknown): FacetRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as FacetRecord) : {};

const readFacetKind = (facet: FacetRecord): ListingFacetKind =>
  isFacetKind(facet.kind) ? facet.kind : "checkbox";

/**
 * Option lines grammar (deliberately simple and generic): one option per
 * line, `value | Label`; the label half is optional. Sort lines use
 * `field:dir | Label` where `dir` is `asc` or `desc`.
 */
const formatOptionLines = (options: unknown): string =>
  Array.isArray(options)
    ? options
        .map((option) => {
          const record = toFacetRecord(option);
          const value = readText(record.value);
          if (!value) return "";
          const label = readText(record.label);
          return label && label !== value ? `${value} | ${label}` : value;
        })
        .filter(Boolean)
        .join("\n")
    : "";

const parseOptionLines = (text: string): Array<{ value: string; label: string }> =>
  text
    .split("\n")
    .map((line) => {
      const [valuePart, ...labelParts] = line.split("|");
      const value = (valuePart ?? "").trim();
      if (!value) return null;
      const label = labelParts.join("|").trim();
      return { value, label: label || value };
    })
    .filter((option): option is { value: string; label: string } => option !== null);

const formatSortOptionLines = (sortOptions: unknown): string =>
  Array.isArray(sortOptions)
    ? sortOptions
        .map((option) => {
          const record = toFacetRecord(option);
          const field = readText(record.field);
          const dir = record.dir === "desc" ? "desc" : "asc";
          if (!field) return "";
          const token = `${field}:${dir}`;
          const label = readText(record.label);
          return label && label !== token ? `${token} | ${label}` : token;
        })
        .filter(Boolean)
        .join("\n")
    : "";

const parseSortOptionLines = (
  text: string
): Array<{ value: string; label: string; field: string; dir: "asc" | "desc" }> =>
  text
    .split("\n")
    .map((line) => {
      const [tokenPart, ...labelParts] = line.split("|");
      const token = (tokenPart ?? "").trim();
      const separatorIndex = token.lastIndexOf(":");
      if (separatorIndex <= 0) return null;
      const field = token.slice(0, separatorIndex).trim();
      const dir = token
        .slice(separatorIndex + 1)
        .trim()
        .toLowerCase();
      if (!field || (dir !== "asc" && dir !== "desc")) return null;
      const label = labelParts.join("|").trim();
      return { value: `${field}:${dir}`, label: label || `${field}:${dir}`, field, dir };
    })
    .filter(
      (option): option is { value: string; label: string; field: string; dir: "asc" | "desc" } =>
        option !== null
    );

/**
 * Commit-on-blur multiline editor for the option/sort-option lists, so the
 * derived stored shape never fights the caret mid-line. The `key` on the
 * call sites remounts it whenever the facet list reshapes.
 */
const FacetLinesField = ({
  ariaLabel,
  placeholder,
  initialText,
  disabled,
  tone,
  onCommit,
}: {
  ariaLabel: string;
  placeholder: string;
  initialText: string;
  disabled: boolean;
  tone: EditorControlTone;
  onCommit: (text: string) => void;
}) => {
  const [text, setText] = useState(initialText);
  return (
    <textarea
      className={`${subInputClassFor(tone)} min-h-14 resize-y`}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => onCommit(text)}
    />
  );
};

/**
 * Generic facet builder for the filters block (TASK-459-02) on the dark
 * floating toolbar. Each row edits one canonical `ListingFacetConfig`: a
 * facet kind, a user-facing label, the entry data field it filters
 * (field-driven — any schema field path such as `data.rooms`), the operator
 * (defaulted per kind), and the option lines for option-backed kinds or the
 * `field:dir` sort options for the sort kind. The stored shape stays owned by
 * the `pageDocumentV2` facet normalizer.
 */
export const FacetListControl = ({
  label,
  value,
  onChange,
  disabled = false,
  tone,
}: FacetListControlProps) => {
  const resolvedTone = useEditorControlTone(tone);
  const focusClass = editorControlFocusClassFor(resolvedTone);
  const inputClass = inputClassFor(resolvedTone);
  const subInputClass = subInputClassFor(resolvedTone);
  const selectClass = selectClassFor(resolvedTone);
  const facets = value.map(toFacetRecord);

  const commit = (nextFacets: readonly FacetRecord[]) => {
    onChange(nextFacets as unknown as ListingFacetConfig[]);
  };

  const patchFacet = (index: number, patch: FacetRecord) => {
    commit(
      facets.map((facet, facetIndex) => (facetIndex === index ? { ...facet, ...patch } : facet))
    );
  };

  return (
    <div className="grid gap-1.5" data-page-editor-control="facet-list">
      <span className={editorControlLabelClassFor(resolvedTone)}>{label}</span>
      <div className="grid gap-2">
        {facets.map((facet, index) => {
          const kind = readFacetKind(facet);
          const operators = getAllowedListingFilterOperators(kind);
          const op = readText(facet.op) || getListingFacetDefaultOperator(kind);
          // Rows are positional; the key carries the row count so removals
          // remount the blur-committed line editors with fresh initial text.
          const rowKey = `${index}:${facets.length}:${kind}`;
          return (
            <div
              key={rowKey}
              className={`grid gap-1 rounded-md p-2 ${
                resolvedTone === "light" ? editorPanelRowClass : "border border-white/10 bg-white/5"
              }`}
              data-page-editor-facet-row={index}
            >
              <div className="flex items-center gap-1.5">
                <select
                  className={selectClass}
                  value={kind}
                  aria-label={`Facet ${index + 1} kind`}
                  disabled={disabled}
                  onChange={(event) => {
                    const nextKind = isFacetKind(event.target.value)
                      ? event.target.value
                      : "checkbox";
                    // Switching kinds resets the operator to the new kind's
                    // owner default so the stored pair stays valid.
                    patchFacet(index, {
                      kind: nextKind,
                      op: getListingFacetDefaultOperator(nextKind),
                    });
                  }}
                >
                  {pageFiltersFacetKinds.map((kindOption) => (
                    <option key={kindOption} value={kindOption}>
                      {facetKindLabels[kindOption]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${editorGhostButtonClassFor(
                    resolvedTone
                  )} ${focusClass}`}
                  aria-label={`Remove facet ${index + 1}`}
                  disabled={disabled}
                  onClick={() => commit(facets.filter((_, facetIndex) => facetIndex !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                className={inputClass}
                value={readText(facet.label)}
                placeholder={`Facet ${index + 1} label`}
                aria-label={`Facet ${index + 1} label`}
                disabled={disabled}
                onChange={(event) => patchFacet(index, { label: event.target.value })}
              />
              {kind !== "sort" ? (
                <input
                  className={subInputClass}
                  value={readText(facet.field)}
                  placeholder="Field path (e.g. data.rooms)"
                  aria-label={`Facet ${index + 1} field`}
                  disabled={disabled}
                  onChange={(event) => patchFacet(index, { field: event.target.value })}
                />
              ) : null}
              {kind !== "sort" && operators.length > 0 ? (
                <select
                  className={selectClass}
                  value={operators.includes(op as (typeof operators)[number]) ? op : operators[0]}
                  aria-label={`Facet ${index + 1} operator`}
                  disabled={disabled}
                  onChange={(event) => patchFacet(index, { op: event.target.value })}
                >
                  {operators.map((operator) => (
                    <option key={operator} value={operator}>
                      {operator}
                    </option>
                  ))}
                </select>
              ) : null}
              {optionBackedKinds.has(kind) ? (
                <FacetLinesField
                  ariaLabel={`Facet ${index + 1} options`}
                  placeholder={"One option per line: value | Label"}
                  initialText={formatOptionLines(facet.options)}
                  disabled={disabled}
                  tone={resolvedTone}
                  onCommit={(text) => patchFacet(index, { options: parseOptionLines(text) })}
                />
              ) : null}
              {kind === "sort" ? (
                <FacetLinesField
                  ariaLabel={`Facet ${index + 1} sort options`}
                  placeholder={"One per line: field:asc | Label"}
                  initialText={formatSortOptionLines(facet.sortOptions)}
                  disabled={disabled}
                  tone={resolvedTone}
                  onCommit={(text) =>
                    patchFacet(index, { sortOptions: parseSortOptionLines(text) })
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className={`flex h-7 items-center justify-center gap-1 rounded-md text-xs font-semibold ${editorButtonClassFor(
          resolvedTone
        )} ${focusClass}`}
        disabled={disabled}
        onClick={() =>
          commit([
            ...facets,
            {
              id: `facet-${facets.length + 1}`,
              kind: "checkbox",
              label: `Facet ${facets.length + 1}`,
              field: "",
              op: "in",
            },
          ])
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Add facet
      </button>
    </div>
  );
};
