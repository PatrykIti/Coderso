import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Bold, Highlighter, Italic, Link as LinkIcon, Palette, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  isPageTextMarkCapableBlockType,
  type PageBlockV2,
  type PageBreakpoint,
  type PageSectionV2,
} from "../../../../services/pages/pageDocumentV2";
import { getPageEditorColorPalette } from "../../../../services/pages/pageEditorControlUiModel";
import {
  getPageBlockAtPath,
  isSamePageBlockPath,
  serializePageBlockPath,
  type PageBlockInsertTarget,
  type PageBlockPath,
} from "../../../../services/pages/pageBlockPaths";
import { resolveInlineEditTarget } from "../../../../services/pages/pageInlineEditContract";
import { getPageSectionEffectiveColumns } from "../../../../services/pages/pageSectionTemplates";
import type { PageRuntimeDataByBlockId } from "../../../../services/pages/pageRuntimeBindingContract";
import {
  joinPageRenderClasses,
  PageSectionContent,
} from "../../../../services/pages/pageRendererV2";
import {
  hasAnyResponsiveOverride,
  readBlockBreakpointOverride,
  readSectionBreakpointOverride,
} from "../../../../services/pages/pageEditorState";
import {
  editorCanvasCtaButtonClass,
  editorCanvasGhostBesideHandleClass,
  editorCanvasGhostTileClass,
  editorCanvasGhostTileCompactClass,
} from "../editorControls/controlChrome";
import { formatSlotLabel, getBlockDisplayLabel } from "./pageEditorLabels";

export type PageEditorInlineEditTarget = {
  blockId: string;
  propPath: string;
};

export type PageEditorInlineEditCommit = {
  blockId: string;
  propPath: string;
  /** Plain text or rich HTML content of the contenteditable region at blur time. */
  text: string;
  /** Text the canvas painted when editing started (includes renderer fallbacks). */
  renderedText: string;
};

export type PageEditorTextMarkCommit = {
  blockId: string;
  propPath: string;
  type: "color" | "highlight" | "link" | "bold" | "italic";
  from: number;
  to: number;
  color?: string;
  href?: string;
};

export type PageEditorTextColorMarkCommit = PageEditorTextMarkCommit;

