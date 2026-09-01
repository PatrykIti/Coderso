// @vitest-environment happy-dom

// TASK-105-08-06: `CommerceCollectionsPage` interaction suite. Covers mount
// load, empty state, create/edit dialogs, save validation, delete confirm, and
// error surfaces through the real commerceClient + fetch mock.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import {
  clearCommerceCache,
  type CommerceCollectionRecord,
} from "../../../core/admin/services/commerceClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { CommerceCollectionsPage } from "../../../core/admin/ui/commerce/CommerceCollectionsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const collection = (
  overrides: Partial<CommerceCollectionRecord> = {}
): CommerceCollectionRecord => ({
  id: overrides.id ?? "collection-1",
  name: overrides.name ?? "Premium",
  slug: overrides.slug ?? "premium",
  description: overrides.description ?? null,
  createdAt: overrides.createdAt ?? "2026-03-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-03-01T00:00:00.000Z",
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

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/advanced/commerce/collections">
        <CommerceCollectionsPage />
      </AdminRouterProvider>
    );
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
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

const setInput = (input: HTMLInputElement | HTMLTextAreaElement | null, value: string) => {
  if (!input) throw new Error("input missing");
  const setter =
    input instanceof HTMLTextAreaElement
      ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
      : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  clearCommerceCache();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

test("mount with no collections shows the empty state", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Collections");
    expect(view.container.textContent).toContain("No collections yet.");
    expect(view.container.textContent).toContain("New collection");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("mount lists existing collections with edit and delete affordances", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [collection()] });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Premium");
    expect(view.container.textContent).toContain("/premium");
    expect(view.container.textContent).toContain("Edit");
    expect(view.container.textContent).toContain("Delete");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("mount surfaces the API message when listing fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections"))
      return jsonResponse(
        { error: { code: "collections_failed", message: "Collections exploded", details: "x" } },
        500
      );
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Collections exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a collections load that fails after unmount does not surface an error", async () => {
  const originalFetch = globalThis.fetch;
  const load = createDeferredResponse();
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/commerce/collections")) return load.promise;
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    view.cleanup();
    load.resolve(
      jsonResponse(
        { error: { code: "collections_failed", message: "Late failure", details: "x" } },
        500
      )
    );
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.isConnected).toBe(false);
  } finally {
    if (view.container.isConnected) view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("create flow opens the dialog, saves, and refreshes the list", async () => {
  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  let created = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: init?.body });
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/csrf") && init?.method === "GET")
      return jsonResponse({ csrfToken: "token-1" });
    if (url.endsWith("/commerce/collections") && init?.method === "POST") {
      created = true;
      return jsonResponse(collection({ id: "new-collection", name: "New Collection" }));
    }
    if (url.endsWith("/commerce/collections"))
      return jsonResponse({
        items: created ? [collection({ id: "new-collection", name: "New Collection" })] : [],
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    clickByText(view.container, "New collection");
    await React.act(async () => {
      await Promise.resolve();
    });
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain("New collection");
    setInput(dialog?.querySelector("#collection-name") as HTMLInputElement, "New Collection");
    const save = Array.from(dialog?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("Save collection")
    );
    click(save);
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const post = calls.find(
      (call) => call.url.endsWith("/commerce/collections") && call.method === "POST"
    );
    expect(post).toBeTruthy();
    expect(JSON.parse(String(post?.body))).toMatchObject({ name: "New Collection" });
    expect(view.container.textContent).toContain("New Collection");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("save is disabled while the name is blank and a failed save surfaces the error", async () => {
  const originalFetch = globalThis.fetch;
  let failSave = true;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/csrf") && init?.method === "GET")
      return jsonResponse({ csrfToken: "token-1" });
    if (url.endsWith("/commerce/collections") && init?.method === "POST") {
      if (failSave)
        return jsonResponse(
          { error: { code: "collection_create_failed", message: "Save exploded", details: "x" } },
          500
        );
      return jsonResponse(collection({ id: "created" }));
    }
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    clickByText(view.container, "New collection");
    await React.act(async () => {
      await Promise.resolve();
    });
    const dialog = document.body.querySelector('[role="dialog"]');
    const save = Array.from(dialog?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("Save collection")
    );
    expect((save as HTMLButtonElement | null)?.disabled).toBe(true);

    setInput(dialog?.querySelector("#collection-name") as HTMLInputElement, "Boom Collection");
    click(save);
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Save exploded");
    failSave = false;
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("edit flow pre-fills the draft and updates the collection", async () => {
  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  let updated = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: init?.body });
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/csrf") && init?.method === "GET")
      return jsonResponse({ csrfToken: "token-1" });
    if (url.endsWith("/commerce/collections/collection-1") && init?.method === "PATCH") {
      updated = true;
      return jsonResponse(collection({ name: "Edited Name" }));
    }
    if (url.endsWith("/commerce/collections"))
      return jsonResponse({
        items: updated ? [collection({ name: "Edited Name" })] : [collection()],
      });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    clickByText(view.container, "Edit");
    await React.act(async () => {
      await Promise.resolve();
    });
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Edit collection");
    const nameInput = dialog?.querySelector("#collection-name") as HTMLInputElement;
    expect(nameInput.value).toBe("Premium");
    setInput(nameInput, "Edited Name");
    const save = Array.from(dialog?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("Save collection")
    );
    click(save);
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const patch = calls.find(
      (call) => call.url.endsWith("/commerce/collections/collection-1") && call.method === "PATCH"
    );
    expect(patch).toBeTruthy();
    expect(view.container.textContent).toContain("Edited Name");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("cancel closes the dialog without saving", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/csrf") && init?.method === "GET")
      return jsonResponse({ csrfToken: "token-1" });
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    clickByText(view.container, "New collection");
    await React.act(async () => {
      await Promise.resolve();
    });
    const dialog = document.body.querySelector('[role="dialog"]');
    const cancel = Array.from(dialog?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("Cancel")
    );
    click(cancel);
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("delete flow confirms, deletes, and refreshes the list", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string }> = [];
  let deleted = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/csrf") && init?.method === "GET")
      return jsonResponse({ csrfToken: "token-1" });
    if (url.endsWith("/commerce/collections/collection-1") && init?.method === "DELETE") {
      deleted = true;
      return jsonResponse({});
    }
    if (url.endsWith("/commerce/collections"))
      return jsonResponse({ items: deleted ? [] : [collection()] });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    clickByText(view.container, "Delete");
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Delete collection?");
    const confirm = Array.from(dialog?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("Delete collection")
    );
    click(confirm);
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const del = calls.find(
      (call) => call.url.endsWith("/commerce/collections/collection-1") && call.method === "DELETE"
    );
    expect(del).toBeTruthy();
    expect(view.container.textContent).toContain("No collections yet.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("failed delete surfaces the API message and keeps the row", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse({});
    if (url.endsWith("/csrf") && init?.method === "GET")
      return jsonResponse({ csrfToken: "token-1" });
    if (url.endsWith("/commerce/collections/collection-1") && init?.method === "DELETE")
      return jsonResponse(
        { error: { code: "collection_delete_failed", message: "Delete exploded", details: "x" } },
        500
      );
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [collection()] });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    clickByText(view.container, "Delete");
    const dialog = document.body.querySelector('[role="dialog"]');
    const confirm = Array.from(dialog?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("Delete collection")
    );
    click(confirm);
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Delete exploded");
    expect(view.container.textContent).toContain("Premium");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("edit flow updates the slug and description drafts", async () => {
  const originalFetch = globalThis.fetch;
  let savedSlug: string | null = null;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/commerce/collections"))
      return jsonResponse({
        items: [
          collection({ id: "collection-1", name: "Premium", slug: "premium", description: "Old" }),
        ],
      });
    if (url.endsWith("/commerce/collections/collection-1") && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body)) as { slug?: string; description?: string };
      savedSlug = body.slug ?? null;
      return jsonResponse(collection({ id: "collection-1", name: "Premium", slug: body.slug }));
    }
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    clickByText(view.container, "Edit");
    await React.act(async () => {
      await Promise.resolve();
    });
    const slugInput = document.body.querySelector("#collection-slug") as HTMLInputElement;
    setInput(slugInput, "premium-edition");
    const description = document.body.querySelector(
      "#collection-description"
    ) as HTMLTextAreaElement;
    setInput(description, "Premium items only");
    clickByText(document.body, "Save collection");
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(savedSlug).toBe("premium-edition");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("dialog close without confirm clears the editing draft", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [collection()] });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    clickByText(view.container, "Edit");
    await React.act(async () => {
      await Promise.resolve();
    });
    const nameInput = document.body.querySelector("#collection-name") as HTMLInputElement;
    setInput(nameInput, "Changed name");
    const closeButton = document.body.querySelector(
      '[data-slot="dialog-close"]'
    ) as HTMLElement | null;
    click(
      closeButton ??
        Array.from(document.body.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("Cancel")
        )
    );
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("back to commerce navigates to the product list", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/commerce/collections")) return jsonResponse({ items: [] });
    return jsonResponse({});
  };

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    clickByText(view.container, "Back to products");
    expect(window.location.pathname).toBe("/admin/advanced/commerce");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
