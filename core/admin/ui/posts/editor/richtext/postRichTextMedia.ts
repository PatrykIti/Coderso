import {
  DEFAULT_POST_IMAGE_LAYOUT,
  normalizePostImageLayout,
  type PostImageLayout,
} from "../../../../../services/posts/postImageWrapLayout";

export type ClipboardItemLike = {
  kind?: string;
  type?: string;
  getAsFile?: () => File | null;
};

export type ClipboardDataLike = {
  items?: ArrayLike<ClipboardItemLike> | null;
  files?: ArrayLike<File> | null;
};

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const extractClipboardImageFiles = (clipboard: ClipboardDataLike | null | undefined) => {
  if (!clipboard) return [] as File[];

  const fromItems: File[] = [];
  for (const item of Array.from(clipboard.items ?? [])) {
    if (!item) continue;
    const itemType = (item.type ?? "").toLowerCase();
    if (item.kind !== "file" && !itemType.startsWith("image/")) continue;
    const file = item.getAsFile?.() ?? null;
    if (!file) continue;
    if (!file.type.toLowerCase().startsWith("image/")) continue;
    fromItems.push(file);
  }

  if (fromItems.length > 0) {
    return fromItems;
  }

  return Array.from(clipboard.files ?? []).filter((file) =>
    file.type.toLowerCase().startsWith("image/")
  );
};

export const deriveClipboardImageAlt = (file: File) => {
  const base = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return (base || "Pasted image").slice(0, 200);
};

export const buildClipboardImageInsertHtml = (
  asset: { id: string; url: string },
  alt: string,
  layout: PostImageLayout = DEFAULT_POST_IMAGE_LAYOUT
) => {
  const safeAlt = alt.trim().slice(0, 500);
  return `<img src="${escapeHtml(asset.url)}" data-media-id="${escapeHtml(asset.id)}" alt="${escapeHtml(safeAlt)}" data-wrap="${layout.wrap}" data-width="${layout.widthPercent}" data-margin="${layout.marginPreset}" loading="lazy">`;
};

const ELEMENT_NODE_TYPE = 1;
const IMAGE_NODE_NAME = "img";

/**
 * Realm-independent image-element predicate.
 *
 * `instanceof` compares against the current realm's prototype chain, so an `<img>`
 * that was created in (or adopted from) another window or iframe realm is neither
 * this realm's `HTMLImageElement` nor its `HTMLElement`: the previous
 * `instanceof HTMLElement && tagName === "img"` fallback could therefore never
 * match it. `Node#nodeType` and `Node#nodeName` are realm-independent, so the
 * traversal identifies an image element by node type plus node name. The walk is
 * bounded by the supplied editor root, so the returned node is always an actual
 * `<img>` inside that root.
 */
const isImageElementNode = (node: Node): node is HTMLImageElement =>
  node.nodeType === ELEMENT_NODE_TYPE && node.nodeName.toLowerCase() === IMAGE_NODE_NAME;

export const findClosestImageFromNode = (
  node: Node | null,
  editorRoot: HTMLElement
): HTMLImageElement | null => {
  if (!node || !editorRoot.contains(node)) return null;
  let cursor: Node | null = node;
  while (cursor && cursor !== editorRoot) {
    if (isImageElementNode(cursor)) {
      return cursor;
    }
    cursor = cursor.parentNode;
  }
  return null;
};

export const findSelectedImageElement = (editorRoot: HTMLElement) => {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const anchor = findClosestImageFromNode(selection.anchorNode, editorRoot);
  if (anchor) return anchor;
  const focus = findClosestImageFromNode(selection.focusNode, editorRoot);
  if (focus) return focus;

  const range = selection.getRangeAt(0);
  const fromStart =
    range.startContainer instanceof Element
      ? (range.startContainer.querySelector("img") as HTMLImageElement | null)
      : null;
  if (fromStart && editorRoot.contains(fromStart)) {
    return fromStart;
  }
  return null;
};

export const readImageLayoutFromElement = (image: HTMLImageElement): PostImageLayout =>
  normalizePostImageLayout({
    wrap: image.getAttribute("data-wrap"),
    widthPercent: image.getAttribute("data-width"),
    marginPreset: image.getAttribute("data-margin"),
  });

export const applyImageLayoutToElement = (image: HTMLImageElement, layout: PostImageLayout) => {
  image.setAttribute("data-wrap", layout.wrap);
  image.setAttribute("data-width", String(layout.widthPercent));
  image.setAttribute("data-margin", layout.marginPreset);
};
