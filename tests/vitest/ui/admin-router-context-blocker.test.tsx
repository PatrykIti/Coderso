// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function BlockerHarness({ block }: { block: boolean }) {
  const router = useAdminRouter();

  React.useEffect(() => {
    if (!block) return undefined;
    return router.registerBlocker(() => false);
  }, [block, router]);

  return (
    <div>
      <span data-testid="path">{router.path}</span>
      <button type="button" onClick={() => router.navigate("/admin/settings/security")}>
        Navigate security
      </button>
    </div>
  );
}

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

function RouterHarness() {
  const router = useAdminRouter();
  return (
    <div>
      <span data-testid="path">{router.path}</span>
      <button
        type="button"
        data-action="external"
        onClick={() => router.navigate("https://example.com/foo")}
      >
        External
      </button>
      <button
        type="button"
        data-action="replace"
        onClick={() => router.replace("/admin/settings/security")}
      >
        Replace
      </button>
    </div>
  );
}

const originalAssign = window.location.assign;

afterEach(() => {
  window.location.assign = originalAssign;
});

test("AdminRouterProvider navigation blockers stop SPA navigate calls", () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <BlockerHarness block />
    </AdminRouterProvider>
  );

  try {
    const button = view.container.querySelector("button");
    if (!button) throw new Error("Missing navigation action");

    React.act(() => {
      button.click();
    });

    expect(view.container.querySelector('[data-testid="path"]')?.textContent).toBe(
      "/admin/settings/general"
    );
    expect(window.location.pathname).toBe("/admin/settings/general");
  } finally {
    view.cleanup();
  }
});

test("AdminRouterProvider navigation blockers restore blocked popstate transitions", () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  window.history.pushState({}, "", "/admin/settings/security");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <BlockerHarness block />
    </AdminRouterProvider>
  );

  try {
    window.history.replaceState({}, "", "/admin/settings/general");
    React.act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(view.container.querySelector('[data-testid="path"]')?.textContent).toBe(
      "/admin/settings/security"
    );
    expect(window.location.pathname).toBe("/admin/settings/security");
  } finally {
    view.cleanup();
  }
});

test("AdminRouterProvider derives the initial path from window.location without initialPath", () => {
  window.history.replaceState({}, "", "/admin/settings/general?tab=basic#top");
  const view = mount(
    <AdminRouterProvider>
      <RouterHarness />
    </AdminRouterProvider>
  );

  try {
    expect(view.container.querySelector('[data-testid="path"]')?.textContent).toBe(
      "/admin/settings/general?tab=basic#top"
    );
  } finally {
    view.cleanup();
  }
});

test("AdminRouterProvider popstate on the current path keeps the route", () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <RouterHarness />
    </AdminRouterProvider>
  );

  try {
    React.act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(view.container.querySelector('[data-testid="path"]')?.textContent).toBe(
      "/admin/settings/general"
    );
    expect(window.location.pathname).toBe("/admin/settings/general");
  } finally {
    view.cleanup();
  }
});

test("AdminRouterProvider popstate on a new path updates the route when unblocked", () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <RouterHarness />
    </AdminRouterProvider>
  );

  try {
    window.history.pushState({}, "", "/admin/settings/security");
    React.act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(view.container.querySelector('[data-testid="path"]')?.textContent).toBe(
      "/admin/settings/security"
    );
    expect(window.location.pathname).toBe("/admin/settings/security");
  } finally {
    view.cleanup();
  }
});

test("AdminRouterProvider delegates external hrefs to window.location.assign", () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const assigned: string[] = [];
  window.location.assign = ((href: string) => {
    assigned.push(href);
  }) as unknown as typeof window.location.assign;

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <RouterHarness />
    </AdminRouterProvider>
  );

  try {
    const button = view.container.querySelector('[data-action="external"]');
    if (!button) throw new Error("Missing external action");

    React.act(() => {
      (button as HTMLElement).click();
    });

    expect(assigned).toEqual(["https://example.com/foo"]);
    // The external branch returns before syncing, so the SPA route is untouched.
    expect(view.container.querySelector('[data-testid="path"]')?.textContent).toBe(
      "/admin/settings/general"
    );
    expect(window.location.pathname).toBe("/admin/settings/general");
  } finally {
    view.cleanup();
  }
});

test("AdminRouterProvider replace navigation rewrites the current history entry", () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <RouterHarness />
    </AdminRouterProvider>
  );

  try {
    const initialLength = window.history.length;
    const button = view.container.querySelector('[data-action="replace"]');
    if (!button) throw new Error("Missing replace action");

    React.act(() => {
      (button as HTMLElement).click();
    });

    // replaceState keeps the history length; a pushState would grow it.
    expect(window.history.length).toBe(initialLength);
    expect(window.location.pathname).toBe("/admin/settings/security");
    expect(view.container.querySelector('[data-testid="path"]')?.textContent).toBe(
      "/admin/settings/security"
    );
  } finally {
    view.cleanup();
  }
});
