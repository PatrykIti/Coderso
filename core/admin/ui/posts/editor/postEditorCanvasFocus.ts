/**
 * Client-only focus/scroll seam for the post editor canvas.
 *
 * Everything in this module touches live browser DOM. It is reachable only from
 * React effects (which never run during server render) and from ref attachment
 * during commit, so no `typeof window` guard belongs here: the canvas is also
 * asserted with `renderToString`, which stops before any effect fires, and the
 * block registry is only populated by the browser attaching refs.
 */

export type CanvasBlockRefs = Map<string, HTMLDivElement>;

/** Factory for the per-canvas registry of block wrapper elements. */
export const createCanvasBlockRefs = (): CanvasBlockRefs => new Map<string, HTMLDivElement>();

/** Registers or clears the wrapper element for one block id. */
export const attachCanvasBlockRef = (
  blockRefs: CanvasBlockRefs,
  blockId: string,
  element: HTMLDivElement | null
) => {
  if (element) {
    blockRefs.set(blockId, element);
  } else {
    blockRefs.delete(blockId);
  }
};

/** Resolves the wrapper element of a block, if it is currently mounted. */
export const readCanvasBlockElement = (
  blockRefs: CanvasBlockRefs,
  blockId: string
): HTMLDivElement | null => blockRefs.get(blockId) ?? null;

const CANVAS_EDITABLE_SELECTOR =
  "[data-post-editor-primary-editable='true'], [contenteditable='true'], textarea, input";

/** Focuses a block's primary editable surface without scrolling the canvas. */
export const focusCanvasBlock = (element: HTMLElement) => {
  const editable = element.querySelector<HTMLElement>(CANVAS_EDITABLE_SELECTOR);
  editable?.focus({ preventScroll: true });
};

/**
 * Hands focus to a freshly inserted/selected block on the next animation frame
 * and returns the cancel function for the scheduled frame.
 */
export const scheduleCanvasBlockFocus = (element: HTMLElement) => {
  const frameId = window.requestAnimationFrame(() => {
    focusCanvasBlock(element);
  });

  return () => {
    window.cancelAnimationFrame(frameId);
  };
};

/** Keeps the block that just became selected inside the visible canvas area. */
export const scrollCanvasBlockIntoView = (element: HTMLElement) => {
  element.scrollIntoView({ behavior: "smooth", block: "nearest" });
};
