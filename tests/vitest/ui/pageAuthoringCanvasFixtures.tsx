// @vitest-environment happy-dom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import React, { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { SectionCanvas } from "../../../core/admin/ui/pages/editor/PageAuthoringCanvas";

const baseCanvasProps = {
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
};

const mount = (node: ReactNode) => {
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

const setNativeInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const linkedSection = (id: string, blockId: string, href: string) =>
  createPageSectionV2("content", {
    id,
    blocks: [
      createPageBlockV2("heading", {
        id: blockId,
        props: {
          text: "Canvas headline",
          level: "h2",
          align: "left",
          marks: [{ type: "link", from: 0, to: 6, href }],
        },
      }),
    ],
  });

const selectLinkRange = (region: HTMLElement) => {
  const linkSpan = region.querySelector(
    '[data-page-editor-link-noop="true"]'
  ) as HTMLElement | null;
  const linkText = linkSpan?.firstChild;
  expect(linkText?.nodeType).toBe(Node.TEXT_NODE);
  flushSync(() => {
    if (!linkText) return;
    const range = document.createRange();
    range.setStart(linkText, 0);
    range.setEnd(linkText, 6);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    region.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
};

export { baseCanvasProps, linkedSection, mount, selectLinkRange, setNativeInputValue };
