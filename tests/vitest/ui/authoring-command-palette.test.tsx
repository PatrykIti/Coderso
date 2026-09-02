// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="palette-dialog">{children}</div> : null,
  DialogContent: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { AuthoringCommandPalette } from "../../../core/admin/ui/authoring/AuthoringCommandPalette";
import type { AuthoringCommandGroup } from "../../../core/admin/ui/authoring/authoringCommands";

const groups = (
  overrides: {
    disabledIndex?: number;
    noIcon?: number;
  } = {}
): AuthoringCommandGroup[] => [
  {
    id: "blocks",
    label: "Blocks",
    commands: [
      {
        id: "hero",
        label: "Hero block",
        description: "Big headline section",
        icon: () => null,
        run: async () => undefined,
      },
      overrides.noIcon === 0
        ? { id: "text", label: "Text block", run: async () => undefined }
        : {
            id: "text",
            label: "Text block",
            description: "Rich text",
            icon: () => null,
            enabled: false,
            run: async () => undefined,
          },
    ],
  },
  {
    id: "fields",
    label: "Fields",
    commands: [
      {
        id: "title",
        label: "Title field",
        description: "Entry title input",
        run: async () => undefined,
      },
    ],
  },
];

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

describe("AuthoringCommandPalette", () => {
  it("renders grouped commands with descriptions and the active highlight", () => {
    const onQueryChange = vi.fn();
    const onClose = vi.fn();
    const view = mount(
      <AuthoringCommandPalette
        groups={groups()}
        query=""
        activeIndex={2}
        onQueryChange={onQueryChange}
        onClose={onClose}
      />
    );
    expect(view.container.textContent).toContain("Blocks");
    expect(view.container.textContent).toContain("Fields");
    expect(view.container.textContent).toContain("Hero block");
    expect(view.container.textContent).toContain("Big headline section");

    const activeButton = view.container.querySelector("[data-authoring-command-active='true']")!;
    expect(activeButton.getAttribute("aria-current")).toBe("true");
    expect(activeButton.textContent).toContain("Title field");

    // disabled commands render non-interactive
    const textButton = Array.from(view.container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Text block")
    ) as HTMLButtonElement;
    expect(textButton.disabled).toBe(true);

    // close via footer button
    clickClose(view.container, onClose);
    view.unmount();
  });

  it("query changes flow through onQueryChange and Enter/click runs commands", async () => {
    const runSpy = vi.fn(async () => undefined);
    const customGroups: AuthoringCommandGroup[] = [
      {
        id: "g",
        label: "G",
        commands: [
          { id: "cmd", label: "Run me", description: "d", run: runSpy },
          { id: "cmd2", label: "Second", run: runSpy },
        ],
      },
    ];
    const onQueryChange = vi.fn();
    const onKeyDown = vi.fn();
    const view = mount(
      <AuthoringCommandPalette
        groups={customGroups}
        query="ru"
        activeIndex={0}
        placeholder="Find actions"
        onQueryChange={onQueryChange}
        onKeyDown={onKeyDown}
        onClose={() => undefined}
      />
    );

    const input = view.container.querySelector<HTMLInputElement>("input")!;
    expect(input.value).toBe("ru");
    expect(input.placeholder).toBe("Find actions");

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("value setter unavailable");
    setter.call(input, "run me");
    React.act(() => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onQueryChange).toHaveBeenLastCalledWith("run me");

    React.act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onKeyDown).toHaveBeenCalledTimes(1);

    clickCommand(view.container, "Run me");
    await Promise.resolve();
    expect(runSpy).toHaveBeenCalled();
    view.unmount();
  });

  it("commands without icons render without an icon node and Close triggers onClose", () => {
    const onClose = vi.fn();
    const view = mount(
      <AuthoringCommandPalette
        groups={groups({ noIcon: 0 })}
        query=""
        activeIndex={-1}
        onQueryChange={() => undefined}
        onClose={onClose}
      />
    );
    const textButton = Array.from(view.container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Text block")
    )!;
    // enabled when enabled flag is absent even without an icon
    expect((textButton as HTMLButtonElement).disabled).toBe(false);
    clickClose(view.container, onClose);
    view.unmount();
  });

  it("a dialog dismissal flows through onOpenChange and calls onClose", async () => {
    let paletteOnOpenChange: ((open: boolean) => void) | null = null;

    vi.doMock("@/components/ui/dialog", () => ({
      Dialog: ({
        children,
        open,
        onOpenChange,
      }: {
        children?: React.ReactNode;
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
      }) => {
        paletteOnOpenChange = onOpenChange ?? null;
        return open ? <div data-testid="palette-dialog">{children}</div> : null;
      },
      DialogContent: ({
        children,
        ...props
      }: {
        children?: React.ReactNode;
        [key: string]: unknown;
      }) => <div {...props}>{children}</div>,
      DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
      DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
      DialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    }));

    vi.resetModules();
    const { AuthoringCommandPalette: FreshPalette } =
      await import("../../../core/admin/ui/authoring/AuthoringCommandPalette");
    const onClose = vi.fn();
    const view = mount(
      <FreshPalette
        groups={groups()}
        query=""
        activeIndex={0}
        onQueryChange={() => undefined}
        onClose={onClose}
      />
    );
    try {
      expect(paletteOnOpenChange).toBeInstanceOf(Function);
      React.act(() => {
        paletteOnOpenChange?.(false);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      view.unmount();
      vi.doUnmock("@/components/ui/dialog");
    }
  });
});

function clickClose(container: HTMLElement, onClose: (value?: unknown) => unknown) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === "Close"
  );
  if (!button) throw new Error("missing Close");
  React.act(() => {
    button.click();
  });
  expect(onClose).toHaveBeenCalledTimes(1);
}

function clickCommand(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing command ${label}`);
  React.act(() => {
    (button as HTMLElement).click();
  });
}
