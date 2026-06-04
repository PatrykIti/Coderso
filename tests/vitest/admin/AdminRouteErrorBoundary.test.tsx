// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { AdminRouteErrorBoundary } from "../../../core/admin/app/AdminRouteErrorBoundary";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
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
    rerender: (next: React.ReactNode) => {
      React.act(() => {
        root.render(next);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const FailingRoute = () => {
  throw new Error("Failed to fetch /admin/assets/route.js?token=secret");
};

const suppressExpectedReactBoundaryError = () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("AdminRouteErrorBoundary hides chunk error details and exposes manual reload", () => {
  suppressExpectedReactBoundaryError();
  const reload = vi.fn();
  Object.defineProperty(window.location, "reload", {
    configurable: true,
    value: reload,
  });
  const view = mount(
    <AdminRouteErrorBoundary resetKey="/backups">
      <FailingRoute />
    </AdminRouteErrorBoundary>
  );

  try {
    expect(view.container.textContent).toContain("Admin route failed to load");
    expect(view.container.textContent).toContain("Reload the page");
    expect(view.container.textContent).not.toContain("token=secret");
    const reloadButton = view.container.querySelector("button");
    expect(reloadButton?.textContent).toContain("Reload");

    React.act(() => {
      reloadButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(reload).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("AdminRouteErrorBoundary resets after route key changes", async () => {
  suppressExpectedReactBoundaryError();
  const view = mount(
    <AdminRouteErrorBoundary resetKey="/backups">
      <FailingRoute />
    </AdminRouteErrorBoundary>
  );

  try {
    expect(view.container.textContent).toContain("Admin route failed to load");

    view.rerender(
      <AdminRouteErrorBoundary resetKey="/settings">
        <div>Recovered route</div>
      </AdminRouteErrorBoundary>
    );
    await flush();

    expect(view.container.textContent).toContain("Recovered route");
    expect(view.container.textContent).not.toContain("Admin route failed to load");
  } finally {
    view.cleanup();
  }
});
