import {
  createPageDocumentId,
  isLegacyOrVersionlessPageDocument,
  isPageDocumentError,
  normalizePageDocumentV2,
  normalizePageDocumentV2ForWrite,
  pageDocumentV2JsonSchema,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "./pageDocumentV2";
import { assertPageTemplateInputBoundary } from "./pageTemplateBoundary";

export const PAGE_TEMPLATE_NAME_MAX_LENGTH = 160;
export const PAGE_TEMPLATE_DESCRIPTION_MAX_LENGTH = 500;
export const PAGE_TEMPLATE_CATEGORY_MAX_LENGTH = 80;
export const PAGE_TEMPLATE_PREVIEW_TTL_DEFAULT_MINUTES = 30;
export const PAGE_TEMPLATE_PREVIEW_TTL_MIN_MINUTES = 1;
export const PAGE_TEMPLATE_PREVIEW_TTL_MAX_MINUTES = 120;

export const pageTemplateStatuses = ["draft", "published"] as const;

export type PageTemplateStatus = (typeof pageTemplateStatuses)[number];

export type PageTemplateErrorCode =
  | "page_template_not_found"
  | "page_template_invalid"
  | "page_template_slug_conflict"
  | "page_template_status_invalid"
  | "page_template_legacy_widget_blocks_invalid";

export class PageTemplateError extends Error {
  code: PageTemplateErrorCode;
  path?: string;

  constructor(code: PageTemplateErrorCode, message?: string, path?: string) {
    super(message ?? code);
    this.name = "PageTemplateError";
    this.code = code;
    this.path = path;
  }
}

export function isPageTemplateError(
  error: unknown,
  code?: PageTemplateErrorCode
): error is PageTemplateError {
  return error instanceof PageTemplateError && (!code || error.code === code);
}

export type PageTemplateCreateInput = {
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: PageTemplateStatus;
  document: PageDocumentV2;
};

export type PageTemplateUpdateInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  category?: string | null;
  status?: PageTemplateStatus;
  document?: PageDocumentV2;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Deterministic slug derivation: trim, lowercase, collapse every non
 * alphanumeric run into a single dash, strip edge dashes. Returns "" when
 * nothing survives so callers can fail closed.
 */
export function normalizePageTemplateSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const normalizeName = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new PageTemplateError("page_template_invalid", "Template name is required.", "name");
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > PAGE_TEMPLATE_NAME_MAX_LENGTH) {
    throw new PageTemplateError(
      "page_template_invalid",
      `Template name must be 1..${PAGE_TEMPLATE_NAME_MAX_LENGTH} characters.`,
      "name"
    );
  }
  return trimmed;
};

const normalizeSlugInput = (value: unknown, fallbackName: string | null): string => {
  if (value === undefined || value === null) {
    if (fallbackName === null) {
      throw new PageTemplateError("page_template_invalid", "Template slug is required.", "slug");
    }
    const derived = normalizePageTemplateSlug(fallbackName);
    if (!derived) {
      throw new PageTemplateError(
        "page_template_invalid",
        "Template slug could not be derived from the name.",
        "slug"
      );
    }
    return derived;
  }
  if (typeof value !== "string") {
    throw new PageTemplateError("page_template_invalid", "Template slug is invalid.", "slug");
  }
  const normalized = normalizePageTemplateSlug(value);
  if (!normalized) {
    throw new PageTemplateError("page_template_invalid", "Template slug is invalid.", "slug");
  }
  return normalized;
};

const normalizeDescription = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new PageTemplateError(
      "page_template_invalid",
      "Template description is invalid.",
      "description"
    );
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > PAGE_TEMPLATE_DESCRIPTION_MAX_LENGTH) {
    throw new PageTemplateError(
      "page_template_invalid",
      `Template description must be at most ${PAGE_TEMPLATE_DESCRIPTION_MAX_LENGTH} characters.`,
      "description"
    );
  }
  return trimmed;
};

