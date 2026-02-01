import { expect, test } from "bun:test";

import { listMenus, getMenuWithItems } from "../../../core/admin/services/menusClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listMenus hits /menus", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listMenus();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/menus");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getMenuWithItems hits /menus/:id", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ menu: { id: "menu-1", name: "Main", location: null, createdAt: "" }, items: [] });
  };

  try {
    await getMenuWithItems("menu-1");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/menus/menu-1");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
