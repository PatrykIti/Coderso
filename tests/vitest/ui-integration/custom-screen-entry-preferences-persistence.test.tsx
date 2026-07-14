// @vitest-environment happy-dom

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { AuthUser } from "../../../core/admin/services/authClient";
import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import type { EntryDetail } from "../../../core/admin/services/entriesClient";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";
import { AdminAuthProvider } from "../../../core/admin/ui/contexts/AdminAuthContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenSchemas";

const preferenceMocks = vi.hoisted(() => ({
  getUserSettingIsolated: vi.fn(),
  setUserSettingIsolated: vi.fn(),
}));

vi.mock("@/services/userSettingsClient", () => preferenceMocks);

type Fixture = {
  screen: CustomScreenRecord & { definition: CustomScreenDefinition };
  contentType: ContentTypeSummary;
  entry: EntryDetail;
};

const fixture: Fixture = {
  screen: {
    id: "preference-screen",
    name: "Preference screen",
    contentTypeId: "preference-type",
    status: "active",
    collectionRole: null,
    compositionKey: null,
    showInSidebar: true,
    sidebarLabel: "Preferences",
    schemaVersion: 4,
    definition: {
      schemaVersion: 4,
      listView: {
        columns: [],
        filters: [],
        defaultSort: { field: "updatedAt", direction: "desc" },
        bulkActions: { delete: true, publish: true, unpublish: true },
      },
      editorView: {
        saveMode: "entry",
        interactionMode: "inline",
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "details",
              type: "section",
              data: { title: "Details" },
              blocks: [
                {
                  id: "title-field",
                  type: "field",
                  data: { label: "Title", field: "title" },
                },
              ],
            },
          ],
        },
        bindings: [
          {
            id: "title-binding",
            blockId: "title-field",
            propPath: "value",
            source: "entry",
            field: "title",
            mode: "readwrite",
          },
        ],
      },
    },
    blocks: [],
    bindings: [],
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  contentType: {
    id: "preference-type",
    name: "Preference records",
    slug: "preference-records",
    status: "published",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", title: "Title", xFieldType: "text" },
      },
    },
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  entry: {
    id: "preference-entry",
    typeId: "preference-type",
    title: "Preference record",
    slug: "preference-record",
    status: "draft",
    visibility: "public",
    hasPassword: false,
    data: { title: "Preference record" },
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
};

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: vi.fn(() => [fixture.screen]),
  listCustomScreensCached: vi.fn(async () => [fixture.screen]),
  getCachedCustomScreen: vi.fn(() => fixture.screen),
  getCustomScreenCached: vi.fn(async () => fixture.screen),
  getCachedScreenEntryOverrides: vi.fn(() => []),
  getScreenEntryOverridesCached: vi.fn(async () => []),
  replaceScreenEntryOverrides: vi.fn(async () => []),
  invalidateScreenEntryOverrides: vi.fn(),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => [fixture.contentType]),
  listContentTypesCached: vi.fn(async () => [fixture.contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(async () => fixture.entry),
  getCachedEntryDetail: vi.fn(() => fixture.entry),
  getEntryCached: vi.fn(async () => fixture.entry),
}));

