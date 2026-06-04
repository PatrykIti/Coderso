// @vitest-environment happy-dom

import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { lazyNamedRoute } from "../../../core/admin/app/adminRouteComponents";

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
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("lazyNamedRoute does not call the loader when the descriptor is created", () => {
  const loader = vi.fn(async () => ({
    ExampleRoute: () => <div>Example route</div>,
  }));

  const route = lazyNamedRoute(loader, "ExampleRoute");

  expect(loader).not.toHaveBeenCalled();
  expect(typeof route.preload).toBe("function");
});

test("lazyNamedRoute caches preload promises for named exports", async () => {
  const loader = vi.fn(async () => ({
    ExampleRoute: () => <div>Example route</div>,
  }));
  const route = lazyNamedRoute(loader, "ExampleRoute");

  const [first, second] = await Promise.all([route.preload(), route.preload()]);

  expect(loader).toHaveBeenCalledTimes(1);
  expect(first).toBe(second);
  expect(first.default).toBeTypeOf("function");
});

test("lazyNamedRoute shares the preload promise with React.lazy", async () => {
  const loader = vi.fn(async () => ({
    ExampleRoute: ({ label }: { label: string }) => <div>{label}</div>,
  }));
  const route = lazyNamedRoute<{ label: string }>(loader, "ExampleRoute");
  await route.preload();

  const view = mount(
    <Suspense fallback={<div>Loading route</div>}>
      <route.Component label="Loaded route" />
    </Suspense>
  );

  try {
    await flush();
    expect(view.container.textContent).toContain("Loaded route");
    expect(loader).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("lazyNamedRoute fails clearly when a named export is missing", async () => {
  const route = lazyNamedRoute(async () => ({}), "MissingRoute");

  await expect(route.preload()).rejects.toThrow("admin_route_export_missing:MissingRoute");
});
