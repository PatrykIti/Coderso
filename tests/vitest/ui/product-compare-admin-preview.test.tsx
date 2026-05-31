// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import { BlockList } from "../../../core/admin/ui/pages/builder/BlockList";
import { createBlock } from "../../../core/admin/ui/pages/builder/blockUtils";

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

test("BlockList merges transient preview state into Product Compare renderer output", () => {
  const block = {
    ...createBlock("product-compare"),
    id: "product-compare-1",
  };

  const view = mount(
    <BlockList
      blocks={[block]}
      selectedId={block.id}
      highlightedId={null}
      onSelect={() => undefined}
      onMove={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
      previewStatesByBlockId={{
        [block.id]: {
          status: "ready",
          dataPatch: {
            resolved: {
              rows: [
                {
                  id: "product-1",
                  title: "Starter Home",
                  slug: "starter-home",
                  excerpt: "Compact modern home.",
                  productHref: "/products/starter-home",
                  imageUrl: "/media/starter-home.jpg",
                  imageAlt: "Starter Home hero",
                  priceAmount: 120000,
                  currency: "USD",
                  compareAtAmount: null,
                  stockState: "in_stock",
                  stockQuantity: 3,
                },
              ],
              total: 1,
              resolvedAt: "2026-05-19T12:00:00.000Z",
            },
          },
        },
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain("Starter Home");
    expect(view.container.textContent).not.toContain("No products to compare");
  } finally {
    view.cleanup();
  }
});
