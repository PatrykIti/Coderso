import type { PostInsertOptions } from "./hooks/usePostEditorState";

export type CanvasSelectionHandler = (blockId: string | null) => void;

/**
 * Insertion target of the empty-canvas "Add section" appender: a
 * writing-canvas block is prepended at index 0, ahead of any content.
 */
export const EMPTY_CANVAS_INSERT_OPTIONS: PostInsertOptions = {
  source: "outline-plus",
  target: { mode: "index", index: 0 },
};

/** Comparison helper backing the active-block state of every canvas block. */
export const isCanvasBlockSelected = (selectedBlockId: string | null, blockId: string) =>
  selectedBlockId === blockId;

/** Root canvas click-away: a click that reaches the canvas body clears selection. */
export const clearCanvasSelection = (onSelectBlock: CanvasSelectionHandler) => {
  onSelectBlock(null);
};

/**
 * Focusing the title deselects the active block; the focus event is stopped so
 * it cannot bubble into the canvas root click-away handler twice.
 */
export const deselectCanvasSelectionOnTitleFocus = (
  event: { stopPropagation: () => void },
  onSelectBlock: CanvasSelectionHandler
) => {
  event.stopPropagation();
  onSelectBlock(null);
};
