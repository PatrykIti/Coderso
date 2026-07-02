import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { menuItems, menus } from "../../../core/db/schema";
import {
  createMenu,
  deleteMenuItem,
  getMenuWithItems,
  moveMenuToDraft,
  normalizeMenuStatus,
  publishMenu,
  replaceMenuItems,
  updateMenu,
} from "../../../core/services/menus/menuService";
import {
  MENU_APPEARANCE_INVALID,
  resolvePublishedMenuAppearance,
} from "../../../core/services/menus/normalizeMenuAppearance";
import {
  MENU_DOCUMENT_INVALID,
  resolvePublishedMenuDocument,
} from "../../../core/services/menus/menuDocumentV2";
import {
  assertNoCycles,
  buildMenuTree,
  type MenuItemRecord,
} from "../../../core/services/menus/treeBuilder";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanupMenu = async (menuId?: string) => {
  if (!menuId) return;
  await db.delete(menuItems).where(eq(menuItems.menuId, menuId));
  await db.delete(menus).where(eq(menus.id, menuId));
};

let createdMenuId: string | undefined;

afterAll(async () => {
  if (!hasDb) return;
  await cleanupMenu(createdMenuId);
});

test("buildMenuTree nests and orders items", () => {
  const items: MenuItemRecord[] = [
    {
      id: "1",
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 1,
    },
    {
      id: "2",
      label: "Blog",
      href: "/blog",
      pageId: null,
      parentId: null,
      orderIndex: 0,
    },
    {
      id: "3",
      label: "Post",
      href: "/blog/post",
      pageId: null,
      parentId: "2",
      orderIndex: 0,
    },
  ];

  const tree = buildMenuTree(items);
  expect(tree[0]?.id).toBe("2");
  expect(tree[0]?.children[0]?.id).toBe("3");
});

test("assertNoCycles rejects cyclic items", () => {
  const items: MenuItemRecord[] = [
    {
      id: "1",
      label: "A",
      href: "/a",
      pageId: null,
      parentId: "2",
      orderIndex: 0,
    },
    {
      id: "2",
      label: "B",
      href: "/b",
      pageId: null,
      parentId: "1",
      orderIndex: 0,
    },
  ];

  expect(() => assertNoCycles(items)).toThrow("menu_items_cycle");
});

test("normalizeMenuStatus only accepts supported lifecycle statuses", () => {
  expect(normalizeMenuStatus("published")).toBe("published");
  expect(normalizeMenuStatus("draft")).toBe("draft");
  expect(normalizeMenuStatus("archived", "published")).toBe("published");
  expect(normalizeMenuStatus(null, "draft")).toBe("draft");
});

testIfDb("createMenu defaults to draft and lifecycle helpers publish or draft menus", async () => {
  const menu = await createMenu({
    name: `Lifecycle-${randomUUID()}`,
    location: `lifecycle-${randomUUID()}`,
  });

  createdMenuId = menu?.id;
  if (!createdMenuId) throw new Error("menu_missing");

  expect(menu?.status).toBe("draft");
  expect(menu?.publishedAt).toBeNull();

  const published = await publishMenu(createdMenuId);
  expect(published?.status).toBe("published");
  expect(published?.publishedAt).toBeInstanceOf(Date);

  const draft = await moveMenuToDraft(createdMenuId);
  expect(draft?.status).toBe("draft");
  expect(draft?.publishedAt).toBeNull();

  await cleanupMenu(createdMenuId);
  createdMenuId = undefined;
});

testIfDb("replaceMenuItems stores items", async () => {
  const menu = await createMenu({
    name: `Primary-${randomUUID()}`,
    // Uniquely scoped: `menus.location` is globally unique and "primary" is
    // real dev data.
    location: `primary-${randomUUID()}`,
  });

  createdMenuId = menu?.id;
  if (!createdMenuId) throw new Error("menu_missing");

  await replaceMenuItems(createdMenuId, [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Child", href: "/about/child", parentId: "missing" },
  ]);

  const stored = await getMenuWithItems(createdMenuId);
  expect(stored?.items.length).toBe(3);
  expect(stored?.items[0]?.label).toBeDefined();

  await cleanupMenu(createdMenuId);
  createdMenuId = undefined;
});

testIfDb("replaceMenuItems normalizes menu metadata settings", async () => {
  const menu = await createMenu({
    name: `Meta-${randomUUID()}`,
    location: `meta-${randomUUID()}`,
  });

  createdMenuId = menu?.id;
  if (!createdMenuId) throw new Error("menu_missing");

  await replaceMenuItems(createdMenuId, [
    {
      label: "Offers",
      href: "/offers",
      settings: {
        visibility: "logged_out",
        badge: { label: " New ", tone: "accent" },
        description: " Seasonal promotions ",
        icon: " sparkles ",
      },
    },
  ]);

  const stored = await getMenuWithItems(createdMenuId);
  expect(stored?.items[0]?.settings).toEqual({
    visibility: "logged_out",
    badge: { label: "New", tone: "accent" },
    description: "Seasonal promotions",
    icon: "sparkles",
  });

  await cleanupMenu(createdMenuId);
  createdMenuId = undefined;
});

