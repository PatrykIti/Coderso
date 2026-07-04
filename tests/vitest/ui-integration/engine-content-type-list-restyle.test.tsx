// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

type TestContentType = {
  id: string;
  name: string;
  slug: string;
  schema: {
    type: "object";
    additionalProperties: false;
    properties: Record<string, unknown>;
  };
  status: "draft" | "published";
  entryCount?: number;
  createdAt: string;
  updatedAt: string;
};

const listState = vi.hoisted(() => ({
  types: [] as TestContentType[],
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => listState.types,
  listContentTypesCached: vi.fn(async () => listState.types),
  duplicateContentType: vi.fn(),
  deleteContentType: vi.fn(),
  updateContentType: vi.fn(),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../core/admin/ui/content-types/ContentTypeCreateDrawer", () => ({
  ContentTypeCreateDrawer: () => null,
}));

const { ContentTypeList } = await import("../../../core/admin/ui/content-types/ContentTypeList");

const seededTypes: TestContentType[] = [
  {
    id: "blog",
    name: "Blog",
    slug: "blog",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { title: { type: "string" }, body: { type: "string" } },
    },
    status: "published",
    entryCount: 7,
    createdAt: "2026-04-24T00:00:00.000Z",
    updatedAt: "2026-04-24T00:00:00.000Z",
  },
];

const flush = () => React.act(async () => Promise.resolve());

const mount = () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/content-types">
        <AdminBasePathProvider value="/admin">
          <ContentTypeList />
        </AdminBasePathProvider>
      </AdminRouterProvider>
    );
  });
  return {
    host,
    cleanup: () => {
      React.act(() => root.unmount());
      host.remove();
    },
  };
};

beforeEach(() => {
  listState.types = [];
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

test("content type list shows summary band chrome", () => {
  listState.types = [];
  const html = renderAdminUi(<ContentTypeList />, { path: "/admin/content-types" });
  expect(html).toContain("Content Types");
  expect(html).toMatch(/Types/);
  expect(html).toMatch(/Entries/);
  expect(html).toMatch(/Fields/);
});

test("content type list renders a card per type with canonical routed actions", async () => {
  listState.types = seededTypes;
  const view = mount();
  try {
    await flush();

    expect(view.host.textContent).toContain("Blog");
    expect(view.host.textContent).toContain("2 fields");
    expect(view.host.textContent).toContain("7 entries");
    expect(view.host.textContent).toContain("Edit schema");
    expect(view.host.textContent).toContain("Entries");

    const schemaLink = view.host.querySelector('a[href="/admin/advanced/engine/blog/schema"]');
    expect(schemaLink).not.toBeNull();
    const entriesLink = view.host.querySelector('a[href="/admin/advanced/engine/blog/collection"]');
    expect(entriesLink).not.toBeNull();
    expect(view.host.querySelector('a[href^="/admin/advanced/engine/"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("content type list keeps per-card selection wiring to the bulk bar", async () => {
  listState.types = seededTypes;
  const view = mount();
  try {
    await flush();

    const selectBlog = view.host.querySelector(
      'button[aria-label="Select Blog"]'
    ) as HTMLButtonElement | null;
    expect(selectBlog).not.toBeNull();
    React.act(() => {
      selectBlog?.click();
    });

    expect(view.host.textContent).toContain("Selected 1");
  } finally {
    view.cleanup();
  }
});
