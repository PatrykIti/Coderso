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
import type { WidgetEditorProps } from "../../../../widgets/types";
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
import { WidgetEditorSection } from "./WidgetEditorControls";

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
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
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
      title="Listing query"
      description="Bind facets to a single listing query source."
    >
      <Select
        value={selectedValue}
        onValueChange={(next) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            listingQueryId: next === NO_LISTING_QUERY_VALUE ? "" : next,
          }))
        }
      >
        <SelectTrigger>
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

function FacetsEditor({
  value,
  onChange,
  listingQueries,
}: {
  value: ListingFiltersData;
  onChange: (next: ListingFiltersData) => void;
  listingQueries: ListingQueryRecord[];
}) {
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
        (entry) => entry.errors.length > 0
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
      title="Facet controls"
      description="Create reusable controls with structured field, operator, option, and preview editors."
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
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Facet {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-widget-control={`listing-filters.facet.${index}.remove`}
                  onClick={() =>
                    updateFacetDrafts((currentFacets) =>
                      currentFacets.filter((_, i) => i !== index)
                    )
                  }
                >
                  Remove
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Input
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
                <Input
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
              </div>

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

              <div className="grid gap-2 sm:grid-cols-3">
                <Select
                  value={facet.kind}
                  onValueChange={(nextKind) => {
                    const resolvedKind = kindOptions.some((option) => option.value === nextKind)
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
                                    : resolvedKind === "checkbox" || resolvedKind === "taxonomy"
                                      ? { controlMode: "inline" }
                                      : undefined,
                              ...(resolvedKind === "sort" ? { options: [] } : { sortOptions: [] }),
                            }
                          : entry
                      )
                    );
                  }}
                >
                  <SelectTrigger>
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

                {!isSort ? (
                  <div className="space-y-2">
                    <Input
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
                ) : (
                  <Input value="Sort config uses per-option field + dir." disabled />
                )}

                {!isSort ? (
                  <Select
                    value={facet.op ?? resolveDefaultOperator(kind)}
                    onValueChange={(nextOp) => {
                      if (!isListingFilterOperator(nextOp)) return;
                      updateFacetDrafts((currentFacets) =>
                        currentFacets.map((entry, i) =>
                          i === index ? { ...entry, op: nextOp as ListingFilterOperator } : entry
                        )
                      );
                    }}
                  >
                    <SelectTrigger>
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
                ) : (
                  <Input value="Sort does not use filter operators." disabled />
                )}
              </div>

              {(kind === "checkbox" || kind === "taxonomy") && !isSort ? (
                <div className="grid gap-2 sm:grid-cols-2">
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
                    <SelectTrigger>
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

              {kind === "range" ? (
                <div className="grid gap-2 sm:grid-cols-2">
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
                    <SelectTrigger>
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
                  <Input
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
                </div>
              ) : null}

              {kind === "date-range" ? (
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
                  <SelectTrigger>
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
              ) : null}

              {canUseOptions ? (
                <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Options</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-widget-control={`listing-filters.facet.${index}.option.add`}
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
                  </div>
                  {(facet.options ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Add structured option rows instead of pipe-delimited textarea values.
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
                          <Input
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
                          <Input
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
                          {isTaxonomy ? (
                            <Input
                              value={option.parentValue}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                updateFacetDrafts((currentFacets) =>
                                  currentFacets.map((entry, i) =>
                                    i === index
                                      ? {
                                          ...entry,
                                          options: (entry.options ?? []).map((row, rowIndex) =>
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
                          ) : null}
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
                                        options: moveArrayItem(entry.options ?? [], optionIndex, 1),
                                      }
                                    : entry
                                )
                              )
                            }
                          >
                            Down
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-widget-control={`listing-filters.facet.${index}.sort-option.add`}
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
                  </div>
                  {(facet.sortOptions ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Add explicit sort rows instead of pipe-delimited config lines.
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
                          <Input
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
                          <Input
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
                          <div className="space-y-2">
                            <Input
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
                            <SelectTrigger>
                              <SelectValue placeholder="Direction" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_SORT_DIRECTION_VALUE}>Direction</SelectItem>
                              <SelectItem value="asc">Ascending</SelectItem>
                              <SelectItem value="desc">Descending</SelectItem>
                            </SelectContent>
                          </Select>
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

      <Button
        type="button"
        variant="outline"
        data-widget-control="listing-filters.facet.add"
        onClick={addFacet}
      >
        Add facet
      </Button>
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
    <EditorSection title="Runtime behavior" description="Labels and auto-apply controls.">
      <Input
        value={normalized.title ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            title: event.target.value,
          }))
        }
        placeholder="Filter results"
      />
      <Textarea
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
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={normalized.searchLabel ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              searchLabel: event.target.value,
            }))
          }
          placeholder="Search"
        />
        <Input
          value={normalized.searchPlaceholder ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              searchPlaceholder: event.target.value,
            }))
          }
          placeholder="Search results..."
        />
      </div>
      <Input
        value={normalized.applyLabel ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            applyLabel: event.target.value,
          }))
        }
        placeholder="Apply filters"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
          <span>Show search field</span>
          <Switch
            checked={normalized.showSearch !== false}
            onCheckedChange={(checked) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                showSearch: checked,
              }))
            }
          />
        </label>
        <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
          <span>Auto apply changes</span>
          <Switch
            checked={normalized.autoApply !== false}
            onCheckedChange={(checked) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                autoApply: checked,
              }))
            }
          />
        </label>
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
      title="Variant and layout"
      description="Control the filter shell, width, and collapsible behavior."
    >
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Max width</p>
          <Select
            value={layout.maxWidth ?? "wide"}
            onValueChange={(next) =>
              updateLayout(value, onChange, { maxWidth: next as ListingFiltersMaxWidth })
            }
          >
            <SelectTrigger>
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
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Collapsible facets</p>
            <p className="text-xs text-muted-foreground">
              Wrap each facet in a native disclosure panel.
            </p>
          </div>
          <Switch
            checked={layout.collapsibleFacets === true}
            onCheckedChange={(checked) =>
              updateLayout(value, onChange, { collapsibleFacets: checked })
            }
          />
        </div>
      </div>

      {layout.collapsibleFacets || resolvedVariant === "drawer" ? (
        <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Default collapsed</p>
            <p className="text-xs text-muted-foreground">
              Start drawer and optional facet disclosures closed until expanded.
            </p>
          </div>
          <Switch
            checked={layout.defaultCollapsed === true}
            onCheckedChange={(checked) =>
              updateLayout(value, onChange, { defaultCollapsed: checked })
            }
          />
        </div>
      ) : null}

      {resolvedVariant === "sidebar" ? (
        <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Sticky sidebar</p>
            <p className="text-xs text-muted-foreground">
              Keeps the filter panel pinned near the top on desktop widths.
            </p>
          </div>
          <Switch
            checked={layout.stickySidebar === true}
            onCheckedChange={(checked) => updateLayout(value, onChange, { stickySidebar: checked })}
          />
        </div>
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
    <EditorSection title="Surface" description="Decorative filter frame and action colors.">
      <ClearableInputField
        label="Frame background"
        value={normalized.style?.frameBackground}
        onChange={(next) => updateStyle(value, onChange, { frameBackground: next })}
        onClear={() => clearStyle(value, onChange, "frameBackground")}
        placeholder="var(--color-bg)"
      />
      <ClearableInputField
        label="Frame border"
        value={normalized.style?.frameBorderColor}
        onChange={(next) => updateStyle(value, onChange, { frameBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "frameBorderColor")}
        placeholder="var(--color-border)"
      />
      <ClearableInputField
        label="Action background"
        value={normalized.style?.actionBackground}
        onChange={(next) => updateStyle(value, onChange, { actionBackground: next })}
        onClear={() => clearStyle(value, onChange, "actionBackground")}
        placeholder="var(--color-primary)"
      />
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

function RuntimeDiagnosticsSummary({ value }: { value: ListingFiltersData }) {
  const normalized = normalizeListingFiltersData(value);
  const runtimeQuery =
    normalized.resolved?.listingQueryId || normalized.listingQueryId || "Not selected";
  const rejectedTokens = formatDiagnosticsValue(normalized.resolved?.rejectedTokens, "None");
  const runtimeError = normalized.resolved?.error?.trim() || null;

  return (
    <EditorSection
      title="Diagnostics"
      description="Explain current editor state before public SSR fills runtime data."
    >
      <div className="space-y-2 rounded-md border border-border/70 bg-background/60 p-3 text-sm">
        <p>
          <span className="font-medium">Runtime query:</span> {runtimeQuery}
        </p>
        <p>
          <span className="font-medium">Rejected tokens:</span> {rejectedTokens}
        </p>
        {runtimeError ? (
          <p className="text-destructive">
            <span className="font-medium">Runtime error:</span> {runtimeError}
          </p>
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
    <EditorSection title="Runtime payload" description="Read-only runtime data from server SSR.">
      <Textarea value={snapshot} readOnly rows={10} className="font-mono text-xs" />
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
      <FacetsEditor value={value} onChange={onChange} listingQueries={listingQueriesState.items} />
      <RuntimeBehavior value={value} onChange={onChange} />
      <RuntimeDiagnosticsSummary value={value} />
      <SurfaceEditor value={value} onChange={onChange} />
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
      <ListingQuerySelect value={value} onChange={onChange} queriesState={listingQueriesState} />
      <LayoutAndVariantEditor
        value={value}
        variant={variant}
        onChange={onChange}
        onVariantChange={onVariantChange}
      />
      <RuntimeBehavior value={value} onChange={onChange} />
      <RuntimeDiagnosticsSummary value={value} />
      <SurfaceEditor value={value} onChange={onChange} />
      <FacetsEditor value={value} onChange={onChange} listingQueries={listingQueriesState.items} />
    </div>
  );
}

export function ListingFiltersAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<ListingFiltersData>) {
  const listingQueriesState = useListingQueries({ retryAuthOnce: true });
  return (
    <div className="space-y-3">
      <FacetsEditor value={value} onChange={onChange} listingQueries={listingQueriesState.items} />
      <RuntimeDiagnosticsSummary value={value} />
      <RuntimeSnapshot value={value} />
      <EditorSection
        title="Contract"
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
