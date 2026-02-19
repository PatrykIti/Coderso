export type MenuItemRecord = {
  id: string;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
  settings?: Record<string, unknown>;
};

export type MenuItemNode = MenuItemRecord & { children: MenuItemNode[] };

export function assertNoCycles(items: MenuItemRecord[]) {
  const parents = new Map<string, string | null>();
  for (const item of items) {
    parents.set(item.id, item.parentId);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string) => {
    if (visiting.has(id)) {
      throw new Error("menu_items_cycle");
    }
    if (visited.has(id)) return;

    visiting.add(id);
    const parentId = parents.get(id);
    if (parentId && parents.has(parentId)) {
      visit(parentId);
    }
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of parents.keys()) {
    visit(id);
  }
}

export function buildMenuTree(items: MenuItemRecord[]): MenuItemNode[] {
  const positions = new Map(items.map((item, index) => [item.id, index]));
  const nodes = new Map<string, MenuItemNode>();

  for (const item of items) {
    nodes.set(item.id, { ...item, children: [] });
  }

  const roots: MenuItemNode[] = [];
  for (const item of items) {
    const node = nodes.get(item.id)!;
    if (item.parentId && nodes.has(item.parentId)) {
      nodes.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list: MenuItemNode[]) => {
    list.sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) {
        return a.orderIndex - b.orderIndex;
      }
      return (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0);
    });

    for (const node of list) {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(roots);
  return roots;
}
