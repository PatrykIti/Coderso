// @vitest-environment happy-dom

// TASK-540 (recovery-cache lane, rc-020 -> rc-021): the entry editor exposes a
// writable Title/Slug block while the entry GET is still in flight. A keystroke
// that lands before hydration used to make the mount effect treat the fetched
// entry as a "remote update" and DISCARD it, leaving `slug` empty and every
// field value unpopulated — and the next Save draft persisted that emptiness
// (PATCH `{ slug: "", data: {} }`). Hydration is the baseline the local edit is
// based on, so it must always be applied, with the typed value kept on top.
//
// Local edits arrive through TWO channels and hydration must respect both: the
// content channel (title/slug/field values, "Save draft") and the metadata channel
// (status/visibility/schedule/SEO/taxonomy, the metadata panel's own Save). The metadata
// panel also renders outside the isLoading gate, so a pre-hydration metadata edit
// is just as reachable — and preserving only the content channel silently reverted
// it and cleared its unsaved-changes warning. Preserving the metadata channel is
// per FIELD: an untouched control must still hydrate from the snapshot, otherwise
// the panel's all-in-one PATCH would push its pristine mount default (draft,
// public, no schedule, empty SEO) over the server's real state.
//
// rc-021 pins the four remaining ways the editor lost or misplaced an edit, all of
// which came from the same root cause — "has the user touched this?" was inferred from
// the VALUE in some places, tracked explicitly in others and not at all for taxonomy:
//   (a) NOTHING is disabled while a save is in flight, so an edit made during the
//       request was either falsely marked saved (content) or visibly reverted from the
//       response (metadata);
//   (b) no read carried any authority, and `getEntryCached` hands the loser of two
//       concurrent reads back to its caller, so an older snapshot could overwrite a
//       newer one;
//   (c) the taxonomy overview read restored category/tags from its OWN older entry
//       snapshot, long after the user could see and use the control;
//   (d) a title or slug the user CLEARED read as pristine, so hydration put the stored
//       value back — including the `slugify()` case, which returns "" for an
//       all-non-ASCII title.
// The last case here is a guard rather than a regression: hydrating from a mutation
// response now covers visibility and the access password too, which no earlier case
// exercised.
//
// The sibling lane `entry-editor-submit-authority.test.tsx` owns the other defect class in
// this family: what the editor is allowed to SUBMIT before it has hydrated at all. Both
// lanes share `support/entryEditorLaneFixture` — the same fake server — so a scenario reads
// the same whichever file it lands in.

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  beforeUnloadIsGuarded,
  clickMetadataAction,
  findSaveDraft,
  flushMicrotasks,
  mount,
  readMetadataState,
  readPanelValue,
  typeAccessPassword,
  typeSeoDescription,
  typeSlug,
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

beforeEach(resetEntryEditorLane);

afterEach(resetEntryEditorDom);

test("a title typed before hydration keeps the loaded slug and field data on save", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    // The mount read is still pending: the Title/Slug block is already writable.
    expect(view.container.textContent).toContain("Loading entry fields");

    React.act(() => {
      typeTitle(view.container, "Updated title");
    });

    // Hydration lands AFTER the keystroke.
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    // Hydration must not be mistaken for a concurrent edit in another tab.
    expect(view.container.textContent).not.toContain("Updated in another tab");
    const slugInput = view.container.querySelector('[data-slug-input="true"]');
    if (!(slugInput instanceof HTMLInputElement)) throw new Error("slug input is absent");
    expect(slugInput.value).toBe("hello");

    const save = findSaveDraft(view.container);
    expect(save.disabled).toBe(false);

    await React.act(async () => {
      save.click();
      await flushMicrotasks();
    });

    expect(editorState.updatePayloads).toEqual([
      {
        title: "Updated title",
        slug: "hello",
        data: { title: "Updated title", summary: "Summary" },
      },
    ]);
  } finally {
    view.cleanup();
  }
});

