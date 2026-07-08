// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { LayerBlockRows } from "../../../core/admin/ui/pages/editor/PageEditorLayers";
import { PageEditorPage } from "../../../core/admin/ui/pages/PageEditorPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

test("LayerBlockRows renders nested slots and selected row actions", () => {
  const nestedText = createPageBlockV2("text", {
    id: "blk-nested-text",
    props: { text: "Nested text", format: "plain", align: "left" },
  });
  const columns = createPageBlockV2("columns", {
    id: "blk-columns",
    props: { count: 2, gap: 24, distribution: "equal" },
    slots: { "column:1": [nestedText], "column:2": [] },
  });
  const section = createPageSectionV2("content", {
    id: "sec-layers",
    blocks: [columns],
  });

  const html = renderToStaticMarkup(
    <LayerBlockRows
      section={section}
      blocks={section.blocks}
      ownerPath={null}
      selectedBlockPath={[{ index: 0 }]}
      canAddBeside
      device="desktop"
      onSelectBlock={vi.fn()}
      onAddToTarget={vi.fn()}
      onMoveToTarget={vi.fn()}
      onAddBeside={vi.fn()}
    />
  );

  expect(html).toContain('data-page-editor-layer-block-id="blk-columns"');
  expect(html).toContain("columns");
  expect(html).toContain("Column 1");
  expect(html).toContain("Column 2");
  expect(html).toContain('data-page-editor-layer-slot-key="column:1"');
  expect(html).toContain('data-page-editor-layer-block-id="blk-nested-text"');
  expect(html).toContain("Beside");
  expect(html).toContain("Move here");
  expect(html).toContain("Empty");
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mountPageEditor() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <PageEditorPage />
      </AdminRouterProvider>
    );
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
}

function findButtonByText(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!button) {
    throw new Error(`Button with label "${label}" not found`);
  }
  return button;
}

afterEach(() => {
  document.body.innerHTML = "";
});

test("live PageEditor Layers popover scroll-contains the section list", () => {
  const { container, cleanup } = mountPageEditor();

  try {
    // The Layers popover is closed by default; open it via the live toggle.
    expect(container.querySelector('[data-page-editor-layers-panel="true"]')).toBeNull();

    const layersToggle = findButtonByText(container, "Layers");
    React.act(() => {
      layersToggle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    const panel = container.querySelector<HTMLElement>('[data-page-editor-layers-panel="true"]');
    expect(panel).not.toBeNull();

    // Container self-bounds via max-h + flex column + overflow-hidden so an
    // absolute popover can scroll without a bounded-height flex ancestor.
    const panelClass = panel!.className;
    expect(panelClass).toContain("max-h-[min(72vh,calc(100dvh-8rem))]");
    expect(panelClass).toContain("flex");
    expect(panelClass).toContain("flex-col");
    expect(panelClass).toContain("overflow-hidden");

    // The single scroll region wraps the whole section stack.
    const scrollRegion = panel!.querySelector<HTMLElement>(
      '[data-page-editor-layers-scroll="true"]'
    );
    expect(scrollRegion).not.toBeNull();
    const scrollClass = scrollRegion!.className;
    expect(scrollClass).toContain("min-h-0");
    expect(scrollClass).toContain("flex-1");
    expect(scrollClass).toContain("overflow-y-auto");
    expect(scrollClass).toContain("overscroll-contain");

    // Exactly one overflow-y-auto in the popover subtree — no nested scroll boxes
    // (LayerBlockRows and its recursion add none).
    const overflowNodes = Array.from(panel!.querySelectorAll<HTMLElement>("*")).filter((node) =>
      node.className?.includes?.("overflow-y-auto")
    );
    expect(overflowNodes).toHaveLength(1);
    expect(overflowNodes[0]).toBe(scrollRegion);
  } finally {
    cleanup();
  }
});
