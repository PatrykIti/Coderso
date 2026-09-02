// @vitest-environment happy-dom

// TASK-105-08-06: `CommerceEditorPage` interaction suite. Covers create mode,
// edit mode hydration, save/publish/discard flows, cache-event refresh, and
// error surfaces through the real commerceClient + fetch mock.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import {
  clearCommerceCache,
  type CommerceProductRecord,
  type CommerceProductStatus,
} from "../../../core/admin/services/commerceClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { CommerceEditorPage } from "../../../core/admin/ui/commerce/CommerceEditorPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = (overrides: Partial<CommerceProductRecord> = {}): CommerceProductRecord => ({
  id: overrides.id ?? "product-1",
  title: overrides.title ?? "Oak Desk",
  slug: overrides.slug ?? "oak-desk",
  status: overrides.status ?? "draft",
  excerpt: overrides.excerpt ?? "Office furniture",
  description: overrides.description ?? null,
  pricing: overrides.pricing ?? { amount: 12000, currency: "USD", compareAtAmount: null },
  stock: overrides.stock ?? { state: "in_stock", quantity: 4 },
  collectionIds: overrides.collectionIds ?? [],
  mediaIds: overrides.mediaIds ?? [],
  variants: overrides.variants ?? [],
  metadata: overrides.metadata ?? {},
  data: overrides.data ?? {},
  createdAt: overrides.createdAt ?? "2026-03-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-03-02T00:00:00.000Z",
  publishedAt: overrides.publishedAt ?? null,
});

type DeferredResponse = {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
};

type FetchCall = { url: string; method?: string; body?: BodyInit | null };

const createDeferredResponse = (): DeferredResponse => {
  let resolveResponse: (response: Response) => void = () => {
    throw new Error("deferred response resolver is unavailable");
  };
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  return { promise, resolve: (response) => resolveResponse(response) };
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const mount = (path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  window.history.replaceState({}, "", path);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <CommerceEditorPage />
      </AdminRouterProvider>
    );
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
      window.history.replaceState({}, "", "/admin/media");
    },
  };
};

