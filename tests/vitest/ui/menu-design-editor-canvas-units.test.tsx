// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import {
  MenuDocumentCanvas,
  NavItemsPreview,
  previewHasRealHref,
  renderPreviewNavItem,
} from "../../../core/admin/ui/menus/MenuDesignEditorCanvas";
import {
  MENU_DOCUMENT_SCHEMA_VERSION,
  type MenuBlockV2,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";
import type { NavigationItem } from "../../../core/services/renderContracts/navigationContract";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Direct unit coverage (TASK-105-08-05) for the exported canvas helpers and
 * the `MenuDocumentCanvas` render host: the preview nav item mirror (real
 * href anchor vs linkless group label + recursive sublists), the spacer/leaf
 * stubs, the unknown-block safety net, and the `previewHasRealHref`
 * predicate branches that the page-flow suites only reach through seeded
 * placeholder hrefs.
 */

test("previewHasRealHref distinguishes real links from placeholders", () => {
  expect(previewHasRealHref("https://example.com/menu")).toBe(true);
  expect(previewHasRealHref("/about")).toBe(true);
  expect(previewHasRealHref("  /contact  ")).toBe(true);
  expect(previewHasRealHref("")).toBe(false);
  expect(previewHasRealHref("   ")).toBe(false);
  expect(previewHasRealHref("#")).toBe(false);
});

test("NavItemsPreview renders real hrefs as anchors and placeholders as group labels", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const items: NavigationItem[] = [
    {
      label: "Products",
      href: "/products",
      children: [
        {
          label: "Cloud",
          href: "#",
          children: [
            {
              label: "Pricing",
              href: "/pricing",
              children: [],
            },
          ],
        },
      ],
    },
  ];
  React.act(() => {
    root.render(<NavItemsPreview items={items} label="Main" />);
  });
  const preview = container.querySelector("[data-menu-nav-preview]");
  expect(preview?.getAttribute("aria-label")).toBe("Main");
  const links = container.querySelectorAll("a.site-nav-link");
  expect(links.length).toBe(2);
  expect(links[0]?.getAttribute("href")).toBe("/products");
  expect(links[1]?.getAttribute("href")).toBe("/pricing");
  const group = container.querySelector("span.site-nav-link.site-nav-group-label");
  expect(group?.textContent?.trim()).toBe("Cloud");
  expect(group?.getAttribute("tabindex")).toBe("0");
  expect(container.querySelector('[data-site-nav-group="true"] ul.site-nav-sublist')).toBeTruthy();
  // Clicking a real preview link runs the canvas preventDefault guard.
  React.act(() => {
    links[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  React.act(() => {
    root.unmount();
  });
  container.remove();
});

test("renderPreviewNavItem mirrors a single linkless leaf as a group label", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const item: NavigationItem = {
    label: "Resources",
    href: "",
    children: [],
  };
  React.act(() => {
    root.render(<ul>{renderPreviewNavItem(item, "leaf")}</ul>);
  });
  const group = container.querySelector("span.site-nav-link.site-nav-group-label");
  expect(group?.textContent?.trim()).toBe("Resources");
  expect(container.querySelector("a.site-nav-link")).toBeNull();
  React.act(() => {
    root.unmount();
  });
  container.remove();
});

test("NavItemsPreview renders the empty state and the default nav label", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<NavItemsPreview items={[]} label="   " />);
  });
  expect(container.querySelector("nav[data-menu-nav-preview]")?.getAttribute("aria-label")).toBe(
    "Site navigation"
  );
  expect(container.textContent).toContain("No published menu items yet.");
  React.act(() => {
    root.unmount();
  });
  container.remove();
});

const canvasBlock = (type: string, id: string) =>
  ({ id, type, props: {} }) as unknown as MenuBlockV2;

test("MenuDocumentCanvas renders leaf stubs, utility fallbacks, and the unknown-type safety net", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const doc: MenuDocumentV2 = {
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: "sec-1",
        type: "menu-bar",
        name: "Bar",
        layout: {},
        blocks: [
          canvasBlock("spacer", "blk-spacer"),
          canvasBlock("search", "blk-search"),
          canvasBlock("mystery", "blk-unknown"),
        ],
      },
    ],
  };
  React.act(() => {
    root.render(
      <MenuDocumentCanvas
        doc={doc}
        device="desktop"
        items={[]}
        navLabel="Main"
        siteName="Acme"
        tokenVariables={{}}
        selectedId={null}
        onSelect={() => {}}
      />
    );
  });
  // Spacer stub is a fixed-width inline span, not the leaf element.
  expect(container.querySelector('span[aria-hidden="true"]')).toBeTruthy();
  // Utility block falls back to its canonical label.
  const utility = container.querySelector("[data-site-nav-utility='search']");
  expect(utility?.textContent?.trim().length).toBeGreaterThan(0);
  // Unknown block types render nothing (fail-closed safety net).
  expect(container.querySelector('[data-block-id="blk-unknown"]')).toBeNull();
  React.act(() => {
    root.unmount();
  });
  container.remove();
});
