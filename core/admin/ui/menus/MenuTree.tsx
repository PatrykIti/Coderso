import type { DragEvent, ReactElement } from "react";
import { useState } from "react";

import type { MenuItemDisplay } from "@/ui/menus/types";
import { MenuItemRow } from "@/ui/menus/MenuItemRow";

export type MenuDropIntent = "sibling" | "child";

const INDENT_THRESHOLD = 36;
const CLICK_SUPPRESS_MS = 250;

const resolveDropIntent = (event: DragEvent<HTMLDivElement>): MenuDropIntent => {
  const rect = event.currentTarget.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  return offsetX > INDENT_THRESHOLD ? "child" : "sibling";
};

const renderTree = (
  items: MenuItemDisplay[],
  depth: number,
  activeId: string | null,
  dragId: string | null,
  hoverId: string | null,
  hoverIntent: MenuDropIntent,
  onSelect: (item: MenuItemDisplay, eventTimeStamp: number) => void,
  onEdit: (item: MenuItemDisplay) => void,
  onDelete: (item: MenuItemDisplay) => void,
  onMove: (dragId: string, targetId: string, intent: MenuDropIntent) => void,
  setDragId: (value: string | null) => void,
  setHoverId: (value: string | null) => void,
  setHoverIntent: (value: MenuDropIntent) => void,
  markDrag: (eventTimeStamp: number) => void
): ReactElement[] =>
  items.flatMap((item): ReactElement[] => [
    <MenuItemRow
      key={item.id}
      item={item}
      depth={depth}
      active={item.id === activeId}
      isDragTarget={hoverId === item.id && dragId !== null}
      dropIntent={hoverId === item.id ? hoverIntent : null}
      onSelect={onSelect}
      onEdit={onEdit}
      onDelete={onDelete}
      onDragStart={(dragItem, event) => {
        markDrag(event.timeStamp);
        setDragId(dragItem.id);
      }}
      onDragEnd={(event) => {
        markDrag(event.timeStamp);
        setDragId(null);
        setHoverId(null);
        setHoverIntent("sibling");
      }}
      onDragOver={(hovered, event) => {
        if (!dragId) return;
        setHoverId(hovered.id);
        setHoverIntent(resolveDropIntent(event));
      }}
      onDrop={(target, event) => {
        if (!dragId || dragId === target.id) return;
        markDrag(event.timeStamp);
        onMove(dragId, target.id, hoverIntent);
        setDragId(null);
        setHoverId(null);
        setHoverIntent("sibling");
      }}
    />,
    ...(item.children
      ? renderTree(
          item.children,
          depth + 1,
          activeId,
          dragId,
          hoverId,
          hoverIntent,
          onSelect,
          onEdit,
          onDelete,
          onMove,
          setDragId,
          setHoverId,
          setHoverIntent,
          markDrag
        )
      : []),
  ]);

type MenuTreeProps = {
  items: MenuItemDisplay[];
  activeId: string | null;
  onSelect: (item: MenuItemDisplay) => void;
  onEdit: (item: MenuItemDisplay) => void;
  onDelete: (item: MenuItemDisplay) => void;
  onMove: (dragId: string, targetId: string, intent: MenuDropIntent) => void;
  onMoveToRoot: (dragId: string, position: "start" | "end") => void;
};

export function MenuTree({
  items,
  activeId,
  onSelect,
  onEdit,
  onDelete,
  onMove,
  onMoveToRoot,
}: MenuTreeProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverIntent, setHoverIntent] = useState<MenuDropIntent>("sibling");
  const [suppressClickUntil, setSuppressClickUntil] = useState(0);
  const [rootDrop, setRootDrop] = useState<"start" | "end" | null>(null);

  const markDrag = (eventTimeStamp: number) => {
    setSuppressClickUntil(eventTimeStamp + CLICK_SUPPRESS_MS);
  };

  const handleSelect = (item: MenuItemDisplay, eventTimeStamp: number) => {
    if (eventTimeStamp < suppressClickUntil) return;
    onSelect(item);
  };

  const handleRootDragOver = (event: DragEvent<HTMLDivElement>, position: "start" | "end") => {
    if (!dragId) return;
    event.preventDefault();
    setRootDrop(position);
  };

  const handleRootDrop = (event: DragEvent<HTMLDivElement>, position: "start" | "end") => {
    if (!dragId) return;
    event.preventDefault();
    markDrag(event.timeStamp);
    onMoveToRoot(dragId, position);
    setDragId(null);
    setHoverId(null);
    setHoverIntent("sibling");
    setRootDrop(null);
  };

  return (
    <div className="space-y-3">
      {dragId ? (
        <div
          className={
            rootDrop === "start"
              ? "rounded-lg border border-dashed border-primary/60 bg-primary/5 px-3 py-2 text-xs text-primary"
              : "rounded-lg border border-dashed border-muted-foreground/40 px-3 py-2 text-xs text-muted-foreground"
          }
          onDragOver={(event) => handleRootDragOver(event, "start")}
          onDragLeave={() => setRootDrop(null)}
          onDrop={(event) => handleRootDrop(event, "start")}
        >
          Drop here to move to top level
        </div>
      ) : null}

      {renderTree(
        items,
        0,
        activeId,
        dragId,
        hoverId,
        hoverIntent,
        handleSelect,
        onEdit,
        onDelete,
        onMove,
        setDragId,
        setHoverId,
        setHoverIntent,
        markDrag
      )}

      {dragId ? (
        <div
          className={
            rootDrop === "end"
              ? "rounded-lg border border-dashed border-primary/60 bg-primary/5 px-3 py-2 text-xs text-primary"
              : "rounded-lg border border-dashed border-muted-foreground/40 px-3 py-2 text-xs text-muted-foreground"
          }
          onDragOver={(event) => handleRootDragOver(event, "end")}
          onDragLeave={() => setRootDrop(null)}
          onDrop={(event) => handleRootDrop(event, "end")}
        >
          Drop here to move to top level
        </div>
      ) : null}
    </div>
  );
}
