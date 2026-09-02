// @vitest-environment happy-dom
//
// TASK-105-08-04: client harness for CustomScreenListPage interactive flows
// (content-type label hydration/failure, create drawer, status/delete/bulk
// actions, selection, cache events). Uses vi.spyOn on real module exports and
// a real AdminRouterProvider + createRoot mount.

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, type MockInstance, vi } from "vitest";

import * as contentTypesClient from "../../../../core/admin/services/contentTypesClient";
import * as customScreensClient from "../../../../core/admin/services/customScreensClient";
import * as userSettingsClient from "../../../../core/admin/services/userSettingsClient";
import { cacheKeys } from "../../../../core/admin/services/cachePolicy";
import { broadcastCacheEvent } from "../../../../core/admin/utils/cacheBus";
import type { CustomScreenSummaryRecord } from "../../../../core/services/customScreens/customScreenSummaryContract";
import type { ContentTypeSummary } from "../../../../core/admin/services/contentTypesClient";
import type { UserSettings } from "../../../../core/admin/services/userSettingsClient";
import { CustomScreenListPage } from "../../../../core/admin/ui/custom-screens/CustomScreenListPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../../core/admin/ui/contexts/AdminRouterContext";

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

export const buildMountedContentType = (): ContentTypeSummary => ({
  id: "type-projects",
  name: "Projects",
  slug: "projects",
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
});

export const buildScreen = (
  id: string,
  name: string,
  overrides: Partial<CustomScreenSummaryRecord> = {}
): CustomScreenSummaryRecord => ({
  id,
  name,
  contentTypeId: buildMountedContentType().id,
  status: "draft",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: false,
  sidebarLabel: null,
  schemaVersion: 4,
  blocks: [],
  bindings: [],
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
  ...overrides,
});

function RouterProbe() {
  const { path } = useAdminRouter();
  return (
    <div data-router-probe>
      <output data-current-path>{path}</output>
    </div>
  );
}

const flushMountedPage = async () => {
  await React.act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

const defaultUserSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  "pages.openAfterCreate": true,
  "customScreens.openAfterCreate": true,
  "forms.openAfterCreate": true,
  "media.openAfterUpload": false,
  "widgets.hero.presets": [],
  "posts.editor.preferences": {
    version: 2,
    focusModeOnOpen: false,
    compactSidePanels: false,
    showOutlineHints: true,
    editorDensity: "comfortable",
    showKeyboardHints: true,
    defaultInspectorTab: "post",
    restoreLastSidebarsState: true,
  },
  "assistant.mode": "llm-guide",
  "assistant.ui.enabled": true,
  "assistant.ui.avatarEnabled": false,
  "assistant.ui.avatarAsset": null,
  "customScreens.entry.preferences": {
    version: 1,
    showFieldMetadata: false,
  },
  ...overrides,
});

