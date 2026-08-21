import { sanitizeAuthoringMediaUrl } from "./pageAuthoringSanitizers";
import {
  PAGE_GALLERY_ALT_MAX,
  PAGE_GALLERY_CAPTION_MAX,
  PAGE_GALLERY_CATEGORY_MAX,
  PAGE_GALLERY_ITEMS_MAX,
  PAGE_GALLERY_SRC_MAX,
  type PageGalleryItemV2,
} from "./pageGalleryV2";
import { GALLERY_CATEGORY_PATTERN, GALLERY_FILTER_CATEGORY_MAX } from "./pageDocumentV2Types";
import {
  assertKnownKeys,
  invalidAt,
  requireArray,
  requireRecord,
  type NormalizeMode,
  type RecordValue,
} from "./pageDocumentV2Normalization";

/**
 * Gallery item normalization (extracted from pageBlockNormalizerV2 so the
 * block normalizer stays within the repository physical line limit). This
 * module owns the stored-read rebuild and the write-path strict contract for
 * gallery `items` rows; the block normalizer delegates via
 * `normalizeGalleryItems`.
 */

const requireOwnString = (value: unknown, path: string): string => {
  if (typeof value !== "string") throw invalidAt(path);
  return value;
};

const pickFirstOwnString = (record: RecordValue, keys: readonly string[]): string | undefined => {
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string") return candidate;
  }
  return undefined;
};

const normalizeWrittenGalleryCategory = (value: unknown, path: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw invalidAt(path);
  if (value.length < 1 || value.length > PAGE_GALLERY_CATEGORY_MAX) throw invalidAt(path);
  const tokens = value.split(" ");
  if (tokens.length < 1 || tokens.length > GALLERY_FILTER_CATEGORY_MAX) throw invalidAt(path);
  if (tokens.join(" ") !== value) throw invalidAt(path);
  if (tokens.some((token) => !GALLERY_CATEGORY_PATTERN.test(token))) throw invalidAt(path);
  if (new Set(tokens).size !== tokens.length) throw invalidAt(path);
  return value;
};

const normalizeStoredGalleryCategory = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const tokens: string[] = [];
  for (const rawToken of value.split(/\s+/)) {
    if (rawToken.length === 0 || !GALLERY_CATEGORY_PATTERN.test(rawToken)) continue;
    if (!tokens.includes(rawToken)) tokens.push(rawToken);
    if (tokens.length >= GALLERY_FILTER_CATEGORY_MAX) break;
  }
  return tokens.length > 0 ? tokens.join(" ") : undefined;
};

const normalizeGalleryItemWrite = (record: RecordValue, itemPath: string): PageGalleryItemV2 => {
  assertKnownKeys(record, ["src", "alt", "caption", "category"], itemPath, "write");
  const src = requireOwnString(record.src, `${itemPath}.src`);
  const alt = requireOwnString(record.alt, `${itemPath}.alt`);
  const caption = requireOwnString(record.caption, `${itemPath}.caption`);
  if (src.length > PAGE_GALLERY_SRC_MAX) throw invalidAt(`${itemPath}.src`);
  if (alt.length > PAGE_GALLERY_ALT_MAX) throw invalidAt(`${itemPath}.alt`);
  if (caption.length > PAGE_GALLERY_CAPTION_MAX) throw invalidAt(`${itemPath}.caption`);
  if (alt !== alt.trim()) throw invalidAt(`${itemPath}.alt`);
  if (caption !== caption.trim()) throw invalidAt(`${itemPath}.caption`);
  // Empty src is the legal draft sentinel; a nonempty src must equal the media
  // sanitizer output byte-for-byte (reject, never repair).
  if (src.length > 0 && sanitizeAuthoringMediaUrl(src) !== src) throw invalidAt(`${itemPath}.src`);
  const item: PageGalleryItemV2 = { src, alt, caption };
  const category = normalizeWrittenGalleryCategory(record.category, `${itemPath}.category`);
  if (category) item.category = category;
  return item;
};

export const normalizeGalleryItems = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageGalleryItemV2[] => {
  const input = requireArray(value, path, mode);
  if (mode === "write" && input.length > PAGE_GALLERY_ITEMS_MAX) throw invalidAt(path);
  const rows = input.slice(0, PAGE_GALLERY_ITEMS_MAX);
  const result: PageGalleryItemV2[] = [];
  rows.forEach((row, index) => {
    const itemPath = `${path}.${index}`;
    if (typeof row === "string") {
      // Legacy string rows are accepted on stored read only (empty alt/caption).
      if (mode !== "write") {
        const src = sanitizeAuthoringMediaUrl(row.trim().slice(0, PAGE_GALLERY_SRC_MAX)) ?? "";
        result.push({ src, alt: "", caption: "" });
      }
      return;
    }
    const record = requireRecord(row, itemPath, mode);
    if (mode === "write") {
      result.push(normalizeGalleryItemWrite(record, itemPath));
      return;
    }
    const srcCandidate = pickFirstOwnString(record, ["src", "url", "image", "assetUrl"]);
    const altCandidate = pickFirstOwnString(record, ["alt", "title"]);
    const captionCandidate = pickFirstOwnString(record, [
      "caption",
      "title",
      "label",
      "name",
      "description",
    ]);
    if (
      srcCandidate === undefined &&
      altCandidate === undefined &&
      captionCandidate === undefined
    ) {
      return; // drop a record with no recognized own string field.
    }
    const src =
      sanitizeAuthoringMediaUrl(srcCandidate?.trim().slice(0, PAGE_GALLERY_SRC_MAX)) ?? "";
    const alt = altCandidate?.trim().slice(0, PAGE_GALLERY_ALT_MAX) ?? "";
    const caption = captionCandidate?.trim().slice(0, PAGE_GALLERY_CAPTION_MAX) ?? "";
    const rebuilt: PageGalleryItemV2 = { src, alt, caption };
    const category = normalizeStoredGalleryCategory(record.category);
    if (category) rebuilt.category = category;
    result.push(rebuilt);
  });
  return result;
};
