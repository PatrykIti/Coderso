import { useState } from "react";

import {
  getCachedEntryRevisions,
  listEntryRevisionsCached,
  restoreEntryRevision,
  type EntryDetail,
  type EntryRevision,
} from "@/services/entriesClient";

type UseEntryRevisionsOptions = Readonly<{
  typeSlug: string | null;
  entryId: string | null;
  /** Re-hydrates the editor from the restored entry (the restore response IS persisted state). */
  onRestored: (entry: EntryDetail) => void;
}>;

/**
 * Owns the entry editor's revision drawer state and handlers. Opening hydrates
 * from the `entries:revisions:<id>` cache and revalidates in the background
 * (no mount-time fetch, no force loop); restoring POSTs through the client,
 * lets the editor re-hydrate from the returned entry, then force-refreshes the
 * list (restore may have written a new pre-restore revision) and closes.
 *
 * The handlers are event handlers, never effect bodies, so the React Hooks
 * Compiler discipline (no synchronous setState in effects) is preserved.
 */
export function useEntryRevisions({ typeSlug, entryId, onRestored }: UseEntryRevisionsOptions) {
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<EntryRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleOpenRevisions = async () => {
    if (!typeSlug || !entryId) return;
    setRevisionsOpen(true);
    const cached = getCachedEntryRevisions(entryId);
    if (cached) setRevisions(cached);
    setRevisionsLoading(!cached);
    try {
      const next = await listEntryRevisionsCached(typeSlug, entryId, { force: Boolean(cached) });
      setRevisions(next);
      setRevisionsError(null);
    } catch (err) {
      setRevisionsError(err instanceof Error ? err.message : "Failed to load revisions.");
    } finally {
      setRevisionsLoading(false);
    }
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!typeSlug || !entryId) return;
    setRestoringId(revisionId);
    try {
      const result = await restoreEntryRevision(typeSlug, entryId, revisionId);
      if (result?.entry) onRestored(result.entry);
      setRevisions(await listEntryRevisionsCached(typeSlug, entryId, { force: true }));
      setRevisionsOpen(false);
    } catch (err) {
      setRevisionsError(err instanceof Error ? err.message : "Failed to restore revision.");
    } finally {
      setRestoringId(null);
    }
  };

  return {
    revisionsOpen,
    setRevisionsOpen,
    revisions,
    revisionsLoading,
    revisionsError,
    restoringId,
    handleOpenRevisions,
    handleRestoreRevision,
    drawerProps: {
      open: revisionsOpen,
      onOpenChange: setRevisionsOpen,
      revisions,
      isLoading: revisionsLoading,
      error: revisionsError,
      restoringId,
      onRestore: handleRestoreRevision,
    },
  };
}
