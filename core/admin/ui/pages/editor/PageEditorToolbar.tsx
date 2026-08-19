// TASK-481-02-L02 facade split (Part A): toolbar chrome. ToolbarSubpanel,
// save/publish/settings actions, draft-recovery + revisions + preview,
// keyboard shortcuts, and the resolved toolbar-target label re-export.
// Extracted verbatim from the former PageEditor.tsx body. Single writer:
// TASK-481-02-L02. No behavior change.

import { isSessionExpiredApiError } from "@/services/apiClient";
import { useCallback, useEffect } from "react";
import type { ReactElement } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminActionToastAdapter } from "@/ui/shared/actionToasts";
import { useAdminDirtyNavigationGuard } from "@/ui/shared/AdminDirtyNavigationGuard";
import { updatePage, type PageDetail } from "@/services/pagesClient";
import { getBlockDisplayLabel } from "./pageEditorLabels";
import { toolbarActionTooltips, toolbarPanelOptions, type ToolbarPanel } from "./pageEditorOptions";
import { editorButtonClassFor, useEditorControlTone } from "../editorControls/controlChrome";
import { ToolbarIconButton } from "./FloatingEditorToolbar";
import {
  resolvePageSectionForBreakpoint,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageEffectsV2,
  type PageSectionV2,
  type PageSectionVariant,
} from "../../../../services/pages/pageDocumentV2";
import { getPageBlockAtPath } from "../../../../services/pages/pageBlockPaths";
import {
  getPageEditorControlsForTarget,
  getPageSectionVariantControl,
  pageSectionStackVerticalControl,
  pageUniversalSectionControls,
  type PageEditorControlDefinition,
} from "../../../../services/pages/pageEditorControlRegistry";
import {
  hasResponsiveOverride,
  readSectionBreakpointOverride,
} from "../../../../services/pages/pageEditorState";
import {
  cloneDocument,
  getFirstInlineEditablePropPath,
  normalizePageData,
  resolveInlineError,
  type PageOverrideBreakpoint,
} from "./pageEditorDocumentCommands";
import {
  isEditableShortcutTarget,
  isInteractiveActivationTarget,
  type PageEditorController,
} from "./usePageEditorController";
import {
  isNewerPageDetailTimestamp,
  type PageEditorHostRevisions,
  type PageEditorResourceDetail,
  type PageEditorRevision,
} from "./pageEditorHostContract";
import { ResponsivePanelContent } from "./PageEditorResponsivePanel";
import {
  RegistryControlField,
  SectionRegistryControlField,
  ToolbarMediaUrlField,
} from "./PageEditorRegistryFields";
import {
  ResponsiveControlShell,
  SectionDateRangeFields,
  SectionVariantControlField,
  SupplementalSectionField,
} from "./PageEditorSettingsPanel";

export { resolveToolbarTargetLabel } from "./pageEditorOptions";

export const pageEditorActionToasts = createAdminActionToastAdapter({
  actions: {
    saveDraft: {
      success: "Draft saved.",
      errorFallback: "Failed to save draft.",
    },
    publish: {
      success: "Page published.",
      errorFallback: "Failed to publish page.",
    },
  },
});
export const resolvePageEditorMutationError = (action: "saveDraft" | "publish", error: unknown) => {
  if (isSessionExpiredApiError(error)) {
    const message =
      action === "publish"
        ? "Your admin session expired. Sign in again before publishing."
        : "Your admin session expired. Sign in again before saving.";
    pageEditorActionToasts.error(action, {
      ...(typeof error === "object" && error !== null ? error : {}),
      name: "ApiClientError",
      code: "session_expired",
      status: 401,
      message,
    });
    return message;
  }
  return pageEditorActionToasts.error(action, error);
};
export function findRecoverableAutosaveRevision(
  revisions: PageEditorRevision[],
  page: Pick<PageEditorResourceDetail, "updatedAt">
): PageEditorRevision | null {
  const candidates = revisions
    .filter((revision) => revision.kind === "autosave")
    .filter((revision) => isNewerPageDetailTimestamp(revision.createdAt, page.updatedAt))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  return candidates[0] ?? null;
}

