import { pageBlockDefaultProps, type PageBlockType } from "./pageDocumentV2";

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
  | "facets"
  // TASK-539 gallery vocabulary: dedicated canonical controls instead of
  // `ListItemsControl` for gallery rows and category tokens.
  | "galleryItems"
  | "galleryCategoryTokens";

/**
 * Reachability gate for a control. The condition is resolved against the BASE
 * target when the control is base-only (`responsive: false`) and against the
 * effective active-device target when the control is responsive — one shared
 * decision so a tablet/mobile override can never open or close a base-only
 * gate. Strict equality on a path read; a malformed or missing value fails
 * closed (control hidden).
 */
export type PageEditorControlCondition = {
  path: readonly string[];
  equals: string | number | boolean | null;
};

export type PageEditorControlOptionsSource =
  "forms" | "contentTypes" | "listingQueries" | "listingQueriesAll" | "listingTemplates";

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
  /** Present-only reachability gate; absent controls are always visible. */
  showWhen?: PageEditorControlCondition;
};

export const control = (
  definition: Omit<PageEditorControlDefinition, "overridePath"> & {
    overridePath?: readonly string[];
  }
): PageEditorControlDefinition => ({
  ...definition,
  overridePath: definition.overridePath ?? definition.path,
});

const blockPropFallback = (type: PageBlockType, key: string): string | number | boolean | null => {
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
        | "panel"
        | "options"
        | "optionsSource"
        | "filterBy"
        | "clamp"
        | "unit"
        | "responsive"
        | "showWhen"
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
    // Responsive defaults to true for ordinary block props; base-only
    // controls (gallery/divider) opt out explicitly.
    responsive: definition.responsive ?? true,
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
    ...(definition.showWhen ? { showWhen: definition.showWhen } : {}),
    ...(fallback === null ? {} : { fallback }),
  });
};

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readPathValue = (source: unknown, path: readonly string[]): unknown => {
  let current: unknown = source;
  for (const key of path) {
    if (!isRecordValue(current) || !(key in current)) return undefined;
    current = current[key];
  }
  return current;
};

/**
 * Resolves a control's reachability gate without mutation. Base-only controls
 * read the BASE target; responsive controls read the effective active-device
 * target. Strict equality on the path value; a missing, malformed, or
 * non-strictly-equal value hides the control (fail closed). Controls without a
 * gate are always visible.
 */
export const isPageEditorControlVisible = (
  control: PageEditorControlDefinition,
  targets: { baseTarget: unknown; effectiveTarget: unknown }
): boolean => {
  if (!control.showWhen) return true;
  const source = control.responsive ? targets.effectiveTarget : targets.baseTarget;
  return readPathValue(source, control.showWhen.path) === control.showWhen.equals;
};
