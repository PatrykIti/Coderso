// TASK-481 line-gate split: host wiring (load/revalidation/cache/autosave
// effects) extracted verbatim from PageEditorRoot.tsx so the root stays
// under the 1,000-line gate. Single writer: TASK-481. No behavior change.

import { useEffect } from "react";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import {
  resolveAssistantPageSelection,
  summarizePageSectionsForAssistant,
} from "../../../../services/assistant/pageActiveSurfaceSummary";
import { resolveInlineError } from "./pageEditorDocumentCommands";
import { shouldApplyFreshPageEditorDetail } from "./pageEditorHostContract";
import type { PageEditorController } from "./usePageEditorController";

export const usePageEditorHostWiring = (controller: PageEditorController) => {
  const {
    editorHost,
    pageId,
    page,
    pageDocument,
    hasUnsavedChanges,
    latestLoadedPageRef,
    revalidatedResourceRef,
    hasUnsavedChangesRef,
    hydrateFromDetail,
    setRevalidatedResourceKey,
    setIsLoading,
    setError,
    setRevalidationError,
    setAutosaveError,
    selectedSectionId,
    selectedBlock,
  } = controller;

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges, hasUnsavedChangesRef]);

  useEffect(() => {
    latestLoadedPageRef.current = page;
  }, [page, latestLoadedPageRef]);

  useEffect(() => {
    if (!pageId) return undefined;
    const resourceKey = `${editorHost.mode}:${pageId}`;
    if (revalidatedResourceRef.current === resourceKey) return undefined;
    revalidatedResourceRef.current = resourceKey;
    let cancelled = false;
    const load = async () => {
      const loadedAtStart = latestLoadedPageRef.current;
      if (!loadedAtStart) setIsLoading(true);
      try {
        const fresh = await editorHost.loadDetail(pageId, { force: true });
        if (cancelled) return;
        const currentLoaded = latestLoadedPageRef.current ?? loadedAtStart;
        if (
          fresh &&
          shouldApplyFreshPageEditorDetail({
            current: currentLoaded,
            fresh,
            isDirty: hasUnsavedChangesRef.current,
            mode: editorHost.freshnessMode ?? "updatedAt",
          })
        ) {
          hydrateFromDetail(fresh);
          setError(null);
          setRevalidationError(null);
        } else if (!currentLoaded && !fresh) {
          hydrateFromDetail(null);
        }
        setRevalidatedResourceKey(resourceKey);
      } catch (loadError) {
        if (cancelled) return;
        const message = resolveInlineError(loadError, editorHost.loadFailedMessage);
        if (loadedAtStart || latestLoadedPageRef.current) {
          setRevalidationError(message);
        } else {
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    editorHost,
    hydrateFromDetail,
    pageId,
    hasUnsavedChangesRef,
    latestLoadedPageRef,
    revalidatedResourceRef,
    setError,
    setIsLoading,
    setRevalidatedResourceKey,
    setRevalidationError,
  ]);

  useEffect(() => {
    // Hosts without an assistant contract (Page Templates v1) advertise no
    // active surface instead of pretending to own one.
    if (!page || !editorHost.assistantSurface) return;
    const sections = summarizePageSectionsForAssistant(pageDocument.sections);
    const selection = resolveAssistantPageSelection(sections, {
      selectedSectionId,
      selectedBlockId: selectedBlock ? selectedBlock.id : null,
    });
    setActiveAssistantSurfaceContext({
      kind: "page",
      schemaVersion: 2,
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        template: pageDocument.settings.template,
      },
      selectedSectionId: selection.selectedSectionId,
      selectedBlockId: selection.selectedBlockId,
      selectedBlockPath: selection.selectedBlockPath,
      sections,
      warnings: hasUnsavedChanges ? ["page_has_unsaved_changes"] : [],
    });
    return () => clearActiveAssistantSurfaceContext();
  }, [editorHost, hasUnsavedChanges, page, pageDocument, selectedBlock, selectedSectionId]);

  useEffect(() => {
    if (!pageId) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== editorHost.detailCacheKey(pageId)) return;
      // Dirty-state protection: background revalidation never overwrites
      // unsaved edits.
      if (hasUnsavedChanges) return;
      const cached = editorHost.getCachedDetail(pageId);
      if (!cached) return;
      if (
        !shouldApplyFreshPageEditorDetail({
          current: page,
          fresh: cached,
          isDirty: hasUnsavedChanges,
          mode: "updatedAt",
        })
      ) {
        return;
      }
      hydrateFromDetail(cached);
    });
  }, [editorHost, hasUnsavedChanges, hydrateFromDetail, page, pageId]);

  useEffect(() => {
    const autosaveDocument = editorHost.autosaveDocument;
    if (!page || !hasUnsavedChanges || !autosaveDocument) return undefined;
    const timeoutId = window.setTimeout(() => {
      void autosaveDocument(page.id, pageDocument)
        .then(() => setAutosaveError(null))
        .catch((autosaveErrorValue: unknown) => {
          setAutosaveError(
            resolveInlineError(autosaveErrorValue, "Autosave failed. Try saving manually.")
          );
        });
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [editorHost, hasUnsavedChanges, page, pageDocument, setAutosaveError]);
};