/** Stable ref callback: focuses a freshly activated inline-edit region with the caret at the end. */
const focusInlineEditableNode = (node: HTMLElement | null) => {
  if (!node || typeof document === "undefined" || document.activeElement === node) return;
  node.focus();
  const selection = node.ownerDocument.defaultView?.getSelection?.();
  if (!selection || typeof node.ownerDocument.createRange !== "function") return;
  const range = node.ownerDocument.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Resolve a collapsed caret range from viewport coordinates, clamped to the
 * given editable node. Used to place the caret where the author clicked when a
 * single click activates inline edit (TASK-475-03). Returns null when the point
 * is outside any text node so callers can fall back to caret-at-end.
 */
const caretRangeFromClientPoint = (node: HTMLElement, x: number, y: number): Range | null => {
  const doc = node.ownerDocument;
  const fromPoint = doc as Document & {
    caretRangeFromPoint?: (cx: number, cy: number) => Range | null;
    caretPositionFromPoint?: (
      cx: number,
      cy: number
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (typeof fromPoint.caretRangeFromPoint === "function") {
    const range = fromPoint.caretRangeFromPoint(x, y);
    if (!range) return null;
    return node.contains(range.startContainer) ? range : null;
  }
  if (typeof fromPoint.caretPositionFromPoint === "function") {
    const position = fromPoint.caretPositionFromPoint(x, y);
    if (!position || !node.contains(position.offsetNode)) return null;
    const range = doc.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }
  return null;
};

const readInlineEditableElementText = (element: HTMLElement): string => {
  const { innerText } = element as HTMLElement & { innerText?: unknown };
  return typeof innerText === "string" ? innerText : (element.textContent ?? "");
};

/**
 * Restore a DOM selection over `[from, to)` character offsets within an editable
 * that may contain mark spans (the inverse of `readInlineTextSelectionRange`).
 * Used after a mark apply re-renders the painted children so the selection (and
 * thus the visible color) survives and the fragment can be re-colored in place
 * (TASK-476-02). No-ops if the offsets fall outside the editable's text.
 */
const selectInlineTextRange = (root: HTMLElement, from: number, to: number): void => {
  const doc = root.ownerDocument;
  const selection = doc.defaultView?.getSelection?.();
  if (!selection || typeof doc.createTreeWalker !== "function") return;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let offset = 0;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (startNode === null && from <= offset + length) {
      startNode = node;
      startOffset = from - offset;
    }
    if (to <= offset + length) {
      endNode = node;
      endOffset = to - offset;
      break;
    }
    offset += length;
    node = walker.nextNode();
  }
  if (!startNode || !endNode) return;
  const range = doc.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  selection.removeAllRanges();
  selection.addRange(range);
};

type InlineTextSelectionRange = { from: number; to: number };

const readRangeOffsetFromRoot = (
  root: HTMLElement,
  container: Node,
  offset: number
): number | null => {
  if (container !== root && !root.contains(container)) return null;
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(root);
  range.setEnd(container, offset);
  return range.toString().length;
};

const readInlineTextSelectionRange = (root: HTMLElement): InlineTextSelectionRange | null => {
  const selection = root.ownerDocument.defaultView?.getSelection?.();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const from = readRangeOffsetFromRoot(root, range.startContainer, range.startOffset);
  const to = readRangeOffsetFromRoot(root, range.endContainer, range.endOffset);
  if (from === null || to === null) return null;
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  return end > start ? { from: start, to: end } : null;
};

// Inline mark swatches expose only the design-token colors whose `var(--color-*)`
// resolves consistently in the admin canvas AND on the front (brand + border).
// The neutral `bg`/`surface`/`text` tokens use CSS variables the admin canvas does
// not define (it carries `--color-background`/`-foreground`/`-muted` instead), so
// they would render as an invalid color in-editor; authors reach those via the
// custom color picker (a sanitized hex) instead. (TASK-477-01)
const inlineTextMarkPalette = getPageEditorColorPalette().filter((swatch) =>
  ["primary", "secondary", "accent", "border"].includes(swatch.id)
);

const InlineEditableCanvasText = ({
  block,
  propPath,
  text,
  children,
  display = "inline",
  selected,
  editing,
  device,
  onStartEdit,
  onCommit,
  onApplyTextMark,
}: {
  block: PageBlockV2;
  propPath: string;
  text: string;
  children?: ReactNode;
  display?: "inline" | "block";
  selected: boolean;
  editing: boolean;
  device: PageBreakpoint;
  onStartEdit: (target: PageEditorInlineEditTarget) => void;
  onCommit: (commit: PageEditorInlineEditCommit) => void;
  onApplyTextMark: (commit: PageEditorTextMarkCommit) => void;
}) => {
  const [selectionRange, setSelectionRange] = useState<InlineTextSelectionRange | null>(null);
  const [linkHref, setLinkHref] = useState("");
  // Live editable node + a synchronous selection snapshot captured on toolbar
  // mousedown (TASK-475-01): the mark toolbar is a sibling of the editable, so
  // its mouse events never reach the editable's mouseup/keyup, leaving the
  // `selectionRange` state stale at click time. The snapshot makes activation
  // authoritative against the live DOM selection.
  const editableRef = useRef<HTMLElement | null>(null);
  const markToolbarRef = useRef<HTMLSpanElement | null>(null);
  const selectionSnapshotRef = useRef<InlineTextSelectionRange | null>(null);
  // Caret point remembered when a single click activates inline edit so the
  // caret lands where the author clicked (TASK-475-03).
  const pendingCaretPointRef = useRef<{ x: number; y: number } | null>(null);
  // Range to re-select after a mark apply re-renders the painted children so the
  // visible color survives and the fragment can be re-colored in place (TASK-476-02).
  const pendingSelectionRestoreRef = useRef<InlineTextSelectionRange | null>(null);
  const setEditableNode = useCallback((node: HTMLElement | null) => {
    editableRef.current = node;
    if (!node) return;
    const point = pendingCaretPointRef.current;
    pendingCaretPointRef.current = null;
    if (point) {
      node.focus();
      const range = caretRangeFromClientPoint(node, point.x, point.y);
      const selection = node.ownerDocument.defaultView?.getSelection?.();
      if (range && selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }
    focusInlineEditableNode(node);
  }, []);
  const resolveActiveMarkRange = (): InlineTextSelectionRange | null =>
    selectionSnapshotRef.current ?? selectionRange;
  // After a mark apply re-renders the painted children (TASK-476-02), restore the
  // author's selection over the marked range so the color is visible and stays
  // selected for an immediate re-color. DOM-only side effect (no setState).
  useEffect(() => {
    if (!editing) return;
    const restore = pendingSelectionRestoreRef.current;
    pendingSelectionRestoreRef.current = null;
    const node = editableRef.current;
    if (!restore || !node) return;
    if (node.ownerDocument.activeElement !== node) return;
    selectInlineTextRange(node, restore.from, restore.to);
  });
  const target = resolveInlineEditTarget(block, propPath);
  if (!target) return <>{children ?? text}</>;
  const { multiline } = target;
  const preserveMarkup = target.preserveMarkup === true;
  const canApplyTextMarks =
    editing &&
    device === "desktop" &&
    propPath === "text" &&
    !preserveMarkup &&
    isPageTextMarkCapableBlockType(block.type);
  const updateSelectionRange = (element: HTMLElement) => {
    if (!canApplyTextMarks) return;
    setSelectionRange(readInlineTextSelectionRange(element));
  };
  const applyMark = (commit: PageEditorTextMarkCommit) => {
    onApplyTextMark(commit);
    // Keep the marked range selected across the re-render so the applied color is
    // visible immediately and can be re-colored in place (TASK-476-02).
    if (canApplyTextMarks) {
      pendingSelectionRestoreRef.current = { from: commit.from, to: commit.to };
    }
  };
  const wrapperKey = `${propPath}:${text}`;
  const wrapperProps = {
    ref: editing ? setEditableNode : undefined,
    contentEditable: editing ? true : undefined,
    suppressContentEditableWarning: true,
    "data-page-editor-inline-edit": editing ? "active" : "idle",
    "data-page-editor-inline-edit-prop": propPath,
    className: editing
      ? "cursor-text outline-none ring-1 ring-primary/60 ring-offset-2"
      : undefined,
    onDoubleClick:
      editing || !selected
        ? undefined
        : (event: MouseEvent<HTMLElement>) => {
            event.preventDefault();
            event.stopPropagation();
            onStartEdit({ blockId: block.id, propPath });
          },
    onClick: editing
      ? (event: MouseEvent<HTMLElement>) => {
          event.stopPropagation();
        }
      : selected
        ? (event: MouseEvent<HTMLElement>) => {
            // Second single click on an already-selected text block enters inline
            // edit (TASK-475-03), placing the caret where the author clicked so a
            // drag-select can follow without needing a double click. The first
            // click (block not yet selected) falls through and bubbles to the
            // block-select handler.
            event.stopPropagation();
            pendingCaretPointRef.current = { x: event.clientX, y: event.clientY };
            onStartEdit({ blockId: block.id, propPath });
          }
        : undefined,
    onMouseUp: editing
      ? (event: MouseEvent<HTMLElement>) => {
          updateSelectionRange(event.currentTarget);
        }
      : undefined,
    onKeyUp: editing
      ? (event: KeyboardEvent<HTMLElement>) => {
          updateSelectionRange(event.currentTarget);
        }
      : undefined,
    onKeyDown: editing
      ? (event: KeyboardEvent<HTMLElement>) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.blur();
            return;
          }
          if (event.key === "Enter" && !multiline) {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.blur();
          }
        }
      : undefined,
    onBlur: editing
      ? (event: FocusEvent<HTMLElement>) => {
          // Keep inline edit alive while focus moves into the mark toolbar (e.g.
          // the link URL input); committing here would unmount the toolbar
          // mid-interaction (TASK-475-01 bug #2).
          const nextFocus = event.relatedTarget;
          if (nextFocus instanceof Node && markToolbarRef.current?.contains(nextFocus)) {
            return;
          }
          onCommit({
            blockId: block.id,
            propPath,
            text: preserveMarkup
              ? event.currentTarget.innerHTML
              : readInlineEditableElementText(event.currentTarget),
            renderedText: text,
          });
        }
      : undefined,
  };
  // Paint the marked children even while editing (TASK-476-02) so applied
  // color/highlight/link marks are visible in place instead of only after the
  // author leaves inline edit. Mirrors the rich-text (preserveMarkup) path, which
  // already renders children into the contentEditable; the commit still reads
  // innerText, and props.marks stays the source of truth.
  const content = children ?? text;
  const markToolbar =
    canApplyTextMarks && inlineTextMarkPalette.length > 0 ? (
      <span
        ref={markToolbarRef}
        className="absolute -top-9 left-0 z-20 flex items-center gap-1 rounded border bg-background/95 px-1.5 py-1 shadow-sm"
        data-page-editor-text-mark-toolbar="true"
        data-page-editor-text-color-toolbar="true"
        onMouseDown={(event) => {
          event.stopPropagation();
          // Snapshot the still-live DOM selection on every toolbar interaction,
          // before either the URL input steals focus or preventDefault runs. The
          // sibling toolbar never triggers the editable's mouseup/keyup, so the
          // `selectionRange` state can be stale at click time (TASK-475-01 bug #1).
          if (canApplyTextMarks && editableRef.current) {
            const liveRange = readInlineTextSelectionRange(editableRef.current);
            if (liveRange) {
              selectionSnapshotRef.current = liveRange;
              setSelectionRange(liveRange);
            }
          }
          // Do NOT preventDefault for the link URL input or the custom color
          // picker: preventDefault on a color input's mousedown blocks the native
          // color dialog from opening, and steals the URL input's focus (bug #2 /
          // TASK-477-01). The picker is a label-wrapped <input type="color">, so
          // the click target can be the label or its icon, not the input.
          const pickerTarget = event.target as Element | null;
          if (
            event.target instanceof HTMLInputElement ||
            pickerTarget?.closest?.("[data-page-editor-text-color-picker-label]")
          ) {
            return;
          }
          // Preserve the selection/focus for swatch/button activation.
          event.preventDefault();
        }}
      >
        <Palette className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <button
          type="button"
          aria-label="Apply bold"
          disabled={!selectionRange}
          title="Bold"
          className="inline-flex size-6 items-center justify-center rounded border border-border bg-background text-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
          data-page-editor-text-mark-button="bold"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const range = resolveActiveMarkRange();
            if (!range) return;
            applyMark({
              blockId: block.id,
              propPath,
              type: "bold",
              from: range.from,
              to: range.to,
            });
          }}
        >
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Apply italic"
          disabled={!selectionRange}
          title="Italic"
          className="inline-flex size-6 items-center justify-center rounded border border-border bg-background text-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
          data-page-editor-text-mark-button="italic"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const range = resolveActiveMarkRange();
            if (!range) return;
            applyMark({
              blockId: block.id,
              propPath,
              type: "italic",
              from: range.from,
              to: range.to,
            });
          }}
        >
          <Italic className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {inlineTextMarkPalette.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            aria-label={`Apply ${swatch.label} text color`}
            disabled={!selectionRange}
            title={swatch.label}
            className="size-5 rounded-full border border-border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
            data-page-editor-text-color-swatch={swatch.id}
            style={{ backgroundColor: swatch.value }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const range = resolveActiveMarkRange();
              if (!range) return;
              applyMark({
                blockId: block.id,
                propPath,
                type: "color",
                from: range.from,
                to: range.to,
                color: swatch.value,
              });
            }}
          />
        ))}
        <label
          aria-label="Custom text color"
          title="Custom color — pick any color"
          data-page-editor-text-color-picker-label="true"
          className={`relative inline-flex size-5 items-center justify-center overflow-hidden rounded-full border border-border shadow-sm ${
            selectionRange ? "cursor-pointer" : "cursor-not-allowed opacity-40"
          }`}
          style={{
            background:
              "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
          }}
          // The native color dialog opens as the click's default action. Stop the
          // click here so it never reaches the block-frame onClick, which calls
          // preventDefault() and would cancel the picker (TASK-477-01). Do NOT
          // preventDefault here — that would block the picker too.
          onClick={(event) => event.stopPropagation()}
        >
          <Plus className="pointer-events-none h-3 w-3 text-white drop-shadow" aria-hidden="true" />
          <input
            type="color"
            aria-label="Custom text color"
            disabled={!selectionRange}
            data-page-editor-text-color-picker="true"
            defaultValue="#1d4ed8"
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            onChange={(event) => {
              const range = resolveActiveMarkRange();
              if (!range) return;
              applyMark({
                blockId: block.id,
                propPath,
                type: "color",
                from: range.from,
                to: range.to,
                color: event.target.value,
              });
              editableRef.current?.focus();
            }}
          />
        </label>
        {inlineTextMarkPalette.slice(0, 4).map((swatch) => (
          <button
            key={`highlight-${swatch.id}`}
            type="button"
            aria-label={`Apply ${swatch.label} highlight`}
            disabled={!selectionRange}
            title={`${swatch.label} highlight`}
            className="relative size-5 rounded border border-border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
            data-page-editor-text-highlight-swatch={swatch.id}
            style={{ backgroundColor: swatch.value }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const range = resolveActiveMarkRange();
              if (!range) return;
              applyMark({
                blockId: block.id,
                propPath,
                type: "highlight",
                from: range.from,
                to: range.to,
                color: swatch.value,
              });
            }}
          >
            <Highlighter className="absolute -bottom-1 -right-1 h-3 w-3 rounded bg-background text-foreground" />
          </button>
        ))}
        <span className="flex items-center gap-1 border-l border-border pl-1">
          <input
            aria-label="Inline link URL"
            value={linkHref}
            placeholder="https://"
            disabled={!selectionRange}
            className="h-6 w-28 rounded border border-border bg-background px-1.5 text-xs text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
            onChange={(event) => setLinkHref(event.target.value)}
          />
          <button
            type="button"
            aria-label="Apply link"
            disabled={!selectionRange || linkHref.trim().length === 0}
            title="Link"
            className="inline-flex size-6 items-center justify-center rounded border border-border bg-background text-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
            data-page-editor-text-mark-button="link"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const range = resolveActiveMarkRange();
              if (!range) return;
              applyMark({
                blockId: block.id,
                propPath,
                type: "link",
                from: range.from,
                to: range.to,
                href: linkHref,
              });
              // Return focus to the editable so a later click-away commits and
              // ends inline edit through the normal blur path (TASK-475-01).
              editableRef.current?.focus();
            }}
          >
            <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      </span>
    ) : null;
  if (display === "block") {
    return (
      <div className="relative" data-page-editor-inline-edit-frame="true">
        <div key={wrapperKey} {...wrapperProps}>
          {content}
        </div>
        {markToolbar}
      </div>
    );
  }
  return (
    <span className="relative inline-block" data-page-editor-inline-edit-frame="true">
      <span key={wrapperKey} {...wrapperProps}>
        {content}
      </span>
      {markToolbar}
    </span>
  );
};

