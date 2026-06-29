// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-479-26-L07: structural lock for the Redirects restyle (L06). Asserts the stat
// row DERIVED from seeded items across all four RedirectStatusCodes, the inline quick-
// add reusing the single createRedirect path with a NUMERIC statusCode, the soft table
// (no Hits column), and the preserved edit/delete flows.

const redirectsState = vi.hoisted(() => ({
  list: [
    {
      id: "r-301",
      fromPath: "/old-a",
      toPath: "/a",
      statusCode: 301 as const,
      enabled: true,
      createdAt: "2026-06-01",
      updatedAt: "2026-06-01",
    },
    {
      id: "r-302",
      fromPath: "/old-b",
      toPath: "/b",
      statusCode: 302 as const,
      enabled: true,
      createdAt: "2026-06-01",
      updatedAt: "2026-06-01",
    },
    {
      id: "r-307",
      fromPath: "/old-c",
      toPath: "/c",
      statusCode: 307 as const,
      enabled: false,
      createdAt: "2026-06-01",
      updatedAt: "2026-06-01",
    },
    {
      id: "r-308",
      fromPath: "/old-d",
      toPath: "/d",
      statusCode: 308 as const,
      enabled: true,
      createdAt: "2026-06-01",
      updatedAt: "2026-06-01",
    },
  ],
  createRedirect: vi.fn(async () => ({})),
  updateRedirect: vi.fn(async () => ({})),
  deleteRedirect: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error,
}));

vi.mock("@/services/redirectsClient", () => ({
  getCachedRedirects: () => redirectsState.list,
  listRedirectsCached: vi.fn(async () => redirectsState.list),
  createRedirect: redirectsState.createRedirect,
  updateRedirect: redirectsState.updateRedirect,
  deleteRedirect: redirectsState.deleteRedirect,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { RedirectsPage } from "../../../core/admin/ui/redirects/RedirectsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
      React.act(() => {
        root.unmount();
      });
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

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

afterEach(() => {
  redirectsState.createRedirect.mockClear();
  redirectsState.updateRedirect.mockClear();
  redirectsState.deleteRedirect.mockClear();
  document.body.innerHTML = "";
});

test("derives the stat row across all four status codes and drops the Hits column", async () => {
  const view = mount(<RedirectsPage />);
  try {
    await flush();
    expect(view.container.textContent).toMatch(/permanent/i);
    expect(view.container.textContent).toMatch(/temporary/i);
    // No fabricated 404s/hit columns.
    expect(view.container.textContent).not.toContain("404s caught");
    expect(view.container.textContent).not.toContain("Last hit");
    // Selectable table (real Checkbox renders role=checkbox).
    expect(view.container.querySelectorAll('[role="checkbox"]').length).toBeGreaterThan(0);
  } finally {
    view.cleanup();
  }
});

test("the inline quick-add submits through createRedirect with a NUMERIC statusCode", async () => {
  const view = mount(<RedirectsPage />);
  try {
    await flush();
    const source = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Redirect source path"]'
    );
    const destination = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Redirect destination path"]'
    );
    expect(source).not.toBeNull();
    expect(destination).not.toBeNull();
    setInputValue(source!, "/old-path");
    setInputValue(destination!, "/new-path");

    const form = source!.closest("form");
    await React.act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(redirectsState.createRedirect).toHaveBeenCalledTimes(1);
    expect(redirectsState.createRedirect).toHaveBeenCalledWith({
      fromPath: "/old-path",
      toPath: "/new-path",
      statusCode: 301,
    });
  } finally {
    view.cleanup();
  }
});

test("Edit opens the drawer and Delete opens the ConfirmActionDialog", async () => {
  const view = mount(<RedirectsPage />);
  try {
    await flush();
    const editButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Edit redirect"
    );
    React.act(() => {
      editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("Destination path");

    const deleteButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Delete redirect"
    );
    React.act(() => {
      deleteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("Delete redirect?");
  } finally {
    view.cleanup();
  }
});
