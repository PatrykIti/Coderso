// @vitest-environment happy-dom

// TASK-479-19-L03: locks the Commerce product EDITOR restyle (relabelled
// Details/Pricing/Inventory section cards in the center column + the right-rail
// Status sidebar) while proving the schema + dirty-state wiring is presentation
// only. The page resolves productId from window.location.pathname and edit-mode
// hydrates from the cached product, so seedEditor() pushes an EDIT route and seeds
// the cache BEFORE mount (otherwise the page resolves CREATE mode and the
// dirty/Save assertions target the wrong code path).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  CommerceCollectionRecord,
  CommerceProductRecord,
  CommerceProductStatus,
  CommerceStockState,
} from "../../../core/admin/services/commerceClient";

const editorState = vi.hoisted(() => ({
  navigate: vi.fn(),
  cached: null as CommerceProductRecord | null,
  listCollections: vi.fn(async () => [] as CommerceCollectionRecord[]),
  getCommerceProductCached: vi.fn(async () => null as CommerceProductRecord | null),
  updateCommerceProduct: vi.fn(async () => null as CommerceProductRecord | null),
  createCommerceProduct: vi.fn(async () => null as CommerceProductRecord | null),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/commerceClient", () => ({
  getCachedCommerceProduct: () => editorState.cached,
  getCommerceProductCached: editorState.getCommerceProductCached,
  listCommerceCollectionsCached: editorState.listCollections,
  updateCommerceProduct: editorState.updateCommerceProduct,
  createCommerceProduct: editorState.createCommerceProduct,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: editorState.navigate }),
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    breadcrumbs,
    leftPanel,
    rightPanel,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{Array.isArray(breadcrumbs) ? breadcrumbs.join(" / ") : breadcrumbs}</div>
      <div data-region="left">{leftPanel}</div>
      <div data-region="right">{rightPanel}</div>
      <div data-region="center">{children}</div>
    </div>
  ),
}));

import { CommerceEditorPage } from "../../../core/admin/ui/commerce/CommerceEditorPage";

const updateCommerceProductMock = editorState.updateCommerceProduct;

const product = (
  id: string,
  status: CommerceProductStatus,
  stock: CommerceStockState
): CommerceProductRecord => ({
  id,
  title: "Oak Desk",
  slug: id,
  status,
  excerpt: "Office furniture",
  description: "A solid oak desk.",
  pricing: { amount: 12000, currency: "USD", compareAtAmount: 15000 },
  stock: { state: stock, quantity: 4 },
  collectionIds: [],
  mediaIds: ["media-1"],
  variants: [],
  metadata: {},
  data: {},
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
  publishedAt: status === "published" ? "2026-03-02T00:00:00.000Z" : null,
});

const seedEditor = (record: CommerceProductRecord) => {
  window.history.pushState({}, "", "/admin/advanced/commerce/product-1");
  editorState.cached = record;
  editorState.getCommerceProductCached.mockResolvedValue(record);
  editorState.updateCommerceProduct.mockResolvedValue(record);
};

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
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
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findButton = (container: HTMLElement, re: RegExp) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    re.test(button.textContent || "")
  );

const clickableLabels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("button")).map(
    (button) => button.textContent?.trim() ?? ""
  );

const setInputValue = (input: Element | null, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input?.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

beforeEach(() => {
  editorState.navigate.mockReset();
  editorState.listCollections.mockReset();
  editorState.listCollections.mockResolvedValue([]);
  editorState.getCommerceProductCached.mockReset();
  editorState.updateCommerceProduct.mockReset();
  editorState.createCommerceProduct.mockReset();
  editorState.cached = null;
});

afterEach(() => {
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/admin/advanced/commerce");
  vi.clearAllMocks();
});

describe("Commerce editor restyle", () => {
  test("relabelled section cards + Status sidebar (edit mode)", async () => {
    seedEditor(product("product-1", "draft", "in_stock"));
    const view = mount(<CommerceEditorPage />);
    await flush();
    try {
      expect(view.container.textContent).toContain("Details"); // was "Identity"
      expect(view.container.textContent).toContain("Pricing");
      expect(view.container.textContent).toContain("Inventory"); // was "Stock"
      expect(view.container.querySelector("[class*='rounded-2xl']")).toBeTruthy();
      expect(clickableLabels(view.container)).toContain("Save changes");
      // right-rail settings sidebar renders the Status select bound to the draft
      expect(view.container.querySelector("#commerce-status")).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  test("editing the title flips dirty-state and Save calls updateCommerceProduct", async () => {
    seedEditor(product("product-1", "draft", "in_stock"));
    const view = mount(<CommerceEditorPage />);
    await flush();
    try {
      const discard = findButton(view.container, /discard/i);
      expect(discard?.disabled).toBe(true); // hasUnsavedChanges === false
      setInputValue(view.container.querySelector("#commerce-title"), "Oak Desk Pro");
      await flush();
      expect(discard?.disabled).toBe(false); // dirty flag flipped
      clickByText(view.container, "Save changes");
      await flush();
      expect(updateCommerceProductMock).toHaveBeenCalledWith(
        "product-1",
        expect.objectContaining({ pricing: expect.any(Object), stock: expect.any(Object) })
      );
    } finally {
      view.cleanup();
    }
  });

  test("Inventory switch toggles stockState over the existing schema field", async () => {
    seedEditor(product("product-1", "draft", "in_stock"));
    const view = mount(<CommerceEditorPage />);
    await flush();
    try {
      const sw = view.container.querySelector("[role='switch']"); // aria-label "Track inventory"
      expect(sw).toBeTruthy();
      React.act(() => (sw as HTMLElement | null)?.click());
      await flush();
      // derived sugar: in_stock -> out_of_stock on the SAME draft.stockState field;
      // the Inventory state Select now reflects "Out of stock".
      expect(view.container.textContent).toContain("Out of stock");
    } finally {
      view.cleanup();
    }
  });
});
