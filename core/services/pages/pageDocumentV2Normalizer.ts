import { createSecureRandomHexFragment } from "../security/secureRandom";
import { normalizeBlock } from "./pageBlockNormalizerV2";
import {
  defaultBlockVisibility,
  defaultBreakpoints,
  defaultLayout,
  defaultSeo,
  defaultSettings,
  defaultSpacing,
  defaultStyle,
  defaultVisibility,
  pageBlockDefaultProps,
} from "./pageDocumentV2Contract";
import {
  assertKnownKeys,
  cloneRecord,
  isRecord,
  requireArray,
  requireRecord,
  type BlockNormalizationContext,
  type MobileBreakpoint,
  type NormalizeMode,
  type RecordValue,
} from "./pageDocumentV2Normalization";
import {
  normalizeBreakpoints,
  normalizeSeo,
  normalizeSection,
  normalizeSettings,
} from "./pageSectionNormalizerV2";
import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  PageDocumentError,
  type PageBlockStyleV2,
  type PageBlockType,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentErrorCode,
  type PageDocumentV2,
  type PageSectionType,
  type PageSectionV2,
} from "./pageDocumentV2Types";
import type { PageBlockResponsiveLayerV2 } from "./pageResponsiveStyleV2";

const toSectionName = (type: PageSectionType) =>
  type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const createPageDocumentIdSuffix = () => {
  const suffix = createSecureRandomHexFragment(12);
  if (suffix) return suffix;
  throw new PageDocumentError(
    "page_document_invalid",
    "Secure randomness is required to create page document ids.",
    "id"
  );
};

export function createPageDocumentId(prefix: "sec" | "blk" = "sec") {
  return `${prefix}_${createPageDocumentIdSuffix()}`;
}

export function createDefaultPageDocumentV2(): PageDocumentV2 {
  return {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: [...defaultBreakpoints],
    seo: { ...defaultSeo },
    settings: { ...defaultSettings },
    sections: [],
  };
}

export function createPageBlockV2(type: PageBlockType, input?: Partial<PageBlockV2>): PageBlockV2 {
  const payload = {
    id: input?.id ?? createPageDocumentId("blk"),
    type,
    props: input?.props ?? pageBlockDefaultProps[type],
    style: input?.style,
    visibility: input?.visibility ?? defaultBlockVisibility,
    responsive: input?.responsive,
    slots: input?.slots,
  };
  const block = normalizeBlock(payload, "block", 0, "stored-read", 1, {
    mode: "stored-read",
    blockIds: new Set(),
    visiting: new WeakSet(),
  });
  if (!block)
    throw new PageDocumentError("page_document_invalid", "Page block is invalid.", "block");
  return block;
}

export function createPageSectionV2(
  type: PageSectionType,
  input?: Partial<PageSectionV2>
): PageSectionV2 {
  const payload = {
    id: input?.id ?? createPageDocumentId("sec"),
    type,
    name: input?.name ?? toSectionName(type),
    variant: input?.variant ?? "default",
    layout: input?.layout ?? defaultLayout,
    style: input?.style ?? defaultStyle,
    spacing: input?.spacing ?? defaultSpacing,
    visibility: input?.visibility ?? defaultVisibility,
    responsive: input?.responsive ?? {},
    blocks: input?.blocks ?? [],
  };
  return normalizeSection(payload, 0, "stored-read", {
    mode: "stored-read",
    blockIds: new Set(),
    visiting: new WeakSet(),
  });
}

export function isPageDocumentError(
  error: unknown,
  code?: PageDocumentErrorCode
): error is PageDocumentError {
  return error instanceof PageDocumentError && (!code || error.code === code);
}

export function isLegacyOrVersionlessPageDocument(value: unknown): boolean {
  if (!isRecord(value)) return true;
  if (value.schemaVersion === PAGE_DOCUMENT_SCHEMA_VERSION) return false;
  return value.schemaVersion === undefined || Array.isArray(value.blocks);
}

