import type { CSSProperties, ReactNode } from "react";

import { getPageBlockActiveSlotKeys } from "./pageDocumentV2Contract";
import type { PageBlockSlotKey, PageBlockV2 } from "./pageDocumentV2Types";
import { serializePageBlockPath, type PageBlockPath } from "./pageBlockPaths";
import { PAGE_MARQUEE_REPLICA_ATTRIBUTE } from "./pageCompositionEffects";
import {
  collectPageReplicaIdentitySets,
  createPageMarqueeReplicaNamespace,
  isPageMarqueeReplicaSafeSubtree,
  type PageReplicaIdentityContext,
} from "./pageRendererReplicaIdentity";
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
      // ── TASK-539-05-L01 ──
      // - `section` rides through unchanged (placement consumers / reveal).
      // - Nested slot children are NEVER direct grid items: spanTarget "none"
      //   suppresses span + PAGE_BLOCK_GRID_ITEM_ATTRIBUTE on every nested
      //   frame (TASK-539-03-L05 classifies every nested path as "none").
      // - The reveal host flag propagates so EVERY block under a revealing
      //   section (root + nested) composes its per-child reveal through the
      //   one formula.
      // - The replica identity context rides through every nested active-slot
      //   render so ids/refs/hooks are namespaced below the approved replica.
      section: context.section,
      spanTarget: "none",
      transformHost: context.transformHost,
      replicaIdentity: context.replicaIdentity,
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
 * TASK-539-05-L01 — the approved replica's styling frame. It re-applies the
 * block's VISUAL frame styling (className + style) plus the replica-aware
 * data hooks: the STYLE-SCOPE id (`PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE`)
 * replaces `data-block-id` (so the runtime `[data-page-block]` queries inside
 * the marquee group still resolve while the replicated node never claims the
 * canonical id / Admin selection target), and the frameAttrs (deco/hover/
 * tilt/magnetic/... ) ride through unchanged for visual parity. No blanket
 * descendant `tabIndex`/`disabled` mutation: the replica segment's native
 * `inert` owns focus/activation suppression.
 */
const renderMarqueeReplicaFrame: PageBlockFrameRenderer = ({ content, renderProps }) => (
  <div className={renderProps.className} style={renderProps.style} {...renderProps.dataAttributes}>
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
                section: context.section,
                transformHost: context.transformHost,
                replicaIdentity: context.replicaIdentity,
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
                      section: context.section,
                      transformHost: context.transformHost,
                      replicaIdentity: context.replicaIdentity,
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
    // ── TASK-539-05-L01 ── marquee/ticker (absorbing 522-05-L04 + 539-04):
    // when style.marquee is set, render the group's slot children inside a
    // `.cx-marquee-viewport > .cx-marquee-rail` strip; the animation binds the
    // RAIL by class (539-04 composition CSS) so the overflow:hidden viewport
    // stays put while the rail scrolls, and segments are nonshrinking
    // (`flex:0 0 auto`). The block FRAME carries data-marquee + speed/dir
    // (539-04 resolver) — the outer authored group's ONE canonical frame
    // remains OUTSIDE both segments, so a legal root grid target never
    // duplicates.
    //
    // Seamless replica: `seamless:true` PLUS a fail-closed safe child subtree
    // (`isPageMarqueeReplicaSafeSubtree`, evaluated on the outer group's
    // normalized active-slot children only — the owner group itself is never
    // passed, its own style.marquee is expected) renders ONE rail with TWO
    // equal adjacent segments. The replica segment carries ONLY the owner
    // marker `[data-page-marquee-replica]=""`, `aria-hidden="true"`, and the
    // native `inert` attribute/property; every descendant ID/reference/hook is
    // namespaced through the deterministic replica identity context, and the
    // style-scope id replaces `data-block-id` on each replica frame. ANY
    // unsafe direct/deep descendant, nested authored marquee, or non-seamless
    // marquee renders the same ONE-RAIL/ONE-CANONICAL-SEGMENT fallback: no
    // marker, no namespace, no clone render, no secondary runtime surface —
    // a fail-closed visual degradation, never an error or document rewrite.
    const marquee = block.style?.marquee;
    if (marquee) {
      const slotChildren = block.slots?.[slotKey] ?? [];
      const replicaSafe =
        marquee.seamless === true &&
        isPageMarqueeReplicaSafeSubtree(slotChildren, {
          includeHiddenBlocks: context.includeHiddenBlocks,
        });
      const replicaContext: PageReplicaIdentityContext | undefined = replicaSafe
        ? {
            namespace: createPageMarqueeReplicaNamespace(
              block.id,
              serializePageBlockPath(context.blockPath)
            ),
            ...(() => {
              const sets = collectPageReplicaIdentitySets(slotChildren, {
                includeHiddenBlocks: context.includeHiddenBlocks,
              });
              return { domIds: sets.domIds, hookIdentifiers: sets.hookIdentifiers };
            })(),
            inert: true,
          }
        : undefined;
      const renderTrackChildren = (frame: boolean, replica?: PageReplicaIdentityContext) =>
        renderPageBlockList(slotChildren, {
          parentPath: context.blockPath,
          depth: context.depth + 1,
          includeHiddenBlocks: context.includeHiddenBlocks,
          // Primary segment keeps the real (canvas or runtime) frame so items
          // stay selectable/targetable; the approved replica segment uses the
          // styling frame (style-scope id, no duplicate selection target).
          renderBlockFrame: frame ? context.renderBlockFrame : renderMarqueeReplicaFrame,
          renderInlineText: context.renderInlineText,
          renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
          runtimeDataByBlockId: context.runtimeDataByBlockId,
          layoutMode: context.layoutMode,
          renderBlockWithFrame: context.renderBlockWithFrame,
          slotKey,
          parentBlock: block,
          section: context.section,
          transformHost: context.transformHost,
          replicaIdentity: replica,
        });
      return (
        <div className="cx-marquee-viewport">
          <div className="cx-marquee-rail">
            <div className="cx-marquee-segment">{renderTrackChildren(true)}</div>
            {replicaContext ? (
              <div
                className="cx-marquee-segment"
                {...{ [PAGE_MARQUEE_REPLICA_ATTRIBUTE]: "" }}
                aria-hidden="true"
                inert={true}
              >
                {renderTrackChildren(false, replicaContext)}
              </div>
            ) : null}
          </div>
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
        section: context.section,
        transformHost: context.transformHost,
        replicaIdentity: context.replicaIdentity,
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
      section: context.section,
      transformHost: context.transformHost,
      replicaIdentity: context.replicaIdentity,
    }),
  });
};
