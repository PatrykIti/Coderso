// @vitest-environment happy-dom

// TASK-488-03-L01: full collections-manager round-trip. Mounts
// `CommerceCollectionsPage` with a mocked `commerceClient` and drives the
// create/edit/delete flows through native DOM events, asserting the outgoing
// client call payloads and the mapped 409 error surface.

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import type { CommerceCollectionRecord } from "../../../core/admin/services/commerceClient";

const collectionsState = vi.hoisted(() => ({
  navigate: vi.fn(),
  listCollections: vi.fn(async () => [] as CommerceCollectionRecord[]),
  createCollection: vi.fn(async () => null as CommerceCollectionRecord | null),
  updateCollection: vi.fn(async () => null as CommerceCollectionRecord | null),
  deleteCollection: vi.fn(async () => undefined),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/commerceClient", () => ({
  listCommerceCollectionsCached: collectionsState.listCollections,
  createCommerceCollection: collectionsState.createCollection,
  updateCommerceCollection: collectionsState.updateCollection,
  deleteCommerceCollection: collectionsState.deleteCollection,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: collectionsState.navigate }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { CommerceCollectionsPage } from "../../../core/admin/ui/commerce/CommerceCollectionsPage";

const collection = (
  overrides: Partial<CommerceCollectionRecord> = {}
): CommerceCollectionRecord => ({
  id: "collection-1",
  name: "Premium",
  slug: "premium",
  description: null,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
  ...overrides,
});

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<CommerceCollectionsPage />);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 6; index += 1) await Promise.resolve();
  });
};

const findButton = (host: ParentNode, label: string) =>
  Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes(label));

const clickButton = (host: ParentNode, label: string) => {
  React.act(() => {
    findButton(host, label)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setValue = (input: Element | null, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input?.dispatchEvent(new Event("input", { bubbles: true }));
    input?.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

beforeEach(() => {
  collectionsState.navigate.mockReset();
  collectionsState.listCollections.mockReset();
  collectionsState.listCollections.mockResolvedValue([]);
  collectionsState.createCollection.mockReset();
  collectionsState.createCollection.mockResolvedValue(collection());
  collectionsState.updateCollection.mockReset();
  collectionsState.updateCollection.mockResolvedValue(collection());
  collectionsState.deleteCollection.mockReset();
  collectionsState.deleteCollection.mockResolvedValue(undefined);
});

test("create collection calls createCommerceCollection with trimmed input", async () => {
  const view = mount();
  try {
    await flush();
    expect(view.container.textContent).toContain("New collection");
    clickButton(view.container, "New collection");
    await flush();
    setValue(document.body.querySelector("#collection-name"), "  Premium  ");
    await flush();
    clickButton(document.body, "Save collection");
    await flush();
    expect(collectionsState.createCollection).toHaveBeenCalledTimes(1);
    expect(collectionsState.createCollection).toHaveBeenCalledWith({
      name: "Premium",
      slug: null,
      description: null,
    });
  } finally {
    view.cleanup();
  }
});

test("editing an existing row calls updateCommerceCollection", async () => {
  collectionsState.listCollections.mockResolvedValue([collection()]);
  const view = mount();
  try {
    await flush();
    clickButton(view.container, "Edit");
    await flush();
    setValue(document.body.querySelector("#collection-name"), "Premium Plus");
    await flush();
    clickButton(document.body, "Save collection");
    await flush();
    expect(collectionsState.updateCollection).toHaveBeenCalledTimes(1);
    expect(collectionsState.updateCollection).toHaveBeenCalledWith("collection-1", {
      name: "Premium Plus",
      slug: "premium",
      description: null,
    });
  } finally {
    view.cleanup();
  }
});

test("delete confirm calls deleteCommerceCollection", async () => {
  collectionsState.listCollections.mockResolvedValue([collection()]);
  const view = mount();
  try {
    await flush();
    clickButton(view.container, "Delete");
    await flush();
    clickButton(document.body, "Delete collection");
    await flush();
    expect(collectionsState.deleteCollection).toHaveBeenCalledTimes(1);
    expect(collectionsState.deleteCollection).toHaveBeenCalledWith("collection-1");
  } finally {
    view.cleanup();
  }
});

test("slug-conflict (409) surfaces the mapped error message", async () => {
  collectionsState.createCollection.mockRejectedValue(
    new ApiClientError(
      "commerce_collection_slug_exists",
      "A collection with this slug already exists.",
      409
    )
  );
  const view = mount();
  try {
    await flush();
    clickButton(view.container, "New collection");
    await flush();
    setValue(document.body.querySelector("#collection-name"), "Premium");
    await flush();
    clickButton(document.body, "Save collection");
    await flush();
    expect(view.container.textContent).toContain("A collection with this slug already exists.");
  } finally {
    view.cleanup();
  }
});
