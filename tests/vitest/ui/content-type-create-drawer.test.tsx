// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const drawerState = vi.hoisted(() => ({
  createContentType: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/contentTypesClient", () => ({
  createContentType: drawerState.createContentType,
}));

import { ContentTypeCreateDrawer } from "../../../core/admin/ui/content-types/ContentTypeCreateDrawer";

const mount = (node: React.ReactNode) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  React.act(() => {
    root.render(node);
  });
  return {
    host,
    cleanup: () => {
      React.act(() => root.unmount());
      host.remove();
    },
  };
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  drawerState.createContentType.mockReset();
  document.body.innerHTML = "";
});

test("ContentTypeCreateDrawer keeps local duplicate validation inline-only", async () => {
  const onCreateError = vi.fn();
  const view = mount(
    <ContentTypeCreateDrawer
      open
      onOpenChange={vi.fn()}
      existingTypes={[{ name: "Articles", slug: "articles" }]}
      onCreateError={onCreateError}
    />
  );

  try {
    await React.act(async () => {
      setInputValue(view.host.querySelector('input[placeholder="Blog Post"]'), "Articles");
      await Promise.resolve();
    });

    expect(view.host.textContent).toContain("This name is already used by another content type.");
    expect(drawerState.createContentType).not.toHaveBeenCalled();
    expect(onCreateError).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ContentTypeCreateDrawer reports rejected create mutations locally and through callback", async () => {
  const apiError = {
    name: "ApiClientError",
    message: "Create denied.",
    code: "request_failed",
    status: 409,
  };
  drawerState.createContentType.mockRejectedValueOnce(apiError);
  const onCreateError = vi.fn();
  const view = mount(
    <ContentTypeCreateDrawer
      open
      onOpenChange={vi.fn()}
      existingTypes={[]}
      onCreateError={onCreateError}
    />
  );

  try {
    await React.act(async () => {
      setInputValue(view.host.querySelector('input[placeholder="Blog Post"]'), "Article");
      await Promise.resolve();
    });

    await React.act(async () => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "Create Collection")
        ?.click();
      await Promise.resolve();
    });

    expect(drawerState.createContentType).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Article",
        slug: "article",
        status: "draft",
      })
    );
    expect(view.host.textContent).toContain("Create denied.");
    expect(onCreateError).toHaveBeenCalledWith(apiError);
  } finally {
    view.cleanup();
  }
});
