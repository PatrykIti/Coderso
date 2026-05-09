// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

const themeState = vi.hoisted(() => ({
  themeItems: [
    {
      name: "starter",
      version: "1.0.0",
      templates: [],
      tokens: { colors: { accent: "#22c55e" } },
    },
  ],
  pageItems: [
    {
      id: "page-1",
      title: "Home",
      slug: "home",
      status: "published",
      updatedAt: "2026-03-06T10:00:00.000Z",
      author: null,
    },
    {
      id: "page-2",
      title: "Promo",
      slug: "promo",
      status: "draft",
      updatedAt: "2026-03-06T10:00:00.000Z",
      author: null,
    },
  ],
  profileResult: {
    id: "profile-1",
    name: "Storefront",
    description: null,
    themeName: "starter",
    tokens: { colors: { primary: "#111111" } },
    isActive: true,
    routes: [{ id: "route-1", path: "/", pageId: "page-1" }],
    createdAt: "2026-03-06T10:00:00.000Z",
    updatedAt: "2026-03-06T10:00:00.000Z",
  },
  getProfileError: null as unknown,
  updateProfileError: null as unknown,
  updateRoutesError: null as unknown,
  getThemeProfile: vi.fn(async () => {
    if (themeState.getProfileError) throw themeState.getProfileError;
    return themeState.profileResult;
  }),
  listThemes: vi.fn(async () => ({ items: themeState.themeItems })),
  updateThemeProfile: vi.fn(async () => {
    if (themeState.updateProfileError) throw themeState.updateProfileError;
    return themeState.profileResult;
  }),
  updateThemeRoutes: vi.fn(async () => {
    if (themeState.updateRoutesError) throw themeState.updateRoutesError;
    return themeState.profileResult;
  }),
  listPagesCached: vi.fn(async () => themeState.pageItems),
  reset() {
    themeState.getProfileError = null;
    themeState.updateProfileError = null;
    themeState.updateRoutesError = null;
    themeState.getThemeProfile.mockClear();
    themeState.listThemes.mockClear();
    themeState.updateThemeProfile.mockClear();
    themeState.updateThemeRoutes.mockClear();
    themeState.listPagesCached.mockClear();
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error && error.kind === "api",
}));

vi.mock("@/services/themeClient", () => ({
  getThemeProfile: themeState.getThemeProfile,
  listThemes: themeState.listThemes,
  updateThemeProfile: themeState.updateThemeProfile,
  updateThemeRoutes: themeState.updateThemeRoutes,
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: themeState.listPagesCached,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    topbarActions,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    topbarActions?: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div>{topbarActions}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/themes/ThemePreviewPanel", () => ({
  ThemePreviewPanel: () => <div>preview-panel</div>,
}));

vi.mock("../../../core/admin/ui/themes/ThemeExportDialog", () => ({
  ThemeExportDialog: ({ open }: { open: boolean }) => (
    <div>{open ? "export:open" : "export:closed"}</div>
  ),
}));

vi.mock("../../../core/admin/ui/themes/ThemeTokensEditor", () => ({
  ThemeTokensEditor: ({
    draft,
    error,
    routes,
    routesError,
    onDraftChange,
    onRoutesChange,
  }: {
    draft: string;
    error: string | null;
    routes: Array<{ id: string; path: string; pageId: string | null }>;
    routesError?: string | null;
    onDraftChange: (value: string) => void;
    onRoutesChange: (next: Array<{ id: string; path: string; pageId: string | null }>) => void;
  }) => (
    <div>
      <span>{draft}</span>
      <span>{error}</span>
      <span>{routesError}</span>
      <span>{`routes:${routes.length}`}</span>
      <button type="button" onClick={() => onDraftChange("{")}>
        invalid-draft
      </button>
      <button
        type="button"
        onClick={() =>
          onDraftChange(
            JSON.stringify(
              {
                colors: { primary: "#ff0000" },
              },
              null,
              2
            )
          )
        }
      >
        valid-draft
      </button>
      <button
        type="button"
        onClick={() =>
          onRoutesChange([...routes, { id: "route-2", path: "promo", pageId: "page-2" }])
        }
      >
        add-route
      </button>
    </div>
  ),
}));

import { ThemeEditorPage } from "../../../core/admin/ui/themes/ThemeEditorPage";

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

test("ThemeEditorPage handles invalid draft, reset, export, and save flows", async () => {
  themeState.reset();
  const dispatchSpy = vi.spyOn(window, "dispatchEvent");
  const view = mount(
    <ThemeEditorPage profileId="profile-1" initialProfile={themeState.profileResult} />
  );

  try {
    expect(view.container.textContent).toContain("Theme Editor");
    expect(view.container.textContent).toContain("Live");
    expect(view.container.textContent).toContain("preview-panel");
    expect(view.container.textContent).toContain("routes:1");
    expect(view.container.textContent).toContain("export:closed");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "invalid-draft")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Invalid JSON");
    const saveButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save Changes")
    );
    expect(saveButton?.hasAttribute("disabled")).toBe(true);

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "valid-draft")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "add-route")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("routes:2");
    expect(saveButton?.hasAttribute("disabled")).toBe(false);

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Export")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("export:open");

    await React.act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(themeState.updateThemeProfile).toHaveBeenCalledWith("profile-1", {
      tokens: { colors: { primary: "#ff0000" } },
    });
    expect(themeState.updateThemeRoutes).toHaveBeenCalledWith("profile-1", [
      { path: "/", pageId: "page-1" },
      { path: "/promo", pageId: "page-2" },
    ]);
    expect(themeState.getThemeProfile).toHaveBeenCalledWith("profile-1");
    expect(dispatchSpy).toHaveBeenCalled();

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "add-route")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("routes:2");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Reset")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("routes:1");
  } finally {
    dispatchSpy.mockRestore();
    view.cleanup();
    themeState.reset();
  }
});

test("ThemeEditorPage loads from the route path and surfaces API load errors", async () => {
  themeState.reset();
  themeState.getProfileError = { kind: "api", message: "Theme load failed" };
  window.history.replaceState({}, "", "/admin/themes/profile-1");

  const view = mount(<ThemeEditorPage />);

  try {
    await flush();

    expect(themeState.getThemeProfile).toHaveBeenCalledWith("profile-1");
    expect(view.container.textContent).toContain("Theme load failed");
  } finally {
    view.cleanup();
    themeState.reset();
  }
});
