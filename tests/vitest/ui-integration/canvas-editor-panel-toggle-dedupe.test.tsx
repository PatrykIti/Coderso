// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { PageDetail } from "../../../core/admin/services/pagesClient";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { renderAdminUi } from "../../utils/adminRouterRender";

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => []),
  listContentTypesCached: vi.fn(async () => []),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn(() => () => undefined),
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: vi.fn(),
  setActiveAssistantSurfaceContext: vi.fn(),
  useActiveAssistantSurfaceContext: vi.fn(() => null),
}));

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: vi.fn(() => []),
  listSolutionKitsCached: vi.fn(async () => []),
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: vi.fn(() => null),
  subscribeActiveSolutionKitId: vi.fn(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

// Hermetic PageEditor mount: no network from the page-detail/revision effects.
vi.mock("@/services/pagesClient", () => ({
  autosavePage: vi.fn(async () => ({ ok: true })),
  discardPageRevision: vi.fn(async () => ({ ok: true })),
  getCachedPageDetail: vi.fn(() => null),
  getPageCached: vi.fn(async () => null),
  listPageRevisions: vi.fn(async () => []),
  previewPage: vi.fn(async () => ({ token: "t", previewUrl: "u", expiresAt: "" })),
  publishPage: vi.fn(async () => ({ ok: true })),
  restorePageRevision: vi.fn(async () => null),
  updatePage: vi.fn(async () => null),
}));

vi.mock("@/services/pageTemplatesClient", () => ({
  getPageTemplateCached: vi.fn(async () => null),
  listPageTemplatesCached: vi.fn(async () => []),
}));

vi.mock("@/services/settingsClient", () => ({
  getCachedSettings: vi.fn(() => null),
  getSettingsCached: vi.fn(async () => ({})),
}));

const createPage = (): PageDetail =>
  ({
    id: "page-1",
    title: "Homepage",
    slug: "homepage",
    status: "draft",
    updatedAt: "2026-07-01T09:00:00.000Z",
    currentData: {
      schemaVersion: 2,
      breakpoints: ["desktop", "tablet", "mobile"],
      seo: {},
      settings: { template: "page-v2", showInNav: true },
      sections: [
        createPageSectionV2("content", {
          id: "sec-1",
          name: "Intro",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-1",
              props: { text: "Hello", level: "h2", align: "left" },
            }),
          ],
        }),
      ],
    },
  }) as PageDetail;

