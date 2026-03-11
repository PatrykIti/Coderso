// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PagePreview } from "../../../core/admin/ui/pages/PagePreview";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

(
  globalThis as {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const normalizeText = (node: Element | null) =>
  node?.textContent?.replace(/\s+/g, " ").trim() ?? "";

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

test("PagePreview parses preview query parameters", () => {
  window.history.replaceState(
    {},
    "",
    "/admin/page-preview?type=entry&path=%2Fabout&contentType=articles&slug=hello-world&token=token-123"
  );
  const view = mount(<PagePreview />);

  try {
    const text = normalizeText(view.container);

    expect(text).toContain("Preview Mode");
    expect(text).toContain("Preview link details");
    expect(text).toContain("Type: entry");
    expect(text).toContain("Path: /about");
    expect(text).toContain("Content type: articles");
    expect(text).toContain("Slug: hello-world");
    expect(text).toContain("Token: token-123");
  } finally {
    view.cleanup();
  }
});

test("PagePreview defaults to page type and closes the preview window", () => {
  window.history.replaceState({}, "", "/admin/page-preview");
  const closeSpy = vi.spyOn(window, "close").mockImplementation(() => undefined);
  const view = mount(<PagePreview />);

  try {
    const text = normalizeText(view.container);
    expect(text).toContain("Type: page");
    expect(text).not.toContain("Path:");
    expect(text).not.toContain("Content type:");
    expect(text).not.toContain("Slug:");
    expect(text).not.toContain("Token:");

    const closeButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => normalizeText(button) === "Close preview"
    );

    act(() => {
      closeButton?.click();
    });

    expect(closeSpy).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});
