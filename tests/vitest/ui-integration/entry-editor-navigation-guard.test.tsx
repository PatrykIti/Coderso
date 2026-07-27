// @vitest-environment happy-dom

// TASK-540 (recovery-cache lane, rc-023): LEAVING the entry editor with unsaved edits. The
// third lane in this family and the only one that mounts the editor under the real
// `AdminRouterProvider`, which is the entire point of it: its siblings mock the router, so
// nothing they can do observes an in-app navigation — and an in-app navigation is where the
// edits went.
//
// The editor registered `beforeunload` and nothing else. Every admin link routes through
// `AdminLink`, which preventDefaults the anchor and calls `router.navigate`, i.e.
// `history.pushState` — and `beforeunload` does not fire for that. Clicking the "Entries"
// breadcrumb in the editor's own `PageHeader` therefore unmounted the component and took the
// typed title, the field values and the metadata edits with it, with no prompt and no trace,
// contradicting docs/guide/coderso/entry-editor-and-metadata.md: "Leaving the editor with
// unsaved status, schedule, SEO, category, or tag changes should trigger the same guard as
// unsaved field edits."
//
// `useAdminDirtyNavigationGuard` already implements both halves — a router blocker AND the
// `beforeunload` handler — and is what the custom-screen entry editor and Settings use. This
// editor simply never adopted it. The cases below drive the real router, the real guard and the
// real dialog end to end, and pin the third fact too: a clean editor must still leave on the
// first attempt, or a guard that blocks unconditionally would keep the other two green.

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";
import {
  beforeUnloadIsGuarded,
  clickMetadataAction,
  flushMicrotasks,
  mount,
  readPanelValue,
  typeTitle,
} from "./support/entryEditorHarness";
import {
  editorState,
  resetEntryEditorDom,
  resetEntryEditorLane,
} from "./support/entryEditorLaneFixture";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const harness = () => import("./support/entryEditorHarness");
const fixture = () => import("./support/entryEditorLaneFixture");

vi.mock("@/components/ui/alert", async () => (await harness()).alertModule);
vi.mock("@/components/ui/badge", async () => (await harness()).badgeModule);
vi.mock("@/components/ui/button", async () => (await harness()).buttonModule);
vi.mock("@/components/ui/card", async () => (await harness()).cardModule);
vi.mock("@/components/ui/input", async () => (await harness()).inputModule);
vi.mock("@/components/ui/scroll-area", async () => (await harness()).scrollAreaModule);
vi.mock("@/components/ui/sheet", async () => (await harness()).sheetModule);
vi.mock("@/components/ui/tabs", async () => (await harness()).tabsModule);
vi.mock("@/components/ui/textarea", async () => (await harness()).textareaModule);

vi.mock("sonner", async () => (await fixture()).sonnerModule);
vi.mock("@/services/apiClient", async () => (await fixture()).apiClientModule);
vi.mock("@/services/cachePolicy", async () => (await fixture()).cachePolicyModule);
vi.mock("@/services/contentTypesClient", async () => (await fixture()).contentTypesClientModule);
vi.mock("@/services/entriesClient", async () => (await fixture()).entriesClientModule);
vi.mock("@/services/siteSettingsClient", async () => (await fixture()).siteSettingsClientModule);
vi.mock("@/services/taxonomyClient", async () => (await fixture()).taxonomyClientModule);
vi.mock("@/ui/layouts/AdminShell", async () => (await fixture()).adminShellModule);
vi.mock("@/utils/cacheBus", async () => (await fixture()).cacheBusModule);
vi.mock(
  "@/ui/preview/RuntimePreviewDialog",
  async () => (await fixture()).runtimePreviewDialogModule
);
vi.mock(
  "../../../core/admin/ui/entries/EntryDeleteDialog",
  async () => (await fixture()).entryDeleteDialogModule
);
vi.mock(
  "../../../core/admin/ui/entries/EntryMetadataPanel",
  async () => (await fixture()).entryMetadataPanelModule
);
vi.mock(
  "../../../core/admin/ui/entries/FieldRenderer",
  async () => (await fixture()).fieldRendererModule
);
vi.mock(
  "../../../core/admin/ui/content-types/schemaMapping",
  async () => (await fixture()).schemaMappingModule
);
vi.mock(
  "../../../core/admin/ui/entries/contentTypeLabels",
  async () => (await fixture()).contentTypeLabelsModule
);
vi.mock(
  "../../../core/admin/ui/entries/entryChecklist",
  async () => (await fixture()).entryChecklistModule
);
// `@/ui/contexts/AdminRouterContext` is deliberately NOT mocked here, unlike in the sibling
// lanes: the defect lives in the real router's blocker protocol, so a fake router would only
// prove the fake. Route PREFETCHING is the one thing the real provider brings along that this
// lane has no use for — it reaches the menus client and its cache policy at import time, and
// nothing here hovers a link — so only that edge is stubbed.
vi.mock("@/utils/adminPrefetch", () => ({ prefetchAdminRoute: () => undefined }));

const ENTRY_PATH = "/admin/advanced/entries/articles/entry-1";
// Where the editor's own "Entries" breadcrumb points, asserted below rather than assumed.
const ENTRIES_PATH = "/admin/advanced/entries";