test("a metadata edit made before hydration survives it and is what the metadata save sends", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    // The mount read is still pending: the metadata panel is already writable.
    expect(view.container.textContent).toContain("Loading entry fields");

    // Metadata only — the content channel (title/slug/fields) is never touched here.
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-publish");
    });
    React.act(() => {
      typeSeoDescription(view.container, "Edited before hydration");
    });
    expect(view.container.textContent).toContain("Unsaved changes");

    // Hydration lands AFTER the metadata edit.
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    // The edit is still there, and it is still flagged as unsaved.
    expect(readMetadataState(view.container)).toEqual({
      status: "published",
      seoDescription: "Edited before hydration",
    });
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).not.toContain("Updated in another tab");

    // ...and the content channel still hydrated normally.
    const slugInput = view.container.querySelector('[data-slug-input="true"]');
    if (!(slugInput instanceof HTMLInputElement)) throw new Error("slug input is absent");
    expect(slugInput.value).toBe("hello");
    expect(view.container.textContent).toContain("field:summary");

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads).toEqual([
      {
        status: "published",
        visibility: "public",
        accessPassword: null,
        scheduledAt: null,
        taxonomy: { categoryId: null, tagIds: [] },
        seo: { description: "Edited before hydration" },
      },
    ]);
    // Saving the channel clears its warning; nothing was written through the content channel.
    expect(view.container.textContent).not.toContain("Unsaved changes");
    expect(editorState.updatePayloads).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("hydration still overwrites the metadata fields the user did not touch", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    // Only the SEO description is edited; `status` keeps its pristine mount default.
    React.act(() => {
      typeSeoDescription(view.container, "Edited before hydration");
    });

    await React.act(async () => {
      editorState.resolveEntry({ ...editorState.entry, status: "published" });
      await flushMicrotasks();
    });

    // The untouched control takes the server value — a preserved "draft" default would
    // unpublish the entry on the panel's next all-in-one metadata PATCH.
    expect(readMetadataState(view.container)).toEqual({
      status: "published",
      seoDescription: "Edited before hydration",
    });

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads).toEqual([
      {
        status: "published",
        visibility: "public",
        accessPassword: null,
        scheduledAt: null,
        taxonomy: { categoryId: null, tagIds: [] },
        seo: { description: "Edited before hydration" },
      },
    ]);
  } finally {
    view.cleanup();
  }
});

// (a) content channel: only the Save buttons are disabled during a save, so the title
// stays editable while its PATCH is in flight.
test("a title typed while Save draft is in flight stays dirty and is what the next save sends", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    React.act(() => {
      typeTitle(view.container, "Saved title");
    });

    editorState.holdNext("updateEntry");
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });
    // The request left with the title as it was; it cannot persist what comes next.
    expect(editorState.updatePayloads).toEqual([
      {
        title: "Saved title",
        slug: "hello",
        data: { title: "Saved title", summary: "Summary" },
      },
    ]);

    // The user keeps typing while the PATCH is still open.
    React.act(() => {
      typeTitle(view.container, "Typed during save");
    });

    await React.act(async () => {
      editorState.release("updateEntry");
      await flushMicrotasks();
    });

    // The response is authoritative only for what it persisted: the newer title is kept
    // and STILL dirty, so navigating away is guarded...
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Typed during save");
    expect(beforeUnloadIsGuarded()).toBe(true);
    expect(view.container.textContent).toContain("Unsaved changes");

    // ...and a background read that arrives before the next save cannot apply the server
    // snapshot over it. A falsely "saved" title is lost in place, not only on navigation.
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
      editorState.resolveEntryRead(1, editorState.entry);
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Typed during save");
    expect(view.container.textContent).toContain("Updated in another tab");

    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    expect(editorState.updatePayloads[1]).toEqual({
      title: "Typed during save",
      slug: "hello",
      data: { title: "Typed during save", summary: "Summary" },
    });
    expect(view.container.textContent).not.toContain("Unsaved changes");
    expect(beforeUnloadIsGuarded()).toBe(false);
  } finally {
    view.cleanup();
  }
});

// (a) metadata channel: the completion used to rewrite every control from the response,
// so an edit made during the request was visibly reverted.
test("a metadata edit made while the metadata save is in flight is not reverted by the response", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-publish");
    });

    editorState.holdNext("updateEntryMetadata");
    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });
    expect(editorState.metadataPayloads).toEqual([
      {
        status: "published",
        visibility: "public",
        accessPassword: null,
        scheduledAt: null,
        taxonomy: { categoryId: null, tagIds: [] },
        seo: { description: "Meta" },
      },
    ]);

    // The SEO field is not disabled while the PATCH is open.
    React.act(() => {
      typeSeoDescription(view.container, "Typed during save");
    });

    await React.act(async () => {
      editorState.release("updateEntryMetadata");
      await flushMicrotasks();
    });

    // `status` was persisted, so it takes the response; the SEO edit was not, so it
    // survives and keeps the channel dirty.
    expect(readMetadataState(view.container)).toEqual({
      status: "published",
      seoDescription: "Typed during save",
    });
    expect(view.container.textContent).toContain("Unsaved changes");

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads[1]).toEqual({
      status: "published",
      visibility: "public",
      accessPassword: null,
      scheduledAt: null,
      taxonomy: { categoryId: null, tagIds: [] },
      seo: { description: "Typed during save" },
    });
  } finally {
    view.cleanup();
  }
});

