import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { normalizeWidgetBlocks } from "../../widgets/validator";
import { normalizePageLayoutSettings } from "../pages/layoutSettings";
import type {
  DetailPageBinding,
  DetailPageBindingTransform,
  DetailPageComputedResolver,
  DetailPageBindingSource,
  DetailPageDocument,
  DetailPageIdentityRole,
  DetailPageMetaField,
  DetailPageRelatedSource,
  DetailPageSeo,
  DetailPageStatus,
} from "./detailPageTypes";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pathPattern = /^[a-zA-Z0-9_.-]+$/;
const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);
const unsafePropSegments = new Set([
  "dangerouslySetInnerHTML",
  "innerHTML",
  "outerHTML",
  "srcDoc",
  "script",
]);
const secretLikePattern =
  /\b[\w.-]*(token|secret|password|api[-_]?key|credential|cookie|session|csrf)[\w.-]*\b/i;
const detailPageTitleTokenPattern = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}|\{\s*([A-Za-z0-9_.-]+)\s*\}/g;
const detailPageTitleMetaTokens = new Set([
  "title",
  "slug",
  "publishedAt",
  "updatedAt",
  "createdAt",
  "author",
]);
const relatedLimitMin = 1;
const relatedLimitMax = 24;
const deterministicNamespace = "detail-page-document";
const textEncoder = new TextEncoder();

const rotateLeft = (value: number, bits: number) =>
  ((value << bits) | (value >>> (32 - bits))) >>> 0;

const toHex = (bytes: Uint8Array, start = 0, end = bytes.length) => {
  let output = "";
  for (let index = start; index < end; index += 1) {
    output += bytes[index]!.toString(16).padStart(2, "0");
  }
  return output;
};