const HiddenBlockGhost = ({ block }: { block: PageBlockV2 }) => (
  <div
    className="flex min-h-14 items-center justify-between gap-3 rounded border border-dashed border-muted-foreground/40 bg-muted/70 px-3 py-2 text-xs text-muted-foreground"
    data-page-editor-hidden-block-ghost="true"
  >
    <span className="shrink-0 font-semibold uppercase">Hidden {block.type}</span>
    <span className="min-w-0 truncate">{getBlockDisplayLabel(block)}</span>
  </div>
);

export const SectionGapInsertZone = ({
  index,
  onInsert,
}: {
  index: number;
  onInsert: (gapIndex: number) => void;
}) => (
  <div
    className="group relative flex h-7 items-center justify-center"
    data-page-editor-section-gap={index}
    onClick={(event) => event.stopPropagation()}
  >
    <div
      className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-primary/30 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      aria-hidden="true"
    />
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`${editorCanvasCtaButtonClass} relative z-10 h-6 gap-1 rounded-full px-2 text-xs opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100`}
      aria-label={`Add section at position ${index + 1}`}
      onClick={() => onInsert(index)}
    >
      <Plus className="h-3 w-3" />
      Add section
    </Button>
  </div>
);

const CanvasGhostAddTile = ({
  ghostKind,
  ariaLabel,
  compact = false,
  onAdd,
}: {
  ghostKind: string;
  ariaLabel: string;
  compact?: boolean;
  onAdd: () => void;
}) => (
  <button
    type="button"
    className={compact ? editorCanvasGhostTileCompactClass : editorCanvasGhostTileClass}
    data-page-editor-ghost={ghostKind}
    aria-label={ariaLabel}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onAdd();
    }}
  >
    <Plus className={compact ? "h-3 w-3" : "h-4 w-4"} />
    Add block
  </button>
);