vi.mock("@/services/mediaClient", () => ({
  getCachedMedia: vi.fn(() => null),
  listMediaCached: vi.fn(async () => []),
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

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

const roots = new Set<Root>();
let userSequence = 0;

const makeUser = (prefix: string): AuthUser => {
  userSequence += 1;
  const id = `${prefix}-${userSequence}`;
  return {
    id,
    email: `${id}@example.test`,
    permissionSnapshot: null,
  };
};

const setting = (showFieldMetadata: boolean) => ({
  key: "customScreens.entry.preferences" as const,
  value: { version: 1 as const, showFieldMetadata },
});

const mountEditor = (initialUser: AuthUser) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  let mounted = true;
  const render = (user: AuthUser, visible = true) => {
    React.act(() => {
      root.render(
        <AdminAuthProvider user={user}>
          <AdminRouterProvider initialPath="/admin/advanced/custom-screens/preference-screen/entries/preference-entry">
            {visible ? <CustomScreenEntryEditor /> : null}
          </AdminRouterProvider>
        </AdminAuthProvider>
      );
    });
  };
  render(initialUser);
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

const flush = async (): Promise<void> => {
  await React.act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

const getVisibleSwitch = (container: HTMLElement): HTMLButtonElement => {
  const element = container.querySelector<HTMLButtonElement>(
    "[data-screen-entry-metadata-toggle] [role='switch']"
  );
  if (!element) throw new Error("metadata_switch_missing");
  return element;
};

const clickSwitch = (element: HTMLButtonElement): void => {
  React.act(() => element.click());
};

beforeEach(() => {
  preferenceMocks.getUserSettingIsolated.mockReset();
  preferenceMocks.setUserSettingIsolated.mockReset();
  preferenceMocks.getUserSettingIsolated.mockResolvedValue(setting(false));
  preferenceMocks.setUserSettingIsolated.mockImplementation(
    async (_key: string, value: { version: 1; showFieldMetadata: boolean }) => ({
      key: "customScreens.entry.preferences",
      value,
    })
  );
  window.localStorage.clear();
});

afterEach(() => {
  for (const root of roots) React.act(() => root.unmount());
  roots.clear();
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test("the visible toolbar persists per user and ignores the removed browser key", async () => {
  const userA = makeUser("visible-a");
  const userB = makeUser("visible-b");
  window.localStorage.setItem(
    "coderso.screens.entry.preferences.v1",
    JSON.stringify({ showFieldMetadata: true })
  );
  const storageWrite = vi.spyOn(Storage.prototype, "setItem");
  const editor = mountEditor(userA);
  await flush();
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("false");

  clickSwitch(getVisibleSwitch(editor.container));
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("true");
  await flush();
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledWith(
    "customScreens.entry.preferences",
    { version: 1, showFieldMetadata: true },
    expect.objectContaining({ expectedUserId: userA.id })
  );

  editor.render(userB);
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("false");
  await flush();
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("false");

  preferenceMocks.getUserSettingIsolated.mockResolvedValue(setting(true));
  editor.render(userA);
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("true");
  await flush();
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("true");
  expect(window.localStorage.getItem("coderso.screens.entry.preferences.v1")).toBe(
    JSON.stringify({ showFieldMetadata: true })
  );
  expect(storageWrite).not.toHaveBeenCalled();
  editor.cleanup();
});

test("rapid visible ON to OFF writes serialize and keep the final switch OFF", async () => {
  const user = makeUser("visible-serial");
  const first = deferred<ReturnType<typeof setting>>();
  preferenceMocks.setUserSettingIsolated
    .mockImplementationOnce(() => first.promise)
    .mockResolvedValueOnce(setting(false));
  const editor = mountEditor(user);
  await flush();

  clickSwitch(getVisibleSwitch(editor.container));
  clickSwitch(getVisibleSwitch(editor.container));
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("false");
  await flush();
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  await React.act(async () => {
    first.resolve(setting(true));
    await first.promise;
    await Promise.resolve();
  });
  await flush();
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("false");
  editor.cleanup();
});

test("a full same-user editor remount keeps the exact settled view while revalidating", async () => {
  const user = makeUser("visible-remount");
  const first = mountEditor(user);
  await flush();
  clickSwitch(getVisibleSwitch(first.container));
  await flush();
  expect(getVisibleSwitch(first.container).getAttribute("aria-checked")).toBe("true");
  first.cleanup();

  preferenceMocks.getUserSettingIsolated.mockResolvedValue(setting(true));
  const second = mountEditor(user);
  expect(getVisibleSwitch(second.container).getAttribute("aria-checked")).toBe("true");
  await flush();
  expect(getVisibleSwitch(second.container).getAttribute("aria-checked")).toBe("true");
  second.cleanup();
});

test("same-user navigation before settlement preserves pending visible state and defers GET", async () => {
  const user = makeUser("visible-navigation");
  const pending = deferred<ReturnType<typeof setting>>();
  preferenceMocks.setUserSettingIsolated.mockImplementationOnce(() => pending.promise);
  const editor = mountEditor(user);
  await flush();
  expect(preferenceMocks.getUserSettingIsolated).toHaveBeenCalledTimes(1);
  clickSwitch(getVisibleSwitch(editor.container));
  await flush();

  editor.render(user, false);
  editor.render(user, true);
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("true");
  await flush();
  expect(preferenceMocks.getUserSettingIsolated).toHaveBeenCalledTimes(1);

  preferenceMocks.getUserSettingIsolated.mockResolvedValue(setting(true));
  await React.act(async () => {
    pending.resolve(setting(true));
    await pending.promise;
    await Promise.resolve();
  });
  await flush();
  expect(preferenceMocks.getUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("true");
  editor.cleanup();
});

test("a fresh editor after coordinator prune starts OFF and performs a fresh GET", async () => {
  vi.useFakeTimers();
  const user = makeUser("visible-prune");
  preferenceMocks.getUserSettingIsolated.mockResolvedValueOnce(setting(true));
  const first = mountEditor(user);
  await flush();
  expect(getVisibleSwitch(first.container).getAttribute("aria-checked")).toBe("true");
  first.cleanup();
  React.act(() => {
    vi.advanceTimersByTime(30_000);
  });

  const freshRead = deferred<ReturnType<typeof setting>>();
  preferenceMocks.getUserSettingIsolated.mockImplementationOnce(() => freshRead.promise);
  const second = mountEditor(user);
  expect(getVisibleSwitch(second.container).getAttribute("aria-checked")).toBe("false");
  await flush();
  expect(preferenceMocks.getUserSettingIsolated).toHaveBeenCalledTimes(2);
  await React.act(async () => {
    freshRead.resolve(setting(true));
    await freshRead.promise;
    await Promise.resolve();
  });
  await flush();
  expect(getVisibleSwitch(second.container).getAttribute("aria-checked")).toBe("true");
  second.cleanup();
});

test("a rejected A write stays A-only and retries once after an explicit A action", async () => {
  const userA = makeUser("visible-failed-a");
  const userB = makeUser("visible-failed-b");
  preferenceMocks.setUserSettingIsolated.mockRejectedValueOnce(
    new Error("preference_transport_failed")
  );
  const editor = mountEditor(userA);
  await flush();
  clickSwitch(getVisibleSwitch(editor.container));
  await flush();
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("true");
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  editor.render(userB);
  await flush();
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("false");
  editor.render(userA);
  await flush();
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("true");
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);
  expect(preferenceMocks.getUserSettingIsolated).toHaveBeenCalledTimes(2);

  clickSwitch(getVisibleSwitch(editor.container));
  await flush();
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(preferenceMocks.setUserSettingIsolated.mock.calls[1]?.[2]).toEqual(
    expect.objectContaining({ expectedUserId: userA.id })
  );
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("false");
  editor.cleanup();
});

test("provider identity cancellation survives removal of the entry toolbar", async () => {
  const userA = makeUser("visible-cancel-a");
  const userB = makeUser("visible-cancel-b");
  const first = deferred<ReturnType<typeof setting>>();
  let signal: AbortSignal | undefined;
  preferenceMocks.setUserSettingIsolated.mockImplementationOnce(
    (_key: string, _value: unknown, options: { signal?: AbortSignal }) => {
      signal = options.signal;
      return first.promise;
    }
  );
  const editor = mountEditor(userA);
  await flush();
  clickSwitch(getVisibleSwitch(editor.container));
  clickSwitch(getVisibleSwitch(editor.container));
  await flush();
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  editor.render(userA, false);
  editor.render(userB, false);
  expect(signal?.aborted).toBe(true);
  await React.act(async () => {
    first.resolve(setting(true));
    await first.promise;
    await Promise.resolve();
  });
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  editor.render(userB);
  await flush();
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("false");
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  editor.render(userA);
  await flush();
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);
  clickSwitch(getVisibleSwitch(editor.container));
  await flush();
  expect(preferenceMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(preferenceMocks.setUserSettingIsolated.mock.calls[1]?.[2]).toEqual(
    expect.objectContaining({ expectedUserId: userA.id })
  );
  expect(getVisibleSwitch(editor.container).getAttribute("aria-checked")).toBe("true");
  editor.cleanup();
});