beforeEach(resetEntryEditorLane);

afterEach(resetEntryEditorDom);

/**
 * The router, driven the way the rest of this repo drives it in tests (see
 * `tests/vitest/ui/support/customScreenEntryNavigationHarness.tsx`): happy-dom has no
 * navigation and marks every anchor click as default-prevented, and `AdminLink` correctly
 * refuses a default-prevented click, so a click on the real breadcrumb cannot reach the router
 * in this environment. Everything from `router.navigate` inward IS the defect — the router asks
 * its blockers, and the editor registered none — and each case checks the breadcrumb's own href
 * against the one this probe navigates to, so it still names the link a user clicks.
 */
function RouterProbe({ href }: { href: string }) {
  const { navigate, path } = useAdminRouter();
  return (
    <div>
      <span data-router-path="true">{path}</span>
      <button type="button" data-router-navigate="true" onClick={() => navigate(href)}>
        Navigate away
      </button>
    </div>
  );
}

const mountEditor = async () => {
  window.history.replaceState({}, "", ENTRY_PATH);
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const view = mount(
    <AdminRouterProvider initialPath={ENTRY_PATH}>
      <RouterProbe href={ENTRIES_PATH} />
      <EntryEditor />
    </AdminRouterProvider>
  );
  await React.act(async () => {
    editorState.resolveEntry(editorState.entry);
    await flushMicrotasks();
  });
  // The link the reported scenario clicks, resolved by `AdminLink` through `adminPaths`. Its
  // href is what the probe above navigates to, so the two cannot drift apart.
  const breadcrumb = view.container.querySelector(`a[href="${ENTRIES_PATH}"]`);
  if (!(breadcrumb instanceof HTMLAnchorElement)) throw new Error("Entries breadcrumb is absent");
  return view;
};

const readWhereWeAre = (container: HTMLElement) => ({
  routerPath: container.querySelector('[data-router-path="true"]')?.textContent ?? "",
  addressBar: window.location.pathname,
});

const clickButton = (root: ParentNode, selector: string) => {
  const button = root.querySelector(selector);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`${selector} button is absent`);
  button.click();
};

const navigateAway = async (container: HTMLElement) => {
  await React.act(async () => {
    clickButton(container, 'button[data-router-navigate="true"]');
    await flushMicrotasks();
  });
};

// The guard's confirm dialog portals out of the editor's container, so it is looked up on the
// document. Absent is a legitimate answer — one case asserts it never appeared.
const findGuardButton = (label: string) =>
  Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent === label
  ) ?? null;

const clickGuardButton = async (label: string) => {
  const button = findGuardButton(label);
  if (!button) throw new Error(`guard dialog button "${label}" is absent`);
  await React.act(async () => {
    button.click();
    await flushMicrotasks();
  });
};

test("an in-app navigation cannot silently leave the editor with unsaved content edits", async () => {
  const view = await mountEditor();
  try {
    React.act(() => {
      typeTitle(view.container, "Unsaved body");
    });

    await navigateAway(view.container);

    // `pushState` never fires `beforeunload`, so that handler was the whole protection and it
    // did nothing here: the route changed and the component went with it.
    expect(readWhereWeAre(view.container)).toEqual({
      routerPath: ENTRY_PATH,
      addressBar: ENTRY_PATH,
    });
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Unsaved body");
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");

    // Cancelling keeps the user exactly where they were, edit intact.
    await clickGuardButton("Keep editing");
    expect(readWhereWeAre(view.container)).toEqual({
      routerPath: ENTRY_PATH,
      addressBar: ENTRY_PATH,
    });
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Unsaved body");

    // Asking again and confirming is what actually leaves.
    await navigateAway(view.container);
    await clickGuardButton("Discard and continue");
    expect(readWhereWeAre(view.container)).toEqual({
      routerPath: ENTRIES_PATH,
      addressBar: ENTRIES_PATH,
    });
  } finally {
    view.cleanup();
  }
});

// The guide names the metadata channel explicitly, and it is the easier one to lose: the panel
// is a sidebar, so a status or SEO change does not look like "editing the document".
test("a metadata-only edit blocks the same navigation, and still guards a browser unload", async () => {
  const view = await mountEditor();
  try {
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-publish");
    });

    await navigateAway(view.container);

    expect(readWhereWeAre(view.container)).toEqual({
      routerPath: ENTRY_PATH,
      addressBar: ENTRY_PATH,
    });
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");
    // The `beforeunload` half has to survive the move to the shared guard: closing the tab is
    // still the other way out of an editor with unsaved work.
    expect(beforeUnloadIsGuarded()).toBe(true);
  } finally {
    view.cleanup();
  }
});

// The other side of the same wiring. A guard that blocked unconditionally would keep both cases
// above green while making every link in the admin ask twice.
test("a clean editor leaves on the first attempt and asks nothing", async () => {
  const view = await mountEditor();
  try {
    expect(beforeUnloadIsGuarded()).toBe(false);

    await navigateAway(view.container);

    expect(readWhereWeAre(view.container)).toEqual({
      routerPath: ENTRIES_PATH,
      addressBar: ENTRIES_PATH,
    });
    expect(findGuardButton("Discard and continue")).toBeNull();
  } finally {
    view.cleanup();
  }
});
