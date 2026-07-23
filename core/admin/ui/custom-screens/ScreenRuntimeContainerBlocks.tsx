import { Fragment } from "react";

import { cn } from "@/lib/utils";
import type {
  ScreenBlockV1,
  ScreenTabItem,
} from "../../../services/customScreens/customScreenSchemas";
import type { ScreenInsertTarget } from "../../../services/customScreens/screenDocumentOps";
import { ScreenRuntimeBlockFrame, ScreenRuntimeInsertGap } from "./ScreenRuntimeBlockFrame";
import { ScreenRuntimeLeafBlock } from "./ScreenRuntimeLeafBlocks";
import {
  insertTargetsEqual,
  readText,
  type RenderBlockContext,
  type ScreenRuntimeContext,
} from "./screenRuntimeRendererModel";
import type { ScreenRuntimeInteractions } from "./useScreenRuntimeInteractions";

type ScreenRuntimeBlockProps = {
  block: ScreenBlockV1;
  blockContext: RenderBlockContext;
  context: ScreenRuntimeContext;
  interactions: ScreenRuntimeInteractions;
};

type ScreenRuntimeSlotsProps = {
  block: ScreenBlockV1;
  blockContext: RenderBlockContext;
  context: ScreenRuntimeContext;
  interactions: ScreenRuntimeInteractions;
  columns?: boolean;
};

