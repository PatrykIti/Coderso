// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { updateEntry } from "@/services/entriesClient";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { renderAdminUi } from "../../utils/adminRouterRender";

/**
 * TASK-479-14-L05: presentation guard for the entry content editor restyle
 * (TASK-479-14-L04). Confirms the calm document-card framing (rounded-2xl /
 * shadow-card) and that the rendered layout is DATA-DRIVEN by the per-screen
 * definition (different screens render different bound-field layouts), while the
 * inline edit -> dirty affordance stays wired.
 *
 * NOTE: the prototype's checklist/activity related-list variants and its
 * Bold/Italic/Underline mark toolbar have no backing in the real custom-screen
 * model (block types: record-header/field/field-group/columns/rich-text;
 * presentation overrides: textSize/textEmphasis/tone/mediaAssetId; inline editing
 * via contenteditable). Per the de-fabrication rule those mock-only affordances
 * are intentionally NOT asserted here; per-screen presentation is proven through
 * the real, definition-driven bound-field layout instead.
 */
const makeFixture = (opts: {
  screenId: string;
  contentTypeId: string;
  slug: string;
  fieldLabel: string;
  fieldName: string;
  entryTitle: string;
}) => {
  const contentType = {
    id: opts.contentTypeId,
    name: opts.slug,
    slug: opts.slug,
    status: "published" as const,
    schema: {
      type: "object" as const,
      additionalProperties: false as const,
      properties: {
        [opts.fieldName]: {
          type: "string" as const,
          title: opts.fieldLabel,
          xFieldType: "text",
        },
      },
    },
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
  };
  const screen = {
    id: opts.screenId,
    name: opts.slug,
    contentTypeId: opts.contentTypeId,
    status: "active" as const,
    showInSidebar: true,
    sidebarLabel: opts.slug,
    schemaVersion: 4,
    definition: {
      schemaVersion: 4,
      listView: {
        columns: [],
        filters: [],
        defaultSort: { field: "updatedAt", direction: "desc" as const },
        bulkActions: { delete: true, publish: true, unpublish: true },
      },
      editorView: {
        saveMode: "entry" as const,
        interactionMode: "inline" as const,
        document: {
          schemaVersion: 1 as const,
          sections: [
            {
              id: "section-1",
              type: "section",
              data: { title: "Details" },
              blocks: [
                {
                  id: "field-1",
                  type: "field",
                  data: { label: opts.fieldLabel, field: opts.fieldName },
                },
              ],
            },
          ],
        },
        bindings: [
          {
            id: "binding-1",
            blockId: "field-1",
            propPath: "value",
            source: "entry" as const,
            field: opts.fieldName,
            mode: "readwrite" as const,
          },
        ],
      },
    },
    blocks: [],
    bindings: [],
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
  };
  const entry = {
    id: "1",
    typeId: opts.contentTypeId,
    title: opts.entryTitle,
    slug: "entry-1",
    status: "draft" as const,
    data: { [opts.fieldName]: opts.entryTitle },
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
  };
  return { screen, contentType, entry };
};

const projectFixture = makeFixture({
  screenId: "project-catalog",
  contentTypeId: "type-1",
  slug: "projects",
  fieldLabel: "Headline",
  fieldName: "headline",
  entryTitle: "Project Aurora",
});

const clientFixture = makeFixture({
  screenId: "client-roster",
  contentTypeId: "type-2",
  slug: "clients",
  fieldLabel: "Account owner",
  fieldName: "owner",
  entryTitle: "Acme Corp",
});

let current = projectFixture;

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: vi.fn(() => [current.screen]),
  listCustomScreensCached: vi.fn(async () => [current.screen]),
  getCachedCustomScreen: vi.fn(() => current.screen),
  getCustomScreenCached: vi.fn(async () => current.screen),
  getCachedScreenEntryOverrides: vi.fn(() => []),
  getScreenEntryOverridesCached: vi.fn(async () => []),
  replaceScreenEntryOverrides: vi.fn(async () => []),
  invalidateScreenEntryOverrides: vi.fn(),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => [current.contentType]),
  listContentTypesCached: vi.fn(async () => [current.contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  getCachedEntryDetail: vi.fn(() => current.entry),
  getEntryCached: vi.fn(async () => current.entry),
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <CustomScreenEntryEditor />
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
};

const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve();
    }
  });
};

beforeEach(() => {
  current = projectFixture;
  vi.mocked(updateEntry).mockResolvedValue(projectFixture.entry as never);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("renders the screen-defined layout inside a soft document card", () => {
  current = projectFixture;
  const html = renderAdminUi(<CustomScreenEntryEditor />, {
    path: "/admin/advanced/custom-screens/project-catalog/entries/1",
  });

  expect(html).toMatch(/rounded-2xl/);
  expect(html).toMatch(/shadow-card/);
  expect(html).toContain('data-custom-screen-entry-document="true"');
  // TASK-496-02: the entry editor now renders through the shared `CanvasEditor`
  // shell; the old sticky sub-header eyebrow "Screen-owned record editor" is
  // replaced by the in-content PageHeader (no eyebrow). Retargeted to the
  // PRESERVED PageHeader description text.
  expect(html).toContain("The canvas is the active editing surface for this record.");
  expect(html).toContain("Headline");
});

test("layout is data-driven by the per-screen definition (not a hardcoded screen id)", () => {
  current = projectFixture;
  const projectHtml = renderAdminUi(<CustomScreenEntryEditor />, {
    path: "/admin/advanced/custom-screens/project-catalog/entries/1",
  });
  expect(projectHtml).toContain("Headline");
  expect(projectHtml).not.toContain("Account owner");

  current = clientFixture;
  const clientHtml = renderAdminUi(<CustomScreenEntryEditor />, {
    path: "/admin/advanced/custom-screens/client-roster/entries/1",
  });
  expect(clientHtml).toContain("Account owner");
  expect(clientHtml).not.toContain("Headline");
});

test("an inline content edit surfaces the unsaved-changes affordance", async () => {
  current = projectFixture;
  const view = mount("/admin/advanced/custom-screens/project-catalog/entries/1");

  try {
    await flush();
    expect(view.container.textContent).not.toContain("Unsaved changes");

    const textbox = view.container.querySelector('[role="textbox"][aria-label="Headline"]');
    expect(textbox).not.toBeNull();

    React.act(() => {
      (textbox as HTMLElement).textContent = "Aurora updated";
      textbox?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});
