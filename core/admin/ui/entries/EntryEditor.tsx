import { SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import {
  deleteEntry,
  getEntryCached,
  publishEntry,
  updateEntryMetadata,
  updateEntry,
  type EntryData,
  type EntryDataValue,
  type EntryDetail,
  type EntryVisibility,
} from "@/services/entriesClient";
import {
  getSiteSettings,
  resolveContentSlugDisplay,
  resolveContentSlugRouteContext,
  type SiteSettingsResponse,
} from "@/services/siteSettingsClient";
import {
  createTaxonomyTerm,
  getTaxonomyOverview,
  type ContentTerm,
  type TaxonomyOverview,
} from "@/services/taxonomyClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { useAdminDirtyNavigationGuard } from "@/ui/shared/AdminDirtyNavigationGuard";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionCard } from "@/ui/shared/SectionCard";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";

import { EntryDeleteDialog } from "./EntryDeleteDialog";
import { EntryEditorHeaderActions } from "./EntryEditorHeader";
import { EntryFieldSections } from "./EntryFieldSections";
import { EntryFieldsPlaceholder } from "./EntryFieldsPlaceholder";
import { EntryMetadataPanel, type EntryStatus } from "./EntryMetadataPanel";
import { EntryTitleSlugFields } from "./EntryTitleSlugFields";
import { getContentTypeLabels } from "./contentTypeLabels";
import { buildEntryChecklist } from "./entryChecklist";
import { buildEntryFieldGroups } from "./entryFieldGroups";
import { buildEntryMetadataUpdate } from "./entryMetadataUpdate";
import {
  isEntryLinkedFieldName,
  type EntryLinkedColumnValues,
  type EntryLinkedFieldName,
} from "./entryLinkedFields";
import {
  buildEntryPayloadData,
  buildInitialValues,
  mergeEditedFieldValues,
} from "./entryValueMapping";
import { useEntryRelationTargets } from "./useEntryRelationTargets";
import { useEntryRuntimePreview } from "./useEntryRuntimePreview";
import { useEntrySnapshotAuthority } from "./useEntrySnapshotAuthority";
import {
  entryFieldEditedKey,
  useEntryEditTracker,
  type EntryEditedKey,
} from "./useEntryEditTracker";
import type { ContentField } from "../content-types/SchemaBuilder";
import { fieldsFromSchema } from "../content-types/schemaMapping";

const resolveEntryParams = (path: string): { type: string | null; id: string | null } => {
  // A router path carries the search and hash too; only the pathname segments identify
  // the entry.
  const pathname = path.split(/[?#]/)[0] ?? path;
  const parts = pathname.split("/").filter(Boolean);
  const entriesIndex = parts.findIndex((segment) => segment === "entries");
  if (entriesIndex !== -1) {
    return {
      type: parts[entriesIndex + 1] ?? null,
      id: parts[entriesIndex + 2] ?? null,
    };
  }

  return { type: null, id: null };
};

// `AdminApp` resolves its own route the same way: the router path is authoritative,
// `window.location` is the fallback for a mount without one.
const resolveEditorPathname = (routerPath?: string) =>
  routerPath ?? (typeof window === "undefined" ? "" : window.location.pathname);

const resolveEditorErrorMessage = (error: unknown, fallback: string) =>
  isApiClientError(error) ? error.message : fallback;

// Shown when a submit is refused because the editor holds no loaded entry. Only used when
// nothing else already explains it: a failed read or a missing content type is the better
// message.
const ENTRY_NOT_LOADED_MESSAGE = "This entry has not finished loading yet.";

type LoadEntryOptions = Readonly<{
  // This read owns the page-level loading indicator and switches it off when it
  // finishes. A read never switches it ON: the baseline read starts with `isLoading`
  // already true, and writing state synchronously from the mount effect would only
  // cost a cascading render (react-hooks/set-state-in-effect). Background reads from
  // the cache bus leave the indicator alone, so a refresh never blanks the page.
  clearLoading?: boolean;
  // The first read of this visit: the baseline the local edits are based on, so it is
  // applied over them instead of being offered as someone else's change.
  isBaseline?: boolean;
  // The user asked for the remote version ("Refresh"): local edits are dropped.
  discardLocalEdits?: boolean;
}>;

/**
 * One entry editor visit. `type` and `id` are FIXED for this component's lifetime:
 * `EntryEditor` keys it by them, so an in-place route change to another entry mounts a
 * fresh instance instead of leaving the previous one's state, refs and in-flight
 * requests pointed at the previous row. The router renders a single unkeyed element for
 * `/advanced/entries/:type/:id` and its error boundary does not remount on `resetKey`,
 * so React would otherwise reuse this instance across two different entries.
 */
type EntryEditorInstanceProps = Readonly<{
  type: string | null;
  id: string | null;
}>;

export function EntryEditor() {
  const { path } = useAdminRouter();
  const { type, id } = resolveEntryParams(resolveEditorPathname(path));
  return <EntryEditorInstance key={`${type ?? ""}:${id ?? ""}`} type={type} id={id} />;
}

function EntryEditorInstance({ type, id }: EntryEditorInstanceProps) {
  const { navigate } = useAdminRouter();
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [contentTypeId, setContentTypeId] = useState<string | null>(null);
  const [contentTypeName, setContentTypeName] = useState<string | null>(null);
  const [fields, setFields] = useState<ContentField[]>([]);
  const [values, setValues] = useState<EntryData>({});
  const [status, setStatus] = useState<EntryStatus>("draft");
  // Visibility (514-03). Two password states only: "" = untouched (keep the
  // stored hash), a non-empty string = a newly typed password. Removing a
  // password is done by switching visibility to public/private (514-01 §3).
  const [visibility, setVisibility] = useState<EntryVisibility>("public");
  const [accessPassword, setAccessPassword] = useState("");
  // Local edits reach the editor through two independent channels, each with its own
  // dirty flag and Save action: CONTENT (title/slug/field values, "Save draft") and
  // METADATA (status/visibility/schedule/SEO/taxonomy, the metadata panel). The tracker
  // owns both flags and, per value, whether the user still owns that value.
  const {
    hasContentEdits,
    hasMetadataEdits,
    markEdited,
    hasEdits,
    editedKeys,
    beginSubmit,
    settleSubmit,
    resetEdits,
  } = useEntryEditTracker();
  // Snapshot authority, for READS AND MUTATIONS ALIKE (see `useEntrySnapshotAuthority`).
  // `getEntryCached` refuses to CACHE the loser of two concurrent reads but still RETURNS it
  // to its caller, and a mutation's response body is a snapshot of the same row built when its
  // request was handled — so every one of them can arrive out of order, and every one of them
  // has to prove it is not older than what the editor already shows before it writes.
  const {
    begin: beginSnapshotWrite,
    isAuthoritative: isSnapshotAuthoritative,
    claim: claimSnapshotWrite,
    supersedeAll: supersedeSnapshotWrites,
  } = useEntrySnapshotAuthority();
  // Which entry the editor holds state FOR. `applyEntry` is the only writer, because it is
  // the only path that populates `fields` and `values`: a mutation response cannot supply
  // them, the field list comes from the content type. The ref is the authority — a promise
  // continuation or a click handler must not decide this from a render-old value — and it is
  // deliberately not part of `loadEntry`'s dependencies, which keeps that reader stable and
  // the mount effect firing exactly once. The state below is its render mirror.
  const loadedIdentityRef = useRef<string | null>(null);
  const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
  // Not "has hydrated once": identity can change under a component, which is why this commit's
  // predecessor added sequence numbers at all. `EntryEditor` keys this instance by type/id so
  // today a change remounts instead, but the predicate that decides whether a save may fire
  // has to say which entry it is talking about.
  //
  // The identity half of this comparison is DELIBERATELY UNPINNED (TASK-540 R4). Weakening it
  // to a bare "hydrated once" keeps the entire entry-editor suite green, and no test can close
  // that: the keying above means an identity change never reaches a live instance, so observing
  // the difference needs `EntryEditorInstance` driven with changing props — which means either
  // exporting it or dropping the key, i.e. changing the thing under test in order to test it.
  // What IS pinned is the assumption this half free-rides on: "moving to another entry in place
  // starts over instead of carrying the first entry's state", in
  // tests/vitest/ui-integration/entry-editor-submit-authority.test.tsx, goes red if the key
  // goes. If it ever does go, this is the line that still refuses the save.
  const entryIdentity = `${type ?? ""}:${id ?? ""}`;
  const hasLoadedEntry = loadedIdentity === entryIdentity;
  const hasLoadedCurrentEntry = useCallback(
    () => loadedIdentityRef.current === entryIdentity,
    [entryIdentity]
  );
  // "A newer authority exists" and "there is no editor left to write to" are different facts.
  // The snapshot authority carries the first, and the baseline hydration below may override
  // it; this ref carries the second, and nothing may override it.
  const visitEndedRef = useRef(false);
  // The read that owns the page-level indicator. Only the newest owner may switch it
  // off, so two "Refresh" clicks cannot let the older one hide a spinner the newer read
  // still needs — and a background read superseding the baseline cannot strand it on.
  const loadingOwnerRef = useRef(0);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [siteSettings, setSiteSettings] = useState<SiteSettingsResponse | null>(null);
  const { previewOpen, setPreviewOpen, previewUrl, previewLoading, previewError, openPreview } =
    useEntryRuntimePreview(type, id);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [taxonomyOverview, setTaxonomyOverview] = useState<TaxonomyOverview | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const schemaFieldNames = useMemo(() => new Set(fields.map((field) => field.name)), [fields]);
  const hiddenSchemaFieldNames = useMemo(() => new Set<string>(), []);
  // The authoritative copy of every linked name (`entryLinkedFields`): what the payload writes
  // into `data`, and what `commitLinkedValue` keeps the schema-rendered copy equal to.
  const linkedColumnValues: EntryLinkedColumnValues = { title, slug };

  // A snapshot is applied to every value EXCEPT the ones the user still owns, and `kept`
  // is the only source of that fact. Nothing infers editedness from a value any more (an
  // empty title or slug used to read as pristine), and nothing preserves a whole channel
  // (which left the taxonomy picks unprotected and, mid-save, rewrote every metadata
  // control from an older response).
  const hydrateFromSnapshot = useCallback(
    (entryResult: EntryDetail, mappedFields: ContentField[], kept: ReadonlySet<EntryEditedKey>) => {
      setEntry(entryResult);
      if (!kept.has("title")) setTitle(entryResult.title);
      if (!kept.has("slug")) setSlug(entryResult.slug);
      // The snapshot's own columns, not the editor's current ones: a linked schema field is
      // hydrated from the column of the entry being applied.
      const baseValues = buildInitialValues(mappedFields, entryResult.data ?? {}, {
        title: entryResult.title,
        slug: entryResult.slug,
      });
      setValues((current) =>
        mergeEditedFieldValues(baseValues, current, (name) => kept.has(entryFieldEditedKey(name)))
      );
      if (!kept.has("status")) setStatus(entryResult.status);
      if (!kept.has("visibility")) setVisibility(entryResult.visibility);
      if (!kept.has("accessPassword")) setAccessPassword("");
      if (!kept.has("scheduledAt")) setScheduledAt(entryResult.scheduledAt ?? "");
      if (!kept.has("seoDescription")) setSeoDescription(entryResult.seo?.description ?? "");
      // `taxonomy` is optional on EntryDetail: absent means the payload carried no
      // taxonomy information, which must not be read as "no category, no tags".
      const taxonomy = entryResult.taxonomy;
      if (taxonomy !== undefined) {
        if (!kept.has("category")) setSelectedCategoryId(taxonomy?.category?.id ?? null);
        if (!kept.has("tags")) setSelectedTagIds(taxonomy?.tags?.map((tag) => tag.id) ?? []);
      }
    },
    []
  );

  const applyEntry = useCallback(
    (entryResult: EntryDetail, contentType: ContentTypeSummary) => {
      const mappedFields = fieldsFromSchema(contentType.schema).filter(
        (field) => !hiddenSchemaFieldNames.has(field.name)
      );
      setFields(mappedFields);
      setContentTypeId(contentType.id);
      setContentTypeName(contentType.name);
      hydrateFromSnapshot(entryResult, mappedFields, editedKeys());
      // The editor now holds this entry's schema and values, which is what every submit and
      // the field area are gated on.
      loadedIdentityRef.current = entryIdentity;
      setLoadedIdentity(entryIdentity);
      setError(null);
      setRemoteUpdatePending(false);
    },
    [editedKeys, entryIdentity, hiddenSchemaFieldNames, hydrateFromSnapshot]
  );

  // Only the option lists: the selections are hydrated by `hydrateFromSnapshot`, which
  // honours the edited keys, so a slow taxonomy read can no longer restore an older
  // category/tag pick over the one the user just made.
  const loadTaxonomyOverview = useCallback(async (taxonomyContentTypeId: string) => {
    try {
      return await getTaxonomyOverview(taxonomyContentTypeId);
    } catch {
      return null;
    }
  }, []);

  const resolveContentType = useCallback(
    async (force?: boolean) => {
      if (!type) return null;
      const cached = getCachedContentTypes()?.find((item) => item.slug === type) ?? null;
      if (cached && !force) return cached;
      const types = await listContentTypesCached({ force: true });
      return types.find((item) => item.slug === type) ?? null;
    },
    [type]
  );

  // One reader for every path into the editor (baseline, cache bus, "Refresh"), written
  // as a promise chain rather than an async body so that every state write happens in a
  // callback: the mount effect below can then start a read without writing state
  // synchronously (react-hooks/set-state-in-effect).
  const loadEntry = useCallback(
    (options?: LoadEntryOptions) => {
      if (!type || !id) return;
      const seq = beginSnapshotWrite();
      if (options?.clearLoading) loadingOwnerRef.current = seq;
      void Promise.all([getEntryCached(type, id, { force: true }), resolveContentType(true)])
        .then(async ([entryResult, contentType]) => {
          if (visitEndedRef.current) return;
          // A superseded read may not overwrite newer state — unless there is no newer state
          // to overwrite. Until `applyEntry` has run for this entry there are no fields and
          // no values, and nothing that superseded this read can supply them: a mutation
          // response carries no content type. Dropping the snapshot here left a fieldless
          // form whose "Save draft" PATCHed `data: {}` over the stored entry, so the
          // supersession hands its result over instead. From the first hydration on, the
          // newer authority wins, which is what keeps a late read from reverting a newer one.
          if (!isSnapshotAuthoritative(seq) && hasLoadedCurrentEntry()) return;
          // This read is now the newest description of the entry anyone holds, whatever it
          // decides below: hydrate, merely offer, or report a missing content type. Claiming
          // before the branch is what stops an OLDER read that resolves next from taking a
          // branch of its own — the "offer" branch writes no snapshot, so leaving it unclaimed
          // would let a stale one hydrate the moment the edits it protected were saved.
          claimSnapshotWrite(seq);
          if (!contentType) {
            setError("Content type not found.");
            return;
          }
          if (!entryResult) return;
          // Someone else's change while the user has unsaved edits is offered, not
          // applied; the "Refresh" action re-enters here with `discardLocalEdits`. The
          // read itself succeeded, so any earlier failure banner is stale even though
          // this snapshot is only offered. Offering presupposes a baseline of our own to
          // protect: the FIRST snapshot is that baseline however it arrives, and
          // `hydrateFromSnapshot` keeps every registered edit on top of it, so applying it
          // costs the user nothing and is what makes the editor savable at all.
          if (
            hasLoadedCurrentEntry() &&
            !options?.isBaseline &&
            !options?.discardLocalEdits &&
            hasEdits()
          ) {
            setError(null);
            setRemoteUpdatePending(true);
            return;
          }
          if (options?.discardLocalEdits) resetEdits();
          // The snapshot is applied BEFORE the option lists are fetched, as it always
          // has been: hydration must not wait on a second request.
          applyEntry(entryResult, contentType);
          const overview = await loadTaxonomyOverview(contentType.id);
          if (!isSnapshotAuthoritative(seq)) return;
          setTaxonomyOverview(overview);
        })
        .catch((err: unknown) => {
          if (!isSnapshotAuthoritative(seq)) return;
          setError(resolveEditorErrorMessage(err, "Failed to load entry."));
        })
        .finally(() => {
          if (options?.clearLoading && loadingOwnerRef.current === seq) setIsLoading(false);
        });
    },
    [
      applyEntry,
      beginSnapshotWrite,
      claimSnapshotWrite,
      hasEdits,
      hasLoadedCurrentEntry,
      id,
      isSnapshotAuthoritative,
      loadTaxonomyOverview,
      resetEdits,
      resolveContentType,
      type,
    ]
  );

  useEffect(() => {
    // Re-entering the same instance (a StrictMode double-invoke) re-opens the visit.
    visitEndedRef.current = false;
    // The first hydration is the baseline the local edits are based on, not a remote
    // update: skipping it left `slug` empty and every field value unpopulated, and the
    // next save persisted that emptiness. It is always applied, keeping exactly what the
    // user has already edited in either channel on top.
    loadEntry({ isBaseline: true, clearLoading: true });
    return () => {
      // Ending the visit invalidates everything in flight, so a late snapshot cannot land
      // on a torn-down editor.
      visitEndedRef.current = true;
      supersedeSnapshotWrites();
    };
  }, [loadEntry, supersedeSnapshotWrites]);

  useEffect(() => {
    if (!type || !id) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.entryDetail(type, id)) return;
      loadEntry();
    });
  }, [id, loadEntry, type]);

  // Called here rather than beside the other useState calls so the effects it
  // registers keep their original position in the mount effect order.
  const relationTargets = useEntryRelationTargets();

  useEffect(() => {
    let active = true;
    getSiteSettings()
      .then((settings) => {
        if (active) setSiteSettings(settings);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const hasAnyUnsavedChanges = hasContentEdits || hasMetadataEdits;
  // "No request is in flight" is not "the entry is loaded": a read superseded before it
  // hydrated, or one that failed, leaves no fields and no values at all, and the baseline
  // read's own `finally` switches the indicator off either way. The Save/Publish actions and
  // the field area key off this instead, so the editor never OFFERS to submit what it never
  // loaded, and never claims a content type has no fields when it never saw one.
  const isEntryPending = isLoading || !hasLoadedEntry;

  // Both ways out of an editor with unsaved work, from the guard the rest of the admin already
  // uses. A local `beforeunload` handler covered only ONE of them: `AdminLink` preventDefaults
  // the anchor and navigates with `history.pushState`, which fires no `beforeunload` at all, so
  // clicking this page's own "Entries" breadcrumb unmounted the editor and took every unsaved
  // edit with it — the case docs/guide/coderso/entry-editor-and-metadata.md says must prompt.
  // `blocked` covers both channels, because the guide names the metadata one explicitly and it
  // is the easier of the two to lose sight of.
  const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
    blocked: hasAnyUnsavedChanges,
    title: "Discard unsaved entry changes?",
    description: "This entry has content or metadata changes that have not been saved.",
    confirmLabel: "Discard and continue",
    cancelLabel: "Keep editing",
  });

  // The way back into an editor whose baseline read failed or resolved nothing: that state
  // refuses every submit (rightly) and shows no fields, and "Refresh" cannot help because it
  // lives inside the "updated in another tab" alert, which needs a hydration of its own. Unlike
  // Refresh this keeps the local edits: nothing was ever loaded for them to conflict with, and
  // hydration puts the snapshot underneath them. User-initiated on purpose — see
  // `EntryFieldsPlaceholder`.
  const handleRetryLoad = () => {
    setIsLoading(true);
    setError(null);
    loadEntry({ isBaseline: true, clearLoading: true });
  };

  // The single writer for a linked name (`entryLinkedFields`). The header composer and a
  // schema field of the same name are two surfaces onto one value, so an edit made through
  // either has to reach both copies and mark both edited — otherwise the copy the save reads
  // and the copy the user typed into are different values, and the save keeps the wrong one.
  const commitLinkedValue = (name: EntryLinkedFieldName, value: string) => {
    if (name === "title") setTitle(value);
    else setSlug(value);
    markEdited(name);
    if (!schemaFieldNames.has(name)) return;
    setValues((prev) => ({ ...prev, [name]: value }));
    markEdited(entryFieldEditedKey(name));
  };

  const handleFieldChange = (name: string, value: EntryDataValue) => {
    // A schema field carrying a linked name edits the entry column, whichever surface it is
    // rendered on. Both columns are strings, so a non-string value is out of that contract and
    // stays an ordinary field write rather than being coerced into the column.
    if (isEntryLinkedFieldName(name) && typeof value === "string") {
      commitLinkedValue(name, value);
      return;
    }
    setValues((prev) => ({ ...prev, [name]: value }));
    markEdited(entryFieldEditedKey(name));
  };

  const handleTitleChange = (value: string) => commitLinkedValue("title", value);

  const handleSlugChange = (value: string) => commitLinkedValue("slug", value);

  // The editor must never submit state it never loaded. All three submits refuse here, not
  // only in the buttons that trigger them: "Save draft" would build `data: {}` from an empty
  // `values` and the PATCH REPLACES the stored data with it, the metadata panel PATCHes
  // status/visibility/schedule/SEO/taxonomy TOGETHER and would push its pristine mount
  // defaults over the server's, and publishing would flip the stored status from an editor
  // showing none of it.
  // `handleDeleteEntry` refuses on the same predicate. It submits no state, but it belongs to
  // the same class: it destroys a row the editor never showed, and the confirm dialog cannot
  // even name it — `title` is still empty, so the description falls back to "Delete this
  // entry?".
  const refuseUnloadedSubmit = () => {
    if (hasLoadedCurrentEntry()) return false;
    // Keep whatever already explains it (a failed read, a missing content type).
    setError((current) => current ?? ENTRY_NOT_LOADED_MESSAGE);
    return true;
  };

  // Every mutation answers with a fresh full read of the entry, and all three can be in flight
  // together: each Save disables only its own button. A body built before another mutation
  // committed describes an OLDER entry than one already applied, so it is admitted only while
  // its ticket still holds — and once admitted it supersedes everything else in flight,
  // INCLUDING requests issued later. That last part is deliberate and it has a price; both are
  // stated in `useEntrySnapshotAuthority`.
  const applyMutationSnapshot = (ticket: number, snapshot: EntryDetail | null) => {
    if (!isSnapshotAuthoritative(ticket)) return;
    supersedeSnapshotWrites();
    if (snapshot) hydrateFromSnapshot(snapshot, fields, editedKeys());
    setRemoteUpdatePending(false);
  };

  const handleSaveDraft = async (options?: { successMessage?: string }) => {
    if (!type || !id) return;
    if (refuseUnloadedSubmit()) return;
    // Captured BEFORE the request: anything edited after this tick is not in the payload,
    // so it stays dirty and survives the response.
    const submittedTick = beginSubmit();
    const snapshotTicket = beginSnapshotWrite();
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateEntry(type, id, {
        title,
        slug,
        data: buildEntryPayloadData({
          fields,
          values,
          entry,
          columns: linkedColumnValues,
          hiddenFieldNames: hiddenSchemaFieldNames,
          schemaFieldNames,
        }),
      });
      // What this request PERSISTED is a fact about the server and is recorded whatever else
      // has happened since; what its BODY says the entry looks like is only a snapshot, and a
      // save started later can commit and answer first.
      settleSubmit("content", submittedTick);
      applyMutationSnapshot(snapshotTicket, updated);
      toast.success(options?.successMessage ?? "Draft saved.");
    } catch (err) {
      const message = resolveEditorErrorMessage(err, "Failed to save entry.");
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!type || !id) return;
    if (refuseUnloadedSubmit()) return;
    if (checklist.blockingIssues.length > 0) {
      setError(checklist.blockingIssues.join(" "));
      return;
    }
    setIsPublishing(true);
    setError(null);
    try {
      if (status === "published") {
        await handleSaveDraft({ successMessage: "Entry updated." });
      } else {
        // Publishing submits no local edit: it flips the stored status, so `status` is the
        // only value that becomes server-owned again. Clearing the content dirty flag here
        // used to drop the unsaved warning for edits nothing had persisted.
        const submittedTick = beginSubmit();
        const snapshotTicket = beginSnapshotWrite();
        await publishEntry(type, id);
        const updated = await getEntryCached(type, id, { force: true });
        settleSubmit(["status"], submittedTick);
        applyMutationSnapshot(snapshotTicket, updated);
        toast.success("Entry published.");
      }
    } catch (err) {
      const message = resolveEditorErrorMessage(err, "Failed to publish entry.");
      setError(message);
      toast.error(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleStatusChange = (nextStatus: EntryStatus) => {
    if (!type || !id) return;
    setStatus(nextStatus);
    markEdited("status");
  };

  const handleVisibilityChange = (nextVisibility: EntryVisibility) => {
    setVisibility(nextVisibility);
    // Switching away from password mode discards any typed value (removal is
    // driven by the visibility switch, not a separate clear signal — 514-01 §3).
    if (nextVisibility !== "password") {
      setAccessPassword("");
    }
    markEdited("visibility");
  };

  const handleAccessPasswordChange = (value: string) => {
    setAccessPassword(value);
    markEdited("accessPassword");
  };

  const handleScheduledAtChange = (value: string) => {
    setScheduledAt(value);
    markEdited("scheduledAt");
  };

  const handleSeoDescriptionChange = (value: string) => {
    setSeoDescription(value);
    markEdited("seoDescription");
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    markEdited("category");
  };

  const handleTagIdsChange = (tagIds: string[]) => {
    setSelectedTagIds(tagIds);
    markEdited("tags");
  };

  // Revisions seam (TASK-487-02-L02): opens the future revision drawer. No-op
  // for now so the PageHeader "History" action renders as a documented insertion
  // point without fetching/rendering revision data.
  const handleOpenRevisions = () => {
    // Intentionally empty until TASK-487-02-L02 wires the EntryRevisionDrawer.
  };

  const handleCreateTerm = async (
    kind: "category" | "tag",
    name: string
  ): Promise<ContentTerm | null> => {
    const taxonomy =
      kind === "category"
        ? taxonomyOverview?.taxonomies.category
        : taxonomyOverview?.taxonomies.tag;
    if (!taxonomy) return null;
    try {
      const created = await createTaxonomyTerm(taxonomy.id, { name });
      setTaxonomyOverview((prev) => {
        if (!prev) return prev;
        const termsKey = kind === "category" ? "categories" : "tags";
        const nextTerms = [...prev.terms[termsKey], created].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        return {
          ...prev,
          terms: {
            ...prev.terms,
            [termsKey]: nextTerms,
          },
        };
      });
      return created;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to create term.");
      }
      return null;
    }
  };

  const handleSaveMetadata = async () => {
    if (!type || !id) return;
    if (refuseUnloadedSubmit()) return;
    setIsSavingMetadata(true);
    setError(null);

    const prepared = buildEntryMetadataUpdate({
      status,
      visibility,
      accessPassword,
      scheduledAt,
      seoDescription,
      taxonomyOverview,
      selectedCategoryId,
      selectedTagIds,
    });
    if (!prepared.ok) {
      setError(prepared.message);
      toast.error(prepared.message);
      setIsSavingMetadata(false);
      return;
    }

    const submittedTick = beginSubmit();
    const snapshotTicket = beginSnapshotWrite();
    try {
      const updated = await updateEntryMetadata(type, id, prepared.payload);
      settleSubmit("metadata", submittedTick);
      applyMutationSnapshot(snapshotTicket, updated);
      toast.success("Metadata saved.");
    } catch (err) {
      const message = resolveEditorErrorMessage(err, "Failed to save metadata.");
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!type || !id) return;
    // See `refuseUnloadedSubmit`: deleting an entry the editor never loaded is the same class
    // as submitting one. The dialog is closed on refusal, because leaving it open would cover
    // the message that explains why nothing happened.
    if (refuseUnloadedSubmit()) {
      setDeleteDialogOpen(false);
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await deleteEntry(type, id);
      toast.success("Entry deleted.");
      // The editor's own navigation, and the only one it initiates: `navigate` is called
      // exactly once in this component, here. It is authoritative, so it skips the dirty
      // guard. The guard is for the ways the USER leaves an entry that still exists; the row
      // is gone, the unsaved edits have nowhere left to be saved, and asking anyway stranded
      // the user on the deleted entry's editor behind "Discard unsaved entry changes?" —
      // where "Keep editing" left them editing a row that no longer exists. Every OTHER way
      // out of here is a link the user clicked, and none of them is weakened by this.
      navigate("/entries", { skipBlockers: true });
    } catch (err) {
      const message = resolveEditorErrorMessage(err, "Failed to delete entry.");
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const taxonomyState = taxonomyOverview
    ? {
        categoryEnabled: Boolean(taxonomyOverview.taxonomies.category),
        tagEnabled: Boolean(taxonomyOverview.taxonomies.tag),
        selectedCategoryId,
        selectedTagIds,
        categories: taxonomyOverview.terms.categories ?? [],
        tags: taxonomyOverview.terms.tags ?? [],
      }
    : null;
  const seoDisplay = useMemo(() => {
    const context = resolveContentSlugRouteContext(siteSettings, type ?? "content");
    return resolveContentSlugDisplay(context, slug);
  }, [siteSettings, slug, type]);
  const taxonomySettingsHref = contentTypeId
    ? `/content-types/${encodeURIComponent(contentTypeId)}`
    : null;

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const { singular: typeSingular, plural: typePlural } = getContentTypeLabels(
    contentTypeName ?? type ?? ""
  );
  const typeLabel = typePlural;
  const editorLabel = `Edit ${typeSingular}`;
  const helpItems = [
    "Fields are defined by the content type schema.",
    "Media fields pull assets from the Media Library.",
    "Relation fields link entries together (e.g. Team → Projects).",
    "Use categories and tags to organize and filter content.",
  ];
  const checklist = buildEntryChecklist({
    title,
    slug,
    status,
    scheduledAt,
    fields,
    values,
  });
  const missingRequiredNames = new Set(checklist.missingRequiredFields.map((field) => field.name));
  const { groups, contentGroup, otherGroups } = useMemo(
    () => buildEntryFieldGroups(fields),
    [fields]
  );

  const metadataPanelProps = {
    status,
    onStatusChange: handleStatusChange,
    scheduledAt,
    onScheduledAtChange: handleScheduledAtChange,
    visibility,
    onVisibilityChange: handleVisibilityChange,
    accessPassword,
    onAccessPasswordChange: handleAccessPasswordChange,
    hasPassword: entry?.hasPassword ?? false,
    title,
    slug,
    seoPreviewUrl: seoDisplay.value,
    seoDescription,
    onSeoDescriptionChange: handleSeoDescriptionChange,
    checklist,
    taxonomy: taxonomyState,
    onCategoryChange: handleCategoryChange,
    onTagIdsChange: handleTagIdsChange,
    onCreateCategory: (name: string) => handleCreateTerm("category", name),
    onCreateTag: (name: string) => handleCreateTerm("tag", name),
    helpItems,
    taxonomySettingsHref,
    author: entry?.author ?? null,
    createdAt: entry?.createdAt,
    updatedAt: entry?.updatedAt,
    entryId: entry?.id,
    onSave: handleSaveMetadata,
    isSaving: isSavingMetadata,
    canSave: hasLoadedEntry,
    onDelete: () => setDeleteDialogOpen(true),
    isDeleting,
    canDelete: hasLoadedEntry,
  };

  return (
    <AdminShell activeHref="/admin/entries" showSearch={false}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: "Entries", href: "/entries" }, { label: typeLabel }]}
          title={editorLabel}
          description="Compose and publish an entry in this content type."
          actions={
            <>
              <EntryEditorHeaderActions
                status={status}
                hasUnsavedChanges={hasAnyUnsavedChanges}
                isLoading={isEntryPending}
                isSaving={isSaving}
                isPublishing={isPublishing}
                onPreview={openPreview}
                onSaveDraft={() => void handleSaveDraft()}
                onPublish={handlePublish}
                onHistory={handleOpenRevisions}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 lg:hidden"
                onClick={() => setDetailsOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Details
              </Button>
            </>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load entry</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {remoteUpdatePending ? (
          <Alert>
            <AlertTitle>Updated in another tab</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>New changes are available. Refresh to load the latest version.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // A click, not an effect: this is where turning the indicator on and
                  // clearing a stale error belongs.
                  setIsLoading(true);
                  setError(null);
                  loadEntry({ discardLocalEdits: true, clearLoading: true });
                }}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {hasAnyUnsavedChanges ? (
          <Alert>
            <AlertTitle>Unsaved changes</AlertTitle>
            <AlertDescription>
              Save the entry content or metadata to keep your edits.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <SectionCard title="Content" description="The main body of this entry.">
              <div className="flex flex-col gap-6">
                <EntryTitleSlugFields
                  title={title}
                  slug={slug}
                  titleRef={titleRef}
                  onTitleChange={handleTitleChange}
                  onSlugChange={handleSlugChange}
                />
                {isEntryPending ? (
                  <EntryFieldsPlaceholder isLoading={isLoading} onRetry={handleRetryLoad} />
                ) : contentGroup ? (
                  <EntryFieldSections
                    sections={contentGroup.sections}
                    values={values}
                    relationTargets={relationTargets}
                    missingRequiredNames={missingRequiredNames}
                    onFieldChange={handleFieldChange}
                  />
                ) : groups.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    This content type has no fields yet.
                  </div>
                ) : null}
              </div>
            </SectionCard>
            {!isEntryPending
              ? otherGroups.map((group) => (
                  <SectionCard key={group.id} title={group.label}>
                    <EntryFieldSections
                      sections={group.sections}
                      values={values}
                      relationTargets={relationTargets}
                      missingRequiredNames={missingRequiredNames}
                      onFieldChange={handleFieldChange}
                    />
                  </SectionCard>
                ))
              : null}
          </div>
          <div className="hidden lg:block">
            <EntryMetadataPanel {...metadataPanelProps} scrollable={false} />
          </div>
        </div>
      </div>
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Content details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit status, SEO, and metadata for this entry.
          </SheetDescription>
          <div className="min-h-0 flex-1">
            <EntryMetadataPanel {...metadataPanelProps} />
          </div>
        </SheetContent>
      </Sheet>
      {/* TASK-487-02-L02 mount point: the <EntryRevisionDrawer> (a Sheet sibling
          of the delete dialog) plugs in here, opened by the PageHeader "History"
          action (handleOpenRevisions). 514-03 provides the trigger + seam only —
          no revision fetch/render. */}
      <EntryDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteDialogOpen(false);
        }}
        title="Delete entry?"
        description={`Delete ${title || "this entry"}? This cannot be undone.`}
        isDeleting={isDeleting}
        onConfirm={() => void handleDeleteEntry()}
      />
      <RuntimePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Entry Preview"
        subtitle="Runtime preview (read-only, site theme)."
        canPreview={Boolean(type && id)}
        previewUrl={previewUrl}
        isLoading={previewLoading}
        error={previewError}
        cannotPreviewMessage="Save this entry first to generate a runtime preview."
        iframeTitle="Entry runtime preview"
      />
      {dirtyNavigationDialog}
    </AdminShell>
  );
}