testIfDb("deleteMenuItem removes descendants and preserves unrelated items", async () => {
  const menu = await createMenu({
    name: `Delete Item-${randomUUID()}`,
    location: `delete-item-${randomUUID()}`,
  });

  createdMenuId = menu?.id;
  if (!createdMenuId) throw new Error("menu_missing");
  const productsId = randomUUID();
  const featuredId = randomUUID();
  const aboutId = randomUUID();

  await replaceMenuItems(createdMenuId, [
    { id: productsId, label: "Products", href: "/products" },
    { id: featuredId, label: "Featured", href: "/products/featured", parentId: productsId },
    { id: aboutId, label: "About", href: "/about" },
  ]);

  const result = await deleteMenuItem(createdMenuId, productsId);
  expect(result?.deleted.label).toBe("Products");
  expect(result?.deletedIds).toEqual([featuredId, productsId].sort());

  const stored = await getMenuWithItems(createdMenuId);
  expect(stored?.items.map((item) => item.id)).toEqual([aboutId]);

  await cleanupMenu(createdMenuId);
  createdMenuId = undefined;
});

testIfDb(
  "updateMenu persists normalized appearance and carries it through publish/draft",
  async () => {
    const menu = await createMenu({
      name: `Appearance-${randomUUID()}`,
      location: `appearance-${randomUUID()}`,
    });

    createdMenuId = menu?.id;
    if (!createdMenuId) throw new Error("menu_missing");

    expect(menu?.settings).toBeNull();

    const appearance = {
      surfaceColor: "#0f172a",
      linkColor: "var(--color-primary)",
      itemGap: 12.4,
      sticky: true,
    };
    const updated = await updateMenu(createdMenuId, { appearance });
    // Numbers are clamped/rounded by normalizeMenuAppearance before persisting.
    expect(updated?.settings).toEqual({
      appearance: { ...appearance, itemGap: 12 },
    });

    // Publish snapshots the draft appearance for public rendering.
    const published = await publishMenu(createdMenuId);
    expect(published?.status).toBe("published");
    expect(published?.settings).toEqual({
      appearance: { ...appearance, itemGap: 12 },
      published: { appearance: { ...appearance, itemGap: 12 } },
    });
    expect(resolvePublishedMenuAppearance(published?.settings)).toEqual({
      ...appearance,
      itemGap: 12,
    });

    // A draft edit on an already-published menu does not alter the public
    // published snapshot until the next publish.
    const draftEdit = await updateMenu(createdMenuId, {
      appearance: { surfaceColor: "#111827" },
    });
    expect(draftEdit?.settings).toEqual({
      appearance: { surfaceColor: "#111827" },
      published: { appearance: { ...appearance, itemGap: 12 } },
    });
    expect(resolvePublishedMenuAppearance(draftEdit?.settings)).toEqual({
      ...appearance,
      itemGap: 12,
    });

    const republished = await publishMenu(createdMenuId);
    expect(republished?.settings).toEqual({
      appearance: { surfaceColor: "#111827" },
      published: { appearance: { surfaceColor: "#111827" } },
    });
    expect(resolvePublishedMenuAppearance(republished?.settings)).toEqual({
      surfaceColor: "#111827",
    });

    const draft = await moveMenuToDraft(createdMenuId);
    expect(draft?.status).toBe("draft");
    expect(draft?.settings).toEqual({
      appearance: { surfaceColor: "#111827" },
      published: { appearance: { surfaceColor: "#111827" } },
    });

    // Explicit null clears the draft appearance. Publishing that cleared
    // draft replaces the public snapshot with the legacy look.
    const cleared = await updateMenu(createdMenuId, { appearance: null });
    expect(cleared?.settings).toEqual({
      published: { appearance: { surfaceColor: "#111827" } },
    });
    const republishedClear = await publishMenu(createdMenuId);
    expect(republishedClear?.settings).toEqual({ published: {} });
    expect(resolvePublishedMenuAppearance(republishedClear?.settings)).toBeNull();

    await cleanupMenu(createdMenuId);
    createdMenuId = undefined;
  }
);

