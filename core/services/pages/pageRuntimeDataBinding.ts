import {
  contentListDefaults,
  normalizeContentListData,
  type ContentListData,
} from "../../widgets/core/contentList";
import type {
  ContentListResolvedRuntimeData,
  resolveContentListRuntimeData,
} from "../content/contentListResolver";
import type { FormRuntimeResolution, resolveFormRuntimeData } from "../forms/formRuntimeResolver";
import { getDefaultFormSettings } from "../forms/formSettings";
import {
  dangerousHtmlContentTagSet,
  escapeHtml,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
} from "../posts/editor/postRichTextHtmlUtils";
import { toYoutubeEmbedUrl } from "../posts/shared/videoEmbed";
import type { ContentRouteSetting } from "../settings/settingsService";
import {
  getPageBlockActiveSlotKeys,
  resolvePageDocumentForBreakpoint,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionV2,
  type PageSectionVisibilityV2,
} from "./pageDocumentV2";

export type PageRuntimeCollectionBinding = {
  kind: "collection";
  data: ContentListData;
};

export type PageRuntimeFormBinding = {
  kind: "form";
  formId: string;
  title: string | null;
  resolution: FormRuntimeResolution;
};

export type PageRuntimeEmbedBinding = {
  kind: "embed";
  sanitizedHtml: string;
  iframeSrc: string | null;
  iframeTitle: string;
};

export type PageRuntimeDataBinding =
  | PageRuntimeCollectionBinding
  | PageRuntimeFormBinding
  | PageRuntimeEmbedBinding;

export type PageRuntimeDataByBlockId = Record<string, PageRuntimeDataBinding>;

export type PageRuntimeDataBindingDeps = {
  resolveContentListRuntimeData?: typeof resolveContentListRuntimeData;
  resolveFormRuntimeData?: typeof resolveFormRuntimeData;
  now?: () => Date;
};

export type PreparedPageRuntimeDocument = {
  document: PageDocumentV2;
  runtimeDataByBlockId: PageRuntimeDataByBlockId;
  cacheable: boolean;
};

type PreparePageRuntimeOptions = {
  preview: boolean;
  breakpoint: PageBreakpoint;
  contentRoutes: ContentRouteSetting[];
  runtimeSearchParams?: URLSearchParams;
};

const pageEmbedAllowedTags = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "ul",
]);

const pageEmbedSelfClosingTags = new Set(["br"]);

const readOptionalText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readBoundedNumber = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isSafeInlineHref = (value: string) => {
  if (value.startsWith("#") || value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
};

const sanitizePageEmbedAttributes = (tagName: string, rawAttrs: string) => {
  if (tagName !== "a") return "";
  const attrs = parseHtmlAttributes(rawAttrs);
  const href = attrs.get("href")?.trim();
  if (!href || !isSafeInlineHref(href)) return null;
  return ` href="${escapeHtml(href)}" rel="nofollow noreferrer" target="_blank"`;
};

export const sanitizePageEmbedHtml = (html: string) =>
  sanitizeHtmlWithPolicy(html, {
    allowedTags: pageEmbedAllowedTags,
    selfClosingTags: pageEmbedSelfClosingTags,
    dropContentTags: dangerousHtmlContentTagSet,
    sanitizeAttributes: sanitizePageEmbedAttributes,
  });

const isWithinSectionSchedule = (visibility: PageSectionVisibilityV2, now: Date) => {
  const startsAt = readOptionalText(visibility.startsAt);
  if (startsAt) {
    const startsAtMs = Date.parse(startsAt);
    if (Number.isFinite(startsAtMs) && now.getTime() < startsAtMs) return false;
  }

  const endsAt = readOptionalText(visibility.endsAt);
  if (endsAt) {
    const endsAtMs = Date.parse(endsAt);
    if (Number.isFinite(endsAtMs) && now.getTime() > endsAtMs) return false;
  }

  return true;
};

const sectionAllowsPublicRender = (
  section: PageSectionV2,
  options: { preview: boolean; now: Date }
) => {
  if (!section.visibility.visible) return false;
  if (options.preview) return true;
  if (section.visibility.authOnly) return false;
  return isWithinSectionSchedule(section.visibility, options.now);
};

const pruneSectionsForRuntime = (
  document: PageDocumentV2,
  options: { preview: boolean; now: Date }
): { document: PageDocumentV2; hasPublicGates: boolean } => {
  let hasPublicGates = false;
  const sections = document.sections.filter((section) => {
    const allowed = sectionAllowsPublicRender(section, options);
    if (!options.preview && !allowed && section.visibility.visible) {
      hasPublicGates = true;
    }
    return allowed;
  });
  return {
    document: { ...document, sections },
    hasPublicGates,
  };
};

const walkVisibleBlocks = function* (blocks: readonly PageBlockV2[]): Generator<PageBlockV2> {
  for (const block of blocks) {
    if (!block.visibility.visible) continue;
    yield block;
    for (const slotKey of getPageBlockActiveSlotKeys(block)) {
      yield* walkVisibleBlocks(block.slots?.[slotKey] ?? []);
    }
  }
};

const walkDocumentBlocks = function* (document: PageDocumentV2): Generator<PageBlockV2> {
  for (const section of document.sections) {
    yield* walkVisibleBlocks(section.blocks);
  }
};

export const mapPageCollectionBlockToContentListData = (block: PageBlockV2): ContentListData => {
  const contentTypeId = readOptionalText(block.props.contentTypeId) ?? "";
  const listingQueryId = readOptionalText(block.props.queryId) ?? "";
  const listingTemplateId = readOptionalText(block.props.templateId) ?? "";
  const limit = readBoundedNumber(block.props.limit, contentListDefaults.source?.limit ?? 6, 1, 24);
  const mode = listingQueryId ? "listing" : "legacy";

  return normalizeContentListData({
    ...contentListDefaults,
    source: {
      ...contentListDefaults.source,
      mode,
      contentTypeId,
      listingQueryId,
      listingTemplateId,
      statusScope: "published",
      limit,
    },
    pagination: {
      ...contentListDefaults.pagination,
      mode: "none",
      pageSize: limit,
    },
  });
};

const resolveCollectionBinding = async (
  block: PageBlockV2,
  options: PreparePageRuntimeOptions,
  deps: Required<Pick<PageRuntimeDataBindingDeps, "resolveContentListRuntimeData">>
): Promise<PageRuntimeCollectionBinding> => {
  const data = mapPageCollectionBlockToContentListData(block);
  let resolved: ContentListResolvedRuntimeData;
  try {
    resolved = await deps.resolveContentListRuntimeData(data, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
      blockId: block.id,
    });
  } catch {
    resolved = {
      items: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      resolvedAt: new Date().toISOString(),
      error: "content_list_unavailable",
    };
  }
  return {
    kind: "collection",
    data: normalizeContentListData({
      ...data,
      resolved,
    }),
  };
};