const normalizeCategory = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new PageTemplateError(
      "page_template_invalid",
      "Template category is invalid.",
      "category"
    );
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > PAGE_TEMPLATE_CATEGORY_MAX_LENGTH) {
    throw new PageTemplateError(
      "page_template_invalid",
      `Template category must be at most ${PAGE_TEMPLATE_CATEGORY_MAX_LENGTH} characters.`,
      "category"
    );
  }
  return trimmed;
};

export function normalizePageTemplateStatus(value: unknown): PageTemplateStatus {
  if (value === "draft" || value === "published") return value;
  throw new PageTemplateError("page_template_status_invalid", "Template status is invalid.");
}

/**
 * Validates a Page-template document for write: rejects legacy root
 * `blocks[]` payloads first, then runs the strict Page v2 owner normalizer.
 */
export function normalizePageTemplateDocumentForWrite(value: unknown): PageDocumentV2 {
  try {
    assertPageTemplateInputBoundary(value);
  } catch {
    throw new PageTemplateError(
      "page_template_legacy_widget_blocks_invalid",
      "Page templates store Page v2 sections, not legacy widget blocks.",
      "document"
    );
  }
  return normalizePageDocumentV2ForWrite(value);
}

/**
 * Reads a stored Page-template document. Unlike the non-destructive page
 * read path, an unreadable stored template fails closed with
 * `page_template_invalid` instead of rendering a default empty document.
 */
export function normalizeStoredPageTemplateDocument(value: unknown): PageDocumentV2 {
  try {
    assertPageTemplateInputBoundary(value);
  } catch {
    throw new PageTemplateError(
      "page_template_invalid",
      "Stored template document is not a Page v2 document.",
      "document"
    );
  }
  if (isLegacyOrVersionlessPageDocument(value)) {
    throw new PageTemplateError(
      "page_template_invalid",
      "Stored template document is not a Page v2 document.",
      "document"
    );
  }
  try {
    return normalizePageDocumentV2(value, "stored-read");
  } catch (error) {
    if (isPageDocumentError(error)) {
      throw new PageTemplateError(
        "page_template_invalid",
        "Stored template document failed normalization.",
        error.path
      );
    }
    throw error;
  }
}

export function normalizePageTemplateCreateInput(value: unknown): PageTemplateCreateInput {
  if (!isRecord(value)) {
    throw new PageTemplateError("page_template_invalid", "Template payload is invalid.");
  }
  const name = normalizeName(value.name);
  return {
    name,
    slug: normalizeSlugInput(value.slug, name),
    description: normalizeDescription(value.description),
    category: normalizeCategory(value.category),
    status: value.status === undefined ? "draft" : normalizePageTemplateStatus(value.status),
    document: normalizePageTemplateDocumentForWrite(value.document),
  };
}

export function normalizePageTemplateUpdateInput(value: unknown): PageTemplateUpdateInput {
  if (!isRecord(value)) {
    throw new PageTemplateError("page_template_invalid", "Template payload is invalid.");
  }
  const update: PageTemplateUpdateInput = {};
  if (value.name !== undefined) update.name = normalizeName(value.name);
  if (value.slug !== undefined) update.slug = normalizeSlugInput(value.slug, null);
  if (value.description !== undefined) update.description = normalizeDescription(value.description);
  if (value.category !== undefined) update.category = normalizeCategory(value.category);
  if (value.status !== undefined) update.status = normalizePageTemplateStatus(value.status);
  if (value.document !== undefined) {
    update.document = normalizePageTemplateDocumentForWrite(value.document);
  }
  if (Object.keys(update).length === 0) {
    throw new PageTemplateError(
      "page_template_invalid",
      "Template update requires at least one field."
    );
  }
  return update;
}

export function clampPageTemplatePreviewTtlMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return PAGE_TEMPLATE_PREVIEW_TTL_DEFAULT_MINUTES;
  }
  const rounded = Math.round(value);
  if (rounded < PAGE_TEMPLATE_PREVIEW_TTL_MIN_MINUTES) return PAGE_TEMPLATE_PREVIEW_TTL_MIN_MINUTES;
  if (rounded > PAGE_TEMPLATE_PREVIEW_TTL_MAX_MINUTES) return PAGE_TEMPLATE_PREVIEW_TTL_MAX_MINUTES;
  return rounded;
}

