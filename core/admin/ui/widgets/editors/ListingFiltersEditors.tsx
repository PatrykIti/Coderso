import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
  listingFiltersDefaults,
  normalizeListingFiltersData,
  type ListingFiltersData,
} from "../../../../widgets/core/listingFilters";
import type {
  WidgetEditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import type {
  ListingFacetConfig,
  ListingFacetControlMode,
  ListingFacetDateInputMode,
  ListingFacetKind,
  ListingFacetRangeInputMode,
} from "../../../../services/search/filterContract";
import {
  getAllowedListingFilterOperators,
  getListingFacetDefaultOperator,
  type ListingFilterOperator,
  tokenizeListingFacetId,
} from "../../../../services/search/filterContract";
import type { ListingQueryRecord } from "../../../services/listingsClient";
import { useListingQueries } from "../../listings/hooks/useListingQueries";
import { ClearableInputField } from "./ClearableFields";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

type ListingFacetOptionDraft = {
  value: string;
  label: string;
  parentValue: string;
};

type ListingFacetSortOptionDraft = {
  value: string;
  label: string;
  field: string;
  dir: "asc" | "desc" | "";
};

type ListingFacetDraft = {
  id: string;
  kind: ListingFacetKind;
  label: string;
  field: string;
  op?: ListingFilterOperator;
  presentation?: {
    controlMode?: ListingFacetControlMode;
    rangeStep?: number;
    rangeInputMode?: ListingFacetRangeInputMode;
    dateInputMode?: ListingFacetDateInputMode;
  };
  options?: ListingFacetOptionDraft[];
  sortOptions?: ListingFacetSortOptionDraft[];
};
type ListingFacetDraftValidation = {
  normalizedId: string;
  errors: string[];
  optionErrors: Array<{ index: number; errors: string[] }>;
  sortOptionErrors: Array<{ index: number; errors: string[] }>;
};

type ListingQueriesState = ReturnType<typeof useListingQueries>;
type ListingFiltersVariantId = "default" | "horizontal" | "sidebar" | "drawer";
type ListingFiltersMaxWidth = "narrow" | "content" | "wide" | "full";

const NO_LISTING_QUERY_VALUE = "__no_listing_query__";
const NO_SORT_DIRECTION_VALUE = "__no_sort_direction__";

const kindOptions: Array<{ value: ListingFacetKind; label: string }> = [
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio" },
  { value: "taxonomy", label: "Taxonomy" },
  { value: "range", label: "Range" },
  { value: "date-range", label: "Date range" },
  { value: "sort", label: "Sort" },
];

const operatorLabelMap: Record<ListingFilterOperator, string> = {
  eq: "Equals",
  neq: "Not equals",
  in: "Contains any",
  nin: "Contains none",
  contains: "Contains text",
  startsWith: "Starts with",
  gt: "Greater than",
  gte: "Greater or equal",
  lt: "Lower than",
  lte: "Lower or equal",
  between: "Between",
  exists: "Exists",
};

const controlModeOptions: Array<{ value: ListingFacetControlMode; label: string }> = [
  { value: "inline", label: "Inline list" },
  { value: "searchable", label: "Searchable list" },
];

const rangeInputModeOptions: Array<{ value: ListingFacetRangeInputMode; label: string }> = [
  { value: "inputs", label: "Inputs only" },
  { value: "inputs-slider", label: "Inputs + sliders" },
];

const dateInputModeOptions: Array<{ value: ListingFacetDateInputMode; label: string }> = [
  { value: "native-date", label: "Native date fields" },
  { value: "text-fallback", label: "Text fallback" },
];

const variantOptions: Array<{
  value: ListingFiltersVariantId;
  label: string;
  description: string;
}> = [
  {
    value: "default",
    label: "Default",
    description: "Stacked filter panel with the standard framed surface.",
  },
  {
    value: "horizontal",
    label: "Horizontal",
    description: "Compact filter bar suited to above-list placement.",
  },
  {
    value: "sidebar",
    label: "Sidebar",
    description: "Narrow filter panel for side-column layouts and sticky placement.",
  },
  {
    value: "drawer",
    label: "Drawer",
    description: "Collapsible filter shell for mobile-heavy layouts.",
  },
];

const maxWidthOptions: Array<{ value: ListingFiltersMaxWidth; label: string }> = [
  { value: "narrow", label: "Narrow" },
  { value: "content", label: "Content" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full width" },
];

const resolveDefaultOperator = (kind: ListingFacetKind): ListingFilterOperator =>
  getListingFacetDefaultOperator(kind);

const isListingFacetKind = (value: unknown): value is ListingFacetKind =>
  value === "checkbox" ||
  value === "radio" ||
  value === "taxonomy" ||
  value === "range" ||
  value === "date-range" ||
  value === "sort";

const isListingFilterOperator = (value: unknown): value is ListingFilterOperator =>
  typeof value === "string" && value in operatorLabelMap;

const resolveDraftText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const resolveOptionalDraftText = (value: unknown) => (typeof value === "string" ? value : "");

const readDraftFacetOptions = (value: unknown): ListingFacetOptionDraft[] =>
  Array.isArray(value)
    ? value
        .map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
          const record = entry as Record<string, unknown>;
          return {
            value: resolveOptionalDraftText(record.value),
            label: resolveOptionalDraftText(record.label),
            parentValue: resolveOptionalDraftText(record.parentValue),
          } satisfies ListingFacetOptionDraft;
        })
        .filter((entry): entry is ListingFacetOptionDraft => entry !== null)
    : [];

const readDraftSortOptions = (value: unknown): ListingFacetSortOptionDraft[] =>
  Array.isArray(value)
    ? value
        .map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
          const record = entry as Record<string, unknown>;
          return {
            value: resolveOptionalDraftText(record.value),
            label: resolveOptionalDraftText(record.label),
            field: resolveOptionalDraftText(record.field),
            dir: record.dir === "asc" || record.dir === "desc" ? record.dir : "",
          } satisfies ListingFacetSortOptionDraft;
        })
        .filter((entry): entry is ListingFacetSortOptionDraft => entry !== null)
    : [];

const dedupeText = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  });
  return result;
};

const getListingQueryFieldCandidates = (query: ListingQueryRecord | null) =>
  dedupeText([
    ...(query?.query.fields ?? []),
    ...(query?.query.filters ?? []).map((entry) => entry.field),
    ...(query?.query.sort ?? []).map((entry) => entry.field),
  ]);

const getFacetOperatorChoices = (
  kind: ListingFacetKind,
  currentOperator: ListingFilterOperator | undefined
) => {
  const allowed = getAllowedListingFilterOperators(kind);
  const current = currentOperator ?? resolveDefaultOperator(kind);
  const choices = allowed.map((value) => ({
    value,
    label: operatorLabelMap[value],
    legacy: false,
  }));

  if (!allowed.includes(current) && kind !== "sort") {
    choices.unshift({
      value: current,
      label: `Unsupported legacy: ${operatorLabelMap[current]}`,
      legacy: true,
    });
  }

  return choices;
};

const resolveEditorFacetSource = (value: ListingFiltersData): unknown[] => {
  if (Array.isArray(value.facets)) {
    return value.facets;
  }
  return normalizeListingFiltersData(value).facets ?? [];
};

const buildListingFacetDrafts = (value: ListingFiltersData): ListingFacetDraft[] => {
  const source = resolveEditorFacetSource(value);

  return source.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      const fallbackId = `facet-${index + 1}`;
      return {
        id: fallbackId,
        kind: "checkbox",
        label: `Facet ${index + 1}`,
        field: "",
        op: resolveDefaultOperator("checkbox"),
        options: [],
      };
    }

    const record = entry as Record<string, unknown>;
    const kind = isListingFacetKind(record.kind) ? record.kind : "checkbox";
    const fallbackId = `facet-${index + 1}`;

    const presentationRecord =
      record.presentation &&
      typeof record.presentation === "object" &&
      !Array.isArray(record.presentation)
        ? (record.presentation as Record<string, unknown>)
        : null;

    return {
      id: resolveDraftText(record.id, fallbackId),
      kind,
      label: resolveDraftText(record.label, `Facet ${index + 1}`),
      field: resolveOptionalDraftText(record.field),
      presentation: presentationRecord
        ? {
            controlMode:
              presentationRecord.controlMode === "inline" ||
              presentationRecord.controlMode === "searchable"
                ? presentationRecord.controlMode
                : undefined,
            rangeStep:
              typeof presentationRecord.rangeStep === "number" &&
              Number.isFinite(presentationRecord.rangeStep)
                ? presentationRecord.rangeStep
                : undefined,
            rangeInputMode:
              presentationRecord.rangeInputMode === "inputs" ||
              presentationRecord.rangeInputMode === "inputs-slider"
                ? presentationRecord.rangeInputMode
                : undefined,
            dateInputMode:
              presentationRecord.dateInputMode === "native-date" ||
              presentationRecord.dateInputMode === "text-fallback"
                ? presentationRecord.dateInputMode
                : undefined,
          }
        : undefined,
      ...(kind === "sort"
        ? {
            sortOptions: readDraftSortOptions(record.sortOptions),
          }
        : {
            op: isListingFilterOperator(record.op) ? record.op : resolveDefaultOperator(kind),
            options: readDraftFacetOptions(record.options),
          }),
    };
  });
};