const resolveFormBinding = async (
  block: PageBlockV2,
  options: PreparePageRuntimeOptions,
  deps: Required<Pick<PageRuntimeDataBindingDeps, "resolveFormRuntimeData">>
): Promise<PageRuntimeFormBinding | null> => {
  const formId = readOptionalText(block.props.formId);
  if (!formId) return null;
  let resolution: FormRuntimeResolution;
  try {
    resolution = await deps.resolveFormRuntimeData(formId, { preview: options.preview });
  } catch {
    resolution = {
      formId: "",
      formName: "",
      description: null,
      status: "missing",
      successMessage: null,
      successRedirectUrl: null,
      settings: getDefaultFormSettings(),
      submissionAccess: "public",
      submissionNonce: null,
      botProtection: null,
      fields: [],
      error: "form_not_found",
    };
  }
  return {
    kind: "form",
    formId,
    title: readOptionalText(block.props.title),
    resolution,
  };
};

const resolveEmbedBinding = (block: PageBlockV2): PageRuntimeEmbedBinding => {
  const html = readOptionalText(block.props.html) ?? "";
  const url = readOptionalText(block.props.url) ?? "";
  const iframeSrc = url && isHttpUrl(url) ? toYoutubeEmbedUrl(url) : null;
  return {
    kind: "embed",
    sanitizedHtml: sanitizePageEmbedHtml(html),
    iframeSrc,
    iframeTitle: iframeSrc ? "Embedded YouTube content" : "Embedded content",
  };
};

export async function preparePageRuntimeDocument(
  document: PageDocumentV2,
  options: PreparePageRuntimeOptions,
  deps: PageRuntimeDataBindingDeps = {}
): Promise<PreparedPageRuntimeDocument> {
  const now = deps.now?.() ?? new Date();
  const resolvedDocument = resolvePageDocumentForBreakpoint(document, options.breakpoint);
  const pruned = pruneSectionsForRuntime(resolvedDocument, {
    preview: options.preview,
    now,
  });
  const resolveCollection =
    deps.resolveContentListRuntimeData ??
    (await import("../content/contentListResolver")).resolveContentListRuntimeData;
  const resolveForm =
    deps.resolveFormRuntimeData ??
    (await import("../forms/formRuntimeResolver")).resolveFormRuntimeData;

  let hasDynamicBinding = pruned.hasPublicGates;
  const runtimeDataByBlockId: PageRuntimeDataByBlockId = {};

  for (const block of walkDocumentBlocks(pruned.document)) {
    if (block.type === "collection") {
      runtimeDataByBlockId[block.id] = await resolveCollectionBinding(block, options, {
        resolveContentListRuntimeData: resolveCollection,
      });
      hasDynamicBinding = true;
      continue;
    }
    if (block.type === "form") {
      const binding = await resolveFormBinding(block, options, {
        resolveFormRuntimeData: resolveForm,
      });
      if (binding) runtimeDataByBlockId[block.id] = binding;
      hasDynamicBinding = true;
      continue;
    }
    if (block.type === "embed") {
      runtimeDataByBlockId[block.id] = resolveEmbedBinding(block);
    }
  }

  return {
    document: pruned.document,
    runtimeDataByBlockId,
    cacheable: !hasDynamicBinding,
  };
}