export function normalizePageDocumentV2ForWrite(value: unknown): PageDocumentV2 {
  const input = requireRecord(value, "data", "write");
  if (input.schemaVersion !== PAGE_DOCUMENT_SCHEMA_VERSION) {
    throw new PageDocumentError(
      "page_document_invalid",
      "Pages require schemaVersion 2 and sections[].",
      "schemaVersion"
    );
  }
  assertKnownKeys(
    input,
    ["schemaVersion", "breakpoints", "seo", "settings", "sections"],
    "",
    "write"
  );

  return normalizePageDocumentV2(input, "write");
}

export function normalizeStoredPageDocumentV2ForRead(value: unknown): PageDocumentV2 {
  if (isLegacyOrVersionlessPageDocument(value)) return createDefaultPageDocumentV2();
  return normalizePageDocumentV2(value, "stored-read");
}

export function normalizePageDocumentV2(
  value: unknown,
  mode: NormalizeMode = "write"
): PageDocumentV2 {
  const input = requireRecord(value, "data", mode);
  if (mode === "write") {
    assertKnownKeys(
      input,
      ["schemaVersion", "breakpoints", "seo", "settings", "sections"],
      "",
      mode
    );
  }
  if (input.schemaVersion !== PAGE_DOCUMENT_SCHEMA_VERSION) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Pages require schemaVersion 2 and sections[].",
        "schemaVersion"
      );
    }
    return createDefaultPageDocumentV2();
  }

  const blockContext: BlockNormalizationContext = {
    mode,
    blockIds: new Set(),
    visiting: new WeakSet(),
  };
  const sections = requireArray(input.sections, "sections", mode).map((section, index) =>
    normalizeSection(section, index, mode, blockContext)
  );

  return {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: normalizeBreakpoints(input.breakpoints, mode),
    seo: normalizeSeo(input.seo, mode),
    settings: normalizeSettings(input.settings, mode),
    sections,
  };
}

export function resolvePageSectionForBreakpoint(
  section: PageSectionV2,
  breakpoint: PageBreakpoint
): PageSectionV2 {
  const base = cloneRecord(section);
  if (breakpoint === "desktop") {
    return {
      ...base,
      blocks: base.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
    };
  }
  const override = section.responsive[breakpoint];
  if (!override) {
    return {
      ...base,
      blocks: base.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
    };
  }

  return {
    ...base,
    layout: { ...section.layout, ...(override.layout ?? {}) },
    style: { ...section.style, ...(override.style ?? {}) },
    spacing: { ...section.spacing, ...(override.spacing ?? {}) },
    visibility: { ...section.visibility, ...(override.visibility ?? {}) },
    blocks: base.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
  };
}

/**
 * TASK-539 present-key layer merge (single source for the resolver and the
 * facade). Copies only OWN present `x`/`y`/`z` keys from the override onto a
 * fresh copy of the base layer; override values win. It never spreads, clones,
 * or casts a broad override into the result (so `anchor` can never leak in).
 * Returns `undefined` when the merged layer would be empty.
 */
