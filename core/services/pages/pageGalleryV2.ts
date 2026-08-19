import { GALLERY_CATEGORY_PATTERN, GALLERY_FILTER_CATEGORY_MAX } from "./pageDocumentV2Types";

/**
 * Canonical gallery item (TASK-539). `src`, `alt`, and `caption` are required
 * own strings on write (empty strings are legal: the exact
 * `{src:"",alt:"",caption:""}` draft sentinel persists and counts toward the
 * item limit). `category` is an optional space-separated set of 1..12
 * `GALLERY_CATEGORY_PATTERN` tokens (deduplicated by the write normalizer).
 */
export type PageGalleryItemV2 = {
  src: string;
  alt: string;
  caption: string;
  category?: string;
};

/** Hard upper bound on gallery rows (draft rows count). */
export const PAGE_GALLERY_ITEMS_MAX = 120 as const;
/** `src` raw-length cap (bytes are enforced by the media-URL sanitizer). */
export const PAGE_GALLERY_SRC_MAX = 2048 as const;
/** `alt` raw-length cap. */
export const PAGE_GALLERY_ALT_MAX = 500 as const;
/** `caption` raw-length cap. */
export const PAGE_GALLERY_CAPTION_MAX = 2_000 as const;
/** Single category token length cap (mirrors `GALLERY_CATEGORY_PATTERN`). */
export const PAGE_GALLERY_CATEGORY_TOKEN_MAX = 48 as const;
/** Max category tokens per item (reuses the owner filter-cap vocabulary). */
export const PAGE_GALLERY_CATEGORY_TOKENS_MAX = GALLERY_FILTER_CATEGORY_MAX;
/** Max serialized category length: 12 * 48 chars + 11 ASCII spaces. */
export const PAGE_GALLERY_CATEGORY_MAX = 587 as const;

// The owner token grammar without its anchors: `[\w-]{1,48}` (derived, never
// a second handwritten token grammar).
const galleryCategoryTokenSource = GALLERY_CATEGORY_PATTERN.source
  .replace(/^\^/, "")
  .replace(/\$$/, "");

/**
 * JSON-Schema pattern for the optional `category` string: exactly 1..12 owner
 * tokens separated by one ASCII space, with no leading/trailing/repeated
 * spaces. JSON Schema proves shape and bounds only — it may accept repeated
 * tokens; the write normalizer independently enforces uniqueness.
 */
export const galleryCategoryTokenStackPattern = `^(?:${galleryCategoryTokenSource})(?: (?:${galleryCategoryTokenSource})){0,${PAGE_GALLERY_CATEGORY_TOKENS_MAX - 1}}$`;