// (b) read authority: `getEntryCached` hands the loser of two concurrent reads back to
// its caller, so the editor itself has to reject it.
test("an entry read that resolves after a newer one does not overwrite it", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    expect(editorState.startedEntryReads()).toBe(1);

    // A cache event starts a second read while the first is still open.
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
    });
    expect(editorState.startedEntryReads()).toBe(2);

    // The NEWER read resolves first and is applied.
    await React.act(async () => {
      editorState.resolveEntryRead(1, { ...editorState.entry, title: "Newer title" });
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Newer title");

    // The older read resolves last and must be discarded, not applied.
    await React.act(async () => {
      editorState.resolveEntryRead(0, { ...editorState.entry, title: "Older title" });
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Newer title");
  } finally {
    view.cleanup();
  }
});

// (c) taxonomy: the overview read used to restore category/tags from its own older entry
// snapshot, so a pick made while it was in flight was silently reverted — and the save
// then submitted the reverted value.
test("a category picked while the taxonomy overview is in flight is not restored to the old one", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const categorized = {
    ...editorState.entry,
    taxonomy: { category: { id: "cat-1", name: "First", slug: "first" }, tags: [] },
  };

  const view = mount(<EntryEditor />);
  try {
    // First load: the overview resolves, so the category control is live from now on.
    await React.act(async () => {
      editorState.resolveEntry(categorized);
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-category-value")).toBe("cat-1");

    // A background refresh: its entry read lands, its overview read is still open.
    editorState.holdNext("taxonomyOverview");
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
      editorState.resolveEntryRead(1, categorized);
      await flushMicrotasks();
    });

    // The user picks a different category while that overview read is in flight.
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-category");
    });
    expect(readPanelValue(view.container, "data-metadata-category-value")).toBe("cat-2");

    await React.act(async () => {
      editorState.release("taxonomyOverview");
      await flushMicrotasks();
    });

    expect(readPanelValue(view.container, "data-metadata-category-value")).toBe("cat-2");

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads).toEqual([
      {
        status: "draft",
        visibility: "public",
        accessPassword: null,
        scheduledAt: null,
        taxonomy: { categoryId: "cat-2", tagIds: [] },
        seo: { description: "Meta" },
      },
    ]);
  } finally {
    view.cleanup();
  }
});

// (d) editedness is a fact about the user's action, not about the value: clearing a
// title or a slug is an edit, and `slugify()` returns "" for an all-non-ASCII title.
test("a title and slug cleared before hydration stay cleared and are what the save sends", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Loading entry fields");

    // Typed, then cleared again — both before the entry read resolves.
    React.act(() => {
      typeTitle(view.container, "Draft title");
    });
    React.act(() => {
      typeTitle(view.container, "");
    });
    React.act(() => {
      typeSlug(view.container, "draft-slug");
    });
    React.act(() => {
      typeSlug(view.container, "");
    });

    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    // Hydration must not read "" as "never touched" and put the stored values back.
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("");
    expect(readPanelValue(view.container, "data-metadata-slug-value")).toBe("");
    expect(view.container.textContent).toContain("Unsaved changes");

    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    expect(editorState.updatePayloads).toEqual([
      { title: "", slug: "", data: { title: "", summary: "Summary" } },
    ]);
  } finally {
    view.cleanup();
  }
});

