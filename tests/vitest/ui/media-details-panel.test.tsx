// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { MediaDetailsPanel } from "../../../core/admin/ui/media/MediaDetailsPanel";
import type { MediaItem } from "../../../core/admin/ui/media/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    readOnly,
  }: {
    value?: string;
    readOnly?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <input value={value} readOnly={readOnly} onChange={onChange} />
      {!readOnly ? (
        <button
          type="button"
          data-input-value={value}
          onClick={() =>
            onChange?.({
              target: {
                value: value === "Workspace Shot" ? "Updated title" : "Updated alt",
              },
            } as React.ChangeEvent<HTMLInputElement>)
          }
        >
          change-input
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  }) => (
    <div>
      <textarea value={value} onChange={onChange} />
      <button
        type="button"
        data-textarea-action="change-caption"
        onClick={() =>
          onChange?.({
            target: { value: "Updated caption" },
          } as React.ChangeEvent<HTMLTextAreaElement>)
        }
      >
        change-caption
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

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

const sampleItem: MediaItem = {
  id: "media-42",
  name: "workspace-shot.jpg",
  originalName: "workspace-original.jpg",
  type: "image",
  sizeBytes: 1_240_000,
  url: "/media/workspace-shot.jpg",
  mimeType: "image/jpeg",
  createdAt: "2026-01-20T09:12:00Z",
  width: 2400,
  height: 1600,
  title: "Workspace Shot",
  alt: "Developer desk",
  caption: "A minimalist workspace",
};

test("MediaDetailsPanel renders empty state when no item is selected", () => {
  const html = document.createElement("div");
  const root = createRoot(html);

  act(() => {
    root.render(
      <MediaDetailsPanel
        item={null}
        onSave={() => undefined}
        onDelete={() => undefined}
        onCopy={() => undefined}
        onOpen={() => undefined}
      />
    );
  });

  expect(html.textContent).toContain("Select an asset to see details");

  act(() => {
    root.unmount();
  });
});

test("MediaDetailsPanel forwards edited metadata and action callbacks", () => {
  const onSave = vi.fn();
  const onDelete = vi.fn();
  const onCopy = vi.fn();
  const onOpen = vi.fn();
  const view = mount(
    <MediaDetailsPanel
      item={sampleItem}
      onSave={onSave}
      onDelete={onDelete}
      onCopy={onCopy}
      onOpen={onOpen}
    />
  );

  try {
    const inputs = Array.from(view.container.querySelectorAll("input"));
    expect((inputs[1] as HTMLInputElement | null | undefined)?.value).toBe(
      "workspace-original.jpg"
    );
    expect(view.container.textContent).toContain("2400 x 1600");

    act(() => {
      Array.from(view.container.querySelectorAll("button[data-input-value]"))
        .forEach((button) =>
          button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
        );
      view.container
        .querySelector("button[data-textarea-action='change-caption']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const clickByText = (label: string) =>
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent?.includes(label)
      );

    act(() => {
      clickByText("Save Changes")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      clickByText("Copy Link")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      clickByText("Open in new tab")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      view.container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSave).toHaveBeenCalledWith("media-42", {
      title: "Updated title",
      alt: "Updated alt",
      caption: "Updated caption",
    });
    expect(onCopy).toHaveBeenCalledWith("/media/workspace-shot.jpg");
    expect(onOpen).toHaveBeenCalledWith("/media/workspace-shot.jpg");
    expect(onDelete).toHaveBeenCalledWith("media-42");
  } finally {
    view.cleanup();
  }
});
