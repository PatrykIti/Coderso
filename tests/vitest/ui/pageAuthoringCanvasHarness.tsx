import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

/**
 * Shared harness for the page-authoring canvas Vitest suites (TASK-481-01-L03
 * split). Each suite runs under `// @vitest-environment happy-dom`; no RTL /
 * jest-dom / user-event exists in this repo. The callbacks are shared vi.fn()
 * instances exactly as the original suite defined them; tests that assert on a
 * callback pass a fresh vi.fn() override for that prop.
 */
export const baseCanvasProps = {
  device: "desktop" as const,
  canAddBlockBeside: false,
  canvasDataByBlockId: {},
  onSelect: vi.fn(),
  onSelectBlock: vi.fn(),
  onAddBlock: vi.fn(),
  onAddBlockToTarget: vi.fn(),
  onAddBlockBeside: vi.fn(),
  onStartInlineEdit: vi.fn(),
  onCommitInlineEdit: vi.fn(),
  onApplyTextMark: vi.fn(),
  contentBrandTokenVariables: {},
};

/**
 * Live-DOM mount helper: createRoot + flushSync into a fresh detached-in-body
 * container. Every `mount(...)` call must be paired with `cleanup()` (or a
 * try/finally) so the root unmounts and the container is removed.
 */
export const mount = (node: ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      flushSync(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

export { renderToStaticMarkup, createPageBlockV2, createPageSectionV2 };

/**
 * TASK-481-01-L03 fixture: a section carrying (a) a heading block whose brand
 * visual style (`textColor` token var + opacity + radius) must co-locate on the
 * block `data-page-editor-content` scope, and (b) a columns block with a nested
 * slot child whose chrome frame must carry the admin-brand re-assertion.
 */
const brandScopeSection = createPageSectionV2("content", {
  id: "sec-brand-scope",
  name: "Brand scope",
  blocks: [
    createPageBlockV2("heading", {
      id: "blk-brand-heading",
      props: { text: "Brand scope headline", level: "h2", align: "left" },
      style: {
        textColor: "var(--color-accent)",
        opacity: 0.8,
        radius: 12,
      },
    }),
    createPageBlockV2("columns", {
      id: "blk-brand-columns",
      props: { count: 2, gap: 24, distribution: "equal" },
      slots: {
        "column:1": [
          createPageBlockV2("heading", {
            id: "blk-brand-nested",
            props: { text: "Nested brand headline", level: "h3", align: "left" },
          }),
        ],
      },
    }),
  ],
});

/** Full SectionCanvas props for the brand-scope section (all required props). */
export const sectionWithBrandBlockProps = {
  section: brandScopeSection,
  baseSection: brandScopeSection,
  selected: false,
  selectedBlockPath: null,
  selectedBlockId: null,
  inlineEditTarget: null,
  ...baseCanvasProps,
};
