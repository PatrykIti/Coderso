import {
  useId,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import type {
  ScreenBlockV1,
  ScreenTabItem,
} from "../../../services/customScreens/customScreenSchemas";
import type { ScreenInsertTarget } from "../../../services/customScreens/screenDocumentOps";
import {
  builderTabSlot,
  insertTargetsEqual,
  resolveRovingTabIndex,
  type RenderBlockContext,
  type ScreenRuntimeContext,
} from "./screenRuntimeRendererModel";

export function useScreenRuntimeInteractions(context: ScreenRuntimeContext) {
  const rendererRootRef = useRef<HTMLDivElement>(null);
  const reactInstanceId = useId();
  const instanceId = reactInstanceId.replace(/[^a-zA-Z0-9_-]/g, "") || "root";
  const [localActiveTabByBlock, setLocalActiveTabByBlock] = useState<Record<string, string>>({});
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragHoverTarget, setDragHoverTarget] = useState<ScreenInsertTarget | null>(null);

  const canInsert = context.mode === "builder" && Boolean(context.onSetInsertPoint);
  const canDrag = context.mode === "builder" && Boolean(context.onDragMove);

  const setDragHover = (target: ScreenInsertTarget) =>
    setDragHoverTarget((previous) =>
      previous && insertTargetsEqual(previous, target) ? previous : target
    );

  const clearDragHover = (target: ScreenInsertTarget) =>
    setDragHoverTarget((previous) =>
      previous && insertTargetsEqual(previous, target) ? null : previous
    );

  const isDragHover = (target: ScreenInsertTarget) =>
    dragHoverTarget ? insertTargetsEqual(dragHoverTarget, target) : false;

  const clearDragState = () => {
    setDraggingBlockId(null);
    setDragHoverTarget(null);
  };

  const tabDomIds = (blockId: string, tabId: string) => {
    const identity = `b${blockId.length}-${blockId}-t${tabId.length}-${tabId}`;
    return {
      tab: `screen-tab-${instanceId}-${identity}`,
      panel: `screen-tabpanel-${instanceId}-${identity}`,
    };
  };

  const resolveActiveTab = (block: ScreenBlockV1, tabs: readonly ScreenTabItem[]) => {
    const requested =
      context.mode === "builder"
        ? builderTabSlot(block, tabs, context.insertPoint)
        : localActiveTabByBlock[block.id];
    return tabs.some((tab) => tab.id === requested) ? requested : (tabs[0]?.id ?? null);
  };

  const activateTab = (block: ScreenBlockV1, tabId: string, sectionId: string) => {
    if (context.mode === "builder") {
      context.onSetInsertPoint?.({
        kind: "slot-end",
        sectionId,
        parentId: block.id,
        slotId: tabId,
      });
      return;
    }
    setLocalActiveTabByBlock((state) =>
      state[block.id] === tabId ? state : { ...state, [block.id]: tabId }
    );
  };

  const focusTabWithinRenderer = (blockId: string, tabId: string) => {
    const targetId = tabDomIds(blockId, tabId).tab;
    queueMicrotask(() => {
      const root = rendererRootRef.current;
      if (!root) return;
      const target = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')).find(
        (element) => element.id === targetId
      );
      target?.focus();
    });
  };

  const onTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
    tabs: readonly ScreenTabItem[],
    block: ScreenBlockV1,
    sectionId: string
  ) => {
    const nextIndex = resolveRovingTabIndex(event.key, index, tabs.length);
    if (nextIndex === null) return;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    event.preventDefault();
    event.stopPropagation();
    activateTab(block, nextTab.id, sectionId);
    focusTabWithinRenderer(block.id, nextTab.id);
  };

  const dropHandlers = (target: ScreenInsertTarget) =>
    canDrag
      ? {
          onDragOver: (event: ReactDragEvent<HTMLElement>) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            setDragHover(target);
          },
          onDragLeave: () => clearDragHover(target),
          onDrop: (event: ReactDragEvent<HTMLElement>) => {
            event.preventDefault();
            event.stopPropagation();
            const blockId = event.dataTransfer?.getData("text/plain");
            clearDragState();
            if (blockId) context.onDragMove?.(blockId, target);
          },
        }
      : {};

  const resolveCardDropTarget = (
    event: ReactDragEvent<HTMLElement>,
    targets: NonNullable<RenderBlockContext["dropTargets"]>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? targets.before : targets.after;
  };

  const onCardDragOver = (
    event: ReactDragEvent<HTMLElement>,
    targets: NonNullable<RenderBlockContext["dropTargets"]>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    setDragHover(resolveCardDropTarget(event, targets));
  };

  const onCardDrop = (
    event: ReactDragEvent<HTMLElement>,
    targets: NonNullable<RenderBlockContext["dropTargets"]>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const blockId = event.dataTransfer?.getData("text/plain");
    const target = resolveCardDropTarget(event, targets);
    clearDragState();
    if (blockId) context.onDragMove?.(blockId, target);
  };

  const onBlockDragStart = (event: ReactDragEvent<HTMLElement>, blockId: string) => {
    event.stopPropagation();
    event.dataTransfer?.setData("text/plain", blockId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    setDraggingBlockId(blockId);
  };

  const interactions = {
    draggingBlockId,
    canInsert,
    canDrag,
    setDragHover,
    isDragHover,
    clearDragState,
    tabDomIds,
    resolveActiveTab,
    activateTab,
    onTabKeyDown,
    dropHandlers,
    onCardDragOver,
    onCardDrop,
    onBlockDragStart,
  };

  return [rendererRootRef, interactions] as const;
}

export type ScreenRuntimeInteractions = ReturnType<typeof useScreenRuntimeInteractions>[1];