export type PageEditorToolbarActions = {
  saveCurrentDraft: () => Promise<PageDetail | null>;
  handleSaveDraft: () => Promise<void>;
  handlePublish: () => Promise<void>;
  handleSettingsSave: () => Promise<void>;
  updateEffects: (patch: Partial<PageEffectsV2>) => void;
  updateBackground: (value: string | null | undefined) => void;
  handleHostSettingsSaved: (detail: PageDetail) => void;
  openRevisions: () => Promise<void>;
  restoreRevision: (revisionId: string) => Promise<void>;
  discardRevision: (revisionId: string) => Promise<void>;
  restoreRecoverableAutosave: () => Promise<void>;
  discardRecoverableAutosave: () => Promise<void>;
  dismissRecoverableAutosave: () => void;
  handlePreview: () => Promise<void>;
  dirtyNavigationDialog: ReactElement | null;
  revisionsHost: PageEditorHostRevisions | undefined;
};

export const ToolbarSubpanel = ({
  panel,
  device,
  section,
  baseSection,
  block,
  baseBlock,
  hasBlockSelection,
  onSectionControlChange,
  onSectionVariantChange,
  onSectionStyle,
  onSectionVisibility,
  onBlockControlChange,
  onClearOverride,
  onClearBlockOverride,
  onResponsiveVisibleChange,
  onResponsiveOverrideReset,
  onAddBlock,
  onClose,
}: {
  /** Registry-driven panels only; "host-appearance" renders host content. */
  panel: Exclude<ToolbarPanel, "host-appearance">;
  device: PageBreakpoint;
  section: PageSectionV2;
  baseSection: PageSectionV2;
  block: PageBlockV2 | null;
  baseBlock: PageBlockV2 | null;
  hasBlockSelection: boolean;
  onSectionControlChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onSectionVariantChange: (variant: PageSectionVariant) => void;
  onSectionStyle: (patch: Partial<PageSectionV2["style"]>) => void;
  onSectionVisibility: (patch: Partial<PageSectionV2["visibility"]>) => void;
  onBlockControlChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onClearOverride: (path: readonly string[]) => void;
  onClearBlockOverride: (path: readonly string[]) => void;
  onResponsiveVisibleChange: (breakpoint: PageBreakpoint, visible: boolean) => void;
  onResponsiveOverrideReset: (breakpoint: PageOverrideBreakpoint, path: readonly string[]) => void;
  onAddBlock: () => void;
  onClose: () => void;
}) => {
  const primaryBlock = block ?? (hasBlockSelection ? undefined : section.blocks[0]);
  const primaryBaseBlock = baseBlock ?? (hasBlockSelection ? undefined : baseSection.blocks[0]);
  const blockPanelControls = primaryBlock
    ? getPageEditorControlsForTarget({ kind: "block", type: primaryBlock.type }).filter(
        (control) =>
          control.panel === panel &&
          (control.id !== "block.style.backgroundImage" ||
            primaryBlock.style?.backgroundType === "image")
      )
    : [];
  const sectionPanelControls = pageUniversalSectionControls.filter(
    (control) => control.panel === panel && control.id !== pageSectionStackVerticalControl.id
  );
  const sectionVariantControl =
    panel === "layout" ? getPageSectionVariantControl(section.type) : null;
  const shouldRenderBlockControls =
    Boolean(primaryBlock) && (panel === "content" || (hasBlockSelection && panel !== "responsive"));
  const sectionOverride = readSectionBreakpointOverride(baseSection, device);
  const panelMeta = toolbarPanelOptions.find((option) => option.panel === panel);
  const tone = useEditorControlTone();
  const isLight = tone === "light";
  const subPanelBgClass = isLight ? "bg-muted/40 text-foreground" : "bg-white/5 text-slate-100";
  const subHeaderBorderClass = isLight ? "border-border" : "border-white/10";
  const subTitleClass = isLight ? "text-foreground" : "text-slate-200";
  const subDescClass = isLight ? "text-muted-foreground" : "text-slate-400";
  const addBlockButtonClass = editorButtonClassFor(tone);
  return (
    <div
      className={`mt-2 flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden rounded-lg ${subPanelBgClass}`}
      data-page-editor-toolbar-panel={panel}
      data-page-editor-subpanel="viewport-safe"
      role="region"
      aria-label={`${panel} toolbar panel`}
    >
      <div
        className={`flex shrink-0 items-start justify-between gap-2 border-b px-3 py-2 ${subHeaderBorderClass}`}
        data-page-editor-subpanel-header="true"
      >
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wide ${subTitleClass}`}>
            {panelMeta?.label ?? panel}
          </p>
          {panelMeta ? (
            <p className={`truncate text-[11px] ${subDescClass}`}>{panelMeta.description}</p>
          ) : null}
        </div>
        <ToolbarIconButton tooltip={toolbarActionTooltips.closePanel} onClick={onClose}>
          <X className="h-4 w-4" />
        </ToolbarIconButton>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
        data-page-editor-subpanel-scroll="true"
      >
        {shouldRenderBlockControls ? (
          <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            {primaryBlock
              ? blockPanelControls.map((control) => (
                  <RegistryControlField
                    key={control.id}
                    block={primaryBlock}
                    baseBlock={primaryBaseBlock}
                    device={device}
                    control={control}
                    onChange={onBlockControlChange}
                    onReset={onClearBlockOverride}
                  />
                ))
              : null}
            {panel === "content" ? (
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className={addBlockButtonClass}
                  onClick={onAddBlock}
                >
                  <Plus className="h-4 w-4" />
                  Add block
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {!shouldRenderBlockControls &&
        (panel === "layout" ||
          panel === "style" ||
          panel === "background" ||
          panel === "spacing" ||
          panel === "visibility") ? (
          <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            {sectionPanelControls.map((control) => (
              <SectionRegistryControlField
                key={control.id}
                section={section}
                baseSection={baseSection}
                device={device}
                control={control}
                onChange={onSectionControlChange}
                onReset={onClearOverride}
              />
            ))}
            {sectionVariantControl ? (
              <SectionVariantControlField
                section={section}
                control={sectionVariantControl}
                onChange={onSectionVariantChange}
              />
            ) : null}
            {panel === "background" ? (
              <ResponsiveControlShell
                device={device}
                override={hasResponsiveOverride(device, sectionOverride, [
                  "style",
                  "backgroundImage",
                ])}
                label="Background image"
                onReset={() => onClearOverride(["style", "backgroundImage"])}
              >
                <ToolbarMediaUrlField
                  label="Background image"
                  value={section.style.backgroundImage ?? ""}
                  accept={["image/*"]}
                  onChange={(backgroundImage) => onSectionStyle({ backgroundImage })}
                />
              </ResponsiveControlShell>
            ) : null}
            {panel === "visibility" ? (
              <>
                <SupplementalSectionField
                  label="Anchor"
                  value={section.visibility.anchor ?? ""}
                  device={device}
                  override={hasResponsiveOverride(device, sectionOverride, [
                    "visibility",
                    "anchor",
                  ])}
                  onReset={() => onClearOverride(["visibility", "anchor"])}
                  onChange={(anchor) => onSectionVisibility({ anchor: anchor.trim() || null })}
                />
                <SectionDateRangeFields
                  key={section.id}
                  section={section}
                  device={device}
                  sectionOverride={sectionOverride}
                  onClearOverride={onClearOverride}
                  onSectionVisibility={onSectionVisibility}
                />
              </>
            ) : null}
          </div>
        ) : null}
        {!shouldRenderBlockControls && panel === "content" ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <p className={`flex items-center text-sm ${subDescClass}`}>
              {primaryBlock ? getBlockDisplayLabel(primaryBlock) : "No block selected"}
            </p>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className={addBlockButtonClass}
                onClick={onAddBlock}
              >
                <Plus className="h-4 w-4" />
                Add block
              </Button>
            </div>
          </div>
        ) : null}
        {panel === "responsive" ? (
          <ResponsivePanelContent
            device={device}
            section={section}
            baseSection={baseSection}
            baseBlock={hasBlockSelection ? (primaryBaseBlock ?? null) : null}
            onSectionControlChange={onSectionControlChange}
            onClearOverride={onClearOverride}
            onResponsiveVisibleChange={onResponsiveVisibleChange}
            onResponsiveOverrideReset={onResponsiveOverrideReset}
          />
        ) : null}
      </div>
    </div>
  );
};

/**
 * Responsive panel content (TASK-425-02): per-breakpoint hide-on-screen
 * toggles, the section vertical-layout toggle, and the explicit per-field
 * override list with reset-inheritance actions. The target is the selected
 * block when one is selected, otherwise the selected section. All metadata
 * comes from the registry-owned responsive panel contract; controls render
 * through the shared editor control primitives.
 */

export const usePageEditorToolbarActions = (
  controller: PageEditorController
): PageEditorToolbarActions => {
  const {
    editorHost,
    page,
    pageDocument,
    hasUnsavedChanges,
    savedDocumentRef,
    recoverableAutosave,
    dismissedRecoverableAutosaveId,
    revalidatedResourceKey,
    setPage,
    setPageDocument,
    setError,
    setIsSaving,
    setIsPublishing,
    setHasUnsavedChanges,
    setAutosaveError,
    setSettingsOpen,
    setSettingsTitle,
    setSettingsSlug,
    setDocumentDraft,
    hydrateFromDetail,
    resetEditorHistory,
    setRecoveryCheckError,
    setRecoverableAutosave,
    setRecoveryActionError,
    setRestoringRevisionId,
    setDiscardingRevisionId,
    setRevisionsOpen,
    setRevisionsLoading,
    setRevisionsError,
    setRevisions,
    setPreviewOpen,
    setPreviewUrl,
    setPreviewProbe,
    setPreviewError,
    setPreviewLoading,
    setDismissedRecoverableAutosaveId,
    settingsTitle,
    settingsSlug,
    showInNav,
    revisionRetention,
  } = controller;

  const saveCurrentDraft = useCallback(async () => {
    if (!page) return null;
    const updated = await editorHost.saveDocument(page.id, pageDocument);
    const document = normalizePageData(updated.currentData);
    setPage(updated);
    setPageDocument(document);
    savedDocumentRef.current = cloneDocument(document);
    resetEditorHistory();
    setHasUnsavedChanges(false);
    setAutosaveError(null);
    return updated;
  }, [
    editorHost,
    page,
    pageDocument,
    resetEditorHistory,
    savedDocumentRef,
    setAutosaveError,
    setHasUnsavedChanges,
    setPage,
    setPageDocument,
  ]);

  const handleSaveDraft = async () => {
    if (!page) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveCurrentDraft();
      pageEditorActionToasts.success("saveDraft");
    } catch (saveError) {
      setError(resolvePageEditorMutationError("saveDraft", saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!page || !editorHost.publish) return;
    setIsPublishing(true);
    setError(null);
    // Draft/published coherence: publishing unsaved edits must persist them
    // through the same draft-save path as Save/Preview first, otherwise a
    // reload would resurrect the stale draft while the public site renders
    // the published document.
    let publishTarget = page;
    let publishDocument = pageDocument;
    if (hasUnsavedChanges) {
      try {
        const saved = await saveCurrentDraft();
        if (!saved) {
          setIsPublishing(false);
          return;
        }
        publishTarget = saved;
        publishDocument = normalizePageData(saved.currentData);
      } catch (saveError) {
        // Failure ordering: a failed draft save aborts the publish so the
        // published site never gets ahead of a draft we could not persist.
        setError(resolvePageEditorMutationError("saveDraft", saveError));
        setIsPublishing(false);
        return;
      }
    }
    try {
      const result = await editorHost.publish(publishTarget.id, publishDocument);
      // Prefer the authoritative post-publish detail over a hand-built page
      // object; keep the fallback for hosts that do not return the detail.
      // The dirty flag is owned by saveCurrentDraft above, so edits made
      // while the publish request was in flight keep their unsaved state.
      const publishedPage = result?.page ?? { ...publishTarget, status: "published" };
      setPage(publishedPage);
      savedDocumentRef.current = cloneDocument(publishDocument);
      resetEditorHistory();
      pageEditorActionToasts.success("publish");
    } catch (publishError) {
      // Failure ordering: the draft save above already committed; surface the
      // publish failure without hiding or rolling back the saved draft.
      setError(resolvePageEditorMutationError("publish", publishError));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSettingsSave = async () => {
    if (!page) return;
    setIsSaving(true);
    setError(null);
    try {
      const nextDocument: PageDocumentV2 = {
        ...pageDocument,
        settings: {
          ...pageDocument.settings,
          showInNav,
          revisionRetention,
        },
      };
      const updated = await updatePage(page.id, {
        title: settingsTitle.trim(),
        slug: settingsSlug.startsWith("/") ? settingsSlug : `/${settingsSlug}`,
        data: nextDocument,
      });
      const document = normalizePageData(updated.currentData);
      setPage(updated);
      setPageDocument(document);
      savedDocumentRef.current = cloneDocument(document);
      resetEditorHistory();
      setHasUnsavedChanges(false);
      setSettingsOpen(false);
      pageEditorActionToasts.success("saveDraft");
    } catch (settingsError) {
      setError(resolvePageEditorMutationError("saveDraft", settingsError));
    } finally {
      setIsSaving(false);
    }
  };

  // TASK-521-05-L02: per-page effects are a LIVE DRAFT on the document itself
  // (`settings.effects`), so EVERY save/publish path carries them — NOT a
  // side-state merged only into the explicit `handleSettingsSave` button. The
  // helper keeps the sub-object present-only: it drops falsy/empty values so a
  // page that never used effects stays byte-identical. The server
  // `normalizeEffects` (521-01) re-validates/clamps; this cleanup is convenience.
  const updateEffects = useCallback(
    (patch: Partial<PageEffectsV2>) => {
      setDocumentDraft((doc) => {
        const next = { ...(doc.settings.effects ?? {}), ...patch };
        const cleaned: PageEffectsV2 = {};
        if (next.cursorSpotlight) cleaned.cursorSpotlight = true;
        if (next.cursorSpotlight && next.spotlightColor) {
          cleaned.spotlightColor = next.spotlightColor;
        }
        if (next.cursorSpotlight && next.spotlightSize != null) {
          cleaned.spotlightSize = next.spotlightSize;
        }
        // ── TASK-534 ── page-root grain overlay: present-only (kept only when true).
        if (next.noiseOverlay) cleaned.noiseOverlay = true;
        if (Object.keys(cleaned).length > 0) {
          return { ...doc, settings: { ...doc.settings, effects: cleaned } };
        }
        // Present-only: strip the key entirely when empty (byte-identity).
        const { effects: _dropped, ...restSettings } = doc.settings;
        return { ...doc, settings: restSettings };
      });
    },
    [setDocumentDraft]
  );

  // TASK-523-01-L03 — live-draft writer for the per-page canvas background, mirroring
  // updateEffects. Writes onto document settings via setDocumentDraft (undo/dirty
  // wrapper), present-only: clearing drops the key ⇒ byte-identical draft. The server
  // normalizeSettings (523-01-L01) re-validates via sanitizeAuthoringCssBackground;
  // this client cleanup is convenience only.
  const updateBackground = useCallback(
    (value: string | null | undefined) => {
      setDocumentDraft((doc) => {
        if (!value) {
          // Present-only: clearing drops the key entirely (byte-identity).
          const { background: _dropped, ...restSettings } = doc.settings;
          return { ...doc, settings: restSettings };
        }
        return { ...doc, settings: { ...doc.settings, background: value } };
      });
    },
    [setDocumentDraft]
  );

  // Host settings sheets save page-chrome metadata through their own client
  // call; only the detail metadata is synchronized so unsaved canvas edits
  // are never overwritten.
  const handleHostSettingsSaved = useCallback(
    (detail: PageDetail) => {
      setPage(detail);
      setSettingsTitle(detail.title);
      setSettingsSlug(detail.slug);
      setSettingsOpen(false);
    },
    [setPage, setSettingsOpen, setSettingsSlug, setSettingsTitle]
  );

  const revisionsHost = editorHost.revisions;

  useEffect(() => {
    if (!page || editorHost.mode !== "page" || !revisionsHost) return undefined;
    if (hasUnsavedChanges) return undefined;
    if (revalidatedResourceKey !== `${editorHost.mode}:${page.id}`) return undefined;
    let cancelled = false;
    void revisionsHost
      .list(page.id)
      .then((items) => {
        if (cancelled) return;
        setRecoveryCheckError(null);
        const candidate = findRecoverableAutosaveRevision(items, page);
        setRecoverableAutosave(
          candidate && candidate.id !== dismissedRecoverableAutosaveId ? candidate : null
        );
      })
      .catch((revisionError) => {
        if (!cancelled) {
          setRecoveryCheckError(
            resolveInlineError(revisionError, "Could not check for draft recovery.")
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    dismissedRecoverableAutosaveId,
    editorHost.mode,
    hasUnsavedChanges,
    page,
    revalidatedResourceKey,
    revisionsHost,
    setRecoverableAutosave,
    setRecoveryCheckError,
  ]);

  const openRevisions = async () => {
    if (!page || !revisionsHost) return;
    setRevisionsOpen(true);
    setRevisionsLoading(true);
    setRevisionsError(null);
    try {
      setRevisions(await revisionsHost.list(page.id));
    } catch (revisionError) {
      setRevisionsError(resolveInlineError(revisionError, "Failed to load page history."));
    } finally {
      setRevisionsLoading(false);
    }
  };

  const restoreRevision = async (revisionId: string) => {
    if (!page || !revisionsHost) return;
    setRestoringRevisionId(revisionId);
    try {
      const result = await revisionsHost.restore(page.id, revisionId);
      if (result.page) {
        hydrateFromDetail(result.page, { resetDirty: true });
      }
      setRevisions(await revisionsHost.list(page.id));
    } catch (restoreError) {
      setRevisionsError(resolveInlineError(restoreError, "Failed to restore revision."));
    } finally {
      setRestoringRevisionId(null);
    }
  };

  const discardRevision = async (revisionId: string) => {
    if (!page || !revisionsHost) return;
    setDiscardingRevisionId(revisionId);
    try {
      await revisionsHost.discard(page.id, revisionId);
      setRevisions(await revisionsHost.list(page.id));
    } catch (discardError) {
      setRevisionsError(resolveInlineError(discardError, "Failed to discard revision."));
    } finally {
      setDiscardingRevisionId(null);
    }
  };

  const restoreRecoverableAutosave = async () => {
    if (!page || !recoverableAutosave || !revisionsHost) return;
    setRestoringRevisionId(recoverableAutosave.id);
    setRecoveryActionError(null);
    try {
      const result = await revisionsHost.restore(page.id, recoverableAutosave.id);
      if (result.page) {
        hydrateFromDetail(result.page, { resetDirty: true });
      }
      setRecoverableAutosave(null);
      setDismissedRecoverableAutosaveId(null);
    } catch (restoreError) {
      setRecoveryActionError(resolveInlineError(restoreError, "Failed to restore draft version."));
    } finally {
      setRestoringRevisionId(null);
    }
  };

  const discardRecoverableAutosave = async () => {
    if (!page || !recoverableAutosave || !revisionsHost) return;
    setDiscardingRevisionId(recoverableAutosave.id);
    setRecoveryActionError(null);
    try {
      await revisionsHost.discard(page.id, recoverableAutosave.id);
      setRecoverableAutosave(null);
      setDismissedRecoverableAutosaveId(null);
    } catch (discardError) {
      setRecoveryActionError(resolveInlineError(discardError, "Failed to discard draft version."));
    } finally {
      setDiscardingRevisionId(null);
    }
  };

  const dismissRecoverableAutosave = () => {
    if (recoverableAutosave) setDismissedRecoverableAutosaveId(recoverableAutosave.id);
    setRecoverableAutosave(null);
    setRecoveryActionError(null);
  };

  const handlePreview = async () => {
    // Optional host capability (TASK-458-03): the affordance is hidden when
    // the host issues no preview tokens, so this is a type guard only.
    const previewHost = editorHost.preview;
    if (!page || !previewHost) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const previewPageId = hasUnsavedChanges ? (await saveCurrentDraft())?.id : page.id;
      if (!previewPageId) return;
      const response = await previewHost(previewPageId);
      setPreviewUrl(response.previewUrl);
      setPreviewProbe(response.probe ?? null);
      setPreviewOpen(true);
    } catch (previewErrorValue) {
      setPreviewError(resolveInlineError(previewErrorValue, "Failed to generate preview."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const navigationBlocked = hasUnsavedChanges || Boolean(recoverableAutosave);
  const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
    blocked: navigationBlocked,
    title: recoverableAutosave
      ? "Leave without recovering draft version?"
      : "Discard unsaved page changes?",
    description: recoverableAutosave
      ? "A saved draft version is available. Cancel to recover it, or continue and leave it in history."
      : "Cancel to keep editing, or discard local changes and continue.",
    confirmLabel: "Discard and continue",
    cancelLabel: "Keep editing",
    onConfirmDiscard: () => {
      setHasUnsavedChanges(false);
      if (recoverableAutosave) {
        setDismissedRecoverableAutosaveId(recoverableAutosave.id);
        setRecoverableAutosave(null);
      }
    },
  });

  return {
    saveCurrentDraft,
    handleSaveDraft,
    handlePublish,
    handleSettingsSave,
    updateEffects,
    updateBackground,
    handleHostSettingsSaved,
    openRevisions,
    restoreRevision,
    discardRevision,
    restoreRecoverableAutosave,
    discardRecoverableAutosave,
    dismissRecoverableAutosave,
    handlePreview,
    dirtyNavigationDialog,
    revisionsHost,
  };
};

export const usePageEditorKeyboardShortcuts = (controller: PageEditorController) => {
  const {
    selectedSection,
    selectedBlock,
    selectedBlockPath,
    selectedSectionId,
    device,
    commandOpen,
    deleteSelectionTarget,
    layersOpen,
    settingsOpen,
    pageSettingsPanelOpen,
    revisionsOpen,
    previewOpen,
    selectSection,
    openCommandPalette,
    undoEditorChange,
    redoEditorChange,
    copySelectedFragment,
    pasteClipboardFragment,
    duplicateSelectedBlock,
    duplicateSelectedSection,
    requestDeleteSelection,
    setDeleteSelectionTarget,
    setCommandOpen,
    setInlineEditTarget,
    setLayersOpen,
    setSettingsOpen,
    setPageSettingsPanelOpen,
    setPendingBlockInsert,
    setPendingSectionInsertIndex,
    setPendingBesideBlockPath,
    setRevisionsOpen,
    setPreviewOpen,
  } = controller;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      const editableTarget = isEditableShortcutTarget(event.target);
      if (event.key === "Escape") {
        if (editableTarget && !commandOpen) return;
        if (deleteSelectionTarget) {
          event.preventDefault();
          setDeleteSelectionTarget(null);
          return;
        }
        if (commandOpen) {
          event.preventDefault();
          setCommandOpen(false);
          setPendingBlockInsert(null);
          setPendingSectionInsertIndex(null);
          setPendingBesideBlockPath(null);
          return;
        }
        if (layersOpen) {
          event.preventDefault();
          setLayersOpen(false);
          return;
        }
        if (settingsOpen) {
          event.preventDefault();
          setSettingsOpen(false);
          return;
        }
        if (pageSettingsPanelOpen) {
          event.preventDefault();
          setPageSettingsPanelOpen(false);
          return;
        }
        if (revisionsOpen) {
          event.preventDefault();
          setRevisionsOpen(false);
          return;
        }
        if (previewOpen) {
          event.preventDefault();
          setPreviewOpen(false);
          return;
        }
        if (selectedSectionId) {
          event.preventDefault();
          selectSection(null);
        }
        return;
      }
      if (editableTarget) return;
      const key = event.key.toLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey;
      if (hasModifier && key === "k") {
        event.preventDefault();
        openCommandPalette();
        return;
      }
      const hasBlockingOverlay =
        commandOpen ||
        settingsOpen ||
        revisionsOpen ||
        previewOpen ||
        Boolean(deleteSelectionTarget);
      if (hasBlockingOverlay) return;
      if (hasModifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoEditorChange();
        } else {
          undoEditorChange();
        }
        return;
      }
      if (hasModifier && key === "y") {
        event.preventDefault();
        redoEditorChange();
        return;
      }
      if (hasModifier && key === "c" && selectedSection) {
        event.preventDefault();
        void copySelectedFragment();
        return;
      }
      if (hasModifier && key === "v") {
        event.preventDefault();
        void pasteClipboardFragment();
        return;
      }
      if (hasModifier && key === "d" && selectedSection) {
        event.preventDefault();
        if (selectedBlock) {
          duplicateSelectedBlock();
        } else {
          duplicateSelectedSection();
        }
        return;
      }
      if (
        event.key === "Enter" &&
        !hasModifier &&
        selectedSection &&
        selectedBlockPath &&
        selectedBlock &&
        !isInteractiveActivationTarget(event.target)
      ) {
        const resolvedBlock =
          getPageBlockAtPath(
            resolvePageSectionForBreakpoint(selectedSection, device),
            selectedBlockPath
          ) ?? selectedBlock;
        const firstPropPath = getFirstInlineEditablePropPath(resolvedBlock);
        if (firstPropPath) {
          event.preventDefault();
          setInlineEditTarget({ blockId: selectedBlock.id, propPath: firstPropPath });
        }
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedSection) {
        event.preventDefault();
        requestDeleteSelection();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    commandOpen,
    copySelectedFragment,
    deleteSelectionTarget,
    device,
    duplicateSelectedBlock,
    duplicateSelectedSection,
    layersOpen,
    openCommandPalette,
    pasteClipboardFragment,
    previewOpen,
    requestDeleteSelection,
    redoEditorChange,
    revisionsOpen,
    selectSection,
    selectedBlock,
    selectedBlockPath,
    selectedSection,
    selectedSectionId,
    settingsOpen,
    pageSettingsPanelOpen,
    undoEditorChange,
    setCommandOpen,
    setDeleteSelectionTarget,
    setInlineEditTarget,
    setLayersOpen,
    setPageSettingsPanelOpen,
    setPendingBesideBlockPath,
    setPendingBlockInsert,
    setPendingSectionInsertIndex,
    setPreviewOpen,
    setRevisionsOpen,
    setSettingsOpen,
  ]);
};
