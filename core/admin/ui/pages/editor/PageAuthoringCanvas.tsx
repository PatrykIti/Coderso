import {
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

const readInlineEditableElementText = (element: HTMLElement): string => {
  const { innerText } = element as HTMLElement & { innerText?: unknown };
  return typeof innerText === "string" ? innerText : (element.textContent ?? "");
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

const inlineTextMarkPalette = getPageEditorColorPalette().slice(0, 6);

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
  const wrapperKey = `${propPath}:${text}`;
  const wrapperProps = {
    ref: editing ? focusInlineEditableNode : undefined,
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
  const content = editing && !preserveMarkup ? text : (children ?? text);
  const markToolbar =
    canApplyTextMarks && inlineTextMarkPalette.length > 0 ? (
      <span
        className="absolute -top-9 left-0 z-20 flex items-center gap-1 rounded border bg-background/95 px-1.5 py-1 shadow-sm"
        data-page-editor-text-mark-toolbar="true"
        data-page-editor-text-color-toolbar="true"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
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
            if (!selectionRange) return;
            onApplyTextMark({
              blockId: block.id,
              propPath,
              type: "bold",
              from: selectionRange.from,
              to: selectionRange.to,
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
            if (!selectionRange) return;
            onApplyTextMark({
              blockId: block.id,
              propPath,
              type: "italic",
              from: selectionRange.from,
              to: selectionRange.to,
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
            style={{ backgroundColor: swatch.previewValue ?? swatch.value }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!selectionRange) return;
              onApplyTextMark({
                blockId: block.id,
                propPath,
                type: "color",
                from: selectionRange.from,
                to: selectionRange.to,
                color: swatch.value,
              });
            }}
          />
        ))}
        {inlineTextMarkPalette.slice(0, 4).map((swatch) => (
          <button
            key={`highlight-${swatch.id}`}
            type="button"
            aria-label={`Apply ${swatch.label} highlight`}
            disabled={!selectionRange}
            title={`${swatch.label} highlight`}
            className="relative size-5 rounded border border-border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
            data-page-editor-text-highlight-swatch={swatch.id}
            style={{ backgroundColor: swatch.previewValue ?? swatch.value }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!selectionRange) return;
              onApplyTextMark({
                blockId: block.id,
                propPath,
                type: "highlight",
                from: selectionRange.from,
                to: selectionRange.to,
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
              if (!selectionRange) return;
              onApplyTextMark({
                blockId: block.id,
                propPath,
                type: "link",
                from: selectionRange.from,
                to: selectionRange.to,
                href: linkHref,
              });
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
