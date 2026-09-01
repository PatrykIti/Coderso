// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import { setActiveAssistantSurfaceContext } from "../../../core/admin/ui/assistant/activeSurfaceContext";
import {
  buildAssistantAdminRuntimeSnapshot,
  useAssistantAdminContext,
} from "../../../core/admin/ui/assistant/useAssistantAdminContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

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

const probeHook = () => {
  let captured: ReturnType<typeof useAssistantAdminContext> | null = null;
  function Probe() {
    captured = useAssistantAdminContext();
    return <span data-testid="probe" />;
  }
  return { Probe, read: () => captured };
};

const mountProbe = (path?: string) => {
  const probe = probeHook();
  const view = path
    ? mount(
        <AdminRouterProvider initialPath={path}>
          <probe.Probe />
        </AdminRouterProvider>
      )
    : mount(<probe.Probe />);
  return { view, probe };
};

const pageSurface = (id: string) => ({
  kind: "page" as const,
  page: { id, title: "Home", slug: "home", status: "published", template: null },
  selectedSectionId: null,
  selectedBlockId: null,
  sections: [],
  warnings: [],
});

const customScreenSurface = (id: string, selectedEntryId: string | null) => ({
  kind: "custom-screen" as const,
  screen: {
    id,
    name: "Bookings",
    status: "published",
    contentTypeId: "bookings",
    showInSidebar: true,
    sidebarLabel: null,
    mode: "table",
  },
  selectedEntryId,
  selectedBlockId: null,
  blocks: [],
  bindings: [],
  writableBindingFields: [],
  warnings: [],
});

const detailPageSurface = () => ({
  kind: "detail-page" as const,
  detailPage: {
    id: "template-a",
    name: "Product template",
    status: "draft",
    contentTypeId: "products",
    contentTypeSlug: "products",
    titlePattern: "{name}",
  },
  sampleEntryId: null,
  selectedBlockId: null,
  blocks: [],
  warnings: [],
});

test("useAssistantAdminContext reads the browser path without a router", () => {
  window.history.replaceState({}, "", "/custom-browser-route");
  const { view, probe } = mountProbe();
  try {
    expect(probe.read()?.page).toMatch(/^\/custom-browser-route\/?$/);
    expect(probe.read()?.runtimeSnapshot?.route).toMatch(/^\/custom-browser-route\/?$/);
  } finally {
    view.cleanup();
  }
});

test("buildAssistantAdminRuntimeSnapshot resolves advanced engine content type resources", () => {
  const snapshot = buildAssistantAdminRuntimeSnapshot({
    route: "/admin/advanced/engine/products",
  });

  expect(snapshot.selectedResource).toEqual({
    kind: "content-type",
    id: "products",
  });
  expect(snapshot.visibleActions).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: "content-type.create" })])
  );
});

test("buildAssistantAdminRuntimeSnapshot resolves advanced entry resources", () => {
  const snapshot = buildAssistantAdminRuntimeSnapshot({
    route: "/admin/advanced/entries/products/entry-42",
  });

  expect(snapshot.selectedResource).toEqual({ kind: "entry", id: "entry-42" });
  expect(snapshot.visibleActions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "entry.create" }),
      expect.objectContaining({ id: "entry.publish" }),
    ])
  );
});

test("buildAssistantAdminRuntimeSnapshot resolves advanced form resources", () => {
  const snapshot = buildAssistantAdminRuntimeSnapshot({
    route: "/admin/advanced/forms/contact",
  });

  expect(snapshot.selectedResource).toEqual({ kind: "form", id: "contact" });
  expect(snapshot.visibleActions).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: "form.create" })])
  );
});

test("buildAssistantAdminRuntimeSnapshot resolves custom screen entry and screen resources", () => {
  const entrySnapshot = buildAssistantAdminRuntimeSnapshot({
    route: "/admin/advanced/custom-screens/bookings/entries/entry-9",
  });
  expect(entrySnapshot.selectedResource).toEqual({
    kind: "custom-screen-entry",
    id: "entry-9",
  });

  const screenSnapshot = buildAssistantAdminRuntimeSnapshot({
    route: "/admin/advanced/custom-screens/bookings",
  });
  expect(screenSnapshot.selectedResource).toEqual({
    kind: "custom-screen",
    id: "bookings",
  });
});

