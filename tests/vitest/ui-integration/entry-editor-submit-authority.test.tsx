// @vitest-environment happy-dom

// TASK-540 (recovery-cache lane, rc-022): the entry editor's SUBMIT AUTHORITY — what it may
// send before it has loaded the entry it addresses, and which arriving snapshot becomes that
// baseline. Its sibling lane `entry-editor-hydration-race.test.tsx` owns the neighbouring
// class, rc-020/rc-021: once a baseline EXISTS, which value wins when a read or a save is in
// flight against a local edit. Both mount the same editor against the same fake server
// (`support/entryEditorLaneFixture`), so a scenario reads the same whichever file it is in.

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  findButtonByLabel,
  findDeleteConfirm,
  findHeaderButton,
  findHeaderProbe,
  findMetadataButton,
  findSaveDraft,
  flushMicrotasks,
  mount,
  readDeleteDialog,
  readPanelValue,
  typeTitle,
} from "./support/entryEditorHarness";
import {
  dispatchEntryCacheEvent,
  editorState,
  resetEntryEditorDom,
  resetEntryEditorLane,
} from "./support/entryEditorLaneFixture";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The shadcn primitives are stubbed in the harness module and the service fixture in the
// lane-fixture module, each beside the code that reads it; a `vi.mock` factory is lazy, so it
// may import either even though the call is hoisted. The paths themselves stay here: `vi.mock`
// resolves them relative to the file that calls it.
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
vi.mock("@/ui/contexts/AdminRouterContext", async () => (await fixture()).adminRouterModule);
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
// Not a stub: the real header, wrapped, so the gated Save draft / Publish keep their real
// labels and their real `disabled` wiring while two ungated probes call the same
// `onSaveDraft` / `onPublish` props. See `withUngatedHeaderProbes`.
vi.mock("../../../core/admin/ui/entries/EntryEditorHeader", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../core/admin/ui/entries/EntryEditorHeader")>();
  return {
    EntryEditorHeaderActions: (await harness()).withUngatedHeaderProbes(
      actual.EntryEditorHeaderActions
    ),
  };
});

beforeEach(resetEntryEditorLane);

afterEach(resetEntryEditorDom);

// (e) rc-022: the register commit closed (a)-(d) and opened a fifth instance of the same
// class, a worse one — it can empty an entry instead of losing one field. `applyEntry` is
// the ONLY path that populates `fields` and `values`, and only the read that survives
// `isCurrentLoad` reaches it, while the baseline read's own `finally` switches the page
// spinner off whether or not it hydrated. A read superseded before hydration therefore left
// a fieldless form with a live "Save draft", and that PATCH carries `data: {}` — which
// REPLACES the entry's stored data. The invariant the three cases below pin: until the
// editor has hydrated for the entry it addresses, every snapshot that arrives is its
// baseline (applied whatever superseded it, with the user's registered edits kept on top),
// and no save may fire at all.

test("a baseline read superseded before it hydrates is still applied, so the save carries the entry", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    // A cache event supersedes the baseline read before it resolves...
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
    });
    expect(editorState.startedEntryReads()).toBe(2);

    // ...and that superseded read is the only snapshot that ever arrives. Nothing else can
    // populate the fields: a mutation response carries no content type.
    await React.act(async () => {
      editorState.resolveEntryRead(0, editorState.entry);
      await flushMicrotasks();
    });
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    // The PATCH replaces `data` wholesale, so what the client was called with is the harm:
    // discarding this snapshot sent `{ title: "", slug: "", data: {} }`.
    expect(editorState.updatePayloads).toEqual([
      { title: "Hello", slug: "hello", data: { title: "Hello", summary: "Summary" } },
    ]);
    expect(view.container.textContent).toContain("field:summary");
  } finally {
    view.cleanup();
  }
});

test("a cache-bus read arriving before any hydration is applied, not merely offered", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    // The user types while the baseline read is still open, so the editor has edits.
    React.act(() => {
      typeTitle(view.container, "Typed before hydration");
    });

    // A cache event starts a second read, and that one resolves first.
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
      editorState.resolveEntryRead(1, { ...editorState.entry, slug: "newer-slug" });
      await flushMicrotasks();
    });

    // The baseline read lands last. It is superseded AND there is a baseline now, so it is
    // discarded rather than applied — (b) stays closed, its older slug never appears.
    await React.act(async () => {
      editorState.resolveEntryRead(0, { ...editorState.entry, slug: "older-slug" });
      await flushMicrotasks();
    });
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    // With no baseline yet there was no local state for "someone else's change" to conflict
    // with: that snapshot IS the baseline, and the typed title stays on top of it. Offering it
    // instead left the editor fieldless and sent `data: {}` with an empty slug.
    expect(editorState.updatePayloads).toEqual([
      {
        title: "Typed before hydration",
        slug: "newer-slug",
        data: { title: "Typed before hydration", summary: "Summary" },
      },
    ]);
    expect(view.container.textContent).not.toContain("Updated in another tab");
    expect(view.container.textContent).toContain("field:summary");
  } finally {
    view.cleanup();
  }
});

