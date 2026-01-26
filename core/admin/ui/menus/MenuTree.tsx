import type { ReactElement } from "react";

import type { MenuItemNode } from "@/ui/menus/types";
import { MenuItemRow } from "@/ui/menus/MenuItemRow";

const renderTree = (
  items: MenuItemNode[],
  depth: number,
  activeId?: string
): ReactElement[] =>
  items.flatMap((item): ReactElement[] => [
    <MenuItemRow
      key={item.id}
      item={item}
      depth={depth}
      active={item.id === activeId}
    />,
    ...(item.children ? renderTree(item.children, depth + 1, activeId) : []),
  ]);

type MenuTreeProps = {
  items: MenuItemNode[];
  activeId?: string;
};

export function MenuTree({ items, activeId }: MenuTreeProps) {
  return <div className="space-y-3">{renderTree(items, 0, activeId)}</div>;
}