const sha1Digest = (value: string) => {
  const source = textEncoder.encode(value);
  const bitLength = source.length * 8;
  const totalLength = Math.ceil((source.length + 9) / 64) * 64;
  const padded = new Uint8Array(totalLength);
  padded.set(source);
  padded[source.length] = 0x80;

  const paddedView = new DataView(padded.buffer);
  paddedView.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000), false);
  paddedView.setUint32(totalLength - 4, bitLength >>> 0, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const words = new Uint32Array(80);
  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = paddedView.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 80; index += 1) {
      words[index] = rotateLeft(
        words[index - 3]! ^ words[index - 8]! ^ words[index - 14]! ^ words[index - 16]!,
        1
      );
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let index = 0; index < 80; index += 1) {
      let f = 0;
      let k = 0;

      if (index < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (index < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (index < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const next = (rotateLeft(a, 5) + f + e + k + words[index]!) >>> 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = next;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  const digestView = new DataView(digest.buffer);
  digestView.setUint32(0, h0, false);
  digestView.setUint32(4, h1, false);
  digestView.setUint32(8, h2, false);
  digestView.setUint32(12, h3, false);
  digestView.setUint32(16, h4, false);
  return digest;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const rejectUnknownKeys = (input: Record<string, unknown>, allowed: readonly string[]) => {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(input).find((key) => !allowedSet.has(key));
  if (unknown) throw new Error("detail_page_document_invalid");
};

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRequiredText = (value: unknown) => {
  const text = normalizeText(value);
  if (!text) throw new Error("detail_page_document_invalid");
  return text;
};

const normalizeOptionalText = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return normalizeRequiredText(value);
};

const normalizeUuid = (value: unknown) => {
  const text = normalizeRequiredText(value).toLowerCase();
  if (!uuidPattern.test(text)) throw new Error("detail_page_document_invalid");
  return text;
};

const normalizeSlug = (value: unknown) => {
  const text = normalizeRequiredText(value).toLowerCase();
  if (!slugPattern.test(text)) throw new Error("detail_page_document_invalid");
  return text;
};

const normalizeStatus = (value: unknown): DetailPageStatus => {
  const text = normalizeText(value) ?? "draft";
  if (text !== "draft" && text !== "published") {
    throw new Error("detail_page_document_invalid");
  }
  return text;
};

const normalizeSafePath = (value: unknown) => {
  const text = normalizeRequiredText(value);
  if (!pathPattern.test(text)) throw new Error("detail_page_document_invalid");
  const segments = text.split(".");
  if (
    segments.some((segment) => segment.length === 0 || unsafePathSegments.has(segment)) ||
    segments.some(
      (segment) =>
        unsafePropSegments.has(segment) || /^on[A-Z]/.test(segment) || /^on[a-z]/.test(segment)
    )
  ) {
    throw new Error("detail_page_document_invalid");
  }
  return text;
};

export const isDetailPageTitleTokenSafe = (token: string) => {
  const text = normalizeText(token);
  if (!text) return false;
  if (detailPageTitleMetaTokens.has(text)) return true;

  const dataPath = text.startsWith("data.") ? text.slice("data.".length) : text;
  if (!dataPath) return false;

  try {
    const safePath = normalizeSafePath(dataPath);
    return !secretLikePattern.test(safePath);
  } catch {
    return false;
  }
};

const normalizeTitlePattern = (value: unknown) => {
  const text = normalizeRequiredText(value);
  detailPageTitleTokenPattern.lastIndex = 0;
  for (
    let match = detailPageTitleTokenPattern.exec(text);
    match;
    match = detailPageTitleTokenPattern.exec(text)
  ) {
    const token = match[1] ?? match[2] ?? "";
    if (!isDetailPageTitleTokenSafe(token)) {
      throw new Error("detail_page_document_invalid");
    }
  }
  return text;
};

const normalizeOptionalTitlePattern = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return normalizeTitlePattern(value);
};

const normalizeFallback = (value: unknown) => {
  if (
    value === undefined ||
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (isRecord(value)) {
    return structuredClone(value);
  }
  throw new Error("detail_page_document_invalid");
};

const collectBlockIds = (blocks: Array<Record<string, unknown>>, seen = new Set<string>()) => {
  for (const block of blocks) {
    const id = normalizeText(block.id);
    if (!id || seen.has(id)) throw new Error("detail_page_document_invalid");
    seen.add(id);

    const slots = isRecord(block.slots) ? block.slots : {};
    for (const nested of Object.values(slots)) {
      if (!Array.isArray(nested)) continue;
      collectBlockIds(nested as Array<Record<string, unknown>>, seen);
    }
  }
  return seen;
};

const normalizeBlocks = (value: unknown) => {
  if (!Array.isArray(value)) throw new Error("detail_page_document_invalid");
  ensureRuntimeWidgetsRegistered();
  const blocks = normalizeWidgetBlocks(value as DetailPageDocument["blocks"]);
  collectBlockIds(blocks as Array<Record<string, unknown>>);
  return blocks;
};

const normalizeSeo = (value: unknown): DetailPageSeo | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new Error("detail_page_document_invalid");
  rejectUnknownKeys(value, ["titlePattern", "descriptionField", "imageField"]);

  const titlePattern = normalizeOptionalTitlePattern(value.titlePattern);
  const descriptionField = normalizeOptionalText(value.descriptionField);
  const imageField = normalizeOptionalText(value.imageField);

  if (descriptionField && secretLikePattern.test(descriptionField)) {
    throw new Error("detail_page_document_invalid");
  }
  if (imageField && secretLikePattern.test(imageField)) {
    throw new Error("detail_page_document_invalid");
  }

  const normalized = {
    ...(titlePattern !== undefined ? { titlePattern } : {}),
    ...(descriptionField !== undefined ? { descriptionField } : {}),
    ...(imageField !== undefined ? { imageField } : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeSettings = (value: unknown) => {
  if (!isRecord(value)) throw new Error("detail_page_document_invalid");
  rejectUnknownKeys(value, ["template", "layout"]);

  return {
    template: normalizeRequiredText(value.template ?? "detail"),
    layout: normalizePageLayoutSettings(value.layout),
  };
};

const normalizeBindingSource = (value: unknown): DetailPageBindingSource => {
  if (!isRecord(value)) throw new Error("detail_page_document_invalid");
  rejectUnknownKeys(value, ["kind", "field", "resolver"]);
  const kind = normalizeRequiredText(value.kind);

  if (kind === "entry-field") {
    const field = normalizeSafePath(value.field);
    if (secretLikePattern.test(field)) throw new Error("detail_page_document_invalid");
    return { kind, field };
  }
  if (kind === "entry-meta") {
    const field = normalizeRequiredText(value.field);
    if (!["title", "slug", "publishedAt", "author"].includes(field)) {
      throw new Error("detail_page_document_invalid");
    }
    return { kind: "entry-meta", field: field as DetailPageMetaField };
  }
  if (kind === "computed") {
    const resolver = normalizeRequiredText(value.resolver);
    if (!["detailHref", "relatedItems", "formContext"].includes(resolver)) {
      throw new Error("detail_page_document_invalid");
    }
    return { kind: "computed", resolver: resolver as DetailPageComputedResolver };
  }

  throw new Error("detail_page_document_invalid");
};

const normalizeBindings = (value: unknown, blockIds: Set<string>): DetailPageBinding[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("detail_page_document_invalid");

  const seen = new Set<string>();
  return value.map((entry) => {
    if (!isRecord(entry)) throw new Error("detail_page_document_invalid");
    rejectUnknownKeys(entry, [
      "id",
      "blockId",
      "propPath",
      "source",
      "fallback",
      "transform",
      "required",
    ]);

    const id = normalizeRequiredText(entry.id);
    if (seen.has(id)) throw new Error("detail_page_document_invalid");
    seen.add(id);

    const blockId = normalizeRequiredText(entry.blockId);
    if (!blockIds.has(blockId)) throw new Error("detail_page_document_invalid");

    const propPath = normalizeSafePath(entry.propPath);
    const source = normalizeBindingSource(entry.source);
    let transform: DetailPageBindingTransform | undefined;
    if (entry.transform !== undefined) {
      const normalizedTransform = normalizeRequiredText(entry.transform);
      if (
        !["text", "number", "currency", "area", "image", "gallery", "list"].includes(
          normalizedTransform
        )
      ) {
        throw new Error("detail_page_document_invalid");
      }
      transform = normalizedTransform as DetailPageBindingTransform;
    }
    if (entry.required !== undefined && typeof entry.required !== "boolean") {
      throw new Error("detail_page_document_invalid");
    }

    return {
      id,
      blockId,
      propPath,
      source,
      ...(entry.fallback !== undefined ? { fallback: normalizeFallback(entry.fallback) } : {}),
      ...(transform !== undefined ? { transform } : {}),
      ...(entry.required !== undefined ? { required: entry.required } : {}),
    };
  });
};

const normalizeRelatedSources = (value: unknown): DetailPageRelatedSource[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new Error("detail_page_document_invalid");

  const seen = new Set<string>();
  const normalized = value.map((entry) => {
    if (!isRecord(entry)) throw new Error("detail_page_document_invalid");
    rejectUnknownKeys(entry, [
      "id",
      "kind",
      "label",
      "limit",
      "listingQueryId",
      "excludeCurrentEntry",
    ]);

    const id = normalizeRequiredText(entry.id);
    if (seen.has(id)) throw new Error("detail_page_document_invalid");
    seen.add(id);

    const kind = normalizeRequiredText(entry.kind);
    if (kind !== "same-content-type" && kind !== "listing-query") {
      throw new Error("detail_page_document_invalid");
    }

    const rawLimit =
      typeof entry.limit === "number" && Number.isFinite(entry.limit)
        ? Math.trunc(entry.limit)
        : relatedLimitMin;
    const limit = Math.max(relatedLimitMin, Math.min(relatedLimitMax, rawLimit));

    const listingQueryId = normalizeOptionalText(entry.listingQueryId);
    if (kind === "listing-query" && !listingQueryId) {
      throw new Error("detail_page_document_invalid");
    }
    if (entry.excludeCurrentEntry !== undefined && typeof entry.excludeCurrentEntry !== "boolean") {
      throw new Error("detail_page_document_invalid");
    }

    return {
      id,
      kind,
      label: normalizeRequiredText(entry.label),
      limit,
      ...(listingQueryId !== undefined ? { listingQueryId } : {}),
      ...(entry.excludeCurrentEntry !== undefined
        ? { excludeCurrentEntry: entry.excludeCurrentEntry }
        : {}),
    } satisfies DetailPageRelatedSource;
  });

  return normalized.length > 0 ? normalized : undefined;
};

const toUuidString = (bytes: Uint8Array) =>
  [
    toHex(bytes, 0, 4),
    toHex(bytes, 4, 6),
    toHex(bytes, 6, 8),
    toHex(bytes, 8, 10),
    toHex(bytes, 10, 16),
  ].join("-");

export const buildDeterministicDetailPageId = (input: {
  contentTypeId: string;
  pageRole: DetailPageIdentityRole;
  compositionKey?: string | null;
}) => {
  const contentTypeId = normalizeUuid(input.contentTypeId);
  const name = [
    deterministicNamespace,
    contentTypeId,
    input.pageRole,
    normalizeOptionalText(input.compositionKey) ?? "",
  ].join(":");
  const digest = sha1Digest(name);
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return toUuidString(bytes);
};

export const normalizeDetailPageId = (value: unknown) => normalizeUuid(value);

export const normalizeDetailPageDocument = (
  value: unknown,
  overrides?: {
    id?: string | null;
    contentTypeId?: string | null;
    contentTypeSlug?: string | null;
    status?: DetailPageStatus | null;
  }
): DetailPageDocument => {
  if (!isRecord(value)) throw new Error("detail_page_document_invalid");
  rejectUnknownKeys(value, [
    "schemaVersion",
    "id",
    "name",
    "contentTypeId",
    "contentTypeSlug",
    "status",
    "titlePattern",
    "seo",
    "settings",
    "blocks",
    "bindings",
    "related",
  ]);

  const blocks = normalizeBlocks(value.blocks);
  const blockIds = collectBlockIds(blocks as Array<Record<string, unknown>>);
  const bindings = normalizeBindings(value.bindings, blockIds);
  const related = normalizeRelatedSources(value.related);
  const seo = normalizeSeo(value.seo);

  const schemaVersion = value.schemaVersion ?? 1;
  if (schemaVersion !== 1) throw new Error("detail_page_document_invalid");

  return {
    schemaVersion: 1,
    id: normalizeUuid(overrides?.id ?? value.id),
    name: normalizeRequiredText(value.name),
    contentTypeId: normalizeUuid(overrides?.contentTypeId ?? value.contentTypeId),
    contentTypeSlug: normalizeSlug(overrides?.contentTypeSlug ?? value.contentTypeSlug),
    status: normalizeStatus(overrides?.status ?? value.status),
    titlePattern: normalizeTitlePattern(value.titlePattern),
    ...(seo ? { seo } : {}),
    settings: normalizeSettings(value.settings),
    blocks,
    bindings,
    ...(related ? { related } : {}),
  };
};
