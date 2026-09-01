// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { InlineEditWrapper } from "../../../core/admin/ui/authoring/InlineEditWrapper";

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

describe("InlineEditWrapper", () => {
  it("renders read-only content through the configured tag without editing affordances", () => {
    const onCommit = vi.fn();
    const view = mount(
      <InlineEditWrapper
        value="Static title"
        editable={false}
        onCommit={onCommit}
        as="h2"
        readOnlyClassName="opacity-70"
      />
    );
    const node = view.container.querySelector("h2")!;
    expect(node.textContent).toBe("Static title");
    expect(node.className).toContain("opacity-70");
    expect(node.getAttribute("contenteditable")).toBeNull();
    expect(onCommit).not.toHaveBeenCalled();
    view.unmount();
  });

  it("falls back to the placeholder text when the value is empty", () => {
    const view = mount(
      <InlineEditWrapper
        value=""
        editable={false}
        onCommit={() => undefined}
        placeholder="Untitled"
      />
    );
    expect(view.container.firstElementChild!.textContent).toBe("Untitled");
    view.unmount();
  });

  it("renders an editable textbox bound to commit-on-blur", () => {
    const onCommit = vi.fn();
    const view = mount(
      <InlineEditWrapper value="Draft title" editable onCommit={onCommit} ariaLabel="Title" />
    );
    const node = view.container.querySelector("[role='textbox']")!;
    expect(node.getAttribute("aria-label")).toBe("Title");
    expect(node.hasAttribute("data-placeholder")).toBe(false);
    expect(node.textContent).toBe("Draft title");

    // blur with unchanged text must NOT fire a commit (no-op guard)
    React.act(() => {
      node.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(onCommit).not.toHaveBeenCalled();

    // changed text commits on blur
    node.textContent = "Renamed title";
    React.act(() => {
      node.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(onCommit).toHaveBeenCalledWith("Renamed title");
    view.unmount();
  });

  it("Enter commits via blur and stops propagation; Escape reverts and never commits", () => {
    const onCommit = vi.fn();
    const view = mount(<InlineEditWrapper value="Keep" editable onCommit={onCommit} />);
    const node = view.container.querySelector("[role='textbox']")!;

    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    React.act(() => {
      node.dispatchEvent(enterEvent);
    });
    expect(enterEvent.defaultPrevented).toBe(true);

    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    React.act(() => {
      node.dispatchEvent(escapeEvent);
    });
    expect(escapeEvent.defaultPrevented).toBe(true);
    // revert restored the original text before blurring, so no commit fires
    expect(onCommit).not.toHaveBeenCalled();
    view.unmount();
  });

  it("supports custom tags while keeping the same editing contract", () => {
    const onCommit = vi.fn();
    const view = mount(
      <InlineEditWrapper value="Body" editable onCommit={onCommit} as="p" className="text-sm" />
    );
    const node = view.container.querySelector("p[role='textbox']")!;
    expect(node.className).toContain("text-sm");
    expect(node.textContent).toBe("Body");
    view.unmount();
  });
});