const clickElement = (element: Element | null | undefined) => {
  expect(element, "expected element to exist").toBeTruthy();
  if (!element) throw new Error("expected element to exist");
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const pointerClick = (element: Element | null | undefined) => {
  expect(element, "pointer click target missing").toBeTruthy();
  if (!element) throw new Error("pointer click target missing");
  React.act(() => {
    element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const setInputValue = (input: HTMLInputElement | null | undefined, value: string) => {
  expect(input, "expected input to exist").toBeTruthy();
  if (!input) throw new Error("expected input to exist");
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
  if (!setter) throw new Error("expected input value setter");
  React.act(() => {
    input.focus();
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

export type ListPageHarness = {
  container: HTMLElement;
  cleanup: () => void;
};

export function createCustomScreenListPageHarness() {
  const mountedContentType = buildMountedContentType();
  let cachedScreens: CustomScreenSummaryRecord[] | null = null;
  let remoteScreens: CustomScreenSummaryRecord[] = [];
  let cachedContentTypes: ContentTypeSummary[] | null = null;
  let remoteContentTypes: ContentTypeSummary[] = [mountedContentType];
  let screensLoadQueue: Array<{
    request: Promise<CustomScreenSummaryRecord[]>;
  }> = [];
  let contentTypesLoadQueue: Array<Promise<ContentTypeSummary[]>> = [];
  let getUserSettingsImpl: () => Promise<UserSettings> = async () => defaultUserSettings();
  let active = false;
  let createSpy: MockInstance<typeof customScreensClient.createCustomScreen> | null = null;
  let updateSpy: MockInstance<typeof customScreensClient.updateCustomScreen> | null = null;
  let deleteSpy: MockInstance<typeof customScreensClient.deleteCustomScreen> | null = null;
  let setUserSettingSpy: MockInstance<typeof userSettingsClient.setUserSetting> | null = null;

  const setup = () => {
    if (active) throw new Error("list page harness setup must be paired with cleanup");
    active = true;
    cachedScreens = null;
    remoteScreens = [buildScreen("screen-1", "Projects"), buildScreen("screen-2", "Team")];
    cachedContentTypes = null;
    remoteContentTypes = [mountedContentType];
    screensLoadQueue = [];
    contentTypesLoadQueue = [];
    getUserSettingsImpl = async () => defaultUserSettings();

    vi.spyOn(customScreensClient, "getCachedCustomScreens").mockReturnValue(cachedScreens);
    vi.spyOn(customScreensClient, "listCustomScreensCached").mockImplementation(async () => {
      const queued = screensLoadQueue.shift();
      return queued ? await queued.request : remoteScreens;
    });
    vi.spyOn(contentTypesClient, "getCachedContentTypes").mockReturnValue(cachedContentTypes);
    vi.spyOn(contentTypesClient, "listContentTypesCached").mockImplementation(async () => {
      const queued = contentTypesLoadQueue.shift();
      return queued ? await queued : remoteContentTypes;
    });
    createSpy = vi
      .spyOn(customScreensClient, "createCustomScreen")
      .mockImplementation(async (input) => {
        const created = buildScreen("created-screen", input.name, {
          contentTypeId: input.contentTypeId,
          status: input.status ?? "draft",
          showInSidebar: input.showInSidebar === true,
          sidebarLabel: typeof input.sidebarLabel === "string" ? input.sidebarLabel : null,
        });
        remoteScreens = [created, ...remoteScreens];
        return created;
      });
    updateSpy = vi
      .spyOn(customScreensClient, "updateCustomScreen")
      .mockImplementation(async (id, input) => {
        remoteScreens = remoteScreens.map((screen) =>
          screen.id === id ? { ...screen, ...input } : screen
        );
        return remoteScreens.find((screen) => screen.id === id) ?? buildScreen(id, "Missing");
      });
    deleteSpy = vi
      .spyOn(customScreensClient, "deleteCustomScreen")
      .mockImplementation(async (id) => {
        remoteScreens = remoteScreens.filter((screen) => screen.id !== id);
        return { ok: true };
      });
    vi.spyOn(userSettingsClient, "getUserSettings").mockImplementation(getUserSettingsImpl);
    setUserSettingSpy = vi
      .spyOn(userSettingsClient, "setUserSetting")
      .mockImplementation(async (key, value) => ({ key, value }));
  };

  const setCachedScreens = (screens: CustomScreenSummaryRecord[] | null) => {
    cachedScreens = screens;
    vi.mocked(customScreensClient.getCachedCustomScreens).mockReturnValue(screens);
  };
  const setRemoteScreens = (screens: CustomScreenSummaryRecord[]) => {
    remoteScreens = screens;
  };
  const setCachedContentTypes = (types: ContentTypeSummary[] | null) => {
    cachedContentTypes = types;
    vi.mocked(contentTypesClient.getCachedContentTypes).mockReturnValue(types);
  };
  const setRemoteContentTypes = (types: ContentTypeSummary[]) => {
    remoteContentTypes = types;
  };
  const setGetUserSettings = (impl: () => Promise<Partial<UserSettings>>) => {
    getUserSettingsImpl = async () => defaultUserSettings(await impl());
    vi.mocked(userSettingsClient.getUserSettings).mockImplementation(getUserSettingsImpl);
  };
  const queueScreensLoad = (request: Promise<CustomScreenSummaryRecord[]>) => {
    screensLoadQueue.push({ request });
  };
  const queueContentTypesLoad = (request: Promise<ContentTypeSummary[]>) => {
    contentTypesLoadQueue.push(request);
  };

  const requireCreateSpy = () => {
    if (!createSpy) throw new Error("list page harness is not set up");
    return createSpy;
  };
  const requireUpdateSpy = () => {
    if (!updateSpy) throw new Error("list page harness is not set up");
    return updateSpy;
  };
  const requireDeleteSpy = () => {
    if (!deleteSpy) throw new Error("list page harness is not set up");
    return deleteSpy;
  };
  const requireSetUserSettingSpy = () => {
    if (!setUserSettingSpy) throw new Error("list page harness is not set up");
    return setUserSettingSpy;
  };

  const mount = (path: string): ListPageHarness => {
    window.history.replaceState({}, "", path);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    React.act(() => {
      root.render(
        <AdminRouterProvider initialPath={path}>
          <RouterProbe />
          <CustomScreenListPage />
        </AdminRouterProvider>
      );
    });
    return {
      container,
      cleanup: () => {
        React.act(() => root.unmount());
        container.remove();
      },
    };
  };

  const findButton = (root: ParentNode, text: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === text
    ) ?? null;

  const findByText = (root: ParentNode, text: string) =>
    Array.from(root.querySelectorAll<HTMLElement>("*")).find(
      (node) => node.childElementCount === 0 && node.textContent?.trim() === text
    ) ?? null;

  const getAlertMessage = (root: ParentNode, title: string) => {
    const alert = Array.from(root.querySelectorAll<HTMLElement>('[data-slot="alert"]')).find(
      (candidate) =>
        candidate.querySelector('[data-slot="alert-title"]')?.textContent?.trim() === title
    );
    return alert?.querySelector('[data-slot="alert-description"]')?.textContent?.trim() ?? null;
  };

  const openRowActions = (root: ParentNode, screenName: string) => {
    const card = Array.from(root.querySelectorAll<HTMLElement>("[data-selected]")).find((node) =>
      node.textContent?.includes(screenName)
    );
    const trigger = card?.querySelector<HTMLButtonElement>("button[aria-haspopup='menu']");
    pointerClick(trigger);
  };

  const emitCacheEvent = (key: string) => {
    React.act(() => {
      broadcastCacheEvent({ key, action: "update" });
    });
  };

  const currentPath = (container: ParentNode) =>
    container.querySelector("[data-current-path]")?.textContent ?? "";

  const cleanup = () => {
    if (!active) return;
    active = false;
    vi.restoreAllMocks();
  };

  return {
    setup,
    cleanup,
    mount,
    flushMountedPage,
    findButton,
    findByText,
    getAlertMessage,
    openRowActions,
    emitCacheEvent,
    currentPath,
    clickElement,
    pointerClick,
    setInputValue,
    setCachedScreens,
    setRemoteScreens,
    setCachedContentTypes,
    setRemoteContentTypes,
    setGetUserSettings,
    queueScreensLoad,
    queueContentTypesLoad,
    requireCreateSpy,
    requireUpdateSpy,
    requireDeleteSpy,
    requireSetUserSettingSpy,
    deferred,
    buildScreen,
    buildMountedContentType,
    cacheKeys,
  };
}
