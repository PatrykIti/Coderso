import {
  pageBlockPropKeys,
  type PageBlockV2,
  type PageBreakpoint,
  type PageSectionV2,
} from "./pageDocumentV2";
import type { PageEditorControlDefinition } from "./pageEditorControlRegistry";
import {
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
} from "./pageAuthoringSanitizers";

export type BlockControlGroup = "props" | "style" | "visibility";
export type SectionControlGroup = "layout" | "style" | "spacing" | "visibility";

const blockControlGroups: readonly BlockControlGroup[] = ["props", "style", "visibility"];
const sectionControlGroups: readonly SectionControlGroup[] = [
  "layout",
  "style",
  "spacing",
  "visibility",
];

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isBlockControlGroup = (value: string | undefined): value is BlockControlGroup =>
  blockControlGroups.includes(value as BlockControlGroup);

export const isSectionControlGroup = (value: string | undefined): value is SectionControlGroup =>
  sectionControlGroups.includes(value as SectionControlGroup);

export const setNestedPathValue = (
  source: unknown,
  path: readonly string[],
  value: unknown
): Record<string, unknown> => {
  const current = isPlainRecord(source) ? source : {};
  const [key, ...rest] = path;
  if (!key) return { ...current };
  if (rest.length === 0) return { ...current, [key]: value };
  return {
    ...current,
    [key]: setNestedPathValue(current[key], rest, value),
  };
};

const filterBlockPropsPatch = (type: PageBlockV2["type"], patch: Record<string, unknown>) => {
  const allowed = pageBlockPropKeys[type];
  return Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => value !== undefined && allowed.includes(key))
  );
};

const sanitizeBlockPropValue = (key: string, value: unknown): unknown => {
  if (key === "href") return sanitizeAuthoringLinkHref(value);
  if (key === "src" || key === "image" || key === "url") return sanitizeAuthoringMediaUrl(value);
  return value;
};

const sanitizeStyleValue = (key: string | undefined, value: unknown): unknown => {
  if (key === "textColor" || key === "borderColor" || key === "accent") {
    return sanitizeAuthoringCssColor(value);
  }
  if (key === "background") return sanitizeAuthoringCssBackground(value);
  if (key === "backgroundImage") return sanitizeAuthoringMediaUrl(value);
  return value;
};

export const sanitizePageEditorControlValue = (
  control: PageEditorControlDefinition,
  value: unknown
): unknown => {
  const [group, key, ...rest] = control.overridePath;
  if (group === "props") return sanitizeBlockPropValue(key, value);
  // ── TASK-531 REGION: nested `style.glow.color` (length-3 overridePath) client
  // write-guard. The `[group, key]` destructure leaves `key="glow"` (NOT "color"),
  // so `sanitizeStyleValue` matches none of its cases and would return the glow
  // color UNSANITIZED into optimistic client state. Route the nested color path
  // through `sanitizeAuthoringCssColor` here (defence-in-depth; the persist
  // boundary `normalizeGlow` re-sanitizes). Mirrors sibling 533-02's length-4
  // `border.*.color` handling; distinct condition, additive. Numeric glow fields
  // (blur/spread/x/y) pass through — clamped at the persist boundary.
  if (group === "style" && key === "glow" && rest[0] === "color") {
    return sanitizeAuthoringCssColor(value);
  }
  // ── END TASK-531 REGION ──────────────────────────────────────────────────
  if (group === "style") return sanitizeStyleValue(key, value);
  return value;
};

export const sanitizePageSectionStylePatch = (
  patch: Partial<PageSectionV2["style"]>
): Partial<PageSectionV2["style"]> => {
  const result: Partial<PageSectionV2["style"]> = {};
  for (const [key, value] of Object.entries(patch)) {
    const sanitized = sanitizeStyleValue(key, value);
    if (sanitized !== undefined) result[key as keyof PageSectionV2["style"]] = sanitized as never;
  }
  return result;
};

export const patchBlockPropsForDevice = (
  block: PageBlockV2,
  device: PageBreakpoint,
  patch: Record<string, unknown>
): PageBlockV2 => {
  const knownPatch = filterBlockPropsPatch(block.type, patch);
  if (Object.keys(knownPatch).length === 0) return block;
  if (device === "desktop") {
    return { ...block, props: { ...block.props, ...knownPatch } };
  }
  return {
    ...block,
    responsive: {
      ...block.responsive,
      [device]: {
        ...(block.responsive?.[device] ?? {}),
        props: {
          ...(block.responsive?.[device]?.props ?? {}),
          ...knownPatch,
        },
      },
    },
  };
};

export const patchBlockControlForDevice = (
  block: PageBlockV2,
  device: PageBreakpoint,
  control: PageEditorControlDefinition,
  value: unknown
): PageBlockV2 => {
  const [group, ...path] = control.overridePath;
  if (!isBlockControlGroup(group) || path.length === 0) return block;
  const sanitizedValue = sanitizePageEditorControlValue(control, value);
  if (group === "props") {
    const [key] = path;
    if (!key) return block;
    if (block.type === "collection" && key === "contentTypeId") {
      return patchBlockPropsForDevice(block, device, {
        contentTypeId: sanitizedValue,
        queryId: null,
      });
    }
    return patchBlockPropsForDevice(block, device, { [key]: sanitizedValue });
  }

  if (device === "desktop") {
    return {
      ...block,
      [group]: setNestedPathValue(block[group], path, sanitizedValue),
    };
  }

  const breakpoint = block.responsive?.[device] ?? {};
  return {
    ...block,
    responsive: {
      ...block.responsive,
      [device]: {
        ...breakpoint,
        [group]: setNestedPathValue(breakpoint[group], path, sanitizedValue),
      },
    },
  };
};

export const patchSectionControlForDevice = (
  section: PageSectionV2,
  device: PageBreakpoint,
  control: PageEditorControlDefinition,
  value: unknown
): PageSectionV2 => {
  const [group, ...path] = control.overridePath;
  if (!isSectionControlGroup(group) || path.length === 0) return section;
  const sanitizedValue = sanitizePageEditorControlValue(control, value);

  if (device === "desktop") {
    return {
      ...section,
      [group]: setNestedPathValue(section[group], path, sanitizedValue),
    };
  }

  const breakpoint = section.responsive[device] ?? {};
  return {
    ...section,
    responsive: {
      ...section.responsive,
      [device]: {
        ...breakpoint,
        [group]: setNestedPathValue(breakpoint[group], path, sanitizedValue),
      },
    },
  };
};

export const setSectionVisibleForBreakpoint = (
  section: PageSectionV2,
  breakpoint: PageBreakpoint,
  visible: boolean
): PageSectionV2 => {
  if (breakpoint === "desktop") {
    return { ...section, visibility: { ...section.visibility, visible } };
  }
  return {
    ...section,
    responsive: {
      ...section.responsive,
      [breakpoint]: {
        ...(section.responsive[breakpoint] ?? {}),
        visibility: { ...(section.responsive[breakpoint]?.visibility ?? {}), visible },
      },
    },
  };
};

export const setBlockVisibleForBreakpoint = (
  block: PageBlockV2,
  breakpoint: PageBreakpoint,
  visible: boolean
): PageBlockV2 => {
  if (breakpoint === "desktop") {
    return { ...block, visibility: { ...block.visibility, visible } };
  }
  return {
    ...block,
    responsive: {
      ...block.responsive,
      [breakpoint]: {
        ...(block.responsive?.[breakpoint] ?? {}),
        visibility: { ...(block.responsive?.[breakpoint]?.visibility ?? {}), visible },
      },
    },
  };
};