test("an entry that never hydrated can be saved or published through no channel at all", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  editorState.hideContentType();
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    // The entry read succeeds and the spinner goes off, but nothing hydrated: the schema
    // never arrived, so `fields` and `values` are still empty.
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Content type not found.");

    const save = findSaveDraft(view.container);
    const publish = findHeaderButton(view.container, "Publish");
    const metadataSave = findMetadataButton(view.container, "data-metadata-save");
    await React.act(async () => {
      save.click();
      publish.click();
      metadataSave.click();
      // The probe calls the panel's own `onSave` with no gate: what refuses it is the editor.
      findMetadataButton(view.container, "data-metadata-save-ungated").click();
      await flushMicrotasks();
    });

    // `data: {}` would replace the entry's content, the metadata PATCH would push the panel's
    // mount defaults (draft, public, no schedule, empty SEO) over the server's, and publish
    // would flip the stored status. Asserted together, so a failure names every leak.
    expect({
      updates: editorState.updatePayloads,
      metadata: editorState.metadataPayloads,
      published: editorState.publishCalls,
    }).toEqual({ updates: [], metadata: [], published: [] });
    expect([save.disabled, publish.disabled, metadataSave.disabled]).toEqual([true, true, true]);
  } finally {
    view.cleanup();
  }
});

// The case above asserts the buttons AND the requests, but for the two header channels it can
// only assert the buttons: happy-dom does not dispatch a click on a disabled element, and React
// refuses to call `onClick` when the element's props say `disabled`, so the click never reaches
// `handleSaveDraft` or `handlePublish` whether or not they guard themselves. Removing
// `refuseUnloadedSubmit()` from both of them left that case green. What follows drives the same
// two props through ungated probes, so the assertion observes the editor refusing rather than an
// attribute — the button gate is a courtesy, the handler is the guarantee.
test("the save and publish handlers refuse an unloaded entry themselves, not only through their buttons", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    // The baseline read is still open, so nothing has hydrated and no other failure is in
    // play: `fields` and `values` are empty and a save would PATCH `data: {}` over the
    // stored entry.
    await React.act(async () => {
      await flushMicrotasks();
    });
    expect([
      findSaveDraft(view.container).disabled,
      findHeaderButton(view.container, "Publish").disabled,
    ]).toEqual([true, true]);

    await React.act(async () => {
      findHeaderProbe(view.container, "data-header-save-draft-ungated").click();
      findHeaderProbe(view.container, "data-header-publish-ungated").click();
      await flushMicrotasks();
    });

    expect({
      updates: editorState.updatePayloads,
      published: editorState.publishCalls,
    }).toEqual({ updates: [], published: [] });
    // Nothing else explains the refusal in this scenario (the read has not failed and the
    // content type resolved), so the editor has to say it itself.
    expect(view.container.textContent).toContain("This entry has not finished loading yet.");
  } finally {
    view.cleanup();
  }
});

// Deleting is not submitting state, but it is the same class and the worse outcome: the row is
// gone. `handleDeleteEntry` opened with `if (!type || !id) return;` and the panel's Delete
// carried no gate at all, so on an editor that never hydrated a user could confirm the
// destruction of a row it never showed them — the confirm dialog falls back to "Delete this
// entry?" precisely because there is no title to name it with.
test("an entry that never hydrated cannot be deleted, and the dialog cannot even name it", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    // The baseline read is still open: no title, no fields, no loaded entry.
    await React.act(async () => {
      await flushMicrotasks();
    });
    expect(findMetadataButton(view.container, "data-metadata-delete").disabled).toBe(true);
    expect(readDeleteDialog(view.container).open).toBe(false);

    // The ungated probe opens the dialog the gated button refuses to offer, which is the only
    // way to reach the handler and see what IT does rather than what the button attribute says.
    await React.act(async () => {
      findMetadataButton(view.container, "data-metadata-delete-ungated").click();
      await flushMicrotasks();
    });
    expect(readDeleteDialog(view.container)).toEqual({
      open: true,
      description: "Delete this entry? This cannot be undone.",
    });

    await React.act(async () => {
      findDeleteConfirm(view.container).click();
      await flushMicrotasks();
    });

    // No DELETE left, the editor says why, and the dialog is closed so the message is not
    // hidden behind it.
    expect(editorState.deleteCalls).toEqual([]);
    expect(view.container.textContent).toContain("This entry has not finished loading yet.");
    expect(readDeleteDialog(view.container).open).toBe(false);
  } finally {
    view.cleanup();
  }
});