/**
 * TASK-500-03: panel-toggle dedupe across the two HOST canvases (Pages +
 * Screens). The shared `CanvasEditor` shell is CONTROLLED read-only — the ONLY
 * panel-hide control is the host's top-toolbar Hide/Show toggle and the ONLY
 * reopen control is the host's "Show panel" chip. The redundant in-panel
 * `PanelRight` closer that each host rail head used to hand-roll
 * (`ScreenAuthoringCanvas` `aria-label="Hide panel"`, PageEditor
 * `toolbarActionTooltips.hidePanel` → `aria-label="Hide options panel"`) was
 * removed; this suite pins "exactly one hide surface" for BOTH hosts.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const parseHtml = (html: string) => {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
};

const mount = (node: React.ReactElement, path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminRouterProvider initialPath={path}>{node}</AdminRouterProvider>);
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

const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve();
    }
  });
};

const clickButtonByLabel = (container: HTMLElement, label: string) => {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("Screens: exactly ONE hide affordance — the top toggle; the in-panel PanelRight closer is gone", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/advanced/custom-screens/new",
  });

  // Exactly one labelled hide control renders while the panel is open: the
  // host's top-toolbar toggle (which also carries aria-pressed).
  expect(html.match(/aria-label="Hide panel"/g)).toHaveLength(1);
  expect(html).toContain('aria-pressed="true"');

  const dom = parseHtml(html);
  const railHead = dom.querySelector('[data-screen-rail-head="true"]');
  expect(railHead).not.toBeNull();
  const scroller = dom.querySelector('[data-screen-editor-canvas-scroller="true"]');
  expect(scroller?.getAttribute("data-screen-canvas-panel-open")).toBe("true");
  expect(scroller?.classList.contains("lg:pr-[332px]")).toBe(true);
  // The removed rail-head closer must not resurface: no hide button inside the
  // rail head — and none anywhere inside the floating panel body.
  expect(railHead?.querySelector('button[aria-label="Hide panel"]')).toBeNull();
  expect(
    dom.querySelector('[data-screen-editor-panel="true"] button[aria-label="Hide panel"]')
  ).toBeNull();
  // The surviving toggle lives OUTSIDE the panel (sub-toolbar) and is pressed.
  const toggle = dom.querySelector('button[aria-label="Hide panel"]');
  expect(toggle?.closest('[data-screen-editor-panel="true"]')).toBeNull();
  expect(toggle?.getAttribute("aria-pressed")).toBe("true");
});

test("Pages (builder chrome): the rail-head PanelRight closer is gone; the top toggle is the sole hide surface", () => {
  const html = renderAdminUi(<PageEditor pageId="page-1" initialPage={createPage()} />);

  const dom = parseHtml(html);
  // The builder rail head renders (a section is selected by default) …
  const railHead = dom.querySelector('[data-page-editor-toolbar-row="head"]');
  expect(railHead).not.toBeNull();
  // … and no longer contains the removed closer: neither a PanelRight
  // "Hide options panel" ToolbarIconButton (its rendered aria-label via
  // toolbarActionTooltips.hidePanel.label) nor any "Hide panel" button.
  expect(html).not.toContain('aria-label="Hide options panel"');
  expect(railHead?.querySelector('button[aria-label="Hide panel"]')).toBeNull();
  // Supporting post-condition (count was already 1 pre-removal — the removed
  // closer carried a DIFFERENT label): exactly one "Hide panel" control, the
  // sub-toolbar toggle, outside the floating panel, with aria-pressed.
  expect(html.match(/aria-label="Hide panel"/g)).toHaveLength(1);
  const toggle = dom.querySelector('button[aria-label="Hide panel"]');
  expect(toggle?.closest('[data-page-editor-floating-toolbar="true"]')).toBeNull();
  expect(toggle?.getAttribute("aria-pressed")).toBe("true");
});

test("Screens: hide/reopen round-trips through the top toggle + the reopen chip only", async () => {
  const view = mount(<CustomScreenEditorPage />, "/admin/advanced/custom-screens/new");

  try {
    await flush();
    expect(view.container.querySelector('[data-screen-editor-panel="true"]')).not.toBeNull();
    const openScroller = view.container.querySelector(
      '[data-screen-editor-canvas-scroller="true"]'
    );
    expect(openScroller?.getAttribute("data-screen-canvas-panel-open")).toBe("true");
    expect(openScroller?.classList.contains("lg:pr-[332px]")).toBe(true);

    // Hide via the sole surviving hide surface — the top toolbar toggle.
    clickButtonByLabel(view.container, "Hide panel");
    await flush();
    expect(view.container.querySelector('[data-screen-editor-panel="true"]')).toBeNull();
    expect(view.container.querySelector('button[aria-label="Hide panel"]')).toBeNull();
    const closedScroller = view.container.querySelector(
      '[data-screen-editor-canvas-scroller="true"]'
    );
    expect(closedScroller?.hasAttribute("data-screen-canvas-panel-open")).toBe(false);
    expect(closedScroller?.classList.contains("lg:pr-[332px]")).toBe(false);

    // Reopen via the chip (the shell renders it only while hidden).
    const chips = view.container.querySelectorAll('button[aria-label="Show panel"]');
    expect(chips.length).toBeGreaterThanOrEqual(1);
    clickButtonByLabel(view.container, "Show panel");
    await flush();
    expect(view.container.querySelector('[data-screen-editor-panel="true"]')).not.toBeNull();
    const reopenedScroller = view.container.querySelector(
      '[data-screen-editor-canvas-scroller="true"]'
    );
    expect(reopenedScroller?.getAttribute("data-screen-canvas-panel-open")).toBe("true");
    expect(reopenedScroller?.classList.contains("lg:pr-[332px]")).toBe(true);
    // The panel returns with the single hide surface — still no in-panel closer.
    expect(view.container.querySelectorAll('button[aria-label="Hide panel"]')).toHaveLength(1);
    expect(
      view.container.querySelector(
        '[data-screen-editor-panel="true"] button[aria-label="Hide panel"]'
      )
    ).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("Pages: hide/reopen round-trips through the top toggle + the reopen chip only", async () => {
  const view = mount(
    <PageEditor pageId="page-1" initialPage={createPage()} />,
    "/admin/pages/editor/page-1"
  );

  try {
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-floating-toolbar="true"]')
    ).not.toBeNull();

    // Hide via the sole surviving hide surface — the sub-toolbar toggle.
    clickButtonByLabel(view.container, "Hide panel");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeNull();
    expect(view.container.querySelector('button[aria-label="Hide panel"]')).toBeNull();

    // Reopen via the chip; the panel returns with NO in-panel closer.
    clickButtonByLabel(view.container, "Show panel");
    await flush();
    const panel = view.container.querySelector('[data-page-editor-floating-toolbar="true"]');
    expect(panel).not.toBeNull();
    expect(view.container.querySelectorAll('button[aria-label="Hide panel"]')).toHaveLength(1);
    expect(panel?.querySelector('button[aria-label="Hide panel"]')).toBeNull();
    expect(panel?.querySelector('button[aria-label="Hide options panel"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});
