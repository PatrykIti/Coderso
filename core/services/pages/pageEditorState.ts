import type { PageBlockV2, PageBreakpoint, PageDocumentV2, PageSectionV2 } from "./pageDocumentV2";
import { getPageBlockAtPath, type PageBlockPath } from "./pageBlockPaths";

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export type PageEditorSelectionState = {
  selectedSectionId: string | null;
  selectedBlockPath: PageBlockPath | null;
};

export type ResolvedPageEditorSelection = {
  section: PageSectionV2 | null;
  block: PageBlockV2 | null;
  selectedBlockId: string | null;
};

export const resolvePageEditorSelection = (
  document: PageDocumentV2,
  state: PageEditorSelectionState
): ResolvedPageEditorSelection => {
  const section =
    document.sections.find((candidate) => candidate.id === state.selectedSectionId) ?? null;
  const block =
    section && state.selectedBlockPath
      ? getPageBlockAtPath(section, state.selectedBlockPath)
      : null;
  return { section, block, selectedBlockId: block?.id ?? null };
};

export const readSectionBreakpointOverride = (
  section: PageSectionV2,
  breakpoint: PageBreakpoint
) => (breakpoint === "desktop" ? undefined : section.responsive[breakpoint]);

export const readBlockBreakpointOverride = (
  block: PageBlockV2 | undefined,
  breakpoint: PageBreakpoint
) => (breakpoint === "desktop" ? undefined : block?.responsive?.[breakpoint]);

export const hasPathValue = (source: unknown, path: readonly string[]) =>
  path.reduce<unknown>((current, key) => {
    if (!isPlainRecord(current) || !(key in current)) return undefined;
    return current[key];
  }, source) !== undefined;

export const hasResponsiveOverride = (
  breakpoint: PageBreakpoint,
  source: unknown,
  path: readonly string[]
) => breakpoint !== "desktop" && hasPathValue(source, path);

export const hasAnyResponsiveOverride = (breakpoint: PageBreakpoint, source: unknown) =>
  breakpoint !== "desktop" && isPlainRecord(source) && Object.keys(source).length > 0;

export const clampToolbarOffset = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const resolveInitialToolbarPanel = (hasAppearancePanel: boolean) =>
  hasAppearancePanel ? "host-appearance" : "layout";