test("useAssistantAdminContext resolves the collection workspace and detail page surface", () => {
  setActiveAssistantSurfaceContext(detailPageSurface());

  const { view, probe } = mountProbe(
    "/admin/advanced/engine/products/collection/detail-template/template-a"
  );
  try {
    const context = probe.read();
    expect(context?.collectionWorkspaceHint).toEqual({
      contentTypeId: "products",
      activeDetailPageId: "template-a",
    });
    expect(context?.activeSurface).toEqual(expect.objectContaining({ kind: "detail-page" }));
  } finally {
    view.cleanup();
  }
});

test("useAssistantAdminContext drops detail page surfaces when ids mismatch", () => {
  setActiveAssistantSurfaceContext(detailPageSurface());

  const { view, probe } = mountProbe(
    "/admin/advanced/engine/products/collection/detail-template/template-other"
  );
  try {
    expect(probe.read()?.activeSurface).toBeNull();
    expect(probe.read()?.collectionWorkspaceHint).toEqual({
      contentTypeId: "products",
      activeDetailPageId: null,
    });
  } finally {
    view.cleanup();
  }
});

test("useAssistantAdminContext keeps page surfaces when ids match", () => {
  setActiveAssistantSurfaceContext(pageSurface("p-1"));

  const { view, probe } = mountProbe("/admin/pages/p-1");
  try {
    expect(probe.read()?.activeSurface).toEqual(expect.objectContaining({ kind: "page" }));
  } finally {
    view.cleanup();
  }
});

test("useAssistantAdminContext drops page surfaces when ids differ", () => {
  setActiveAssistantSurfaceContext(pageSurface("p-other"));

  const { view, probe } = mountProbe("/admin/pages/p-1");
  try {
    expect(probe.read()?.activeSurface).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("useAssistantAdminContext matches custom screen and entry surfaces", () => {
  setActiveAssistantSurfaceContext(customScreenSurface("s-1", "e-9"));

  const screenView = mountProbe("/admin/advanced/custom-screens/s-1");
  try {
    expect(screenView.probe.read()?.activeSurface).toEqual(
      expect.objectContaining({ kind: "custom-screen" })
    );
  } finally {
    screenView.view.cleanup();
  }

  const entryView = mountProbe("/admin/advanced/custom-screens/s-1/entries/e-9");
  try {
    expect(entryView.probe.read()?.activeSurface).toEqual(
      expect.objectContaining({ kind: "custom-screen" })
    );
  } finally {
    entryView.view.cleanup();
  }

  const mismatchView = mountProbe("/admin/advanced/custom-screens/s-1/entries/e-other");
  try {
    expect(mismatchView.probe.read()?.activeSurface).toBeNull();
  } finally {
    mismatchView.view.cleanup();
  }
});

test("useAssistantAdminContext resolves advanced module surfaces for widgets", () => {
  const { view, probe } = mountProbe("/admin/advanced/widgets");
  try {
    const runtimeSnapshot = probe.read()?.runtimeSnapshot;
    if (runtimeSnapshot?.schemaVersion === 2) {
      expect(runtimeSnapshot.advancedModule).toBe("widgets");
    } else {
      throw new Error("expected a schema version 2 runtime snapshot");
    }
  } finally {
    view.cleanup();
  }
});

test("buildAssistantAdminRuntimeSnapshot resolves legacy aliased routes", () => {
  expect(buildAssistantAdminRuntimeSnapshot({ route: "/admin/coderso/posts/slug-1" }).route).toBe(
    "/admin/posts/slug-1"
  );
  expect(buildAssistantAdminRuntimeSnapshot({ route: "/admin/coderso" }).route).toBe(
    "/admin/advanced"
  );
  expect(buildAssistantAdminRuntimeSnapshot({ route: "/admin/content/products" }).route).toBe(
    "/admin/advanced/entries/products"
  );
  expect(buildAssistantAdminRuntimeSnapshot({ route: "/admin/content-types/products" }).route).toBe(
    "/admin/advanced/engine/products"
  );
});
