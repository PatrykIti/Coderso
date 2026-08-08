import { PAGE_TEXT_MARK_MAX, PageDocumentError, type PageTextMark } from "./pageDocumentV2Types";
import {
  assertKnownKeys,
  isRecord,
  requireArray,
  type NormalizeMode,
} from "./pageDocumentV2Normalization";
import { sanitizeAuthoringCssColor, sanitizeAuthoringLinkHref } from "./pageAuthoringSanitizers";

const normalizeTextMarkIndex = (
  value: unknown,
  textLength: number,
  path: string,
  mode: NormalizeMode
): number | null => {
  if (!Number.isFinite(value)) {
    if (mode === "write") {
      throw new PageDocumentError("page_document_invalid", `Invalid ${path}.`, path);
    }
    return null;
  }
  const index = Math.trunc(value as number);
  return Math.min(textLength, Math.max(0, index));
};

const textMarkAttributeKeys: Record<PageTextMark["type"], readonly string[]> = {
  color: ["type", "from", "to", "color"],
  highlight: ["type", "from", "to", "color"],
  link: ["type", "from", "to", "href"],
  bold: ["type", "from", "to"],
  italic: ["type", "from", "to"],
};

const pageTextMarkTypeRank: Record<PageTextMark["type"], number> = {
  bold: 0,
  italic: 1,
  link: 2,
  color: 3,
  highlight: 4,
};

