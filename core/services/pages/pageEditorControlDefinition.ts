import {
  pageBlockDefaultProps,
  type PageBlockType,
} from "./pageDocumentV2";

export type PageEditorControlTarget = "section" | "block";

export type PageEditorControlPanel =
  | "layout"
  | "content"
  | "typography"
  | "style"
  | "spacing"
  | "background"
  | "responsive"
  | "visibility";

export type PageEditorControlInput =
  | "text"
  | "number"
  | "select"
  | "segmented"
  | "switch"
  | "color"
  | "swatch"
  | "media"
  | "items"
  | "facets";

export type PageEditorControlOptionsSource =
  | "forms"
  | "contentTypes"
  | "listingQueries"
  | "listingQueriesAll"
  | "listingTemplates";

export type PageEditorControlDefinition = {
  id: string;
  panel: PageEditorControlPanel;
  target: PageEditorControlTarget;
  label: string;
  path: readonly string[];
  overridePath: readonly string[];
  input: PageEditorControlInput;
  responsive: boolean;
  options?: readonly string[];
  optionsSource?: PageEditorControlOptionsSource;
  nullable?: boolean;
  filterBy?: string;
  clamp?: { min: number; max: number };
  step?: number;
  unit?: string;
  fallback?: string | number | boolean;
};

export const control = (
  definition: Omit<PageEditorControlDefinition, "overridePath"> & {
    overridePath?: readonly string[];
  }
): PageEditorControlDefinition => ({
  ...definition,
  overridePath: definition.overridePath ?? definition.path,
});

const blockPropFallback = (
  type: PageBlockType,
  key: string
): string | number | boolean | null => {
  const value = pageBlockDefaultProps[type][key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? value
    : null;
};

export const blockPropControl = (
  type: PageBlockType,
  key: string,
  definition: Pick<PageEditorControlDefinition, "label" | "input"> &
    Partial<
      Pick<
        PageEditorControlDefinition,
        "panel" | "options" | "optionsSource" | "filterBy" | "clamp" | "unit"
      >
    >
) => {
  const fallback = blockPropFallback(type, key);
  return control({
    id: `block.${type}.props.${key}`,
    panel: definition.panel ?? "content",
    target: "block",
    label: definition.label,
    path: ["props", key],
    input: definition.input,
    responsive: true,
    ...(definition.options ? { options: definition.options } : {}),
    ...(definition.optionsSource
      ? {
          optionsSource: definition.optionsSource,
          nullable: pageBlockDefaultProps[type][key] === null,
          ...(definition.filterBy ? { filterBy: definition.filterBy } : {}),
        }
      : {}),
    ...(definition.clamp ? { clamp: definition.clamp } : {}),
    ...(definition.unit !== undefined ? { unit: definition.unit } : {}),
    ...(fallback === null ? {} : { fallback }),
  });
};
