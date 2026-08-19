import { Plus } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  type PageBlockV2,
  type PageBreakpoint,
  type PageSectionV2,
} from "../../../../services/pages/pageDocumentV2";
import {
  getPageBlockAtPath,
  isSamePageBlockPath,
  serializePageBlockPath,
  type PageBlockInsertTarget,
  type PageBlockPath,
} from "../../../../services/pages/pageBlockPaths";
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
import { adminBrandColorCssVariableMap } from "../../../../ui/theme/tokenCss";
import {
  editorCanvasCtaButtonClass,
  editorCanvasGhostBesideHandleClass,
  editorCanvasGhostTileClass,
  editorCanvasGhostTileCompactClass,
} from "../editorControls/controlChrome";
import { formatSlotLabel, getBlockDisplayLabel } from "./pageEditorLabels";
import {
  InlineEditableCanvasText,
  type PageEditorInlineEditCommit,
  type PageEditorInlineEditTarget,
  type PageEditorMarkToolbarDock,
  type PageEditorTextMarkCommit,
} from "./PageAuthoringCanvasInline";

// Facade re-export of the inline text/mark-toolbar contract so `PageEditor.tsx`
// and the editor tests keep importing every public type from this unchanged
// module path (no export-star). The inline-edit surface itself lives in
// `PageAuthoringCanvasInline.tsx` (TASK-481-01-L01 split).
export type {
  PageEditorInlineEditCommit,
  PageEditorInlineEditTarget,
  PageEditorMarkToolbarDock,
  PageEditorTextColorMarkCommit,
  PageEditorTextMarkCommit,
} from "./PageAuthoringCanvasInline";

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
  markToolbarDock,
  onMarkToolbarDockChange,
  onSelect,
  onSelectBlock,
  onAddBlock,
  onAddBlockToTarget,
  onAddBlockBeside,
  onStartInlineEdit,
  onCommitInlineEdit,
  onApplyTextMark,
  contentBrandTokenVariables,
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
  markToolbarDock?: PageEditorMarkToolbarDock;
  onMarkToolbarDockChange?: (dock: PageEditorMarkToolbarDock) => void;
  onSelect: () => void;
  onSelectBlock: (blockPath: PageBlockPath) => void;
  onAddBlock: () => void;
  onAddBlockToTarget: (target: PageBlockInsertTarget, options?: { column?: number }) => void;
  onAddBlockBeside: () => void;
  onStartInlineEdit: (target: PageEditorInlineEditTarget) => void;
  onCommitInlineEdit: (commit: PageEditorInlineEditCommit) => void;
  onApplyTextMark: (commit: PageEditorTextMarkCommit) => void;
  contentBrandTokenVariables: CSSProperties;
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
      style={adminBrandColorCssVariableMap as CSSProperties}
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
      {/* TASK-481-01-L01: section-level content scope. The section chrome badges
          above stay on the <section> (admin cascade); the rendered section
          content sits inside this scope so the 481-02 brand-token emission can
          define the SITE brand vars here without recoloring chrome. */}
      <div data-page-editor-content="true" style={contentBrandTokenVariables}>
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
              markToolbarDock={markToolbarDock}
              onMarkToolbarDockChange={onMarkToolbarDockChange}
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
            // TASK-481-01-L01: split the frame style into the BLOCK BRAND VISUAL
            // surface (moved onto the content scope so 481-02 can emit the site
            // brand var map there) and the FRAME LAYOUT surface
            // (padding/margin/textAlign + composition/span/custom props), keeping
            // the chrome outline/ring/badges on the admin cascade. For
            // isPageBlockVisualElementType blocks `toPageBlockStyle` is
            // layout-only, so the visual surface is empty and the split is a
            // no-op (the brand lives on the inner element inside `content`).
            const {
              color,
              backgroundColor,
              backgroundImage,
              backgroundSize,
              backgroundPosition,
              borderColor,
              borderStyle,
              borderWidth,
              borderRadius,
              boxShadow,
              opacity,
              ...frameLayoutStyle
            } = blockRenderProps.style;
            const contentVisualStyle = {
              color,
              backgroundColor,
              backgroundImage,
              backgroundSize,
              backgroundPosition,
              borderColor,
              borderStyle,
              borderWidth,
              borderRadius,
              boxShadow,
              opacity,
            };
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
                style={{ ...adminBrandColorCssVariableMap, ...frameLayoutStyle } as CSSProperties}
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
                {/* TASK-481-01-L01: block content scope. Chrome (override badge,
                    add-beside handle, outline/ring) stays on the frame; the block
                    content and its brand visual style live in this scope. */}
                <div
                  data-page-editor-content="true"
                  style={{ ...contentBrandTokenVariables, ...contentVisualStyle }}
                >
                  {block.visibility.visible ? content : <HiddenBlockGhost block={block} />}
                </div>
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
      </div>
    </section>
  );
};
