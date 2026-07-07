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
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  schema: {
    type: "object";
    additionalProperties: false;
    required?: string[];
    properties: Record<string, unknown>;
  };
};

const schemaState = vi.hoisted(() => ({
  list: [] as TestContentType[],
  detail: null as TestContentType | null,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => schemaState.list,
  getContentTypeCached: vi.fn(async () => schemaState.detail),
  listContentTypesCached: vi.fn(async () => schemaState.list),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { SchemaBuilderPage } =
  await import("../../../core/admin/ui/content-types/SchemaBuilderPage");

const seededType: TestContentType = {
  id: "sample",
  name: "Article",
  slug: "article",
  status: "published",
  createdAt: "2026-04-24T00:00:00.000Z",
  updatedAt: "2026-04-24T00:00:00.000Z",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title"],
    properties: {
      title: { type: "string", title: "Title" },
      body: { type: "string", xFieldType: "richtext", title: "Body" },
    },
  },
};

const flush = () => React.act(async () => Promise.resolve());

const mount = () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/content-types/sample/schema">
        <AdminBasePathProvider value="/admin">
          <SchemaBuilderPage />
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
  schemaState.list = [];
  schemaState.detail = null;
  window.history.pushState({}, "", "/admin/content-types/sample/schema");
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

test("schema builder renders rail palette + inspector chrome", () => {
  const html = renderAdminUi(<SchemaBuilderPage />, {
    path: "/admin/content-types/sample/schema",
  });

  expect(html).toContain("Field types");
  for (const label of ["Text", "Number", "Boolean", "Rich text", "Media", "Relation", "Select"]) {
    expect(html).toContain(label);
  }
  expect(html).toMatch(/fields/);
  expect(html).toContain("Field settings");
  expect(html).toContain("Add new field");
  // Schema JSON preview is opt-in behind a toolbar toggle (owner request), not a
  // permanently docked side rail — the "Schema Preview" panel is absent by default.
  expect(html).not.toContain("Schema Preview");
  // TASK-513-02 ports the `date` + `slug` field types into the palette.
  expect(html).toContain(">Date<");
  expect(html).toContain(">Slug<");
});

test("schema builder canvas renders one node per real field with type text", async () => {
  schemaState.list = [seededType];
  schemaState.detail = seededType;
  const view = mount();
  try {
    await flush();

    expect(view.host.textContent).not.toContain("Loading fields...");
    expect(view.host.textContent).toContain("Title");
    expect(view.host.textContent).toContain("Body");
    expect(view.host.textContent).toContain("Text · required");
    expect(view.host.textContent).toContain("Rich text");
  } finally {
    view.cleanup();
  }
});
