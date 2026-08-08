import type { CSSProperties, ReactNode } from "react";

import { getPageBlockActiveSlotKeys } from "./pageDocumentV2Contract";
import type { PageBlockSlotKey, PageBlockV2 } from "./pageDocumentV2Types";
import type { PageBlockPath } from "./pageBlockPaths";
import {
  joinPageRenderClasses,
  readBoolean,
  readNumber,
  type PageBlockFrameRenderer,
  type PageBlockRenderContext,
  type PageBlockWithFrameRenderer,
} from "./pageRendererV2Contract";

type RecursivePageBlockRenderContext = PageBlockRenderContext & {
  renderBlockWithFrame: PageBlockWithFrameRenderer;
};
function FragmentLike({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const createChildBlockPath = (
  parentPath: PageBlockPath,
  slotKey: PageBlockSlotKey,
  index: number
): PageBlockPath => [...parentPath, { slotKey, index }] as PageBlockPath;

const pageColumnsSlotGridStyle = (block: PageBlockV2): CSSProperties => {
  const count = Math.max(1, Math.min(4, Math.trunc(readNumber(block.props.count, 2))));
  const distribution = block.props.distribution === "auto" ? "auto" : "equal";
  return {
    gap: `${readNumber(block.props.gap, 24)}px`,
    gridTemplateColumns:
      distribution === "auto"
        ? `repeat(${count}, minmax(0, auto))`
        : `repeat(${count}, minmax(0, 1fr))`,
  };
};

export const renderPageBlockList = (
  blocks: readonly PageBlockV2[],
  context: Omit<
    RecursivePageBlockRenderContext,
    "blockPath" | "depth" | "slotKey" | "parentBlock"
  > & {
    parentPath: PageBlockPath;
    depth: number;
    slotKey: PageBlockSlotKey;
    parentBlock: PageBlockV2;
  }
) => {
  const visibleBlocks = context.includeHiddenBlocks
    ? blocks
    : blocks.filter((block) => block.visibility.visible);
  return visibleBlocks.map((block, index) =>
    context.renderBlockWithFrame(block, {
      blockPath: createChildBlockPath(context.parentPath, context.slotKey, index),
      depth: context.depth,
      includeHiddenBlocks: context.includeHiddenBlocks,
      renderBlockFrame: context.renderBlockFrame,
      renderInlineText: context.renderInlineText,
      renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
      runtimeDataByBlockId: context.runtimeDataByBlockId,
      layoutMode: context.layoutMode,
      slotKey: context.slotKey,
      parentBlock: context.parentBlock,
    })
  );
};

const renderSlotWrapper = ({
  block,
  slotKey,
  children,
  className,
  style,
}: {
  block: PageBlockV2;
  slotKey: PageBlockSlotKey;
  children: ReactNode;
  className: string;
  style?: CSSProperties;
}) => (
  <div
    className={className}
    style={style}
    data-page-block-slot={slotKey}
    data-page-block-slot-owner={block.id}
  >
    {children}
  </div>
);

/**
 * TASK-522-05-L04 — the seamless marquee's decorative DUPLICATE track frame. It
 * re-applies the block's VISUAL frame styling (className + style) so the ticker
 * copy looks identical, but emits NO `data-block-id` / selection chrome, so each
 * item's `data-block-id` matches exactly ONE DOM node in the builder canvas
 * (finding 3). NOTE: the leaf pseudocode passed `renderBlockFrame: undefined`
 * here, but that falls through to the runtime `PageBlockFrame`, which DOES emit
 * `data-block-id` (defeating the stated invariant); a styling-only frameless copy
 * is the faithful realization of that intent — no duplicate selection targets.
 */
const renderMarqueeCopyFrame: PageBlockFrameRenderer = ({ content, renderProps }) => (
  <div className={renderProps.className} style={renderProps.style}>
    {content}
  </div>
);

export const renderPageLayoutBlockContent = (
  block: PageBlockV2,
  context: RecursivePageBlockRenderContext
): ReactNode => {
  const slotKeys = getPageBlockActiveSlotKeys(block);
  if (slotKeys.length === 0) return null;

  // Layered canvas (TASK-522-05-L02): a layout block with style.composition ===
  // "layered" becomes a positioning context (data-composition="layered" already
  // stamped on the block FRAME by the 522-03 resolver + position:relative from
  // 522-01-L04 CSS), so its slot children — each carrying data-layer +
  // --layer-x/y/z from the frame resolver — position absolutely. Render the SAME
  // slot lists through a plain (NON flex/grid) pass-through wrapper so the flow
  // track styles do not fight the absolute children. "flow"/unset falls through
  // to the byte-identical columns/group/default flow branches below.
  if (block.style?.composition === "layered") {
    return (
      <div className="cx-layered-canvas" data-page-layout-block={block.type}>
        {slotKeys.map((slotKey) => (
          <FragmentLike key={slotKey}>
            {renderSlotWrapper({
              block,
              slotKey,
              className: "cx-layered-slot",
              children: renderPageBlockList(block.slots?.[slotKey] ?? [], {
                parentPath: context.blockPath,
                depth: context.depth + 1,
                includeHiddenBlocks: context.includeHiddenBlocks,
                renderBlockFrame: context.renderBlockFrame,
                renderInlineText: context.renderInlineText,
                renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
                runtimeDataByBlockId: context.runtimeDataByBlockId,
                layoutMode: context.layoutMode,
                renderBlockWithFrame: context.renderBlockWithFrame,
                slotKey,
                parentBlock: block,
              }),
            })}
          </FragmentLike>
        ))}
      </div>
    );
  }

  if (block.type === "columns") {
    return (
      <div
        className="grid w-full"
        style={pageColumnsSlotGridStyle(block)}
        data-page-layout-block="columns"
        data-page-layout-columns-count={slotKeys.length}
      >
        {slotKeys.map((slotKey) => {
          const slotChildren = block.slots?.[slotKey] ?? [];
          return (
            <FragmentLike key={slotKey}>
              {renderSlotWrapper({
                block,
                slotKey,
                className: "min-w-0 space-y-4",
                children: (
                  <>
                    {renderPageBlockList(slotChildren, {
                      parentPath: context.blockPath,
                      depth: context.depth + 1,
                      includeHiddenBlocks: context.includeHiddenBlocks,
                      renderBlockFrame: context.renderBlockFrame,
                      renderInlineText: context.renderInlineText,
                      renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
                      runtimeDataByBlockId: context.runtimeDataByBlockId,
                      layoutMode: context.layoutMode,
                      renderBlockWithFrame: context.renderBlockWithFrame,
                      slotKey,
                      parentBlock: block,
                    })}
                    {context.renderColumnsSlotTrailing?.({
                      block,
                      slotKey,
                      ownerPath: context.blockPath,
                      childCount: slotChildren.length,
                    })}
                  </>
                ),
              })}
            </FragmentLike>
          );
        })}
      </div>
    );
  }

  const slotKey = slotKeys[0]!;
  if (block.type === "group") {
    // Marquee/ticker (TASK-522-05-L04): when style.marquee is set (a speed
    // present), render the group's slot children inside a
    // .cx-marquee-viewport > .cx-marquee-track strip. The block FRAME already
    // carries data-marquee + --marquee-speed + data-marquee-dir (522-03
    // resolver); the animation binds .cx-marquee-track by CLASS (522-01-L04) so
    // the overflow:hidden viewport stays put while the track scrolls. When
    // `seamless`, a SECOND aria-hidden track is rendered WITHOUT block frames
    // (renderBlockFrame omitted) so the decorative copy carries NO
    // [data-block-id] / selection chrome in the builder canvas. No marquee ⇒
    // the flow flex branch below stays byte-identical.
    const marquee = block.style?.marquee;
    if (marquee) {
      const renderTrackChildren = (frame: boolean) =>
        renderPageBlockList(block.slots?.[slotKey] ?? [], {
          parentPath: context.blockPath,
          depth: context.depth + 1,
          includeHiddenBlocks: context.includeHiddenBlocks,
          // Primary track keeps the real (canvas or runtime) frame so items stay
          // selectable/targetable; the seamless copy uses the decorative frame
          // (styling only, NO data-block-id) so it is not a duplicate selection
          // target (finding 3).
          renderBlockFrame: frame ? context.renderBlockFrame : renderMarqueeCopyFrame,
          renderInlineText: context.renderInlineText,
          renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
          runtimeDataByBlockId: context.runtimeDataByBlockId,
          layoutMode: context.layoutMode,
          renderBlockWithFrame: context.renderBlockWithFrame,
          slotKey,
          parentBlock: block,
        });
      return (
        <div className="cx-marquee-viewport">
          <div className="cx-marquee-track">{renderTrackChildren(true)}</div>
          {marquee.seamless ? (
            <div className="cx-marquee-track" aria-hidden="true">
              {renderTrackChildren(false)}
            </div>
          ) : null}
        </div>
      );
    }
    const direction = block.props.direction === "row" ? "row" : "column";
    return renderSlotWrapper({
      block,
      slotKey,
      className: joinPageRenderClasses(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        readBoolean(block.props.wrap, false) ? "flex-wrap" : undefined
      ),
      style: { gap: `${readNumber(block.props.gap, 16)}px` },
      children: renderPageBlockList(block.slots?.[slotKey] ?? [], {
        parentPath: context.blockPath,
        depth: context.depth + 1,
        includeHiddenBlocks: context.includeHiddenBlocks,
        renderBlockFrame: context.renderBlockFrame,
        renderInlineText: context.renderInlineText,
        renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
        runtimeDataByBlockId: context.runtimeDataByBlockId,
        layoutMode: context.layoutMode,
        renderBlockWithFrame: context.renderBlockWithFrame,
        slotKey,
        parentBlock: block,
      }),
    });
  }

  return renderSlotWrapper({
    block,
    slotKey,
    className: "space-y-4",
    children: renderPageBlockList(block.slots?.[slotKey] ?? [], {
      parentPath: context.blockPath,
      depth: context.depth + 1,
      includeHiddenBlocks: context.includeHiddenBlocks,
      renderBlockFrame: context.renderBlockFrame,
      renderInlineText: context.renderInlineText,
      renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
      runtimeDataByBlockId: context.runtimeDataByBlockId,
      layoutMode: context.layoutMode,
      renderBlockWithFrame: context.renderBlockWithFrame,
      slotKey,
      parentBlock: block,
    }),
  });
};