testIfDb(
  "updateMenu rejects invalid appearance with menu_appearance_invalid and persists nothing",
  async () => {
    const menu = await createMenu({
      name: `Appearance-Invalid-${randomUUID()}`,
      location: `appearance-invalid-${randomUUID()}`,
    });

    createdMenuId = menu?.id;
    if (!createdMenuId) throw new Error("menu_missing");

    await expect(
      updateMenu(createdMenuId, { appearance: { surfaceColor: "not-a-color" } })
    ).rejects.toThrow(MENU_APPEARANCE_INVALID);
    await expect(updateMenu(createdMenuId, { appearance: { unknownField: true } })).rejects.toThrow(
      MENU_APPEARANCE_INVALID
    );

    const stored = await getMenuWithItems(createdMenuId);
    expect(stored?.menu.settings).toBeNull();

    await cleanupMenu(createdMenuId);
    createdMenuId = undefined;
  }
);

const sampleMenuDocument = () => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "sec-menu-bar",
      type: "menu-bar" as const,
      name: "Menu bar",
      layout: { surfaceColor: "#0f172a" },
      blocks: [
        { id: "blk-nav", type: "nav-items" as const, props: { linkColor: "var(--color-primary)" } },
      ],
    },
  ],
});

testIfDb(
  "updateMenu merges a document per key without dropping a co-present appearance",
  async () => {
    const menu = await createMenu({
      name: `Document-Merge-${randomUUID()}`,
      location: `document-merge-${randomUUID()}`,
    });

    createdMenuId = menu?.id;
    if (!createdMenuId) throw new Error("menu_missing");

    // Seed an appearance first, then a document — the document merge must not
    // drop the appearance key already in the envelope.
    await updateMenu(createdMenuId, { appearance: { surfaceColor: "#111827" } });
    const document = sampleMenuDocument();
    const merged = await updateMenu(createdMenuId, { document });
    expect(merged?.settings).toEqual({
      appearance: { surfaceColor: "#111827" },
      document,
    });

    // Publishing snapshots the document under `published` alongside appearance.
    const published = await publishMenu(createdMenuId);
    expect(published?.settings).toEqual({
      appearance: { surfaceColor: "#111827" },
      document,
      published: { appearance: { surfaceColor: "#111827" }, document },
    });
    expect(resolvePublishedMenuDocument(published?.settings)?.sections[0]?.blocks[0]?.type).toBe(
      "nav-items"
    );

    // Clearing the document removes only that key, leaving appearance intact.
    const cleared = await updateMenu(createdMenuId, { document: null });
    expect(cleared?.settings).toEqual({
      appearance: { surfaceColor: "#111827" },
      published: { appearance: { surfaceColor: "#111827" }, document },
    });

    await cleanupMenu(createdMenuId);
    createdMenuId = undefined;
  }
);

testIfDb("updateMenu persists a document-ONLY PATCH (guards the merge gate at :235)", async () => {
  const menu = await createMenu({
    name: `Document-Only-${randomUUID()}`,
    location: `document-only-${randomUUID()}`,
  });

  createdMenuId = menu?.id;
  if (!createdMenuId) throw new Error("menu_missing");
  expect(menu?.settings).toBeNull();

  // A PATCH carrying ONLY `document` (no appearance/extras) must still compute
  // patch.settings and persist the document — a silent-drop failure mode with
  // no compile error if the merge gate is left unedited.
  const document = sampleMenuDocument();
  const updated = await updateMenu(createdMenuId, { document });
  expect(updated?.settings).toEqual({ document });

  await cleanupMenu(createdMenuId);
  createdMenuId = undefined;
});

testIfDb(
  "updateMenu rejects an invalid document with menu_document_invalid and persists nothing",
  async () => {
    const menu = await createMenu({
      name: `Document-Invalid-${randomUUID()}`,
      location: `document-invalid-${randomUUID()}`,
    });

    createdMenuId = menu?.id;
    if (!createdMenuId) throw new Error("menu_missing");

    await expect(
      updateMenu(createdMenuId, {
        document: {
          schemaVersion: 1,
          sections: [{ type: "footer", name: "x", layout: {}, blocks: [] }],
        },
      })
    ).rejects.toThrow(MENU_DOCUMENT_INVALID);

    const stored = await getMenuWithItems(createdMenuId);
    expect(stored?.menu.settings).toBeNull();

    await cleanupMenu(createdMenuId);
    createdMenuId = undefined;
  }
);

testIfDb("replaceMenuItems rejects missing page ids", async () => {
  const menu = await createMenu({
    name: `Primary-${randomUUID()}`,
    location: `primary-${randomUUID()}`,
  });

  createdMenuId = menu?.id;
  if (!createdMenuId) throw new Error("menu_missing");

  await expect(
    replaceMenuItems(createdMenuId, [{ label: "Home", pageId: randomUUID() }])
  ).rejects.toThrow("menu_item_page_missing");

  await cleanupMenu(createdMenuId);
  createdMenuId = undefined;
});