/**
 * Deterministic duplicate naming: name "<name> (copy)", slug "<slug>-copy",
 * then "-copy-2", "-copy-3", ... until `isSlugTaken` clears.
 */
export function resolvePageTemplateCopyNaming(
  source: { name: string; slug: string },
  isSlugTaken: (slug: string) => boolean
): { name: string; slug: string } {
  const name = `${source.name} (copy)`.slice(0, PAGE_TEMPLATE_NAME_MAX_LENGTH);
  const baseSlug = `${source.slug}-copy`;
  if (!isSlugTaken(baseSlug)) return { name, slug: baseSlug };
  for (let suffix = 2; suffix <= 100; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!isSlugTaken(candidate)) return { name, slug: candidate };
  }
  throw new PageTemplateError("page_template_slug_conflict", "Template slug already exists.");
}

type InstantiateDeps = {
  createId?: (prefix: "sec" | "blk") => string;
};

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const regenerateBlockIds = (
  block: PageBlockV2,
  createId: (prefix: "sec" | "blk") => string
): PageBlockV2 => {
  const next: PageBlockV2 = { ...block, id: createId("blk") };
  if (block.slots) {
    const slots: NonNullable<PageBlockV2["slots"]> = {};
    for (const [slotKey, children] of Object.entries(block.slots)) {
      if (!Array.isArray(children)) continue;
      slots[slotKey as keyof NonNullable<PageBlockV2["slots"]>] = children.map((child) =>
        regenerateBlockIds(child, createId)
      );
    }
    next.slots = slots;
  }
  return next;
};

/**
 * Returns deep-cloned template sections with every section and block id
 * (recursively through slots) regenerated, so applying the same template
 * twice never collides and editing the template later never retro-affects
 * pages it was applied to. Only `sections[]` are instantiated; template
 * `settings`, `seo`, and `breakpoints` never touch the target page.
 */
export function instantiatePageTemplateSections(
  document: PageDocumentV2,
  deps?: InstantiateDeps
): PageSectionV2[] {
  const createId = deps?.createId ?? createPageDocumentId;
  return document.sections.map((section) => {
    const cloned = cloneJson(section);
    return {
      ...cloned,
      id: createId("sec"),
      blocks: cloned.blocks.map((block) => regenerateBlockIds(block, createId)),
    };
  });
}

const pageTemplateDocumentSchemaDefs = {
  $defs: pageDocumentV2JsonSchema.$defs,
};

export const pageTemplateCreateSchema = {
  ...pageTemplateDocumentSchemaDefs,
  type: "object",
  required: ["name", "document"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: PAGE_TEMPLATE_NAME_MAX_LENGTH },
    slug: { type: "string", minLength: 1 },
    description: {
      type: ["string", "null"],
      maxLength: PAGE_TEMPLATE_DESCRIPTION_MAX_LENGTH,
    },
    category: { type: ["string", "null"], maxLength: PAGE_TEMPLATE_CATEGORY_MAX_LENGTH },
    status: { type: "string", enum: [...pageTemplateStatuses] },
    document: pageDocumentV2JsonSchema,
  },
};

export const pageTemplateUpdateSchema = {
  ...pageTemplateDocumentSchemaDefs,
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: PAGE_TEMPLATE_NAME_MAX_LENGTH },
    slug: { type: "string", minLength: 1 },
    description: {
      type: ["string", "null"],
      maxLength: PAGE_TEMPLATE_DESCRIPTION_MAX_LENGTH,
    },
    category: { type: ["string", "null"], maxLength: PAGE_TEMPLATE_CATEGORY_MAX_LENGTH },
    status: { type: "string", enum: [...pageTemplateStatuses] },
    document: pageDocumentV2JsonSchema,
  },
};

export const pageTemplateDuplicateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
};

export const pageTemplatePreviewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ttlMinutes: { type: "number" },
  },
};