const validateListingFacetDrafts = (drafts: ListingFacetDraft[]): ListingFacetDraftValidation[] => {
  const normalizedIds = drafts.map(
    (draft, index) => tokenizeListingFacetId(draft.id) || `facet-${index + 1}`
  );

  return drafts.map((draft, index) => {
    const errors: string[] = [];
    const optionErrors: Array<{ index: number; errors: string[] }> = [];
    const sortOptionErrors: Array<{ index: number; errors: string[] }> = [];
    const normalizedId = normalizedIds[index] ?? `facet-${index + 1}`;
    const duplicateCount = normalizedIds.filter((candidate) => candidate === normalizedId).length;
    const rawId = draft.id.trim();

    if (duplicateCount > 1) {
      errors.push(`Duplicate facet ID after normalization: ${normalizedId}.`);
    }

    if (rawId.length === 0) {
      errors.push("Facet ID is required.");
    } else if (normalizedId !== rawId.toLowerCase()) {
      errors.push(
        `Facet ID will be saved as ${normalizedId}. Use lowercase letters, numbers, dots, underscores, or hyphens to keep it stable.`
      );
    }

    if (draft.kind !== "sort" && draft.field.trim().length === 0) {
      errors.push("Field path is required for this facet kind.");
    }

    if (draft.kind !== "sort") {
      const currentOperator = draft.op ?? resolveDefaultOperator(draft.kind);
      const allowedOperators = getAllowedListingFilterOperators(draft.kind);
      if (!allowedOperators.includes(currentOperator)) {
        errors.push(
          `Operator ${operatorLabelMap[currentOperator]} is not supported for ${draft.kind}.`
        );
      }
    }

    if (draft.kind === "sort") {
      (draft.sortOptions ?? []).forEach((option, optionIndex) => {
        const rowErrors: string[] = [];
        if (option.value.trim().length === 0) {
          rowErrors.push("Sort value is required.");
        }
        if (option.field.trim().length === 0) {
          rowErrors.push("Sort field is required.");
        }
        if (option.dir !== "asc" && option.dir !== "desc") {
          rowErrors.push("Sort direction must be asc or desc.");
        }
        if (rowErrors.length > 0) {
          sortOptionErrors.push({ index: optionIndex, errors: rowErrors });
        }
      });
    } else if (draft.kind !== "range" && draft.kind !== "date-range") {
      (draft.options ?? []).forEach((option, optionIndex) => {
        const rowErrors: string[] = [];
        if (option.value.trim().length === 0) {
          rowErrors.push("Option value is required.");
        }
        if (
          draft.kind === "taxonomy" &&
          option.parentValue.trim().length > 0 &&
          option.parentValue.trim() === option.value.trim()
        ) {
          rowErrors.push("Parent value cannot point to the same taxonomy option.");
        }
        if (
          draft.kind === "taxonomy" &&
          option.parentValue.trim().length > 0 &&
          !(draft.options ?? []).some(
            (candidate) => candidate.value.trim() === option.parentValue.trim()
          )
        ) {
          rowErrors.push("Parent value must match another taxonomy option value.");
        }
        if (rowErrors.length > 0) {
          optionErrors.push({ index: optionIndex, errors: rowErrors });
        }
      });
    }

    return {
      normalizedId,
      errors,
      optionErrors,
      sortOptionErrors,
    };
  });
};

const serializeListingFacetDrafts = (drafts: ListingFacetDraft[]): ListingFacetConfig[] =>
  drafts.map((draft, index) => ({
    id: tokenizeListingFacetId(draft.id) || `facet-${index + 1}`,
    kind: draft.kind,
    label: draft.label,
    ...(draft.kind === "sort"
      ? {
          ...(draft.sortOptions
            ? {
                sortOptions: draft.sortOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                  field: option.field,
                  ...(option.dir === "asc" || option.dir === "desc" ? { dir: option.dir } : {}),
                })) as ListingFacetConfig["sortOptions"],
              }
            : {}),
        }
      : {
          field: draft.field,
          op: draft.op ?? resolveDefaultOperator(draft.kind),
          ...(draft.options
            ? {
                options: draft.options.map((option) => ({
                  value: option.value,
                  label: option.label,
                  ...(option.parentValue.trim().length > 0
                    ? { parentValue: option.parentValue.trim() }
                    : {}),
                })),
              }
            : {}),
        }),
    ...(draft.presentation && Object.values(draft.presentation).some((entry) => entry !== undefined)
      ? { presentation: draft.presentation }
      : {}),
  }));

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id: string;
  mode: WidgetEditorMode;
  role: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function updateValue(
  value: ListingFiltersData,
  onChange: (next: ListingFiltersData) => void,
  updater: (current: ListingFiltersData) => ListingFiltersData
) {
  const current = normalizeListingFiltersData(value);
  const currentWithEditorFacets: ListingFiltersData = {
    ...current,
    ...(Array.isArray(value.facets) ? { facets: value.facets } : {}),
  };
  const next = updater(currentWithEditorFacets);
  const normalizedNext = normalizeListingFiltersData(next);
  const nextFacets = Array.isArray(next.facets) ? next.facets : normalizedNext.facets;
  onChange({
    ...normalizedNext,
    ...(nextFacets ? { facets: nextFacets } : {}),
  });
}