export const normalizeBlockTextMarksForMode = (
  text: string,
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageTextMark[] => {
  const input = requireArray(value ?? [], path, mode);
  const textLength = text.length;
  const candidates: PageTextMark[] = [];

  for (const [index, rawMark] of input.entries()) {
    const markPath = `${path}.${index}`;
    if (!isRecord(rawMark)) {
      if (mode === "write") {
        throw new PageDocumentError("page_document_invalid", `Invalid ${markPath}.`, markPath);
      }
      continue;
    }
    const type = rawMark.type;
    if (
      type !== "color" &&
      type !== "highlight" &&
      type !== "link" &&
      type !== "bold" &&
      type !== "italic"
    ) {
      if (mode === "write") {
        throw new PageDocumentError(
          "page_document_invalid",
          `Invalid ${markPath}.type.`,
          `${markPath}.type`
        );
      }
      continue;
    }
    assertKnownKeys(rawMark, textMarkAttributeKeys[type], markPath, mode);
    const from = normalizeTextMarkIndex(rawMark.from, textLength, `${markPath}.from`, mode);
    const to = normalizeTextMarkIndex(rawMark.to, textLength, `${markPath}.to`, mode);
    if (from === null || to === null || to <= from) continue;
    if (type === "color" || type === "highlight") {
      const color = sanitizeAuthoringCssColor(rawMark.color);
      if (!color) {
        if (mode === "write") {
          throw new PageDocumentError(
            "page_document_invalid",
            `Invalid ${markPath}.color.`,
            `${markPath}.color`
          );
        }
        continue;
      }
      candidates.push({ type, from, to, color });
      continue;
    }
    if (type === "link") {
      const href = sanitizeAuthoringLinkHref(rawMark.href);
      if (!href) {
        if (mode === "write") {
          throw new PageDocumentError(
            "page_document_invalid",
            `Invalid ${markPath}.href.`,
            `${markPath}.href`
          );
        }
        continue;
      }
      candidates.push({ type, from, to, href });
      continue;
    }
    candidates.push({ type, from, to });
  }

  const result: PageTextMark[] = [];
  const occupiedUntilByType = new Map<PageTextMark["type"], number>();
  for (const mark of candidates.sort((left, right) =>
    left.from === right.from
      ? left.to === right.to
        ? pageTextMarkTypeRank[left.type] - pageTextMarkTypeRank[right.type]
        : left.to - right.to
      : left.from - right.from
  )) {
    const occupiedUntil = occupiedUntilByType.get(mark.type) ?? 0;
    if (mark.from < occupiedUntil) continue;
    result.push(mark);
    occupiedUntilByType.set(mark.type, mark.to);
    if (result.length >= PAGE_TEXT_MARK_MAX) break;
  }
  return result;
};

export function normalizeBlockTextMarks(text: string, value: unknown): PageTextMark[] {
  return normalizeBlockTextMarksForMode(text, value, "stored-read", "props.marks");
}
export function normalizeBlockTextColorMarks(text: string, value: unknown): PageTextMark[] {
  return normalizeBlockTextMarks(text, value);
}

export type PageBlockTextMarkInput = {
  type: PageTextMark["type"];
  from: number;
  to: number;
  color?: string;
  href?: string;
};

/**
 * Apply a single inline text mark to a block's mark set and return the
 * normalized result. Re-applying the IDENTICAL mark (same type, range, AND value)
 * toggles it off; applying a DIFFERENT value over the same range REPLACES it (the
 * old overlapping same-type mark is dropped and the new one added); marks of
 * other types or non-overlapping ranges are retained. Value-awareness is what
 * makes recoloring a fragment a single-click replace instead of a toggle-off then
 * re-apply (TASK-476-01).
 */
export function applyBlockTextMark(
  text: string,
  currentMarks: unknown,
  mark: PageBlockTextMarkInput
): PageTextMark[] {
  const existing = normalizeBlockTextMarks(text, currentMarks);
  const isSameMarkValue = (entry: PageTextMark): boolean => {
    if (entry.type !== mark.type) return false;
    if (entry.type === "color" || entry.type === "highlight") return entry.color === mark.color;
    if (entry.type === "link") return entry.href === mark.href;
    return true;
  };
  const exactMatch = existing.some(
    (entry) => entry.from === mark.from && entry.to === mark.to && isSameMarkValue(entry)
  );
  const retained = existing.filter((entry) => {
    if (entry.type !== mark.type) return true;
    if (exactMatch && entry.from === mark.from && entry.to === mark.to) return false;
    return entry.to <= mark.from || entry.from >= mark.to;
  });
  if (exactMatch) return normalizeBlockTextMarks(text, retained);

  const nextMark: PageTextMark =
    mark.type === "color" || mark.type === "highlight"
      ? { type: mark.type, from: mark.from, to: mark.to, color: mark.color ?? "" }
      : mark.type === "link"
        ? { type: "link", from: mark.from, to: mark.to, href: mark.href ?? "" }
        : { type: mark.type, from: mark.from, to: mark.to };

  return normalizeBlockTextMarks(text, [...retained, nextMark]);
}

export type PageBlockTextMarkRemoveInput = {
  type: PageTextMark["type"];
  from: number;
  to: number;
};

/**
 * Explicitly strip a single inline mark of `mark.type` over `[from, to)` and
 * return the normalized result (audit M7 / TASK-478-02). Unlike
 * {@link applyBlockTextMark} this never toggles or re-applies — it only removes.
 * Behaviour over overlapping marks is precise:
 *  - marks of a DIFFERENT type are untouched (an unlink keeps color/highlight/bold);
 *  - a same-type mark fully inside `[from, to)` is dropped;
 *  - a same-type mark that PARTIALLY overlaps is split so only the covered slice is
 *    removed and the outside slices are preserved (with their value, e.g. the link
 *    href), so unlinking the middle of a long link leaves the two ends linked.
 */
export function removeBlockTextMark(
  text: string,
  currentMarks: unknown,
  mark: PageBlockTextMarkRemoveInput
): PageTextMark[] {
  const existing = normalizeBlockTextMarks(text, currentMarks);
  const next: PageTextMark[] = [];
  for (const entry of existing) {
    // Different type, or no overlap with the removed range: keep as-is.
    if (entry.type !== mark.type || entry.to <= mark.from || entry.from >= mark.to) {
      next.push(entry);
      continue;
    }
    // Preserve the slice before the removed range (carries the entry's value).
    if (entry.from < mark.from) {
      next.push({ ...entry, to: mark.from });
    }
    // Preserve the slice after the removed range.
    if (entry.to > mark.to) {
      next.push({ ...entry, from: mark.to });
    }
    // The slice inside `[from, to)` is dropped.
  }
  return normalizeBlockTextMarks(text, next);
}
