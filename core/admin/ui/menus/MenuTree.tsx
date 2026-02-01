import type { ReactElement } from "react";
import { useState } from "react";

import type { MenuItemDisplay } from "@/ui/menus/types";
import { MenuItemRow } from "@/ui/menus/MenuItemRow";

const renderTree = (
  items: MenuItemDisplay[],
  depth: number,
  activeId: string | null,
  dragId: string | null,
  hoverId: string | null,
  onSelect: (item: MenuItemDisplay) => void,
  onEdit: (item: MenuItemDisplay) => void,
  onDelete: (item: MenuItemDisplay) => void,
  onMove: (dragId: string, targetId: string) => void,
  setDragId: (value: string | null) => void,
  setHoverId: (value: string | null) => void
): ReactElement[] =>
  items.flatMap((item): ReactElement[] => [
    <MenuItemRow
      key={item.id}
      item={item}
      depth={depth}
      active={item.id === activeId}
      isDragTarget={hoverId === item.id && dragId !== null}
      onSelect={onSelect}
      onEdit={onEdit}
      onDelete={onDelete}
      onDragStart={(dragItem) => {
        setDragId(dragItem.id);
      }}
      onDragEnd={() => {
        setDragId(null);
        setHoverId(null);
      }}
      onDragOver={(hovered) => {
        if (dragId) setHoverId(hovered.id);
      }}
      onDrop={(target) => {
        if (!dragId || dragId === target.id) return;
        onMove(dragId, target.id);
        setDragId(null);
        setHoverId(null);
      }}
    />,
    ...(item.children
      ? renderTree(
          item.children,
          depth + 1,
          activeId,
          dragId,
          hoverId,
          onSelect,
          onEdit,
          onDelete,
          onMove,
          setDragId,
          setHoverId
        )
      : []),
  ]);

type MenuTreeProps = {
  items: MenuItemDisplay[];
  activeId: string | null;
  onSelect: (item: MenuItemDisplay) => void;
  onEdit: (item: MenuItemDisplay) => void;
  onDelete: (item: MenuItemDisplay) => void;
  onMove: (dragId: string, targetId: string) => void;
};

export function MenuTree({
  items,
  activeId,
  onSelect,
  onEdit,
  onDelete,
  onMove,
}: MenuTreeProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {renderTree(
        items,
        0,
        activeId,
        dragId,
        hoverId,
        onSelect,
        onEdit,
        onDelete,
        onMove,
        setDragId,
        setHoverId
      )}
    </div>
  );
}