// R3. The guards above are correct and they had a cost nobody paid for: a baseline read that
// REJECTS, and one that resolves NULL, both leave every submit disabled and no fields on
// screen, and the only re-read the editor offered lives inside the "updated in another tab"
// alert — which needs a hydration of its own. The verified shape after a reject was
// { save: true, publish: true, metadata: true, loadingText: true, errorText: true }: a dead
// editor, escapable only by reloading the browser. Two cases, because the two failures leave a
// different screen behind, and the retry has to be reachable in both.
test("a baseline read that fails is recoverable, and the retry hydrates the editor", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.rejectEntryRead(0, "Network down");
      await flushMicrotasks();
    });
    // Refused everywhere, as it must be — and no longer claiming to be loading, which was the
    // other half of the lie.
    expect([
      findSaveDraft(view.container).disabled,
      findHeaderButton(view.container, "Publish").disabled,
      findMetadataButton(view.container, "data-metadata-save").disabled,
      findMetadataButton(view.container, "data-metadata-delete").disabled,
    ]).toEqual([true, true, true, true]);
    expect(view.container.textContent).toContain("Failed to load entry.");
    expect(view.container.textContent).not.toContain("Loading entry fields");
    // The pre-existing "Refresh" is not the way out: it is inside an alert this editor cannot
    // reach.
    expect(view.container.textContent).not.toContain("Refresh to load the latest version");

    await React.act(async () => {
      findButtonByLabel(view.container, "Retry loading this entry").click();
      await flushMicrotasks();
    });
    // A second read, started by the click and only by the click: nothing here re-reads on its
    // own, so a GET that keeps failing cannot loop.
    expect(editorState.startedEntryReads()).toBe(2);
    expect(view.container.textContent).toContain("Loading entry fields");

    await React.act(async () => {
      editorState.resolveEntryRead(1, editorState.entry);
      await flushMicrotasks();
    });
    // Recovered for real: the fields are there, the failure banner is gone, and the save that
    // was refused now carries the entry rather than emptying it.
    expect(view.container.textContent).toContain("field:summary");
    expect(view.container.textContent).not.toContain("Failed to load entry.");
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });
    expect(editorState.updatePayloads).toEqual([
      { title: "Hello", slug: "hello", data: { title: "Hello", summary: "Summary" } },
    ]);
  } finally {
    view.cleanup();
  }
});

test("a baseline read that resolves nothing is recoverable too, though nothing explains it", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntryRead(0, null);
      await flushMicrotasks();
    });
    // `if (!entryResult) return;` sets no error, so there is no alert to hang a recovery button
    // on — which is why the retry lives in the field-area placeholder, the one surface that
    // renders in every not-loaded shape.
    expect(view.container.textContent).not.toContain("Unable to load entry");
    expect(findMetadataButton(view.container, "data-metadata-save").disabled).toBe(true);

    await React.act(async () => {
      findButtonByLabel(view.container, "Retry loading this entry").click();
      await flushMicrotasks();
    });
    expect(editorState.startedEntryReads()).toBe(2);

    await React.act(async () => {
      editorState.resolveEntryRead(1, editorState.entry);
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("field:summary");
    expect(findSaveDraft(view.container).disabled).toBe(false);
  } finally {
    view.cleanup();
  }
});

// R4. `hasLoadedEntry` asks "did we load the entry we are ADDRESSING", not "did we load
// something once", and that stronger half cannot be pinned directly: `EntryEditor` keys the
// instance by `${type}:${id}`, so an identity change remounts and the weakened predicate stays
// green. Recorded as deliberately unpinned at the predicate itself. What this case pins is the
// assumption it free-rides on — remove the key and the editor keeps the previous entry's state
// while addressing a new one, which is precisely the situation the strong predicate exists for.
test("moving to another entry in place starts over instead of carrying the first entry's state", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntryRead(0, editorState.entry);
      await flushMicrotasks();
    });
    React.act(() => {
      typeTitle(view.container, "Edited first entry");
    });
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Edited first entry");

    // The route changes to another entry without leaving the editor: React is handed the same
    // element in the same root, and only the key decides whether it reuses this instance.
    window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-2");
    view.rerender(<EntryEditor />);
    await React.act(async () => {
      await flushMicrotasks();
    });

    // Nothing of entry-1 is left — not the typed title, not the loaded state — and the second
    // entry's own baseline read has started.
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("");
    expect(findSaveDraft(view.container).disabled).toBe(true);
    expect(editorState.startedEntryReads()).toBe(2);

    await React.act(async () => {
      editorState.resolveEntryRead(1, {
        ...editorState.entry,
        id: "entry-2",
        title: "Second",
        slug: "second",
        data: { title: "Second", summary: "Second summary" },
      });
      await flushMicrotasks();
    });
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    // The save carries entry-2 and nothing of entry-1: a stale instance would have kept the
    // typed title as an edit and written it onto the row the user only navigated to.
    expect(editorState.updatePayloads).toEqual([
      { title: "Second", slug: "second", data: { title: "Second", summary: "Second summary" } },
    ]);
  } finally {
    view.cleanup();
  }
});
