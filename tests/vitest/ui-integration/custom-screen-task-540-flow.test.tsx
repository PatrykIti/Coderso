// @vitest-environment happy-dom

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import * as assistantSurface from "../../../core/admin/ui/assistant/activeSurfaceContext";
import * as cacheBus from "../../../core/admin/utils/cacheBus";
import * as contentTypesClient from "../../../core/admin/services/contentTypesClient";
import * as customScreensClient from "../../../core/admin/services/customScreensClient";
import * as entriesClient from "../../../core/admin/services/entriesClient";
import * as mediaClient from "../../../core/admin/services/mediaClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type { AuthUser } from "../../../core/admin/services/authClient";
import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import type { EntryDetail } from "../../../core/admin/services/entriesClient";
import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";
import { ScreenRuntimeRenderer } from "../../../core/admin/ui/custom-screens/ScreenRuntimeRenderer";
import { AdminAuthProvider } from "../../../core/admin/ui/contexts/AdminAuthContext";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";
import {
  buildDefaultListViewDefinition,
  getCustomScreenEditorViewBindings,
  getCustomScreenEditorViewBlocks,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
  type CustomScreenDefinition,
  type ScreenBlockV1,
} from "../../../core/services/customScreens/customScreenSchemas";

const preferenceClient = vi.hoisted(() => ({
  getUserSettingIsolated: vi.fn(),
  setUserSettingIsolated: vi.fn(),
}));

vi.mock("@/services/userSettingsClient", () => preferenceClient);

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

type ScreenRecordWithDefinition = CustomScreenRecord & { definition: CustomScreenDefinition };
type CacheHandler = Parameters<typeof cacheBus.subscribeCacheEvents>[0];

const contentType: ContentTypeSummary = {
  id: "task-540-type",
  name: "TASK-540 records",
  slug: "task-540-records",
  status: "published",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      urlA: { type: "string", title: "Primary URL", xFieldType: "text" },
      urlB: { type: "string", title: "Secondary URL", xFieldType: "text" },
      headline: { type: "string", title: "Headline", xFieldType: "text" },
    },
  },
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
};

const makeButtonDefinition = (): CustomScreenDefinition =>
  normalizeCustomScreenDefinitionForWrite(
    {
      definition: {
        schemaVersion: 4,
        listView: buildDefaultListViewDefinition(contentType),
        editorView: {
          saveMode: "entry",
          interactionMode: "inline",
          document: {
            schemaVersion: 1,
            sections: [
              {
                id: "section-main",
                type: "section",
                label: "Details",
                data: { title: "Details" },
                blocks: [
                  {
                    id: "button-1",
                    type: "button",
                    data: {
                      label: "Open record target",
                      action: "link",
                      href: "/static-target",
                    },
                  },
                  {
                    id: "headline-field",
                    type: "field",
                    data: { label: "Headline", field: "headline" },
                  },
                ],
              },
            ],
          },
          bindings: [
            {
              id: "headline-field-value",
              blockId: "headline-field",
              propPath: "value",
              source: "entry",
              field: "headline",
              mode: "readwrite",
            },
          ],
        },
      },
    },
    { contentType }
  );

const makeScreenRecord = (definition = makeButtonDefinition()): ScreenRecordWithDefinition => ({
  id: "task-540-screen",
  name: "TASK-540 Screen",
  contentTypeId: contentType.id,
  status: "active",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: false,
  sidebarLabel: null,
  schemaVersion: 4,
  definition,
  blocks: getCustomScreenEditorViewBlocks(definition),
  bindings: getCustomScreenEditorViewBindings(definition),
  revision: 1,
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
});

const makeEntry = (): EntryDetail => ({
  id: "task-540-entry",
  typeId: contentType.id,
  title: "TASK-540 record",
  slug: "task-540-record",
  status: "draft",
  visibility: "public",
  hasPassword: false,
  data: {
    urlA: "/entry-primary",
    urlB: "/entry-secondary",
    headline: "Persisted headline",
  },
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
});

const setting = (showFieldMetadata: boolean) => ({
  key: "customScreens.entry.preferences" as const,
  value: { version: 1 as const, showFieldMetadata },
});

