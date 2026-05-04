import type { DragEvent, MutableRefObject, ReactElement } from "react";
import { useRef, useState } from "react";

import { resolveMenuDropIntent, type MenuDropIntent } from "@/ui/menus/menuDnD";
import type { MenuItemDisplay } from "@/ui/menus/types";
import { MenuItemRow, type MenuKeyboardAction } from "@/ui/menus/MenuItemRow";

export type { MenuDropIntent } from "@/ui/menus/menuDnD";

const CLICK_SUPPRESS_MS = 250;

const setMoveDropEffect = (event: DragEvent<HTMLElement>) => {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
};

const buildKeyboardActions = ({
  item,
  siblings,
  parent,
  onMove,
}: {
  item: MenuItemDisplay;
  siblings: MenuItemDisplay[];
  parent: MenuItemDisplay | null;
  onMove: (dragId: string, targetId: string, intent: MenuDropIntent) => void;
}): MenuKeyboardAction[] => {
  const index = siblings.findIndex((entry) => entry.id === item.id);
  const previousSibling = index > 0 ? siblings[index - 1] : null;
  const nextSibling = index >= 0 ? siblings[index + 1] : null;

  return [
    {
      id: "move-up",
      label: "Move up",
      disabled: !previousSibling,
      onSelect: () => {
        if (previousSibling) onMove(item.id, previousSibling.id, "before");
      },
    },
    {
      id: "move-down",
      label: "Move down",
      disabled: !nextSibling,
      onSelect: () => {
        if (nextSibling) onMove(item.id, nextSibling.id, "after");
      },
    },
    {
      id: "indent",
      label: "Indent",
      disabled: !previousSibling,
      onSelect: () => {
        if (previousSibling) onMove(item.id, previousSibling.id, "child");
      },
    },
    {
      id: "outdent",
      label: "Outdent",
      disabled: !parent,
      onSelect: () => {
        if (parent) onMove(item.id, parent.id, "after");
      },
    },
  ];
};

const renderTree = (
  items: MenuItemDisplay[],
  depth: number,
  parent: MenuItemDisplay | null,
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
  latestHoverIntentRef: MutableRefObject<MenuDropIntent>,
  markDrag: (eventTimeStamp: number) => void
): ReactElement[] =>
  items.flatMap((item): ReactElement[] => {
    const isTarget = hoverId === item.id && dragId !== null;
    const keyboardActions = buildKeyboardActions({
      item,
      siblings: items,
      parent,
      onMove,
    });
    const children = item.children?.length
      ? renderTree(
          item.children,
          depth + 1,
          item,
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
          latestHoverIntentRef,
          markDrag
        )
      : [];

    return [
      <MenuItemRow
        key={item.id}
        item={item}
        depth={depth}
        active={item.id === activeId}
        isDragTarget={isTarget}
        dropIntent={isTarget ? hoverIntent : null}
        keyboardActions={keyboardActions}
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
          setHoverIntent("child");
          latestHoverIntentRef.current = "child";
        }}
        onDragOver={(hovered, event) => {
          if (!dragId) return;
          setMoveDropEffect(event);
          const intent = resolveMenuDropIntent({
            clientX: event.clientX,
            clientY: event.clientY,
            rect: event.currentTarget.getBoundingClientRect(),
          });
          latestHoverIntentRef.current = intent;
          setHoverId(hovered.id);
          setHoverIntent(intent);
        }}
        onDrop={(target, event) => {
          if (!dragId || dragId === target.id) return;
          event.preventDefault();
          markDrag(event.timeStamp);
          const intent =
            resolveMenuDropIntent({
              clientX: event.clientX,
              clientY: event.clientY,
              rect: event.currentTarget.getBoundingClientRect(),
            }) ?? latestHoverIntentRef.current;
          onMove(dragId, target.id, intent);
          setDragId(null);
          setHoverId(null);
          setHoverIntent("child");
          latestHoverIntentRef.current = "child";
        }}
      />,
      ...children,
    ].filter((entry): entry is ReactElement => Boolean(entry));
  });

type MenuTreeProps = {
  items: MenuItemDisplay[];
  activeId: string | null;
  onSelect: (item: MenuItemDisplay) => void;
  onEdit: (item: MenuItemDisplay) => void;
  onDelete: (item: MenuItemDisplay) => void;
  onMove: (dragId: string, targetId: string, intent: MenuDropIntent) => void;
};

export function MenuTree({ items, activeId, onSelect, onEdit, onDelete, onMove }: MenuTreeProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverIntent, setHoverIntent] = useState<MenuDropIntent>("child");
  const [suppressClickUntil, setSuppressClickUntil] = useState(0);
  const latestHoverIntentRef = useRef<MenuDropIntent>("child");

  const markDrag = (eventTimeStamp: number) => {
    setSuppressClickUntil(eventTimeStamp + CLICK_SUPPRESS_MS);
  };

  const handleSelect = (item: MenuItemDisplay, eventTimeStamp: number) => {
    if (eventTimeStamp < suppressClickUntil) return;
    onSelect(item);
  };

  return (
    <div className="space-y-3">
      {renderTree(
        items,
        0,
        null,
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
        latestHoverIntentRef,
        markDrag
      )}
    </div>
  );
}