// Guard, not a regression: hydrating from a mutation response now covers visibility and
// the access password, which "Save draft" does not submit. Unsaved edits to them must
// survive it, and once the metadata save HAS persisted them, what the content response
// reports back is the persisted value — both routes answer with a fresh full read.
test("a draft save keeps an unsaved visibility edit and reports the persisted one", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    // Visibility and the password are edited and NOT saved; "Save draft" submits neither.
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-password-mode");
    });
    React.act(() => {
      typeAccessPassword(view.container, "a-new-password");
    });
    React.act(() => {
      typeTitle(view.container, "Draft body");
    });

    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    expect(readPanelValue(view.container, "data-metadata-visibility-value")).toBe("password");
    expect(readPanelValue(view.container, "data-metadata-password-value")).toBe("a-new-password");
    // The content channel is saved; the metadata channel is still dirty.
    expect(view.container.textContent).toContain("Unsaved changes");

    // Now the metadata save persists "private", so the value stops being the user's.
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-private");
    });
    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-visibility-value")).toBe("private");

    React.act(() => {
      typeTitle(view.container, "Draft body, again");
    });
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    // The content response may write visibility now, and what it writes is what the
    // server holds — not the value the editor was loaded with.
    expect(readPanelValue(view.container, "data-metadata-visibility-value")).toBe("private");
    expect(readPanelValue(view.container, "data-metadata-password-value")).toBe("");
    expect(editorState.updatePayloads).toHaveLength(2);

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads[1].visibility).toBe("private");
  } finally {
    view.cleanup();
  }
});

// (e) RESPONSE AUTHORITY. The cases above gave every READ a sequence number, because
// `getEntryCached` hands the loser of two concurrent reads back to its caller. A mutation's
// response body is a snapshot of the same entry and got none: every one of the three
// hydrated unconditionally. Nothing disables another channel's Save either — each button
// disables only itself — so two mutations are genuinely concurrent, their bodies are built
// when the route handles each request, and they can land in either order. An older body
// applied over a newer one is the same disease as (b) with a worse ending: it does not merely
// show a stale value, the metadata panel PATCHes status/visibility/schedule/SEO/taxonomy
// TOGETHER, so the next metadata save sends the reverted status back to the server.

test("a delayed draft response cannot put back the status a later metadata save published", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });
    expect(readMetadataState(view.container).status).toBe("draft");

    // "Save draft" leaves while the entry is still a draft, and its response is held on the
    // way back. It disables its own button and nothing else.
    React.act(() => {
      typeTitle(view.container, "Body edited first");
    });
    editorState.holdNext("updateEntry");
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });
    expect(editorState.updatePayloads).toHaveLength(1);

    // The user publishes while that PATCH is still open, and the metadata response — built
    // later, and carrying `status: published` — arrives first.
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-publish");
    });
    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });
    expect(readMetadataState(view.container).status).toBe("published");

    // Now the older body lands. Its `status` is `draft`, and the metadata save has already
    // cleared the flag that marked `status` as the user's, so nothing protects it.
    await React.act(async () => {
      editorState.release("updateEntry");
      await flushMicrotasks();
    });
    expect(readMetadataState(view.container).status).toBe("published");

    // Refusing the stale BODY must not refuse the request's other, unrelated fact: it did
    // persist the title, so the content channel is clean and the typed value is still there.
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Body edited first");
    expect(view.container.textContent).not.toContain("Unsaved changes");

    // The harm the hydration leads to: the panel's all-in-one PATCH would send that reverted
    // draft back and unpublish an entry nobody asked to unpublish.
    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });
    expect(editorState.metadataPayloads.map((payload) => payload.status)).toEqual([
      "published",
      "published",
    ]);
  } finally {
    view.cleanup();
  }
});

// The same rule, across the read/mutation boundary rather than between two mutations: a read
// that has already hydrated is newer than a mutation body built before it, and the editor
// only ever invalidated reads in the other direction.
test("a delayed save response cannot revert a read that hydrated while it was open", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    editorState.holdNext("updateEntry");
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    // Another tab changed the SEO description; the cache event refreshes it here. Nothing is
    // edited locally, so the snapshot is applied rather than offered.
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
      editorState.resolveEntryRead(1, {
        ...editorState.entry,
        seo: { description: "Changed in another tab" },
      });
      await flushMicrotasks();
    });
    expect(readMetadataState(view.container).seoDescription).toBe("Changed in another tab");

    // The save's body predates that read and still says "Meta". Applying it reverts a value
    // the user can see, and the metadata panel would then PATCH the revert back.
    await React.act(async () => {
      editorState.release("updateEntry");
      await flushMicrotasks();
    });
    expect(readMetadataState(view.container).seoDescription).toBe("Changed in another tab");

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });
    expect(editorState.metadataPayloads).toEqual([
      {
        status: "draft",
        visibility: "public",
        accessPassword: null,
        scheduledAt: null,
        taxonomy: { categoryId: null, tagIds: [] },
        seo: { description: "Changed in another tab" },
      },
    ]);
  } finally {
    view.cleanup();
  }
});