const roots = new Set<Root>();
let currentScreen: ScreenRecordWithDefinition;
let currentEntry: EntryDetail;
let cacheHandlers: CacheHandler[];

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  let mounted = true;

  const render = (next: React.ReactNode) => {
    React.act(() => root.render(next));
  };
  render(node);

  return {
    container,
    render,
    cleanup: () => {
      if (!mounted) return;
      mounted = false;
      roots.delete(root);
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 12; index += 1) await Promise.resolve();
  });
};

const click = (element: Element | null) => {
  expect(element).not.toBeNull();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findButton = (container: ParentNode, label: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === label
  ) ?? null;

const selectBoundField = (container: ParentNode, optionText: string) => {
  const trigger = container.querySelector<HTMLElement>('[data-screen-bound-field="true"]');
  expect(trigger).not.toBeNull();
  React.act(() => {
    trigger?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (item) => item.textContent?.includes(optionText)
  );
  expect(option).toBeTruthy();
  React.act(() => {
    option?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
    option?.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 }));
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const mountBuilder = () => {
  const path = `/admin/advanced/custom-screens/${currentScreen.id}`;
  window.history.replaceState({}, "", path);
  return mount(
    <AdminRouterProvider initialPath={path}>
      <CustomScreenEditorPage />
    </AdminRouterProvider>
  );
};

const emitRemoteCacheEvent = (key: string) => {
  React.act(() => {
    const event: cacheBus.CacheEvent = {
      key,
      action: "update",
      sourceId: "task-540-aggregate",
      ts: Date.now(),
    };
    cacheHandlers.forEach((handler) => handler(event, "remote"));
  });
};

function RouterProbe() {
  const { navigate, path } = useAdminRouter();
  return (
    <div>
      <output data-testid="task-540-router-path">{path}</output>
      <button
        type="button"
        data-testid="task-540-navigate-away"
        onClick={() => navigate(`/advanced/custom-screens/${currentScreen.id}/entries/other`)}
      >
        Navigate away
      </button>
    </div>
  );
}

const mountEntryEditor = (user: AuthUser) => {
  const path = `/admin/advanced/custom-screens/${currentScreen.id}/entries/${currentEntry.id}`;
  window.history.replaceState({}, "", path);
  return mount(
    <AdminAuthProvider user={user}>
      <AdminRouterProvider initialPath={path}>
        <RouterProbe />
        <CustomScreenEntryEditor />
      </AdminRouterProvider>
    </AdminAuthProvider>
  );
};

const makeTabsDefinitionInput = (options?: {
  buttonHref?: unknown;
  tabItems?: unknown;
  tabSlots?: Record<string, unknown>;
  buttonAction?: unknown;
}) => ({
  schemaVersion: 4,
  listView: buildDefaultListViewDefinition(contentType),
  editorView: {
    saveMode: "entry",
    interactionMode: "inline",
    document: {
      schemaVersion: 1,
      sections: [
        {
          id: "section-tabs",
          type: "section",
          data: { title: "Tabbed content" },
          blocks: [
            {
              id: "tabs-1",
              type: "tabs",
              data: {
                label: "Record views",
                tabs: options?.tabItems ?? [
                  { id: "overview", label: "Overview" },
                  { id: "details", label: "Details" },
                ],
              },
              slots: options?.tabSlots ?? {
                overview: [
                  {
                    id: "overview-copy",
                    type: "text",
                    data: { content: "Overview panel content" },
                  },
                ],
                details: [
                  {
                    id: "details-copy",
                    type: "text",
                    data: { content: "Details panel content" },
                  },
                ],
              },
            },
            {
              id: "button-tabs",
              type: "button",
              data: {
                label: "Safe destination",
                action: options?.buttonAction ?? "link",
                href: options?.buttonHref ?? "/safe-destination",
              },
            },
          ],
        },
      ],
    },
    bindings: [],
  },
});

beforeEach(() => {
  currentScreen = makeScreenRecord();
  currentEntry = makeEntry();
  cacheHandlers = [];
  preferenceClient.getUserSettingIsolated.mockReset();
  preferenceClient.setUserSettingIsolated.mockReset();
  preferenceClient.getUserSettingIsolated.mockResolvedValue(setting(false));
  preferenceClient.setUserSettingIsolated.mockImplementation(
    async (_key: string, value: { version: 1; showFieldMetadata: boolean }) => ({
      key: "customScreens.entry.preferences" as const,
      value,
    })
  );

  vi.spyOn(cacheBus, "subscribeCacheEvents").mockImplementation((handler) => {
    cacheHandlers.push(handler);
    return () => {
      cacheHandlers = cacheHandlers.filter((candidate) => candidate !== handler);
    };
  });
  vi.spyOn(contentTypesClient, "getCachedContentTypes").mockReturnValue([contentType]);
  vi.spyOn(contentTypesClient, "listContentTypesCached").mockResolvedValue([contentType]);
  vi.spyOn(customScreensClient, "getCachedCustomScreens").mockImplementation(() => [currentScreen]);
  vi.spyOn(customScreensClient, "listCustomScreensCached").mockImplementation(async () => [
    currentScreen,
  ]);
  vi.spyOn(customScreensClient, "getCachedCustomScreen").mockImplementation((id) =>
    id === currentScreen.id ? currentScreen : null
  );
  vi.spyOn(customScreensClient, "getCustomScreenCached").mockImplementation(async (id) =>
    id === currentScreen.id ? currentScreen : null
  );
  vi.spyOn(customScreensClient, "getCachedScreenEntryOverrides").mockReturnValue([]);
  vi.spyOn(customScreensClient, "getScreenEntryOverridesCached").mockResolvedValue([]);
  vi.spyOn(customScreensClient, "replaceScreenEntryOverrides").mockResolvedValue([]);
  vi.spyOn(customScreensClient, "invalidateScreenEntryOverrides").mockImplementation(
    () => undefined
  );
  vi.spyOn(customScreensClient, "createCustomScreen").mockRejectedValue(
    new Error("aggregate_unexpected_create")
  );
  vi.spyOn(customScreensClient, "updateCustomScreen").mockImplementation(async (id, input) => {
    if (id !== currentScreen.id || !input.definition) {
      throw new Error("aggregate_invalid_screen_update");
    }
    const definition = normalizeCustomScreenDefinitionForWrite(
      { definition: input.definition },
      { contentType }
    );
    currentScreen = {
      ...currentScreen,
      name: input.name ?? currentScreen.name,
      contentTypeId: input.contentTypeId ?? currentScreen.contentTypeId,
      status: input.status ?? currentScreen.status,
      showInSidebar: input.showInSidebar ?? currentScreen.showInSidebar,
      sidebarLabel:
        input.sidebarLabel === undefined ? currentScreen.sidebarLabel : input.sidebarLabel,
      definition,
      blocks: getCustomScreenEditorViewBlocks(definition),
      bindings: getCustomScreenEditorViewBindings(definition),
      // TASK-569: the server increments the revision on every definition save.
      revision: (currentScreen.revision ?? 0) + 1,
      updatedAt: "2026-07-14T01:00:00.000Z",
    };
    return currentScreen;
  });

  vi.spyOn(entriesClient, "getCachedEntries").mockReturnValue([]);
  vi.spyOn(entriesClient, "listEntriesCached").mockResolvedValue([]);
  vi.spyOn(entriesClient, "getCachedEntryDetail").mockImplementation((_slug, id) =>
    id === currentEntry.id ? currentEntry : null
  );
  vi.spyOn(entriesClient, "getEntryCached").mockImplementation(async (_slug, id) => {
    if (id !== currentEntry.id) {
      throw new Error("aggregate_entry_not_found");
    }
    return currentEntry;
  });
  vi.spyOn(entriesClient, "createEntry").mockRejectedValue(
    new Error("aggregate_unexpected_entry_create")
  );
  vi.spyOn(entriesClient, "updateEntry").mockImplementation(async () => currentEntry);
  vi.spyOn(mediaClient, "getCachedMedia").mockReturnValue(null);
  vi.spyOn(mediaClient, "listMediaCached").mockResolvedValue([]);
  vi.spyOn(assistantSurface, "setActiveAssistantSurfaceContext").mockImplementation(
    () => undefined
  );
  vi.spyOn(assistantSurface, "clearActiveAssistantSurfaceContext").mockImplementation(
    () => undefined
  );
  window.localStorage.clear();
});

afterEach(() => {
  for (const root of roots) React.act(() => root.unmount());
  roots.clear();
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("TASK-540 aggregate builder, persistence, and entry seams", () => {
  test("binds, updates, clears, rebinds, saves, reopens, and resolves the Button at the entry sink", async () => {
    const builder = mountBuilder();
    try {
      await flush();
      click(builder.container.querySelector('[data-screen-block-id="button-1"]'));
      await flush();

      selectBoundField(builder.container, "Primary URL");
      await flush();
      expect(builder.container.textContent).toContain("Use static link");
      expect(
        builder.container.querySelector('[data-screen-bound-field="true"]')?.textContent
      ).toContain("Primary URL");

      selectBoundField(builder.container, "Secondary URL");
      await flush();
      expect(
        builder.container.querySelector('[data-screen-bound-field="true"]')?.textContent
      ).toContain("Secondary URL");

      click(findButton(builder.container, "Use static link"));
      await flush();
      expect(builder.container.textContent).not.toContain("Use static link");

      selectBoundField(builder.container, "Primary URL");
      await flush();
      expect(builder.container.textContent).toContain("Use static link");
      click(findButton(builder.container, "Save"));
      await flush();

      expect(customScreensClient.createCustomScreen).not.toHaveBeenCalled();
      expect(customScreensClient.updateCustomScreen).toHaveBeenCalledTimes(1);
      const persistedDefinition = currentScreen.definition;
      const hrefBindings = persistedDefinition.editorView.bindings.filter(
        (binding) => binding.blockId === "button-1" && binding.propPath === "href"
      );
      expect(hrefBindings).toEqual([
        {
          id: "button-1-href-0fithhb61p0wq",
          blockId: "button-1",
          propPath: "href",
          source: "entry",
          field: "urlA",
          mode: "read",
        },
      ]);
      expect(JSON.stringify(persistedDefinition)).not.toContain('"field":""');
      expect(persistedDefinition.editorView.document.sections[0]?.blocks[0]?.data.href).toBe(
        "/static-target"
      );
    } finally {
      builder.cleanup();
    }

    const reopenedBuilder = mountBuilder();
    try {
      await flush();
      click(reopenedBuilder.container.querySelector('[data-screen-block-id="button-1"]'));
      await flush();
      expect(reopenedBuilder.container.textContent).toContain("Use static link");
      expect(
        reopenedBuilder.container.querySelector('[data-screen-bound-field="true"]')?.textContent
      ).toContain("Primary URL");
      expect(reopenedBuilder.container.textContent).not.toContain("Unsaved changes");
    } finally {
      reopenedBuilder.cleanup();
    }

    const reopenedDefinition = normalizeCustomScreenDefinitionForRead(
      { definition: JSON.parse(JSON.stringify(currentScreen.definition)) as unknown },
      { contentType }
    );
    const entry = mount(
      <ScreenRuntimeRenderer
        document={reopenedDefinition.editorView.document}
        bindings={reopenedDefinition.editorView.bindings}
        values={{ urlA: "/entry-bound-target" }}
        mode="entry"
      />
    );
    try {
      const affordance = entry.container.querySelector('[data-screen-button-affordance="true"]');
      expect(affordance?.tagName).toBe("A");
      expect(affordance?.getAttribute("href")).toBe("/entry-bound-target");
      expect(affordance?.textContent).toBe("Open record target");

      entry.render(
        <ScreenRuntimeRenderer
          document={reopenedDefinition.editorView.document}
          bindings={reopenedDefinition.editorView.bindings}
          values={{ urlA: "javascript:alert(1)" }}
          mode="entry"
        />
      );
      const disabled = entry.container.querySelector('[data-screen-button-affordance="true"]');
      expect(disabled?.tagName).toBe("SPAN");
      expect(disabled?.getAttribute("aria-disabled")).toBe("true");
      expect(entry.container.querySelector('a[href="/static-target"]')).toBeNull();
    } finally {
      entry.cleanup();
    }
  });

  test("round-trips strict Tabs and URLs into visible reciprocal ARIA state while legacy reads stay disabled", async () => {
    const written = normalizeCustomScreenDefinitionForWrite(
      { definition: makeTabsDefinitionInput() },
      { contentType }
    );
    const reopened = normalizeCustomScreenDefinitionForRead(
      { definition: JSON.parse(JSON.stringify(written)) as unknown },
      { contentType }
    );
    expect(reopened).toEqual(written);

    expect(() =>
      normalizeCustomScreenDefinitionForWrite(
        {
          definition: makeTabsDefinitionInput({
            tabItems: [
              { id: "overview", label: "Overview", unexpected: true },
              { id: "details", label: "Details" },
            ],
          }),
        },
        { contentType }
      )
    ).toThrow("custom_screen_definition_invalid");
    expect(() =>
      normalizeCustomScreenDefinitionForWrite(
        {
          definition: makeTabsDefinitionInput({
            tabItems: [
              { id: "duplicate", label: "One" },
              { id: "duplicate", label: "Two" },
            ],
            tabSlots: { duplicate: [] },
          }),
        },
        { contentType }
      )
    ).toThrow("custom_screen_definition_invalid");
    expect(() =>
      normalizeCustomScreenDefinitionForWrite(
        {
          definition: makeTabsDefinitionInput({ tabSlots: { overview: [] } }),
        },
        { contentType }
      )
    ).toThrow("custom_screen_definition_invalid");
    expect(() =>
      normalizeCustomScreenDefinitionForWrite(
        {
          definition: makeTabsDefinitionInput({ buttonHref: "javascript:alert(1)" }),
        },
        { contentType }
      )
    ).toThrow("custom_screen_definition_invalid");

    const view = mount(
      <ScreenRuntimeRenderer
        document={reopened.editorView.document}
        bindings={reopened.editorView.bindings}
        values={{}}
        mode="entry"
      />
    );
    try {
      const tabs = Array.from(view.container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      const panels = Array.from(view.container.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
      expect(tabs).toHaveLength(2);
      expect(panels).toHaveLength(2);
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
      expect(tabs[0]?.tabIndex).toBe(0);
      expect(panels[0]?.hidden).toBe(false);
      expect(panels[0]?.textContent).toContain("Overview panel content");
      expect(panels[1]?.hidden).toBe(true);
      expect(tabs[0]?.getAttribute("aria-controls")).toBe(panels[0]?.id);
      expect(panels[0]?.getAttribute("aria-labelledby")).toBe(tabs[0]?.id);

      click(tabs[1] ?? null);
      await flush();
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
      expect(tabs[0]?.tabIndex).toBe(-1);
      expect(panels[0]?.hidden).toBe(true);
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
      expect(tabs[1]?.tabIndex).toBe(0);
      expect(panels[1]?.hidden).toBe(false);
      expect(panels[1]?.textContent).toContain("Details panel content");
      expect(tabs[1]?.getAttribute("aria-controls")).toBe(panels[1]?.id);
      expect(panels[1]?.getAttribute("aria-labelledby")).toBe(tabs[1]?.id);

      React.act(() => {
        tabs[1]?.focus();
        tabs[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
      });
      await flush();
      expect(document.activeElement).toBe(tabs[0]);
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
      expect(panels[0]?.hidden).toBe(false);
      expect(panels[1]?.hidden).toBe(true);
    } finally {
      view.cleanup();
    }

    const canonicalButton = reopened.editorView.document.sections[0]?.blocks.find(
      (block) => block.id === "button-tabs"
    );
    expect(canonicalButton).toBeTruthy();
    const legacyStored: CustomScreenDefinition = {
      ...reopened,
      editorView: {
        ...reopened.editorView,
        document: {
          ...reopened.editorView.document,
          sections: reopened.editorView.document.sections.map((section) => ({
            ...section,
            blocks: section.blocks.map((block): ScreenBlockV1 =>
              block.id === "button-tabs"
                ? {
                    ...block,
                    data: { ...block.data, action: "custom", href: "/legacy-target" },
                  }
                : block
            ),
          })),
        },
        bindings: [
          {
            id: "button-tabs-href",
            blockId: "button-tabs",
            propPath: "href",
            source: "entry",
            field: "urlA",
            mode: "read",
          },
        ],
      },
    };
    const compatible = normalizeCustomScreenDefinitionForRead(
      { definition: legacyStored },
      { contentType }
    );
    const compatibleButton = compatible.editorView.document.sections[0]?.blocks.find(
      (block) => block.id === "button-tabs"
    );
    expect(compatibleButton?.data.action).toBe("link");
    expect(compatibleButton?.data).not.toHaveProperty("href");
    expect(compatible.editorView.bindings).toEqual([]);

    const legacyView = mount(
      <ScreenRuntimeRenderer
        document={compatible.editorView.document}
        bindings={compatible.editorView.bindings}
        values={{ urlA: "/must-not-be-used" }}
        mode="entry"
      />
    );
    try {
      const affordance = legacyView.container.querySelector(
        '[data-screen-block-id="button-tabs"] [data-screen-button-affordance="true"]'
      );
      expect(affordance?.tagName).toBe("SPAN");
      expect(affordance?.getAttribute("aria-disabled")).toBe("true");
      expect(
        legacyView.container.querySelector('[data-screen-block-id="button-tabs"] a')
      ).toBeNull();
    } finally {
      legacyView.cleanup();
    }
  });

  test("keeps a dirty entry byte-for-byte through cache refresh while persisting the authenticated preference and guarding navigation", async () => {
    const user: AuthUser = {
      id: "task-540-aggregate-user",
      email: "task-540-aggregate-user@example.test",
      permissionSnapshot: null,
    };
    const legacyStorageKey = "coderso.screens.entry.preferences.v1";
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    const view = mountEntryEditor(user);
    try {
      await flush();
      const metadataSwitch = view.container.querySelector<HTMLButtonElement>(
        '[data-screen-entry-metadata-toggle="true"] [role="switch"]'
      );
      expect(metadataSwitch?.getAttribute("aria-checked")).toBe("false");
      click(metadataSwitch);
      await flush();
      expect(metadataSwitch?.getAttribute("aria-checked")).toBe("true");
      expect(preferenceClient.setUserSettingIsolated).toHaveBeenCalledWith(
        "customScreens.entry.preferences",
        { version: 1, showFieldMetadata: true },
        expect.objectContaining({ expectedUserId: user.id })
      );

      const textbox = view.container.querySelector<HTMLElement>(
        '[role="textbox"][aria-label="Headline"]'
      );
      expect(textbox).not.toBeNull();
      React.act(() => {
        if (textbox) textbox.textContent = "Local draft survives refresh";
        textbox?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      });
      await flush();
      expect(view.container.textContent).toContain("Unsaved changes");

      currentEntry = {
        ...currentEntry,
        data: { ...currentEntry.data, headline: "Remote headline must not win" },
      };
      emitRemoteCacheEvent(cacheKeys.entryDetail(contentType.slug, currentEntry.id));
      await flush();

      const currentTextbox = view.container.querySelector<HTMLElement>(
        '[role="textbox"][aria-label="Headline"]'
      );
      expect(currentTextbox?.textContent).toBe("Local draft survives refresh");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain("Updated in another tab");
      expect(metadataSwitch?.getAttribute("aria-checked")).toBe("true");

      const beforeUnload = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(beforeUnload);
      expect(beforeUnload.defaultPrevented).toBe(true);

      click(view.container.querySelector('[data-testid="task-540-navigate-away"]'));
      await flush();
      expect(document.body.textContent).toContain("Discard unsaved entry changes?");
      click(findButton(document.body, "Keep editing"));
      await flush();
      expect(
        view.container.querySelector('[data-testid="task-540-router-path"]')?.textContent
      ).toContain(`/entries/${currentEntry.id}`);
      expect(
        view.container.querySelector<HTMLElement>('[role="textbox"][aria-label="Headline"]')
          ?.textContent
      ).toBe("Local draft survives refresh");
      expect(window.localStorage.getItem(legacyStorageKey)).toBeNull();
      expect(storageWrite.mock.calls.some(([key]) => key === legacyStorageKey)).toBe(false);
    } finally {
      view.cleanup();
    }
  });
});