function updateStyle(
  value: ListingFiltersData,
  onChange: (next: ListingFiltersData) => void,
  patch: Partial<NonNullable<ListingFiltersData["style"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateLayout(
  value: ListingFiltersData,
  onChange: (next: ListingFiltersData) => void,
  patch: Partial<NonNullable<ListingFiltersData["layout"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function clearStyle(
  value: ListingFiltersData,
  onChange: (next: ListingFiltersData) => void,
  key: keyof NonNullable<ListingFiltersData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

const moveArrayItem = <T,>(items: T[], index: number, direction: -1 | 1) => {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const nextItems = [...items];
  const [entry] = nextItems.splice(index, 1);
  nextItems.splice(nextIndex, 0, entry);
  return nextItems;
};

const flattenDraftTaxonomyOptions = (options: ListingFacetOptionDraft[]) => {
  const values = new Set(options.map((option) => option.value.trim()).filter(Boolean));
  const childrenByParent = new Map<string, ListingFacetOptionDraft[]>();
  const roots: ListingFacetOptionDraft[] = [];

  options.forEach((option) => {
    const parentValue = option.parentValue.trim();
    const optionValue = option.value.trim();
    if (!parentValue || parentValue === optionValue || !values.has(parentValue)) {
      roots.push(option);
      return;
    }
    const current = childrenByParent.get(parentValue) ?? [];
    current.push(option);
    childrenByParent.set(parentValue, current);
  });

  const result: Array<{ option: ListingFacetOptionDraft; depth: number }> = [];
  const visited = new Set<string>();

  const visit = (option: ListingFacetOptionDraft, depth: number) => {
    const optionValue = option.value.trim();
    if (optionValue && visited.has(optionValue)) return;
    if (optionValue) visited.add(optionValue);
    result.push({ option, depth });
    (childrenByParent.get(optionValue) ?? []).forEach((child) => visit(child, depth + 1));
  };

  roots.forEach((option) => visit(option, 0));
  options.forEach((option) => {
    const optionValue = option.value.trim();
    if (!optionValue || !visited.has(optionValue)) {
      visit(option, 0);
    }
  });

  return result;
};

function ListingFacetPreview({ facet }: { facet: ListingFacetDraft }) {
  const options = facet.options ?? [];
  const sortOptions = facet.sortOptions ?? [];

  if (facet.kind === "sort") {
    return (
      <div className="space-y-2 rounded-md border border-dashed border-border/70 bg-background/60 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">{facet.label || "Sort"}</span>
          <select
            className="h-9 rounded-md border border-border/70 bg-transparent px-3 text-sm"
            disabled
          >
            <option>Default order</option>
            {sortOptions.map((option, index) => (
              <option key={`${option.value || "sort"}-${index}`}>
                {option.label.trim() || option.value.trim() || `Sort ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  if (facet.kind === "range" || facet.kind === "date-range") {
    return (
      <div className="space-y-2 rounded-md border border-dashed border-border/70 bg-background/60 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
        <fieldset className="grid gap-2 text-sm">
          <legend className="font-medium">{facet.label || "Range"}</legend>
          {facet.kind === "date-range" && facet.presentation?.dateInputMode !== "text-fallback" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="h-9 rounded-md border border-border/70 bg-transparent px-3 text-sm"
                type="date"
                disabled
              />
              <input
                className="h-9 rounded-md border border-border/70 bg-transparent px-3 text-sm"
                type="date"
                disabled
              />
            </div>
          ) : facet.kind === "range" ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="h-9 rounded-md border border-border/70 bg-transparent px-3 text-sm"
                  type="number"
                  disabled
                  placeholder="Min"
                />
                <input
                  className="h-9 rounded-md border border-border/70 bg-transparent px-3 text-sm"
                  type="number"
                  disabled
                  placeholder="Max"
                />
              </div>
              {facet.presentation?.rangeInputMode !== "inputs" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input type="range" disabled />
                  <input type="range" disabled />
                </div>
              ) : null}
            </>
          ) : (
            <input
              className="h-9 rounded-md border border-border/70 bg-transparent px-3 text-sm"
              disabled
              placeholder="YYYY-MM-DD,YYYY-MM-DD"
              value=""
              readOnly
            />
          )}
        </fieldset>
      </div>
    );
  }

  const previewOptions =
    options.length > 0
      ? options
      : [{ value: "", label: `Add ${facet.kind} options to preview this facet.`, parentValue: "" }];

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/70 bg-background/60 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
      {facet.kind === "radio" ? (
        <fieldset className="space-y-2 text-sm">
          <legend className="font-medium">{facet.label || "Facet"}</legend>
          <div className="grid gap-1.5">
            {previewOptions.map((option, index) => (
              <label
                key={`${option.value || "option"}-${index}`}
                className="flex items-center gap-2"
              >
                <input type="radio" name={`preview-${facet.id || "facet"}`} disabled />
                <span>{option.label.trim() || option.value.trim() || `Option ${index + 1}`}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : facet.presentation?.controlMode === "searchable" ? (
        <fieldset className="space-y-2 text-sm">
          <legend className="font-medium">{facet.label || "Facet"}</legend>
          <input
            className="h-9 rounded-md border border-border/70 bg-transparent px-3 text-sm"
            type="search"
            disabled
            placeholder={`Search ${(facet.label || "facet").toLowerCase()} options`}
          />
          <div className="grid gap-1.5">
            {(facet.kind === "taxonomy"
              ? flattenDraftTaxonomyOptions(previewOptions)
              : previewOptions.map((option) => ({ option, depth: 0 }))
            ).map(({ option, depth }, index) => (
              <label
                key={`${option.value || "option"}-${index}`}
                className="flex items-center gap-2"
                style={depth > 0 ? { paddingInlineStart: `${depth * 16}px` } : undefined}
              >
                <input type="checkbox" disabled />
                <span>{option.label.trim() || option.value.trim() || `Option ${index + 1}`}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <fieldset className="space-y-2 text-sm">
          <legend className="font-medium">{facet.label || "Facet"}</legend>
          <div className="grid gap-1.5">
            {(facet.kind === "taxonomy"
              ? flattenDraftTaxonomyOptions(previewOptions)
              : previewOptions.map((option) => ({ option, depth: 0 }))
            ).map(({ option, depth }, index) => (
              <label
                key={`${option.value || "option"}-${index}`}
                className="flex items-center gap-2"
                style={depth > 0 ? { paddingInlineStart: `${depth * 16}px` } : undefined}
              >
                <input type="checkbox" disabled />
                <span>{option.label.trim() || option.value.trim() || `Option ${index + 1}`}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

function ListingQuerySelect({
  value,
  onChange,
  queriesState,
}: {
  value: ListingFiltersData;
  onChange: (next: ListingFiltersData) => void;
  queriesState: ListingQueriesState;
}) {
  const normalized = normalizeListingFiltersData(value);
  const { items, isLoading, error, refresh } = queriesState;
  const loadState = isLoading
    ? "loading"
    : error
      ? "error"
      : items.length === 0
        ? "empty"
        : "ready";
  const selectedValue = normalized.listingQueryId || NO_LISTING_QUERY_VALUE;
  const selectedLabel =
    selectedValue === NO_LISTING_QUERY_VALUE
      ? "No listing query selected"
      : (items.find((item) => item.id === selectedValue)?.name ?? "Selected listing query");

  return (
    <EditorSection
      id="listing-filters.wizard.query-source"
      mode="wizard"
      role="source"
      title="Listing query source"
      description="Bind facets to a single listing query source."
    >
      <WidgetControlRow
        id="listing-filters.wizard.listing-query"
        label="Listing query"
        path="listingQueryId"
        help="Changing the source can invalidate existing facet fields. Treat this as setup ownership."
      >
        {(fieldProps) => (
          <Select
            value={selectedValue}
            onValueChange={(next) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                listingQueryId: next === NO_LISTING_QUERY_VALUE ? "" : next,
              }))
            }
          >
            <SelectTrigger
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            >
              <SelectValue placeholder="Select listing query">{selectedLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LISTING_QUERY_VALUE}>No listing query selected</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      {loadState === "loading" ? (
        <p className="text-xs text-muted-foreground">Loading listing queries...</p>
      ) : null}
      {loadState === "empty" ? (
        <p className="text-xs text-muted-foreground">No listing queries are available yet.</p>
      ) : null}
      {loadState === "error" && error ? (
        <div className="flex items-center gap-2">
          <p className="text-xs text-destructive">{error}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void refresh({ force: true, retryAuthOnce: true });
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {!normalized.listingQueryId ? (
        <p className="text-xs text-muted-foreground">
          Select a listing query to enable canvas preview and facet mapping.
        </p>
      ) : null}
    </EditorSection>
  );
}

function FacetDraftEditor({
  mode,
  value,
  onChange,
  listingQueries,
}: {
  mode: "setup" | "presentation";
  value: ListingFiltersData;
  onChange: (next: ListingFiltersData) => void;
  listingQueries: ListingQueryRecord[];
}) {
  const editorMode: WidgetEditorMode = mode === "setup" ? "wizard" : "visual";
  const isSetupMode = mode === "setup";
  const isPresentationMode = mode === "presentation";
  const normalizedValue = normalizeListingFiltersData(value);
  const selectedListingQuery =
    listingQueries.find((item) => item.id === normalizedValue.listingQueryId) ?? null;
  const fieldCandidates = useMemo(
    () => getListingQueryFieldCandidates(selectedListingQuery),
    [selectedListingQuery]
  );
  const persistedFacets = useMemo(() => buildListingFacetDrafts(value), [value]);
  const persistedSignature = useMemo(
    () => JSON.stringify(serializeListingFacetDrafts(persistedFacets)),
    [persistedFacets]
  );
  const [facets, setFacets] = useState<ListingFacetDraft[]>(() => persistedFacets);
  const lastPersistedSignatureRef = useRef(persistedSignature);
  const facetsRef = useRef(facets);
  const validations = validateListingFacetDrafts(facets);

  useEffect(() => {
    facetsRef.current = facets;
  }, [facets]);

  useEffect(() => {
    if (persistedSignature === lastPersistedSignatureRef.current) return;
    lastPersistedSignatureRef.current = persistedSignature;
    setFacets((currentFacets) => {
      const hasDraftErrors = validateListingFacetDrafts(currentFacets).some(
        (entry) =>
          entry.errors.length > 0 ||
          entry.optionErrors.length > 0 ||
          entry.sortOptionErrors.length > 0
      );
      return hasDraftErrors ? currentFacets : persistedFacets;
    });
  }, [persistedFacets, persistedSignature]);

  const commitFacetDrafts = (nextDrafts: ListingFacetDraft[]) => {
    const normalized = normalizeListingFiltersData(value);
    onChange({
      ...normalized,
      facets: serializeListingFacetDrafts(nextDrafts),
    });
  };

  const updateFacetDrafts = (updater: (current: ListingFacetDraft[]) => ListingFacetDraft[]) => {
    const nextDrafts = updater(facetsRef.current);
    facetsRef.current = nextDrafts;
    setFacets(nextDrafts);
    commitFacetDrafts(nextDrafts);
  };

  const addFacet = () => {
    updateFacetDrafts((currentFacets) => {
      const index = currentFacets.length + 1;
      return [
        ...currentFacets,
        {
          id: `facet-${index}`,
          kind: "checkbox",
          label: `Facet ${index}`,
          field: "",
          op: "in",
          options: [],
        },
      ];
    });
  };

  return (
    <EditorSection
      id={
        isSetupMode
          ? "listing-filters.wizard.facet-setup"
          : "listing-filters.visual.facet-presentation"
      }
      mode={editorMode}
      role={isSetupMode ? "setup" : "content"}
      title={isSetupMode ? "Facet setup" : "Facet presentation"}
      description={
        isSetupMode
          ? "Create facets and configure their field, operator, option value, and sort bindings."
          : "Rename, reorder, and tune how configured facets appear to visitors."
      }
    >
      <div className="space-y-3">
        {facets.map((facet, index) => {
          const key = `${index}:${facet.id || `facet-${index + 1}`}`;
          const kind = facet.kind;
          const isSort = kind === "sort";
          const isRange = kind === "range" || kind === "date-range";
          const isTaxonomy = kind === "taxonomy";
          const canUseOptions = !isSort && !isRange;
          const controlMode = facet.presentation?.controlMode ?? "inline";
          const rangeInputMode = facet.presentation?.rangeInputMode ?? "inputs-slider";
          const dateInputMode = facet.presentation?.dateInputMode ?? "native-date";
          const rangeStep = facet.presentation?.rangeStep;
          const operatorChoices = getFacetOperatorChoices(kind, facet.op);
          const validation = validations[index] ?? {
            normalizedId: tokenizeListingFacetId(facet.id) || `facet-${index + 1}`,
            errors: [],
            optionErrors: [],
            sortOptionErrors: [],
          };
          const rawId = facet.id.trim();
          const showsNormalizedId = rawId.length > 0 && rawId !== validation.normalizedId;
          const fieldSuggestionId =
            fieldCandidates.length > 0 ? `listing-filters-field-suggestions-${index}` : undefined;

          return (
            <div
              key={key}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-widget-control={`listing-filters.facet.${index}`}
              data-widget-control-ownership="preview"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Facet {index + 1}</p>
                {isSetupMode ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-widget-control={`listing-filters.facet.${index}.remove`}
                    data-widget-control-ownership="action"
                    onClick={() =>
                      updateFacetDrafts((currentFacets) =>
                        currentFacets.filter((_, i) => i !== index)
                      )
                    }
                  >
                    Remove
                  </Button>
                ) : (
                  <WidgetControlRow
                    id={`listing-filters.visual.facet.${index}.order`}
                    label="Order"
                    path={`facets.${index}.order`}
                    className="min-w-[9rem]"
                  >
                    {() => (
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onClick={() =>
                            updateFacetDrafts((currentFacets) =>
                              moveArrayItem(currentFacets, index, -1)
                            )
                          }
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={index === facets.length - 1}
                          onClick={() =>
                            updateFacetDrafts((currentFacets) =>
                              moveArrayItem(currentFacets, index, 1)
                            )
                          }
                        >
                          Down
                        </Button>
                      </div>
                    )}
                  </WidgetControlRow>
                )}
              </div>

              {isSetupMode ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <WidgetControlRow
                    id={`listing-filters.wizard.facet.${index}.id`}
                    label="Facet ID"
                    path={`facets.${index}.id`}
                  >
                    {(fieldProps) => (
                      <Input
                        id={fieldProps.id}
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        aria-describedby={fieldProps["aria-describedby"]}
                        value={facet.id}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          updateFacetDrafts((currentFacets) =>
                            currentFacets.map((entry, i) =>
                              i === index ? { ...entry, id: nextValue } : entry
                            )
                          );
                        }}
                        placeholder="facet-id"
                      />
                    )}
                  </WidgetControlRow>
                  <ReadonlyWidgetSummaryRow
                    id={`listing-filters.wizard.facet.${index}.label-seed`}
                    label="Current label"
                    path={`facets.${index}.label`}
                    value={facet.label}
                    help="Visual owns daily label edits after setup creates the facet."
                  />
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <ReadonlyWidgetSummaryRow
                    id={`listing-filters.visual.facet.${index}.source-id`}
                    label="Facet ID"
                    path={`facets.${index}.id`}
                    value={validation.normalizedId}
                    help="Setup owns facet identity."
                  />
                  <WidgetControlRow
                    id={`listing-filters.visual.facet.${index}.label`}
                    label="Facet label"
                    path={`facets.${index}.label`}
                  >
                    {(fieldProps) => (
                      <Input
                        id={fieldProps.id}
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        aria-describedby={fieldProps["aria-describedby"]}
                        value={facet.label}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          updateFacetDrafts((currentFacets) =>
                            currentFacets.map((entry, i) =>
                              i === index ? { ...entry, label: nextValue } : entry
                            )
                          );
                        }}
                        placeholder="Facet label"
                      />
                    )}
                  </WidgetControlRow>
                </div>
              )}

              {showsNormalizedId ? (
                <p className="text-xs text-muted-foreground">
                  Saved as: <code>{validation.normalizedId}</code>
                </p>
              ) : null}
              {validation.errors.map((error) => (
                <p key={`${validation.normalizedId}:${error}`} className="text-xs text-destructive">
                  {error}
                </p>
              ))}

              {isSetupMode ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <WidgetControlRow
                    id={`listing-filters.wizard.facet.${index}.kind`}
                    label="Facet kind"
                    path={`facets.${index}.kind`}
                  >
                    {(fieldProps) => (
                      <Select
                        value={facet.kind}
                        onValueChange={(nextKind) => {
                          const resolvedKind = kindOptions.some(
                            (option) => option.value === nextKind
                          )
                            ? (nextKind as ListingFacetKind)
                            : "checkbox";
                          updateFacetDrafts((currentFacets) =>
                            currentFacets.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    kind: resolvedKind,
                                    op: resolveDefaultOperator(resolvedKind),
                                    field: resolvedKind === "sort" ? "" : entry.field,
                                    presentation:
                                      resolvedKind === "range"
                                        ? {
                                            rangeInputMode: "inputs-slider",
                                            rangeStep: entry.presentation?.rangeStep,
                                          }
                                        : resolvedKind === "date-range"
                                          ? { dateInputMode: "native-date" }
                                          : resolvedKind === "checkbox" ||
                                              resolvedKind === "taxonomy"
                                            ? { controlMode: "inline" }
                                            : undefined,
                                    ...(resolvedKind === "sort"
                                      ? { options: [] }
                                      : { sortOptions: [] }),
                                  }
                                : entry
                            )
                          );
                        }}
                      >
                        <SelectTrigger
                          id={fieldProps.id}
                          aria-labelledby={fieldProps["aria-labelledby"]}
                          aria-describedby={fieldProps["aria-describedby"]}
                        >
                          <SelectValue placeholder="Facet kind" />
                        </SelectTrigger>
                        <SelectContent>
                          {kindOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </WidgetControlRow>

                  {!isSort ? (
                    <WidgetControlRow
                      id={`listing-filters.wizard.facet.${index}.field`}
                      label="Field path"
                      path={`facets.${index}.field`}
                    >
                      {(fieldProps) => (
                        <div className="space-y-2">
                          <Input
                            id={fieldProps.id}
                            aria-labelledby={fieldProps["aria-labelledby"]}
                            aria-describedby={fieldProps["aria-describedby"]}
                            value={facet.field ?? ""}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              updateFacetDrafts((currentFacets) =>
                                currentFacets.map((entry, i) =>
                                  i === index ? { ...entry, field: nextValue } : entry
                                )
                              );
                            }}
                            placeholder="Field path (example: tags)"
                            list={fieldSuggestionId}
                          />
                          {fieldSuggestionId ? (
                            <datalist id={fieldSuggestionId}>
                              {fieldCandidates.map((candidate) => (
                                <option key={candidate} value={candidate} />
                              ))}
                            </datalist>
                          ) : null}
                          {fieldCandidates.length > 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Suggested fields: {fieldCandidates.join(", ")}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No field suggestions are available for the selected listing query yet.
                            </p>
                          )}
                        </div>
                      )}
                    </WidgetControlRow>
                  ) : (
                    <ReadonlyWidgetSummaryRow
                      id={`listing-filters.wizard.facet.${index}.sort-field-note`}
                      label="Field path"
                      value="Sort config uses per-option field + dir."
                    />
                  )}

                  {!isSort ? (
                    <WidgetControlRow
                      id={`listing-filters.wizard.facet.${index}.operator`}
                      label="Operator"
                      path={`facets.${index}.op`}
                    >
                      {(fieldProps) => (
                        <Select
                          value={facet.op ?? resolveDefaultOperator(kind)}
                          onValueChange={(nextOp) => {
                            if (!isListingFilterOperator(nextOp)) return;
                            updateFacetDrafts((currentFacets) =>
                              currentFacets.map((entry, i) =>
                                i === index
                                  ? { ...entry, op: nextOp as ListingFilterOperator }
                                  : entry
                              )
                            );
                          }}
                        >
                          <SelectTrigger
                            id={fieldProps.id}
                            aria-labelledby={fieldProps["aria-labelledby"]}
                            aria-describedby={fieldProps["aria-describedby"]}
                          >
                            <SelectValue placeholder="Operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {operatorChoices.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </WidgetControlRow>
                  ) : (
                    <ReadonlyWidgetSummaryRow
                      id={`listing-filters.wizard.facet.${index}.sort-operator-note`}
                      label="Operator"
                      value="Sort does not use filter operators."
                    />
                  )}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  <ReadonlyWidgetSummaryRow
                    id={`listing-filters.visual.facet.${index}.kind`}
                    label="Facet kind"
                    path={`facets.${index}.kind`}
                    value={kindOptions.find((option) => option.value === facet.kind)?.label}
                  />
                  <ReadonlyWidgetSummaryRow
                    id={`listing-filters.visual.facet.${index}.field`}
                    label="Field path"
                    path={`facets.${index}.field`}
                    value={isSort ? "Sort rows own fields" : facet.field || "Not configured"}
                  />
                  <ReadonlyWidgetSummaryRow
                    id={`listing-filters.visual.facet.${index}.operator`}
                    label="Operator"
                    path={`facets.${index}.op`}
                    value={
                      isSort
                        ? "Sort"
                        : (operatorLabelMap[facet.op ?? resolveDefaultOperator(kind)] ?? "Default")
                    }
                  />
                </div>
              )}

              {isPresentationMode && (kind === "checkbox" || kind === "taxonomy") && !isSort ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <WidgetControlRow
                    id={`listing-filters.visual.facet.${index}.control-mode`}
                    label="Option mode"
                    path={`facets.${index}.presentation.controlMode`}
                  >
                    {(fieldProps) => (
                      <Select
                        value={controlMode}
                        onValueChange={(nextMode) => {
                          if (nextMode !== "inline" && nextMode !== "searchable") return;
                          updateFacetDrafts((currentFacets) =>
                            currentFacets.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    presentation: {
                                      ...(entry.presentation ?? {}),
                                      controlMode: nextMode,
                                    },
                                  }
                                : entry
                            )
                          );
                        }}
                      >
                        <SelectTrigger
                          id={fieldProps.id}
                          aria-labelledby={fieldProps["aria-labelledby"]}
                          aria-describedby={fieldProps["aria-describedby"]}
                        >
                          <SelectValue placeholder="Option mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {controlModeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </WidgetControlRow>
                  <Input
                    value={
                      isTaxonomy
                        ? "Use parent values on option rows to build nested taxonomy levels."
                        : controlMode === "searchable"
                          ? "Search box is shown above the checkbox list."
                          : "Inline checkbox list with no local option search."
                    }
                    disabled
                  />
                </div>
              ) : null}

              {isPresentationMode && kind === "range" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <WidgetControlRow
                    id={`listing-filters.visual.facet.${index}.range-input-mode`}
                    label="Range mode"
                    path={`facets.${index}.presentation.rangeInputMode`}
                  >
                    {(fieldProps) => (
                      <Select
                        value={rangeInputMode}
                        onValueChange={(nextMode) => {
                          if (nextMode !== "inputs" && nextMode !== "inputs-slider") return;
                          updateFacetDrafts((currentFacets) =>
                            currentFacets.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    presentation: {
                                      ...(entry.presentation ?? {}),
                                      rangeInputMode: nextMode,
                                    },
                                  }
                                : entry
                            )
                          );
                        }}
                      >
                        <SelectTrigger
                          id={fieldProps.id}
                          aria-labelledby={fieldProps["aria-labelledby"]}
                          aria-describedby={fieldProps["aria-describedby"]}
                        >
                          <SelectValue placeholder="Range mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {rangeInputModeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </WidgetControlRow>
                  <WidgetControlRow
                    id={`listing-filters.visual.facet.${index}.range-step`}
                    label="Range step"
                    path={`facets.${index}.presentation.rangeStep`}
                  >
                    {(fieldProps) => (
                      <Input
                        id={fieldProps.id}
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        aria-describedby={fieldProps["aria-describedby"]}
                        value={rangeStep ?? ""}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          updateFacetDrafts((currentFacets) =>
                            currentFacets.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    presentation: {
                                      ...(entry.presentation ?? {}),
                                      rangeStep:
                                        nextValue.trim().length > 0 &&
                                        Number.isFinite(Number(nextValue)) &&
                                        Number(nextValue) > 0
                                          ? Number(nextValue)
                                          : undefined,
                                    },
                                  }
                                : entry
                            )
                          );
                        }}
                        placeholder="Range step (optional)"
                      />
                    )}
                  </WidgetControlRow>
                </div>
              ) : null}

              {isPresentationMode && kind === "date-range" ? (
                <WidgetControlRow
                  id={`listing-filters.visual.facet.${index}.date-input-mode`}
                  label="Date input mode"
                  path={`facets.${index}.presentation.dateInputMode`}
                >
                  {(fieldProps) => (
                    <Select
                      value={dateInputMode}
                      onValueChange={(nextMode) => {
                        if (nextMode !== "native-date" && nextMode !== "text-fallback") return;
                        updateFacetDrafts((currentFacets) =>
                          currentFacets.map((entry, i) =>
                            i === index
                              ? {
                                  ...entry,
                                  presentation: {
                                    ...(entry.presentation ?? {}),
                                    dateInputMode: nextMode,
                                  },
                                }
                              : entry
                          )
                        );
                      }}
                    >
                      <SelectTrigger
                        id={fieldProps.id}
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        aria-describedby={fieldProps["aria-describedby"]}
                      >
                        <SelectValue placeholder="Date input mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {dateInputModeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </WidgetControlRow>
              ) : null}

              {canUseOptions ? (
                <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Options</p>
                    {isSetupMode ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-widget-control={`listing-filters.facet.${index}.option.add`}
                        data-widget-control-ownership="action"
                        onClick={() =>
                          updateFacetDrafts((currentFacets) =>
                            currentFacets.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    options: [
                                      ...(entry.options ?? []),
                                      { value: "", label: "", parentValue: "" },
                                    ],
                                  }
                                : entry
                            )
                          )
                        }
                      >
                        Add option
                      </Button>
                    ) : null}
                  </div>
                  {(facet.options ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {isSetupMode
                        ? "Add structured option rows instead of pipe-delimited textarea values."
                        : "Re-open setup to add option rows for this facet."}
                    </p>
                  ) : null}
                  {(facet.options ?? []).map((option, optionIndex) => {
                    const rowErrors =
                      validation.optionErrors.find((entry) => entry.index === optionIndex)
                        ?.errors ?? [];
                    return (
                      <div
                        key={`${optionIndex}:${option.value}:${option.label}`}
                        className="space-y-2"
                      >
                        <div
                          className={
                            isTaxonomy
                              ? "grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]"
                              : "grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]"
                          }
                        >
                          {isSetupMode ? (
                            <WidgetControlRow
                              id={`listing-filters.wizard.facet.${index}.option.${optionIndex}.value`}
                              label="Option value"
                              path={`facets.${index}.options.${optionIndex}.value`}
                            >
                              {(fieldProps) => (
                                <Input
                                  id={fieldProps.id}
                                  aria-labelledby={fieldProps["aria-labelledby"]}
                                  aria-describedby={fieldProps["aria-describedby"]}
                                  value={option.value}
                                  onChange={(event) => {
                                    const nextValue = event.target.value;
                                    updateFacetDrafts((currentFacets) =>
                                      currentFacets.map((entry, i) =>
                                        i === index
                                          ? {
                                              ...entry,
                                              options: (entry.options ?? []).map((row, rowIndex) =>
                                                rowIndex === optionIndex
                                                  ? { ...row, value: nextValue }
                                                  : row
                                              ),
                                            }
                                          : entry
                                      )
                                    );
                                  }}
                                  placeholder="Option value"
                                />
                              )}
                            </WidgetControlRow>
                          ) : (
                            <ReadonlyWidgetSummaryRow
                              id={`listing-filters.visual.facet.${index}.option.${optionIndex}.value`}
                              label="Option value"
                              path={`facets.${index}.options.${optionIndex}.value`}
                              value={option.value || "Not configured"}
                            />
                          )}
                          {isPresentationMode ? (
                            <WidgetControlRow
                              id={`listing-filters.visual.facet.${index}.option.${optionIndex}.label`}
                              label="Option label"
                              path={`facets.${index}.options.${optionIndex}.label`}
                            >
                              {(fieldProps) => (
                                <Input
                                  id={fieldProps.id}
                                  aria-labelledby={fieldProps["aria-labelledby"]}
                                  aria-describedby={fieldProps["aria-describedby"]}
                                  value={option.label}
                                  onChange={(event) => {
                                    const nextValue = event.target.value;
                                    updateFacetDrafts((currentFacets) =>
                                      currentFacets.map((entry, i) =>
                                        i === index
                                          ? {
                                              ...entry,
                                              options: (entry.options ?? []).map((row, rowIndex) =>
                                                rowIndex === optionIndex
                                                  ? { ...row, label: nextValue }
                                                  : row
                                              ),
                                            }
                                          : entry
                                      )
                                    );
                                  }}
                                  placeholder="Option label"
                                />
                              )}
                            </WidgetControlRow>
                          ) : (
                            <ReadonlyWidgetSummaryRow
                              id={`listing-filters.wizard.facet.${index}.option.${optionIndex}.label`}
                              label="Option label"
                              path={`facets.${index}.options.${optionIndex}.label`}
                              value={option.label || "Visual label not set"}
                              help="Visual owns option labels after setup creates the option value."
                            />
                          )}
                          {isTaxonomy ? (
                            isSetupMode ? (
                              <WidgetControlRow
                                id={`listing-filters.wizard.facet.${index}.option.${optionIndex}.parent`}
                                label="Parent value"
                                path={`facets.${index}.options.${optionIndex}.parentValue`}
                              >
                                {(fieldProps) => (
                                  <Input
                                    id={fieldProps.id}
                                    aria-labelledby={fieldProps["aria-labelledby"]}
                                    aria-describedby={fieldProps["aria-describedby"]}
                                    value={option.parentValue}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      updateFacetDrafts((currentFacets) =>
                                        currentFacets.map((entry, i) =>
                                          i === index
                                            ? {
                                                ...entry,
                                                options: (entry.options ?? []).map(
                                                  (row, rowIndex) =>
                                                    rowIndex === optionIndex
                                                      ? { ...row, parentValue: nextValue }
                                                      : row
                                                ),
                                              }
                                            : entry
                                        )
                                      );
                                    }}
                                    placeholder="Parent value (optional)"
                                  />
                                )}
                              </WidgetControlRow>
                            ) : (
                              <ReadonlyWidgetSummaryRow
                                id={`listing-filters.visual.facet.${index}.option.${optionIndex}.parent`}
                                label="Parent value"
                                path={`facets.${index}.options.${optionIndex}.parentValue`}
                                value={option.parentValue || "Top-level"}
                              />
                            )
                          ) : null}
                          {isPresentationMode ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateFacetDrafts((currentFacets) =>
                                    currentFacets.map((entry, i) =>
                                      i === index
                                        ? {
                                            ...entry,
                                            options: moveArrayItem(
                                              entry.options ?? [],
                                              optionIndex,
                                              -1
                                            ),
                                          }
                                        : entry
                                    )
                                  )
                                }
                              >
                                Up
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateFacetDrafts((currentFacets) =>
                                    currentFacets.map((entry, i) =>
                                      i === index
                                        ? {
                                            ...entry,
                                            options: moveArrayItem(
                                              entry.options ?? [],
                                              optionIndex,
                                              1
                                            ),
                                          }
                                        : entry
                                    )
                                  )
                                }
                              >
                                Down
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateFacetDrafts((currentFacets) =>
                                  currentFacets.map((entry, i) =>
                                    i === index
                                      ? {
                                          ...entry,
                                          options: (entry.options ?? []).filter(
                                            (_, rowIndex) => rowIndex !== optionIndex
                                          ),
                                        }
                                      : entry
                                  )
                                )
                              }
                            >
                              Remove option
                            </Button>
                          )}
                        </div>
                        {rowErrors.map((error) => (
                          <p
                            key={`option-${optionIndex}-${error}`}
                            className="text-xs text-destructive"
                          >
                            {error}
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {isSort ? (
                <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Sort options</p>
                    {isSetupMode ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-widget-control={`listing-filters.facet.${index}.sort-option.add`}
                        data-widget-control-ownership="action"
                        onClick={() =>
                          updateFacetDrafts((currentFacets) =>
                            currentFacets.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    sortOptions: [
                                      ...(entry.sortOptions ?? []),
                                      { value: "", label: "", field: "", dir: "" },
                                    ],
                                  }
                                : entry
                            )
                          )
                        }
                      >
                        Add sort option
                      </Button>
                    ) : null}
                  </div>
                  {(facet.sortOptions ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {isSetupMode
                        ? "Add explicit sort rows instead of pipe-delimited config lines."
                        : "Re-open setup to add sort rows for this facet."}
                    </p>
                  ) : null}
                  {(facet.sortOptions ?? []).map((option, optionIndex) => {
                    const rowErrors =
                      validation.sortOptionErrors.find((entry) => entry.index === optionIndex)
                        ?.errors ?? [];
                    const sortFieldSuggestionId =
                      fieldCandidates.length > 0
                        ? `listing-filters-sort-field-suggestions-${index}-${optionIndex}`
                        : undefined;
                    return (
                      <div
                        key={`${optionIndex}:${option.value}:${option.field}`}
                        className="space-y-2"
                      >
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_120px_auto]">
                          {isSetupMode ? (
                            <WidgetControlRow
                              id={`listing-filters.wizard.facet.${index}.sort-option.${optionIndex}.value`}
                              label="Sort value"
                              path={`facets.${index}.sortOptions.${optionIndex}.value`}
                            >
                              {(fieldProps) => (
                                <Input
                                  id={fieldProps.id}
                                  aria-labelledby={fieldProps["aria-labelledby"]}
                                  aria-describedby={fieldProps["aria-describedby"]}
                                  value={option.value}
                                  onChange={(event) => {
                                    const nextValue = event.target.value;
                                    updateFacetDrafts((currentFacets) =>
                                      currentFacets.map((entry, i) =>
                                        i === index
                                          ? {
                                              ...entry,
                                              sortOptions: (entry.sortOptions ?? []).map(
                                                (row, rowIndex) =>
                                                  rowIndex === optionIndex
                                                    ? { ...row, value: nextValue }
                                                    : row
                                              ),
                                            }
                                          : entry
                                      )
                                    );
                                  }}
                                  placeholder="Sort value"
                                />
                              )}
                            </WidgetControlRow>
                          ) : (
                            <ReadonlyWidgetSummaryRow
                              id={`listing-filters.visual.facet.${index}.sort-option.${optionIndex}.value`}
                              label="Sort value"
                              path={`facets.${index}.sortOptions.${optionIndex}.value`}
                              value={option.value || "Not configured"}
                            />
                          )}
                          {isPresentationMode ? (
                            <WidgetControlRow
                              id={`listing-filters.visual.facet.${index}.sort-option.${optionIndex}.label`}
                              label="Sort label"
                              path={`facets.${index}.sortOptions.${optionIndex}.label`}
                            >
                              {(fieldProps) => (
                                <Input
                                  id={fieldProps.id}
                                  aria-labelledby={fieldProps["aria-labelledby"]}
                                  aria-describedby={fieldProps["aria-describedby"]}
                                  value={option.label}
                                  onChange={(event) => {
                                    const nextValue = event.target.value;
                                    updateFacetDrafts((currentFacets) =>
                                      currentFacets.map((entry, i) =>
                                        i === index
                                          ? {
                                              ...entry,
                                              sortOptions: (entry.sortOptions ?? []).map(
                                                (row, rowIndex) =>
                                                  rowIndex === optionIndex
                                                    ? { ...row, label: nextValue }
                                                    : row
                                              ),
                                            }
                                          : entry
                                      )
                                    );
                                  }}
                                  placeholder="Sort label"
                                />
                              )}
                            </WidgetControlRow>
                          ) : (
                            <ReadonlyWidgetSummaryRow
                              id={`listing-filters.wizard.facet.${index}.sort-option.${optionIndex}.label`}
                              label="Sort label"
                              path={`facets.${index}.sortOptions.${optionIndex}.label`}
                              value={option.label || "Visual label not set"}
                            />
                          )}
                          {isSetupMode ? (
                            <WidgetControlRow
                              id={`listing-filters.wizard.facet.${index}.sort-option.${optionIndex}.field`}
                              label="Sort field"
                              path={`facets.${index}.sortOptions.${optionIndex}.field`}
                            >
                              {(fieldProps) => (
                                <div className="space-y-2">
                                  <Input
                                    id={fieldProps.id}
                                    aria-labelledby={fieldProps["aria-labelledby"]}
                                    aria-describedby={fieldProps["aria-describedby"]}
                                    value={option.field}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      updateFacetDrafts((currentFacets) =>
                                        currentFacets.map((entry, i) =>
                                          i === index
                                            ? {
                                                ...entry,
                                                sortOptions: (entry.sortOptions ?? []).map(
                                                  (row, rowIndex) =>
                                                    rowIndex === optionIndex
                                                      ? { ...row, field: nextValue }
                                                      : row
                                                ),
                                              }
                                            : entry
                                        )
                                      );
                                    }}
                                    placeholder="Sort field"
                                    list={sortFieldSuggestionId}
                                  />
                                  {sortFieldSuggestionId ? (
                                    <datalist id={sortFieldSuggestionId}>
                                      {fieldCandidates.map((candidate) => (
                                        <option key={candidate} value={candidate} />
                                      ))}
                                    </datalist>
                                  ) : null}
                                </div>
                              )}
                            </WidgetControlRow>
                          ) : (
                            <ReadonlyWidgetSummaryRow
                              id={`listing-filters.visual.facet.${index}.sort-option.${optionIndex}.field`}
                              label="Sort field"
                              path={`facets.${index}.sortOptions.${optionIndex}.field`}
                              value={option.field || "Not configured"}
                            />
                          )}
                          {isSetupMode ? (
                            <WidgetControlRow
                              id={`listing-filters.wizard.facet.${index}.sort-option.${optionIndex}.dir`}
                              label="Direction"
                              path={`facets.${index}.sortOptions.${optionIndex}.dir`}
                            >
                              {(fieldProps) => (
                                <Select
                                  value={option.dir || NO_SORT_DIRECTION_VALUE}
                                  onValueChange={(nextDir) => {
                                    updateFacetDrafts((currentFacets) =>
                                      currentFacets.map((entry, i) =>
                                        i === index
                                          ? {
                                              ...entry,
                                              sortOptions: (entry.sortOptions ?? []).map(
                                                (row, rowIndex) =>
                                                  rowIndex === optionIndex
                                                    ? {
                                                        ...row,
                                                        dir:
                                                          nextDir === "asc" || nextDir === "desc"
                                                            ? nextDir
                                                            : "",
                                                      }
                                                    : row
                                              ),
                                            }
                                          : entry
                                      )
                                    );
                                  }}
                                >
                                  <SelectTrigger
                                    id={fieldProps.id}
                                    aria-labelledby={fieldProps["aria-labelledby"]}
                                    aria-describedby={fieldProps["aria-describedby"]}
                                  >
                                    <SelectValue placeholder="Direction" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NO_SORT_DIRECTION_VALUE}>
                                      Direction
                                    </SelectItem>
                                    <SelectItem value="asc">Ascending</SelectItem>
                                    <SelectItem value="desc">Descending</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </WidgetControlRow>
                          ) : (
                            <ReadonlyWidgetSummaryRow
                              id={`listing-filters.visual.facet.${index}.sort-option.${optionIndex}.dir`}
                              label="Direction"
                              path={`facets.${index}.sortOptions.${optionIndex}.dir`}
                              value={option.dir || "Not configured"}
                            />
                          )}
                          {isSetupMode ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateFacetDrafts((currentFacets) =>
                                  currentFacets.map((entry, i) =>
                                    i === index
                                      ? {
                                          ...entry,
                                          sortOptions: (entry.sortOptions ?? []).filter(
                                            (_, rowIndex) => rowIndex !== optionIndex
                                          ),
                                        }
                                      : entry
                                  )
                                )
                              }
                            >
                              Remove sort
                            </Button>
                          ) : null}
                        </div>
                        {rowErrors.map((error) => (
                          <p
                            key={`sort-option-${optionIndex}-${error}`}
                            className="text-xs text-destructive"
                          >
                            {error}
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <ListingFacetPreview facet={facet} />
            </div>
          );
        })}
      </div>

      {isSetupMode ? (
        <Button
          type="button"
          variant="outline"
          data-widget-control="listing-filters.facet.add"
          data-widget-control-ownership="action"
          onClick={addFacet}
        >
          Add facet
        </Button>
      ) : facets.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Re-open setup to add the first facet before tuning presentation.
        </p>
      ) : null}
    </EditorSection>
  );
}

function RuntimeBehavior({
  value,
  onChange,
}: {
  value: ListingFiltersData;
  onChange: (next: ListingFiltersData) => void;
}) {
  const normalized = normalizeListingFiltersData(value);

  return (
    <EditorSection
      id="listing-filters.visual.copy-behavior"
      mode="visual"
      role="content"
      title="Filter copy and behavior"
      description="Labels and auto-apply controls."
    >
      <WidgetControlRow id="listing-filters.visual.title" label="Title" path="title">
        {(fieldProps) => (
          <Input
            id={fieldProps.id}
            aria-labelledby={fieldProps["aria-labelledby"]}
            aria-describedby={fieldProps["aria-describedby"]}
            value={normalized.title ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Filter results"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="listing-filters.visual.description"
        label="Description"
        path="description"
      >
        {(fieldProps) => (
          <Textarea
            id={fieldProps.id}
            aria-labelledby={fieldProps["aria-labelledby"]}
            aria-describedby={fieldProps["aria-describedby"]}
            value={normalized.description ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={2}
            placeholder="Optional helper text."
          />
        )}
      </WidgetControlRow>
      <div className="grid gap-2 sm:grid-cols-2">
        <WidgetControlRow
          id="listing-filters.visual.search-label"
          label="Search label"
          path="searchLabel"
        >
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
              value={normalized.searchLabel ?? ""}
              onChange={(event) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  searchLabel: event.target.value,
                }))
              }
              placeholder="Search"
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="listing-filters.visual.search-placeholder"
          label="Search placeholder"
          path="searchPlaceholder"
        >
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
              value={normalized.searchPlaceholder ?? ""}
              onChange={(event) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  searchPlaceholder: event.target.value,
                }))
              }
              placeholder="Search results..."
            />
          )}
        </WidgetControlRow>
      </div>
      <WidgetControlRow
        id="listing-filters.visual.apply-label"
        label="Apply label"
        path="applyLabel"
      >
        {(fieldProps) => (
          <Input
            id={fieldProps.id}
            aria-labelledby={fieldProps["aria-labelledby"]}
            aria-describedby={fieldProps["aria-describedby"]}
            value={normalized.applyLabel ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                applyLabel: event.target.value,
              }))
            }
            placeholder="Apply filters"
          />
        )}
      </WidgetControlRow>
      <div className="grid gap-2 sm:grid-cols-2">
        <WidgetControlRow
          id="listing-filters.visual.show-search"
          label="Show search field"
          path="showSearch"
        >
          {() => (
            <Switch
              checked={normalized.showSearch !== false}
              onCheckedChange={(checked) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  showSearch: checked,
                }))
              }
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="listing-filters.visual.auto-apply"
          label="Auto apply changes"
          path="autoApply"
        >
          {() => (
            <Switch
              checked={normalized.autoApply !== false}
              onCheckedChange={(checked) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  autoApply: checked,
                }))
              }
            />
          )}
        </WidgetControlRow>
      </div>
    </EditorSection>
  );
}

function LayoutAndVariantEditor({
  value,
  variant,
  onChange,
  onVariantChange,
}: WidgetEditorProps<ListingFiltersData>) {
  const normalized = normalizeListingFiltersData(value);
  const resolvedVariant = (
    ["default", "horizontal", "sidebar", "drawer"].includes(variant) ? variant : "default"
  ) as ListingFiltersVariantId;
  const layout = normalized.layout ?? listingFiltersDefaults.layout!;

  return (
    <EditorSection
      id="listing-filters.visual.variant-layout"
      mode="visual"
      role="layout"
      title="Variant and layout"
      description="Control the filter shell, width, and collapsible behavior."
    >
      <WidgetControlRow id="listing-filters.visual.variant" label="Variant" path="variant">
        {() => (
          <div className="space-y-2">
            {variantOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onVariantChange?.(option.value)}
                className={[
                  "w-full rounded-lg border p-3 text-left transition",
                  resolvedVariant === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/50",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
                  <span className="shrink-0 rounded-full border border-border/70 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                    {resolvedVariant === option.value ? "Selected" : "Pick"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
        )}
      </WidgetControlRow>

      <div className="grid gap-3 sm:grid-cols-2">
        <WidgetControlRow
          id="listing-filters.visual.max-width"
          label="Max width"
          path="layout.maxWidth"
        >
          {(fieldProps) => (
            <Select
              value={layout.maxWidth ?? "wide"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { maxWidth: next as ListingFiltersMaxWidth })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                {maxWidthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="listing-filters.visual.collapsible-facets"
          label="Collapsible facets"
          path="layout.collapsibleFacets"
          help="Wrap each facet in a native disclosure panel."
        >
          {() => (
            <Switch
              checked={layout.collapsibleFacets === true}
              onCheckedChange={(checked) =>
                updateLayout(value, onChange, { collapsibleFacets: checked })
              }
            />
          )}
        </WidgetControlRow>
      </div>

      {layout.collapsibleFacets || resolvedVariant === "drawer" ? (
        <WidgetControlRow
          id="listing-filters.visual.default-collapsed"
          label="Default collapsed"
          path="layout.defaultCollapsed"
          help="Start drawer and optional facet disclosures closed until expanded."
        >
          {() => (
            <Switch
              checked={layout.defaultCollapsed === true}
              onCheckedChange={(checked) =>
                updateLayout(value, onChange, { defaultCollapsed: checked })
              }
            />
          )}
        </WidgetControlRow>
      ) : null}

      {resolvedVariant === "sidebar" ? (
        <WidgetControlRow
          id="listing-filters.visual.sticky-sidebar"
          label="Sticky sidebar"
          path="layout.stickySidebar"
          help="Keeps the filter panel pinned near the top on desktop widths."
        >
          {() => (
            <Switch
              checked={layout.stickySidebar === true}
              onCheckedChange={(checked) =>
                updateLayout(value, onChange, { stickySidebar: checked })
              }
            />
          )}
        </WidgetControlRow>
      ) : null}

      {resolvedVariant === "drawer" ? (
        <p className="text-xs text-muted-foreground">
          Drawer uses a native disclosure shell so filters stay usable without extra runtime JS.
        </p>
      ) : null}
    </EditorSection>
  );
}

function SurfaceEditor({
  value,
  onChange,
}: {
  value: ListingFiltersData;
  onChange: (next: ListingFiltersData) => void;
}) {
  const normalized = normalizeListingFiltersData(value);

  return (
    <EditorSection
      id="listing-filters.visual.surface"
      mode="visual"
      role="visual"
      title="Filter surface"
      description="Decorative filter frame and action colors."
    >
      <WidgetControlRow
        id="listing-filters.visual.frame-background"
        label="Frame background"
        path="style.frameBackground"
      >
        {() => (
          <ClearableInputField
            label="Frame background"
            value={normalized.style?.frameBackground}
            onChange={(next) => updateStyle(value, onChange, { frameBackground: next })}
            onClear={() => clearStyle(value, onChange, "frameBackground")}
            placeholder="var(--color-bg)"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="listing-filters.visual.frame-border"
        label="Frame border"
        path="style.frameBorderColor"
      >
        {() => (
          <ClearableInputField
            label="Frame border"
            value={normalized.style?.frameBorderColor}
            onChange={(next) => updateStyle(value, onChange, { frameBorderColor: next })}
            onClear={() => clearStyle(value, onChange, "frameBorderColor")}
            placeholder="var(--color-border)"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="listing-filters.visual.action-background"
        label="Action background"
        path="style.actionBackground"
      >
        {() => (
          <ClearableInputField
            label="Action background"
            value={normalized.style?.actionBackground}
            onChange={(next) => updateStyle(value, onChange, { actionBackground: next })}
            onClear={() => clearStyle(value, onChange, "actionBackground")}
            placeholder="var(--color-primary)"
          />
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

const formatDiagnosticsValue = (value: string[] | string | undefined, fallback: string) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (Array.isArray(value)) {
    const normalized = value.map((entry) => entry.trim()).filter(Boolean);
    return normalized.length > 0 ? normalized.join(", ") : fallback;
  }
  return fallback;
};

function SourceAndFacetSummary({
  value,
  listingQueries,
}: {
  value: ListingFiltersData;
  listingQueries: ListingQueryRecord[];
}) {
  const normalized = normalizeListingFiltersData(value);
  const selectedQuery =
    listingQueries.find((query) => query.id === normalized.listingQueryId) ?? null;
  const facets = buildListingFacetDrafts(value);

  return (
    <EditorSection
      id="listing-filters.advanced.source-summary"
      mode="advanced"
      role="diagnostics"
      title="Source and facets summary"
      description="Read-only binding map for the query source and normalized facet setup."
    >
      <ReadonlyWidgetSummaryRow
        id="listing-filters.advanced.listing-query"
        label="Listing query"
        path="listingQueryId"
        value={
          normalized.listingQueryId
            ? `${selectedQuery?.name ?? "Selected query"} (${normalized.listingQueryId})`
            : "Not selected"
        }
      />
      <ReadonlyWidgetSummaryRow
        id="listing-filters.advanced.facet-count"
        label="Facet count"
        path="facets"
        value={String(facets.length)}
      />
      {facets.length > 0 ? (
        <div className="space-y-2">
          {facets.map((facet, index) => (
            <div
              key={`${facet.id}-${index}`}
              className="rounded-md border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground"
              data-widget-control={`listing-filters.advanced.facet.${index}`}
              data-widget-control-ownership="readonly"
              data-widget-control-readonly="true"
            >
              <p className="font-medium text-foreground">{facet.label}</p>
              <p>
                <span className="font-medium">ID:</span>{" "}
                {tokenizeListingFacetId(facet.id) || `facet-${index + 1}`}
              </p>
              <p>
                <span className="font-medium">Kind:</span> {facet.kind}
              </p>
              <p>
                <span className="font-medium">Binding:</span>{" "}
                {facet.kind === "sort"
                  ? `${facet.sortOptions?.length ?? 0} sort rows`
                  : `${facet.field || "missing field"} / ${
                      operatorLabelMap[facet.op ?? resolveDefaultOperator(facet.kind)]
                    }`}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          No facets are configured. Re-open setup to add the first facet.
        </p>
      )}
    </EditorSection>
  );
}

function RuntimeDiagnosticsSummary({ value }: { value: ListingFiltersData }) {
  const normalized = normalizeListingFiltersData(value);
  const runtimeQuery =
    normalized.resolved?.listingQueryId || normalized.listingQueryId || "Not selected";
  const rejectedTokens = formatDiagnosticsValue(normalized.resolved?.rejectedTokens, "None");
  const runtimeError = normalized.resolved?.error?.trim() || null;

  return (
    <EditorSection
      id="listing-filters.advanced.runtime-diagnostics"
      mode="advanced"
      role="diagnostics"
      title="Runtime diagnostics"
      description="Explain current editor state before public SSR fills runtime data."
    >
      <div className="space-y-2 rounded-md border border-border/70 bg-background/60 p-3 text-sm">
        <ReadonlyWidgetSummaryRow
          id="listing-filters.advanced.runtime-query"
          label="Runtime query"
          path="resolved.listingQueryId"
          value={runtimeQuery}
        />
        <ReadonlyWidgetSummaryRow
          id="listing-filters.advanced.rejected-tokens"
          label="Rejected tokens"
          path="resolved.rejectedTokens"
          value={rejectedTokens}
        />
        {runtimeError ? (
          <ReadonlyWidgetSummaryRow
            id="listing-filters.advanced.runtime-error"
            label="Runtime error"
            path="resolved.error"
            value={<span className="text-destructive">{runtimeError}</span>}
          />
        ) : (
          <p className="text-muted-foreground">
            Editor previews keep <code>resolved</code> mostly empty until public SSR resolves the
            widget on a runtime page.
          </p>
        )}
      </div>
    </EditorSection>
  );
}

function RuntimeSnapshot({ value }: { value: ListingFiltersData }) {
  const normalized = normalizeListingFiltersData(value);
  const snapshot = useMemo(
    () =>
      JSON.stringify(
        {
          resolved: normalized.resolved,
        },
        null,
        2
      ),
    [normalized]
  );

  return (
    <EditorSection
      id="listing-filters.advanced.runtime-payload"
      mode="advanced"
      role="diagnostics"
      title="Runtime payload"
      description="Read-only runtime data from server SSR."
    >
      <WidgetControlRow
        id="listing-filters.advanced.resolved-payload"
        label="Resolved payload"
        path="resolved.metrics"
        ownership="readonly"
        readOnly
      >
        {(fieldProps) => (
          <Textarea
            id={fieldProps.id}
            aria-labelledby={fieldProps["aria-labelledby"]}
            aria-describedby={fieldProps["aria-describedby"]}
            value={snapshot}
            readOnly
            rows={10}
            className="font-mono text-xs"
          />
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

export function ListingFiltersWizardEditor({
  value,
  onChange,
}: WidgetEditorProps<ListingFiltersData>) {
  const listingQueriesState = useListingQueries({ retryAuthOnce: true });
  return (
    <div className="space-y-3">
      <ListingQuerySelect value={value} onChange={onChange} queriesState={listingQueriesState} />
      <FacetDraftEditor
        mode="setup"
        value={value}
        onChange={onChange}
        listingQueries={listingQueriesState.items}
      />
    </div>
  );
}

export function ListingFiltersVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ListingFiltersData>) {
  const listingQueriesState = useListingQueries({ retryAuthOnce: true });
  return (
    <div className="space-y-3">
      <LayoutAndVariantEditor
        value={value}
        variant={variant}
        onChange={onChange}
        onVariantChange={onVariantChange}
      />
      <RuntimeBehavior value={value} onChange={onChange} />
      <SurfaceEditor value={value} onChange={onChange} />
      <FacetDraftEditor
        mode="presentation"
        value={value}
        onChange={onChange}
        listingQueries={listingQueriesState.items}
      />
    </div>
  );
}

export function ListingFiltersAdvancedEditor({ value }: WidgetEditorProps<ListingFiltersData>) {
  const listingQueriesState = useListingQueries({ retryAuthOnce: true });
  return (
    <div className="space-y-3">
      <SourceAndFacetSummary value={value} listingQueries={listingQueriesState.items} />
      <RuntimeDiagnosticsSummary value={value} />
      <RuntimeSnapshot value={value} />
      <EditorSection
        id="listing-filters.advanced.contract-summary"
        mode="advanced"
        role="summary"
        title="Contract summary"
        description="This widget expects listing query runtime params under lq.<queryId>.* tokens."
      >
        <p className="text-xs text-muted-foreground">
          Defaults come from <code>listingFiltersDefaults</code>.
        </p>
        <p className="text-xs text-muted-foreground">
          Reference: <code>_docs/_WIDGETS/LISTING_FILTERS.md</code>
        </p>
      </EditorSection>
    </div>
  );
}

export const listingFiltersEditorDefaults = listingFiltersDefaults;
