// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

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
