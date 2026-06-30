// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  AuthoringCommandPalette,
  AuthoringLayersPanel,
  isSameAuthoringSelection,
  type AuthoringCommandGroup,
  type AuthoringLayerNode,
} from "../../../core/admin/ui/authoring";

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

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

// TASK-496-02: the dark canvas-frame + floating-toolbar primitives were retired
// (Screens now render through the shared `CanvasEditor` shell), so their
// render/hook case is dropped here. The surviving authoring LOGIC modules
// (AuthoringLayersPanel / AuthoringCommandPalette / isSameAuthoringSelection)
// keep their coverage below.

test("AuthoringLayersPanel selects nested section and block targets", () => {
  const onSelect = vi.fn();
  const nodes: AuthoringLayerNode[] = [
    {
      id: "section-1",
      label: "Details",
      kind: "section",
      type: "section",
      target: { kind: "section", id: "section-1" },
      children: [
        {
          id: "field-1",
          label: "Headline",
          kind: "block",
          type: "field",
          target: { kind: "block", sectionId: "section-1", id: "field-1" },
        },
      ],
    },
  ];
  const view = mount(
    <AuthoringLayersPanel
      nodes={nodes}
      selection={{ kind: "block", sectionId: "section-1", id: "field-1" }}
      onSelect={onSelect}
    />
  );

  try {
    expect(
      view.container
        .querySelector('[data-authoring-layer-node="field-1"]')
        ?.getAttribute("aria-selected")
    ).toBe("true");

    React.act(() => {
      view.container
        .querySelector('[data-authoring-layer-node="section-1"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onSelect).toHaveBeenCalledWith({ kind: "section", id: "section-1" });
  } finally {
    view.cleanup();
  }
});

test("AuthoringCommandPalette filters input and runs enabled commands", () => {
  const run = vi.fn();
  const close = vi.fn();
  const onQueryChange = vi.fn();
  const groups: AuthoringCommandGroup[] = [
    {
      id: "blocks",
      label: "Blocks",
      commands: [
        {
          id: "field",
          label: "Field",
          description: "Add a field",
          run,
        },
      ],
    },
  ];
  const view = mount(
    <AuthoringCommandPalette
      groups={groups}
      query=""
      activeIndex={0}
      onQueryChange={onQueryChange}
      onClose={close}
    />
  );

  try {
    const input = view.container.querySelector("input");
    React.act(() => {
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(document.body.querySelector("[data-authoring-command-palette]")).not.toBeNull();

    React.act(() => {
      document.body
        .querySelector('[data-authoring-command-active="true"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(run).toHaveBeenCalledTimes(1);

    React.act(() => {
      Array.from(document.body.querySelectorAll("button"))
        .find((button) => button.textContent === "Close")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(close).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("isSameAuthoringSelection compares block section ownership", () => {
  expect(
    isSameAuthoringSelection(
      { kind: "block", sectionId: "section-a", id: "field-1" },
      { kind: "block", sectionId: "section-a", id: "field-1" }
    )
  ).toBe(true);
  expect(
    isSameAuthoringSelection(
      { kind: "block", sectionId: "section-a", id: "field-1" },
      { kind: "block", sectionId: "section-b", id: "field-1" }
    )
  ).toBe(false);
});
