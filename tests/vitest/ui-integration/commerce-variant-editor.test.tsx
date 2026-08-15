// @vitest-environment happy-dom

// TASK-488-03-L01: full author round-trip for the variant editor card. Mounts
// `CommerceEditorPage` in create mode with a mocked `commerceClient` and drives
// the card through native DOM events, asserting the save payload is shaped by
// `serializeDraftVariants` (L01) via `toCommerceProductInput`.

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import type {
  CommerceCollectionRecord,
  CommerceProductInput,
  CommerceProductRecord,
  CommerceProductUpdateInput,
} from "../../../core/admin/services/commerceClient";

type CreateCommerceProductMock = (input: CommerceProductInput) => Promise<CommerceProductRecord>;
type UpdateCommerceProductMock = (
  id: string,
  input: CommerceProductUpdateInput
) => Promise<CommerceProductRecord>;

const commerceState = vi.hoisted(() => ({
  navigate: vi.fn(),
  listCollections: vi.fn(async () => [] as CommerceCollectionRecord[]),
  createCommerceProduct: vi.fn<CreateCommerceProductMock>(async () => {
    throw new Error("unreachable");
  }),
  updateCommerceProduct: vi.fn<UpdateCommerceProductMock>(async () => {
    throw new Error("unreachable");
  }),
  getCachedCommerceProduct: vi.fn(() => null as CommerceProductRecord | null),
  getCommerceProductCached: vi.fn(async () => null as CommerceProductRecord | null),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/commerceClient", () => ({
  getCachedCommerceProduct: commerceState.getCachedCommerceProduct,
  getCommerceProductCached: commerceState.getCommerceProductCached,
  listCommerceCollectionsCached: commerceState.listCollections,
  createCommerceProduct: commerceState.createCommerceProduct,
  updateCommerceProduct: commerceState.updateCommerceProduct,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: commerceState.navigate }),
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

const savedProduct = (): CommerceProductRecord => ({
  id: "product-1",
  title: "Oak Desk",
  slug: "oak-desk",
  status: "draft",
  excerpt: "Office furniture",
  description: null,
  pricing: { amount: 12000, currency: "USD", compareAtAmount: null },
  stock: { state: "in_stock", quantity: 4 },
  collectionIds: [],
  mediaIds: [],
  variants: [],
  metadata: {},
  data: {},
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
  publishedAt: null,
});

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<CommerceEditorPage />);
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

const findButton = (host: HTMLElement, label: string) =>
  Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes(label));

const clickButton = (host: HTMLElement, label: string) => {
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
  window.history.pushState({}, "", "/admin/advanced/commerce/new");
  commerceState.navigate.mockReset();
  commerceState.listCollections.mockReset();
  commerceState.listCollections.mockResolvedValue([]);
  commerceState.createCommerceProduct.mockReset();
  commerceState.createCommerceProduct.mockResolvedValue(savedProduct());
  commerceState.updateCommerceProduct.mockReset();
  commerceState.updateCommerceProduct.mockResolvedValue(savedProduct());
  commerceState.getCachedCommerceProduct.mockReturnValue(null);
  commerceState.getCommerceProductCached.mockReset();
  commerceState.getCommerceProductCached.mockResolvedValue(null);
});

test("adding and editing a variant yields a serialized payload on save", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.container, "Add variant");
    await flush();
    setValue(view.container.querySelector('input[placeholder="Variant title"]'), "Large");
    await flush();
    clickButton(view.container, "Save changes");
    await flush();
    expect(commerceState.createCommerceProduct).toHaveBeenCalledTimes(1);
    const payload = commerceState.createCommerceProduct.mock.calls[0]?.[0];
    expect(payload?.variants).toEqual([
      expect.objectContaining({ title: "Large", isDefault: false }),
    ]);
  } finally {
    view.cleanup();
  }
});

test("blank-title variant is dropped by serializeDraftVariants on save", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.container, "Add variant");
    await flush();
    clickButton(view.container, "Save changes");
    await flush();
    expect(commerceState.createCommerceProduct).toHaveBeenCalledTimes(1);
    const payload = commerceState.createCommerceProduct.mock.calls[0]?.[0];
    expect(payload?.variants).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("toggling default on a second variant clears the first", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.container, "Add variant");
    await flush();
    clickButton(view.container, "Add variant");
    await flush();
    setValue(view.container.querySelectorAll('input[placeholder="Variant title"]')[0], "Small");
    setValue(view.container.querySelectorAll('input[placeholder="Variant title"]')[1], "Large");
    await flush();

    const secondDefault = view.container.querySelector('[aria-label="Default variant 2"]');
    expect(secondDefault).toBeTruthy();
    React.act(() => {
      secondDefault?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    const firstCheckbox = view.container.querySelector('[aria-label="Default variant 1"]');
    const secondCheckbox = view.container.querySelector('[aria-label="Default variant 2"]');
    expect(firstCheckbox?.getAttribute("aria-checked")).toBe("false");
    expect(secondCheckbox?.getAttribute("aria-checked")).toBe("true");

    clickButton(view.container, "Save changes");
    await flush();
    const payload = commerceState.createCommerceProduct.mock.calls[0]?.[0];
    expect(payload?.variants).toEqual([
      expect.objectContaining({ title: "Small", isDefault: false }),
      expect.objectContaining({ title: "Large", isDefault: true }),
    ]);
  } finally {
    view.cleanup();
  }
});