export const SectionCanvas = ({
  section,
  baseSection,
  selected,
  selectedBlockPath,
  selectedBlockId,
  inlineEditTarget,
  device,
  canAddBlockBeside,
  canvasDataByBlockId,
  onSelect,
  onSelectBlock,
  onAddBlock,
  onAddBlockToTarget,
  onAddBlockBeside,
  onStartInlineEdit,
  onCommitInlineEdit,
  onApplyTextMark,
}: {
  section: PageSectionV2;
  baseSection: PageSectionV2;
  selected: boolean;
  selectedBlockPath: PageBlockPath | null;
  selectedBlockId: string | null;
  inlineEditTarget: PageEditorInlineEditTarget | null;
  device: PageBreakpoint;
  canAddBlockBeside: boolean;
  canvasDataByBlockId: PageRuntimeDataByBlockId;
  onSelect: () => void;
  onSelectBlock: (blockPath: PageBlockPath) => void;
  onAddBlock: () => void;
  onAddBlockToTarget: (target: PageBlockInsertTarget, options?: { column?: number }) => void;
  onAddBlockBeside: () => void;
  onStartInlineEdit: (target: PageEditorInlineEditTarget) => void;
  onCommitInlineEdit: (commit: PageEditorInlineEditCommit) => void;
  onApplyTextMark: (commit: PageEditorTextMarkCommit) => void;
}) => {
  const sectionHasOverride = hasAnyResponsiveOverride(
    device,
    readSectionBreakpointOverride(baseSection, device)
  );
  const visibilityBadges = [
    !section.visibility.visible ? "Hidden" : null,
    section.visibility.authOnly ? "Auth only" : null,
    section.visibility.startsAt ? `Starts ${section.visibility.startsAt}` : null,
    section.visibility.endsAt ? `Ends ${section.visibility.endsAt}` : null,
  ].filter((badge): badge is string => Boolean(badge));
  const effectiveColumns = getPageSectionEffectiveColumns(section);
  const addBlockToSectionColumn = (column: number) => {
    onSelect();
    onAddBlockToTarget({ listPath: {}, index: section.blocks.length }, { column });
  };
  return (
    <section
      className={`group relative transition ${
        selected
          ? "outline outline-2 outline-offset-2 outline-primary"
          : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-primary/40"
      } ${section.visibility.visible ? "" : "opacity-65"}`}
      data-page-editor-section={section.type}
      data-section-id={section.id}
      data-page-editor-responsive-target={sectionHasOverride ? "override" : "inherited"}
      data-page-editor-visibility={section.visibility.visible ? "visible" : "hidden"}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <div className="absolute -top-3 left-4 hidden rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground group-hover:block group-focus-within:block">
        {section.name} · {section.variant}
      </div>
      {sectionHasOverride ? (
        <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
          {device} override
        </span>
      ) : null}
      {visibilityBadges.length > 0 ? (
        <div className="absolute right-3 top-9 z-10 flex max-w-[70%] flex-wrap justify-end gap-1">
          {visibilityBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground"
              data-page-editor-visibility-badge={badge}
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      <PageSectionContent
        section={section}
        layoutMode="canvas-device"
        includeHiddenBlocks
        runtimeDataByBlockId={canvasDataByBlockId}
        emptyContent={
          effectiveColumns >= 2 ? (
            <>
              {Array.from({ length: effectiveColumns }, (_, columnIndex) => (
                <CanvasGhostAddTile
                  key={`section-column-ghost-${columnIndex + 1}`}
                  ghostKind="section-column"
                  ariaLabel={`Add block to column ${columnIndex + 1}`}
                  onAdd={() => addBlockToSectionColumn(columnIndex + 1)}
                />
              ))}
            </>
          ) : (
            <button
              type="button"
              className={`rounded border-dashed p-6 text-center text-sm ${editorCanvasCtaButtonClass}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect();
                onAddBlock();
              }}
            >
              Add the first block
            </button>
          )
        }
        trailingContent={
          effectiveColumns >= 2 && section.blocks.length > 0 ? (
            <>
              {Array.from({ length: effectiveColumns }, (_, offset) => {
                const column = ((section.blocks.length + offset) % effectiveColumns) + 1;
                return (
                  <CanvasGhostAddTile
                    key={`section-column-append-ghost-${column}`}
                    ghostKind="section-column-append"
                    ariaLabel={`Add block to column ${column}`}
                    compact
                    onAdd={() => addBlockToSectionColumn(column)}
                  />
                );
              })}
            </>
          ) : null
        }
        renderSectionColumnTrailing={({ column, childCount }) => (
          <CanvasGhostAddTile
            ghostKind={childCount === 0 ? "section-column" : "section-column-append"}
            ariaLabel={`Add block to column ${column}`}
            compact={childCount > 0}
            onAdd={() => addBlockToSectionColumn(column)}
          />
        )}
        renderColumnsSlotTrailing={({ slotKey, ownerPath, childCount }) => {
          const canAdd =
            ownerPath.length + 1 <= PAGE_BLOCK_MAX_TREE_DEPTH &&
            childCount < PAGE_BLOCK_MAX_CHILDREN_PER_SLOT;
          if (!canAdd) return null;
          const slotLabel = formatSlotLabel(slotKey);
          return (
            <CanvasGhostAddTile
              ghostKind={childCount === 0 ? "columns-slot" : "columns-slot-append"}
              ariaLabel={`Add block to ${slotLabel}`}
              compact={childCount > 0}
              onAdd={() => {
                onSelect();
                onAddBlockToTarget({
                  listPath: { ownerPath, slotKey },
                  index: childCount,
                });
              }}
            />
          );
        }}
        renderInlineText={({ block, propPath, text, children, display }) => (
          <InlineEditableCanvasText
            block={block}
            propPath={propPath}
            text={text}
            display={display}
            selected={block.id === selectedBlockId}
            editing={Boolean(
              inlineEditTarget &&
              inlineEditTarget.blockId === block.id &&
              inlineEditTarget.propPath === propPath
            )}
            device={device}
            onStartEdit={onStartInlineEdit}
            onCommit={onCommitInlineEdit}
            onApplyTextMark={onApplyTextMark}
          >
            {children}
          </InlineEditableCanvasText>
        )}
        renderBlockFrame={({
          block,
          content,
          renderProps: blockRenderProps,
          blockPath,
          depth,
          slotKey,
        }) => {
          const baseBlock = getPageBlockAtPath(baseSection, blockPath) ?? undefined;
          const blockHasOverride = hasAnyResponsiveOverride(
            device,
            readBlockBreakpointOverride(baseBlock, device)
          );
          const blockSelected = isSamePageBlockPath(blockPath, selectedBlockPath);
          return (
            <div
              className={joinPageRenderClasses(
                "relative transition outline outline-1 outline-offset-2",
                blockRenderProps.className,
                blockSelected
                  ? "outline-primary ring-2 ring-primary/20"
                  : "outline-transparent hover:outline-primary/30",
                block.visibility.visible ? undefined : "opacity-70"
              )}
              style={blockRenderProps.style}
              {...blockRenderProps.dataAttributes}
              data-page-editor-block={block.type}
              data-page-editor-block-id={block.id}
              data-page-editor-block-path={serializePageBlockPath(blockPath)}
              data-page-editor-block-depth={depth}
              data-page-editor-block-slot-key={slotKey}
              data-page-editor-responsive-target={blockHasOverride ? "override" : "inherited"}
              data-page-editor-visibility={block.visibility.visible ? "visible" : "hidden"}
              data-selected={blockSelected ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectBlock(blockPath);
              }}
            >
              {blockHasOverride ? (
                <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                  {device}
                </span>
              ) : null}
              {block.visibility.visible ? content : <HiddenBlockGhost block={block} />}
              {blockSelected && canAddBlockBeside ? (
                <button
                  type="button"
                  className={editorCanvasGhostBesideHandleClass}
                  data-page-editor-ghost="add-block-beside"
                  title="Add block beside"
                  aria-label="Add block beside"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onAddBlockBeside();
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          );
        }}
      />
    </section>
  );
};