export function mergePageBlockLayerPresentKeys(
  base: PageBlockStyleV2["layer"],
  override: PageBlockResponsiveLayerV2 | undefined
): PageBlockStyleV2["layer"] {
  if (!base && !override) return undefined;
  const merged: NonNullable<PageBlockStyleV2["layer"]> = { ...(base ?? {}) };
  for (const key of ["x", "y", "z"] as const) {
    if (override && Object.prototype.hasOwnProperty.call(override, key)) {
      merged[key] = override[key];
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function resolvePageBlockForBreakpoint(
  block: PageBlockV2,
  breakpoint: PageBreakpoint
): PageBlockV2 {
  const base = cloneRecord(block);
  const resolveSlots = (slots: PageBlockV2["slots"]): PageBlockV2["slots"] | undefined => {
    if (!slots) return undefined;
    return Object.fromEntries(
      Object.entries(slots).map(([slotKey, children]) => [
        slotKey,
        (children ?? []).map((child) => resolvePageBlockForBreakpoint(child, breakpoint)),
      ])
    ) as PageBlockV2["slots"];
  };
  const resolvedSlots = resolveSlots(base.slots);
  if (breakpoint === "desktop") {
    return resolvedSlots ? { ...base, slots: resolvedSlots } : base;
  }
  const override = block.responsive?.[breakpoint];
  if (!override) return resolvedSlots ? { ...base, slots: resolvedSlots } : base;

  const style = { ...(base.style ?? {}), ...(override.style ?? {}) };
  // TASK-539: only nested `layer` receives present-key merge. When the helper
  // returns a layer, assign it as an OWN `style.layer` key; when it returns
  // undefined, delete the possibly spread `style.layer` key BEFORE deciding
  // whether the style record itself is empty (no `undefined` own key, and no
  // raw override layer surviving).
  const mergedLayer = mergePageBlockLayerPresentKeys(base.style?.layer, override.style?.layer);
  if (mergedLayer !== undefined) {
    style.layer = mergedLayer;
  } else {
    delete style.layer;
  }
  const resolved: PageBlockV2 = {
    ...base,
    props: { ...base.props, ...(override.props ?? {}) },
    visibility: { ...base.visibility, ...(override.visibility ?? {}) },
    ...(resolvedSlots ? { slots: resolvedSlots } : {}),
  };
  if (Object.keys(style).length > 0) resolved.style = style;
  else delete resolved.style;
  return resolved;
}

export function resolvePageDocumentForBreakpoint(
  document: PageDocumentV2,
  breakpoint: PageBreakpoint
): PageDocumentV2 {
  return {
    ...cloneRecord(document),
    sections: document.sections.map((section) =>
      resolvePageSectionForBreakpoint(section, breakpoint)
    ),
  };
}

export function clearResponsiveOverride(
  section: PageSectionV2,
  breakpoint: MobileBreakpoint,
  path: readonly string[]
): PageSectionV2 {
  if (path.length === 0) return cloneRecord(section);
  const next = cloneRecord(section);
  const override = next.responsive[breakpoint];
  if (!override) return next;
  removeNestedPath(override as RecordValue, path);
  if (isEmptyRecord(override)) {
    const { [breakpoint]: _removed, ...rest } = next.responsive;
    next.responsive = rest;
  }
  return next;
}

export function clearBlockResponsiveOverride(
  block: PageBlockV2,
  breakpoint: MobileBreakpoint,
  path: readonly string[]
): PageBlockV2 {
  if (path.length === 0) return cloneRecord(block);
  const next = cloneRecord(block);
  const override = next.responsive?.[breakpoint];
  if (!override) return next;
  removeNestedPath(override as RecordValue, path);
  if (isEmptyRecord(override)) {
    const { [breakpoint]: _removed, ...rest } = next.responsive ?? {};
    if (Object.keys(rest).length > 0) next.responsive = rest;
    else delete next.responsive;
  }
  return next;
}

export function toPublishedPageDocumentV2(value: unknown): PageDocumentV2 {
  return stripEditorFields(normalizeStoredPageDocumentV2ForRead(value)) as PageDocumentV2;
}

const removeNestedPath = (target: RecordValue, path: readonly string[]) => {
  const [head, ...tail] = path;
  if (!head) return;
  if (tail.length === 0) {
    delete target[head];
    return;
  }
  const child = target[head];
  if (!isRecord(child)) return;
  removeNestedPath(child, tail);
  if (isEmptyRecord(child)) delete target[head];
};

const isEmptyRecord = (value: unknown): value is RecordValue =>
  isRecord(value) && Object.keys(value).length === 0;

const stripEditorFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripEditorFields);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "editor")
      .map(([key, nested]) => [key, stripEditorFields(nested)])
  );
};
