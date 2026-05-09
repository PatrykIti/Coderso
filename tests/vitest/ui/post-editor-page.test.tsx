// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { PostEditorPage, resolvePostEditorMode } from "../../../core/admin/ui/posts/PostEditorPage";

const postEditorPageState = vi.hoisted(() => ({
  path: "/admin/posts/post-1",
  getSetting: vi.fn(async () => ({ value: null as unknown })),
  reset() {
    this.path = "/admin/posts/post-1";
    this.getSetting.mockReset();
    this.getSetting.mockResolvedValue({ value: null });
  },
}));

vi.mock("@/services/settingsClient", async () => {
  const actual = await vi.importActual<typeof import("@/services/settingsClient")>(
    "@/services/settingsClient"
  );
  return {
    ...actual,
    getSetting: postEditorPageState.getSetting,
  };
});

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    path: postEditorPageState.path,
  }),
}));

vi.mock("../../../core/admin/ui/posts/editor/PostClassicEditorShell", () => ({
  PostClassicEditorShell: () => <div>classic-shell</div>,
}));

vi.mock("../../../core/admin/ui/posts/editor/PostBlockEditorShell", () => ({
  PostBlockEditorShell: () => <div>block-shell</div>,
}));

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

test("PostEditorPage renders block editor shell by default", () => {
  postEditorPageState.reset();
  const view = mount(<PostEditorPage />);

  try {
    expect(view.container.textContent).toContain("block-shell");
  } finally {
    view.cleanup();
  }
});

test("PostEditorPage supports query override for classic editor", () => {
  postEditorPageState.reset();
  postEditorPageState.path = "/admin/posts/post-1?editor=classic";
  const view = mount(<PostEditorPage />);

  try {
    expect(view.container.textContent).toContain("classic-shell");
    expect(postEditorPageState.getSetting).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PostEditorPage resolves classic mode from settings and falls back to blocks on settings failure", async () => {
  postEditorPageState.reset();
  postEditorPageState.getSetting.mockResolvedValueOnce({ value: "classic" });
  const classicView = mount(<PostEditorPage />);

  try {
    await flush();
    expect(postEditorPageState.getSetting).toHaveBeenCalledWith("posts.editor.mode");
    expect(classicView.container.textContent).toContain("classic-shell");
  } finally {
    classicView.cleanup();
  }

  postEditorPageState.reset();
  postEditorPageState.getSetting.mockRejectedValueOnce(new Error("boom"));
  const fallbackView = mount(<PostEditorPage />);

  try {
    await flush();
    expect(fallbackView.container.textContent).toContain("block-shell");
  } finally {
    fallbackView.cleanup();
  }
});

test("resolvePostEditorMode prioritizes query override over settings", () => {
  expect(resolvePostEditorMode("/admin/posts/post-1?editor=classic", "blocks")).toBe("classic");
  expect(resolvePostEditorMode("/admin/posts/post-1", "classic")).toBe("classic");
  expect(resolvePostEditorMode("/admin/posts/post-1", "invalid")).toBe("blocks");
});