function ScreenRuntimeSlots({
  block,
  blockContext,
  context,
  interactions,
  columns,
}: ScreenRuntimeSlotsProps) {
  const slots = block.slots;
  if (!slots) return null;
  const entries = Object.entries(slots);
  if (entries.length === 0) return null;
  const showAffordances = context.mode === "builder" && !blockContext.suppressed;

  return (
    <div className={columns ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
      {entries.map(([slotId, blocks]) => {
        const slotEndTarget: ScreenInsertTarget = {
          kind: "slot-end",
          sectionId: blockContext.sectionId,
          parentId: block.id,
          slotId,
        };
        const armed =
          interactions.canInsert && context.insertPoint
            ? insertTargetsEqual(context.insertPoint, slotEndTarget)
            : false;
        const slotDragHover = showAffordances && interactions.isDragHover(slotEndTarget);
        const childDropTargets = (index: number): RenderBlockContext["dropTargets"] | undefined =>
          showAffordances
            ? {
                before: {
                  kind: "slot-index",
                  sectionId: blockContext.sectionId,
                  parentId: block.id,
                  slotId,
                  index,
                },
                after: {
                  kind: "slot-index",
                  sectionId: blockContext.sectionId,
                  parentId: block.id,
                  slotId,
                  index: index + 1,
                },
              }
            : undefined;

        return (
          <div
            key={slotId}
            className="min-w-0 space-y-3"
            data-screen-runtime-slot={slotId}
            {...(showAffordances ? interactions.dropHandlers(slotEndTarget) : {})}
          >
            {blocks.length > 0 ? (
              showAffordances ? (
                <>
                  {blocks.map((child, index) => (
                    <Fragment key={child.id}>
                      <ScreenRuntimeInsertGap
                        target={{
                          kind: "slot-index",
                          sectionId: blockContext.sectionId,
                          parentId: block.id,
                          slotId,
                          index,
                        }}
                        context={context}
                        interactions={interactions}
                      />
                      <ScreenRuntimeBlock
                        block={child}
                        blockContext={{
                          ...blockContext,
                          dropTargets: childDropTargets(index),
                        }}
                        context={context}
                        interactions={interactions}
                      />
                    </Fragment>
                  ))}
                  <ScreenRuntimeInsertGap
                    target={{
                      kind: "slot-index",
                      sectionId: blockContext.sectionId,
                      parentId: block.id,
                      slotId,
                      index: blocks.length,
                    }}
                    context={context}
                    interactions={interactions}
                  />
                </>
              ) : (
                blocks.map((child) => (
                  <ScreenRuntimeBlock
                    key={child.id}
                    block={child}
                    blockContext={{ ...blockContext, dropTargets: undefined }}
                    context={context}
                    interactions={interactions}
                  />
                ))
              )
            ) : showAffordances && interactions.canInsert ? (
              <button
                type="button"
                data-screen-slot-dropzone={slotId}
                data-insert-parent={block.id}
                data-armed={armed ? "true" : "false"}
                data-drag-hover={slotDragHover ? "true" : undefined}
                className={cn(
                  "w-full rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-left text-sm text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground",
                  armed && "border-primary ring-1 ring-primary",
                  !armed && slotDragHover && "border-primary bg-primary/10 text-foreground"
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  context.onSetInsertPoint?.(armed ? null : slotEndTarget);
                }}
                {...interactions.dropHandlers(slotEndTarget)}
              >
                Empty {slotId}
              </button>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                Empty {slotId}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScreenRuntimeTabs({
  block,
  blockContext,
  context,
  interactions,
}: ScreenRuntimeBlockProps) {
  const tabs = Array.isArray(block.data.tabs) ? (block.data.tabs as ScreenTabItem[]) : [];
  if (tabs.length === 0) {
    return (
      <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
        <p role="status" data-screen-tabs-empty="true" className="text-sm text-muted-foreground">
          No tabs available.
        </p>
      </div>
    );
  }
  const activeTabId = interactions.resolveActiveTab(block, tabs);

  return (
    <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
      <div
        className="flex flex-wrap gap-2 border-b border-border pb-2"
        role="tablist"
        aria-label={readText(block.data, "label", "Tabs")}
      >
        {tabs.map((tab, index) => {
          const ids = interactions.tabDomIds(block.id, tab.id);
          const active = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={ids.tab}
              aria-controls={ids.panel}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                active ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
              onClick={(event) => {
                event.stopPropagation();
                interactions.activateTab(block, tab.id, blockContext.sectionId);
              }}
              onKeyDown={(event) =>
                interactions.onTabKeyDown(event, index, tabs, block, blockContext.sectionId)
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => {
        const ids = interactions.tabDomIds(block.id, tab.id);
        const active = activeTabId === tab.id;
        const slotBlocks = block.slots?.[tab.id] ?? [];
        const showAffordances = context.mode === "builder" && !blockContext.suppressed;
        const tabEndTarget: ScreenInsertTarget = {
          kind: "slot-end",
          sectionId: blockContext.sectionId,
          parentId: block.id,
          slotId: tab.id,
        };
        const tabArmed =
          interactions.canInsert && context.insertPoint
            ? insertTargetsEqual(context.insertPoint, tabEndTarget)
            : false;
        const tabDragHover = showAffordances && interactions.isDragHover(tabEndTarget);
        const tabChildDropTargets = (
          childIndex: number
        ): RenderBlockContext["dropTargets"] | undefined =>
          showAffordances
            ? {
                before: {
                  kind: "slot-index",
                  sectionId: blockContext.sectionId,
                  parentId: block.id,
                  slotId: tab.id,
                  index: childIndex,
                },
                after: {
                  kind: "slot-index",
                  sectionId: blockContext.sectionId,
                  parentId: block.id,
                  slotId: tab.id,
                  index: childIndex + 1,
                },
              }
            : undefined;

        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={ids.panel}
            aria-labelledby={ids.tab}
            hidden={!active}
            tabIndex={0}
            className="mt-3 space-y-3"
            data-screen-runtime-tab={tab.id}
            {...(showAffordances ? interactions.dropHandlers(tabEndTarget) : {})}
          >
            {slotBlocks.length > 0 ? (
              showAffordances ? (
                <>
                  {slotBlocks.map((child, childIndex) => (
                    <Fragment key={child.id}>
                      <ScreenRuntimeInsertGap
                        target={{
                          kind: "slot-index",
                          sectionId: blockContext.sectionId,
                          parentId: block.id,
                          slotId: tab.id,
                          index: childIndex,
                        }}
                        context={context}
                        interactions={interactions}
                      />
                      <ScreenRuntimeBlock
                        block={child}
                        blockContext={{
                          ...blockContext,
                          dropTargets: tabChildDropTargets(childIndex),
                        }}
                        context={context}
                        interactions={interactions}
                      />
                    </Fragment>
                  ))}
                  <ScreenRuntimeInsertGap
                    target={{
                      kind: "slot-index",
                      sectionId: blockContext.sectionId,
                      parentId: block.id,
                      slotId: tab.id,
                      index: slotBlocks.length,
                    }}
                    context={context}
                    interactions={interactions}
                  />
                </>
              ) : (
                slotBlocks.map((child) => (
                  <ScreenRuntimeBlock
                    key={child.id}
                    block={child}
                    blockContext={{ ...blockContext, dropTargets: undefined }}
                    context={context}
                    interactions={interactions}
                  />
                ))
              )
            ) : showAffordances && interactions.canInsert ? (
              <button
                type="button"
                data-screen-slot-dropzone={tab.id}
                data-insert-parent={block.id}
                data-armed={tabArmed ? "true" : "false"}
                data-drag-hover={tabDragHover ? "true" : undefined}
                className={cn(
                  "w-full rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-left text-sm text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground",
                  tabArmed && "border-primary ring-1 ring-primary",
                  !tabArmed && tabDragHover && "border-primary bg-primary/10 text-foreground"
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  context.onSetInsertPoint?.(tabArmed ? null : tabEndTarget);
                }}
                {...interactions.dropHandlers(tabEndTarget)}
              >
                Empty {tab.label}
              </button>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                Empty {tab.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ScreenRuntimeBlock({
  block,
  blockContext,
  context,
  interactions,
}: ScreenRuntimeBlockProps) {
  const childContext: RenderBlockContext = {
    sectionId: blockContext.sectionId,
    suppressed: blockContext.suppressed || interactions.draggingBlockId === block.id,
  };

  let content;
  if (block.type === "field-group") {
    content = (
      <section className={cn("p-4", context.mode === "preview" && "rounded-xl border bg-card")}>
        <div className="mb-4">
          <h3 className="text-base font-semibold">{readText(block.data, "title", "Group")}</h3>
          {readText(block.data, "description") ? (
            <p className="text-sm text-muted-foreground">{readText(block.data, "description")}</p>
          ) : null}
        </div>
        <ScreenRuntimeSlots
          block={block}
          blockContext={childContext}
          context={context}
          interactions={interactions}
        />
      </section>
    );
  } else if (block.type === "columns") {
    content = (
      <div className={cn("p-4", context.mode === "preview" && "rounded-xl border bg-card")}>
        <ScreenRuntimeSlots
          block={block}
          blockContext={childContext}
          context={context}
          interactions={interactions}
          columns
        />
      </div>
    );
  } else if (block.type === "tabs") {
    content = (
      <ScreenRuntimeTabs
        block={block}
        blockContext={childContext}
        context={context}
        interactions={interactions}
      />
    );
  } else {
    content = <ScreenRuntimeLeafBlock block={block} context={context} />;
  }

  return (
    <ScreenRuntimeBlockFrame
      block={block}
      blockContext={blockContext}
      context={context}
      interactions={interactions}
    >
      {content}
    </ScreenRuntimeBlockFrame>
  );
}
