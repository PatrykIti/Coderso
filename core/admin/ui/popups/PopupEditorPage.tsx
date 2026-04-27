import { ArrowLeft, Save, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createPopup,
  getCachedPopup,
  getPopupCached,
  updatePopup,
  type PopupRecord,
} from "@/services/popupsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { PopupEditorForm } from "./components/PopupEditorForm";
import {
  clonePopupDraft,
  createEmptyPopupDraft,
  draftFromPopup,
  toPopupInput,
  type PopupEditorDraft,
} from "./popupEditorModel";

const resolvePopupId = (path: string) => {
  const parts = path.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "popups");
  if (index === -1) return null;
  return parts[index + 1] ?? null;
};

export function PopupEditorPage() {
  const { path, navigate } = useAdminRouter();
  const popupId = useMemo(() => resolvePopupId(path), [path]);
  const isCreateMode = !popupId || popupId === "new";

  const [popup, setPopup] = useState<PopupRecord | null>(() => {
    if (isCreateMode || !popupId) return null;
    return getCachedPopup(popupId) ?? null;
  });
  const [draft, setDraft] = useState<PopupEditorDraft>(() => {
    if (isCreateMode || !popupId) return createEmptyPopupDraft();
    const cached = getCachedPopup(popupId);
    return cached ? draftFromPopup(cached) : createEmptyPopupDraft();
  });
  const [snapshot, setSnapshot] = useState<PopupEditorDraft>(() => clonePopupDraft(draft));

  const [isLoading, setIsLoading] = useState(() => !isCreateMode && !popup);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applyPopup = useCallback((item: PopupRecord) => {
    const nextDraft = draftFromPopup(item);
    setPopup(item);
    setDraft(nextDraft);
    setSnapshot(clonePopupDraft(nextDraft));
    setHasUnsavedChanges(false);
  }, []);

  const refreshPopup = useCallback(
    async (force?: boolean) => {
      if (!popupId || isCreateMode) return;
      const item = await getPopupCached(popupId, { force });
      if (item) applyPopup(item);
    },
    [applyPopup, isCreateMode, popupId]
  );

  useEffect(() => {
    if (isCreateMode) return;
    let active = true;
    if (!popupId) return undefined;
    getPopupCached(popupId, { force: true })
      .then((item) => {
        if (!active || !item) return;
        applyPopup(item);
      })
      .catch((error) => {
        if (!active) return;
        setError(
          isApiClientError(error) ? error.message : "Failed to load popup editor."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyPopup, isCreateMode, popupId]);

  useEffect(() => {
    if (isCreateMode || !popupId) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.popupsList) return;
      if (hasUnsavedChanges) return;
      refreshPopup(true).catch(() => undefined);
    });
  }, [hasUnsavedChanges, isCreateMode, popupId, refreshPopup]);

  const patchDraft = (patch: Partial<PopupEditorDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setHasUnsavedChanges(true);
    setSuccess(null);
  };

  const handleDiscard = () => {
    setDraft(clonePopupDraft(snapshot));
    setHasUnsavedChanges(false);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async (statusOverride?: PopupRecord["status"]) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = toPopupInput({
      ...draft,
      ...(statusOverride ? { status: statusOverride } : {}),
    });

    try {
      if (isCreateMode) {
        const created = await createPopup(payload);
        applyPopup(created);
        navigate(`/coderso/popups/${encodeURIComponent(created.id)}`);
      } else if (popupId) {
        const updated = await updatePopup(popupId, payload);
        applyPopup(updated);
      }
      setSuccess("Popup saved successfully.");
    } catch (error) {
      setError(isApiClientError(error) ? error.message : "Failed to save popup.");
    } finally {
      setIsSaving(false);
    }
  };

  const publishButtonLabel = draft.status === "published" ? "Move to draft" : "Publish";
  const publishTargetStatus: PopupRecord["status"] =
    draft.status === "published" ? "draft" : "published";

  return (
    <AdminShell
      activeHref="/admin/coderso/popups"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span>Popups</span>
          <span>/</span>
          <span className="text-foreground">{isCreateMode ? "New popup" : draft.name || "Editor"}</span>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          title={isCreateMode ? "New popup" : "Edit popup"}
          description="Configure trigger, targeting, content, and display behavior."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {popup ? (
                <Badge variant={popup.status === "published" ? "default" : "outline"} className="capitalize">
                  {popup.status}
                </Badge>
              ) : null}
              <Button variant="outline" className="gap-2" onClick={() => navigate("/coderso/popups")}>
                <ArrowLeft className="h-4 w-4" />
                Back to list
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDiscard}
                disabled={!hasUnsavedChanges}
              >
                <Trash2 className="h-4 w-4" />
                Discard
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleSave(publishTargetStatus)}
                disabled={isSaving}
              >
                <Send className="h-4 w-4" />
                {publishButtonLabel}
              </Button>
              <Button className="gap-2" onClick={() => handleSave()} disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">
            Loading popup editor...
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Popup editor error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert>
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        {!isLoading ? <PopupEditorForm draft={draft} onPatch={patchDraft} /> : null}
      </div>
    </AdminShell>
  );
}