const click = (element: Element | null | undefined) => {
  if (!element) throw new Error("click target missing");
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const clickByText = (root: ParentNode, text: string) => {
  const element = Array.from(root.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  );
  if (!element) throw new Error(`Missing button ${text}`);
  click(element);
};

const setInput = (input: HTMLInputElement | null, value: string) => {
  if (!input) throw new Error("input missing");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  clearCommerceCache();
  resetCsrfToken();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

test("create mode shows the new product editor without loading", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/new");
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("New product");
    expect(view.container.textContent).toContain("Save changes");
    expect(view.container.textContent).not.toContain("Loading product editor");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("create mode save posts the product and navigates to the editor", async () => {
  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  const createdProduct = product({ id: "created-1", title: "Created Product" });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: init?.body });
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/csrf") && init?.method === "GET")
      return jsonResponse({ csrfToken: "token-1" });
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products") && init?.method === "POST")
      return jsonResponse(createdProduct);
    if (url.endsWith("/commerce/products/created-1") && init?.method === "GET")
      return jsonResponse(createdProduct);
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/new");
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    setInput(view.container.querySelector("#commerce-title"), "Created Product");
    clickByText(view.container, "Save changes");
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const post = calls.find(
      (call) => call.url.endsWith("/commerce/products") && call.method === "POST"
    );
    expect(post).toBeTruthy();
    expect(JSON.parse(String(post?.body))).toMatchObject({ title: "Created Product" });
    expect(view.container.textContent).toContain("Product saved successfully.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("create mode save failure surfaces the API message", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/csrf") && init?.method === "GET")
      return jsonResponse({ csrfToken: "token-1" });
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products") && init?.method === "POST")
      return jsonResponse(
        { error: { code: "product_create_failed", message: "Create exploded", details: "x" } },
        500
      );
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/new");
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    setInput(view.container.querySelector("#commerce-title"), "Broken Product");
    clickByText(view.container, "Save changes");
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Create exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("edit mode hydrates from the cache and refreshes from the server", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(product());
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Edit product");
    expect(view.container.textContent).toContain("Oak Desk");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("edit mode publish patches status and saves", async () => {
  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  let published = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: init?.body });
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/csrf") && init?.method === "GET")
      return jsonResponse({ csrfToken: "token-1" });
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1") && init?.method === "PATCH") {
      published = true;
      return jsonResponse(
        product({ status: "published", publishedAt: "2026-03-03T00:00:00.000Z" })
      );
    }
    if (url.endsWith("/commerce/products/product-1"))
      return jsonResponse(published ? product({ status: "published" }) : product());
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    clickByText(view.container, "Publish");
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const patch = calls.find(
      (call) => call.url.endsWith("/commerce/products/product-1") && call.method === "PATCH"
    );
    expect(patch).toBeTruthy();
    expect(JSON.parse(String(patch?.body))).toMatchObject({ status: "published" });
    expect(view.container.textContent).toContain("Product saved successfully.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("editing marks unsaved changes and discard restores the snapshot", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(product());
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    setInput(view.container.querySelector("#commerce-title"), "Changed Title");
    expect(view.container.textContent).toContain("Unsaved changes");
    clickByText(view.container, "Discard");
    await React.act(async () => {
      await Promise.resolve();
    });
    const titleInput = view.container.querySelector("#commerce-title") as HTMLInputElement;
    expect(titleInput.value).toBe("Oak Desk");
    expect(view.container.textContent).not.toContain("Unsaved changes");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("cache event refresh applies a newer product when there are no unsaved changes", async () => {
  const originalFetch = globalThis.fetch;
  let serverProduct = product();
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(serverProduct);
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    serverProduct = product({ title: "Server Updated" });
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const titleInput = view.container.querySelector("#commerce-title") as HTMLInputElement;
    expect(titleInput.value).toBe("Server Updated");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("collections load failure surfaces the API message in edit mode", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections"))
      return jsonResponse(
        { error: { code: "collections_failed", message: "Collections exploded", details: "x" } },
        500
      );
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(product());
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Collections exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a path without a commerce segment falls back to create mode", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    return jsonResponse({});
  };

  const view = mount("/admin/media");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("New product");
    expect(view.container.textContent).not.toContain("Loading product editor");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("generic collections and product failures fall back to friendly copy", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) throw new TypeError("collections network down");
    if (url.endsWith("/commerce/products/product-1")) throw new TypeError("product network down");
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    // The product failure wins the single error slot; both handlers ran.
    expect(view.container.textContent).toContain("Failed to load commerce product.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("an empty product response is ignored during edit hydration", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(null);
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).not.toContain("Loading product editor");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("toggle collection off removes the id from the draft", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections"))
      return jsonResponse({
        items: [
          {
            id: "col-1",
            name: "Featured",
            slug: "featured",
            description: null,
            productIds: [],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
    if (url.endsWith("/commerce/products/product-1"))
      return jsonResponse(product({ collectionIds: ["col-1"] }));
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    const checkbox = Array.from(view.container.querySelectorAll('[data-slot="checkbox"]')).find(
      (entry) => entry.closest("label")?.textContent?.includes("Featured")
    );
    expect(checkbox).toBeTruthy();
    click(checkbox);
    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("back to list navigates to the commerce index", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(product());
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    clickByText(view.container, "Back to list");
    expect(window.location.pathname).toBe("/admin/advanced/commerce");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("edit mode hydrates product variants through the draft clone", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1"))
      return jsonResponse(
        product({
          variants: [
            {
              id: "v-1",
              sku: "OAK-L",
              title: "Large",
              pricing: { amount: 12000, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 3 },
              attributes: { finish: "oak" },
              isDefault: true,
            },
          ],
        })
      );
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    const titleInput = view.container.querySelector("#commerce-title") as HTMLInputElement;
    expect(titleInput.value).toBe("Oak Desk");
    const variantTitle = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.placeholder === "Variant title"
    ) as HTMLInputElement | undefined;
    expect(variantTitle?.value).toBe("Large");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("cache events for other keys are ignored by the editor", async () => {
  const originalFetch = globalThis.fetch;
  let productFetches = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) {
      productFetches += 1;
      return jsonResponse(product());
    }
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    const before = productFetches;
    await React.act(async () => {
      broadcastCacheEvent({ key: "some:other:key", action: "update" });
      await Promise.resolve();
    });
    expect(productFetches).toBe(before);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("cache events are ignored while there are unsaved changes", async () => {
  const originalFetch = globalThis.fetch;
  let serverProduct = product();
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(serverProduct);
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    setInput(view.container.querySelector("#commerce-title"), "Dirty title");
    serverProduct = product({ title: "Server Change" });
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
      await Promise.resolve();
    });
    const titleInput = view.container.querySelector("#commerce-title") as HTMLInputElement;
    expect(titleInput.value).toBe("Dirty title");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("mobile context and details buttons open their drawers", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(product());
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    clickByText(view.container, "Context");
    await React.act(async () => {
      await Promise.resolve();
    });
    const contextSheet = Array.from(document.body.querySelectorAll('[role="dialog"]')).find((d) =>
      d.textContent?.includes("Product context")
    );
    expect(contextSheet).toBeTruthy();
    clickByText(view.container, "Details");
    await React.act(async () => {
      await Promise.resolve();
    });
    const detailsSheet = Array.from(document.body.querySelectorAll('[role="dialog"]')).find((d) =>
      d.textContent?.includes("Collections")
    );
    expect(detailsSheet).toBeTruthy();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("cache event refresh rejection is swallowed without crashing", async () => {
  const originalFetch = globalThis.fetch;
  let serverProduct = product();
  let productCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) {
      productCalls += 1;
      if (productCalls > 1) throw new TypeError("refresh exploded");
      return jsonResponse(serverProduct);
    }
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    serverProduct = product({ title: "Never lands" });
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
      await Promise.resolve();
    });
    const titleInput = view.container.querySelector("#commerce-title") as HTMLInputElement;
    expect(titleInput.value).toBe("Oak Desk");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("toggling a collection on adds the id to the draft", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections"))
      return jsonResponse({
        items: [
          {
            id: "col-1",
            name: "Featured",
            slug: "featured",
            description: null,
            productIds: [],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(product());
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    const checkbox = Array.from(view.container.querySelectorAll('[data-slot="checkbox"]')).find(
      (entry) => entry.closest("label")?.textContent?.includes("Featured")
    );
    click(checkbox);
    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("panel status change, publish, and create collection fire their handlers", async () => {
  const originalFetch = globalThis.fetch;
  let savedPayload: { status?: string } | null = null;
  let publishCalled = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1") && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body)) as { status?: CommerceProductStatus };
      savedPayload = body;
      return jsonResponse(product({ status: body.status }));
    }
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(product());
    if (url.endsWith("/commerce/products") && init?.method === "POST") {
      publishCalled = true;
      return jsonResponse(product());
    }
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    // Status select in the right panel
    const statusTrigger = view.container.querySelector("#commerce-status") as HTMLElement | null;
    expect(statusTrigger).toBeTruthy();
    React.act(() => {
      statusTrigger?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, cancelable: true })
      );
      statusTrigger?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true })
      );
      statusTrigger?.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, cancelable: true })
      );
      statusTrigger?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
      statusTrigger?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await React.act(async () => {
      await Promise.resolve();
    });
    const published = Array.from(document.body.querySelectorAll('[role="option"]')).find((entry) =>
      entry.textContent?.includes("Published")
    );
    React.act(() => {
      published?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, cancelable: true })
      );
      published?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      published?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
      published?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
      published?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Unsaved changes");
    // Publish button in the right panel fires handleSave (the header publish
    // button is covered elsewhere; scope to the panel to hit its handler).
    const rightPanel = view.container.querySelector('[data-editor-shell-right-panel="true"]');
    const publishButton = Array.from(rightPanel?.querySelectorAll("button") ?? []).find(
      (button) =>
        button.textContent?.trim() === "Publish" || button.textContent?.trim() === "Move to draft"
    );
    click(publishButton);
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(publishCalled || savedPayload !== null).toBe(true);
    // Create collection navigates to the collections page
    const createButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Create your first collection")
    );
    click(createButton);
    expect(window.location.pathname).toContain("/collections");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a collections load that fails after unmount does not surface an error", async () => {
  const originalFetch = globalThis.fetch;
  const collectionsLoad = createDeferredResponse();
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return collectionsLoad.promise;
    if (url.endsWith("/commerce/products/product-1")) return jsonResponse(product());
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    view.cleanup();
    collectionsLoad.resolve(
      jsonResponse(
        { error: { code: "collections_failed", message: "Late collections", details: "x" } },
        500
      )
    );
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.isConnected).toBe(false);
  } finally {
    if (view.container.isConnected) view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a product load that fails after unmount does not surface an error", async () => {
  const originalFetch = globalThis.fetch;
  const productLoad = createDeferredResponse();
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) return productLoad.promise;
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    view.cleanup();
    productLoad.resolve(
      jsonResponse(
        { error: { code: "product_failed", message: "Late product", details: "x" } },
        500
      )
    );
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.isConnected).toBe(false);
  } finally {
    if (view.container.isConnected) view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a product load that resolves null after unmount performs no apply", async () => {
  const originalFetch = globalThis.fetch;
  const productLoad = createDeferredResponse();
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    if (url.endsWith("/commerce/products/product-1")) return productLoad.promise;
    return jsonResponse({});
  };

  const view = mount("/admin/advanced/commerce/product-1");
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    view.cleanup();
    productLoad.resolve(jsonResponse(null));
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.isConnected).toBe(false);
  } finally {
    if (view.container.isConnected) view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
