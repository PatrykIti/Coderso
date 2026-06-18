import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isApiClientError } from "@/services/apiClient";
import { getCachedMenus, listMenusCached, type MenuSummary } from "@/services/menusClient";
import {
  getCachedPageTemplates,
  listPageTemplatesCached,
  type PageTemplateSummary,
} from "@/services/pageTemplatesClient";
import {
  getCachedSiteSettings,
  getSiteSettingsCached,
  updateSiteSettings,
} from "@/services/siteSettingsClient";
import {
  SiteShellCard,
  resolveSiteShellFieldErrors,
  type SiteShellFieldErrors,
  type SiteShellValues,
} from "@/ui/site/SiteShellCard";

/**
 * Self-contained "Site shell" dialog hosted on the Menus list (TASK-458-01).
 * It owns its full lifecycle: load on open (site settings plus published
 * menu/template options through the cached admin clients), busy/error state,
 * and a scoped partial PATCH that writes exactly `site.navigationMenuId` and
 * `site.footerTemplateId`. The Site Settings page no longer hosts these keys.
 */

export type SiteShellDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SiteShellLoadStatus = "loading" | "ready" | "error";

const toShellValues = (
  settings: { navigationMenuId: string | null; footerTemplateId: string | null } | null
): SiteShellValues => ({
  navigationMenuId: settings?.navigationMenuId ?? null,
  footerTemplateId: settings?.footerTemplateId ?? null,
});

const resolveInitialDialogState = () => {
  const settings = getCachedSiteSettings();
  return {
    values: toShellValues(settings),
    menus: getCachedMenus() ?? [],
    templates: getCachedPageTemplates() ?? [],
    status: (settings ? "ready" : "loading") as SiteShellLoadStatus,
    hasSettingsCache: Boolean(settings),
  };
};

function SiteShellDialogForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [initialState] = useState(resolveInitialDialogState);
  const [values, setValues] = useState<SiteShellValues>(initialState.values);
  const [menus, setMenus] = useState<MenuSummary[]>(initialState.menus);
  const [templates, setTemplates] = useState<PageTemplateSummary[]>(initialState.templates);
  const [status, setStatus] = useState<SiteShellLoadStatus>(initialState.status);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revalidationError, setRevalidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SiteShellFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const hasSettingsCacheRef = useRef(initialState.hasSettingsCache);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getSiteSettingsCached({ force: hasSettingsCacheRef.current }),
      listMenusCached(),
      listPageTemplatesCached(),
    ])
      .then(([settings, menusResult, templatesResult]) => {
        if (!active) return;
        hasSettingsCacheRef.current = true;
        setMenus(menusResult);
        setTemplates(templatesResult);
        if (!isDirtyRef.current) {
          setValues(toShellValues(settings));
        }
        setLoadError(null);
        setRevalidationError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;
        const message = isApiClientError(err) ? err.message : "Failed to load site shell settings.";
        if (hasSettingsCacheRef.current) {
          setLoadError(null);
          setRevalidationError(message);
          setStatus("ready");
          return;
        }
        setLoadError(message);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const handleRetry = () => {
    setStatus("loading");
    setLoadError(null);
    setRevalidationError(null);
    setLoadAttempt((attempt) => attempt + 1);
  };

  const handleChange = (next: SiteShellValues) => {
    isDirtyRef.current = true;
    setFieldErrors({});
    setSaveError(null);
    setValues(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      // Scoped partial PATCH: the settings client serializes only the keys
      // present on the update object, so this request carries exactly
      // `site.navigationMenuId` + `site.footerTemplateId` and never touches
      // unrelated settings.
      await updateSiteSettings({
        navigationMenuId: values.navigationMenuId,
        footerTemplateId: values.footerTemplateId,
      });
      isDirtyRef.current = false;
      onOpenChange(false);
    } catch (err) {
      const nextFieldErrors = resolveSiteShellFieldErrors(err);
      setFieldErrors(nextFieldErrors);
      if (!nextFieldErrors.navigationMenuId && !nextFieldErrors.footerTemplateId) {
        setSaveError(isApiClientError(err) ? err.message : "Failed to save site shell settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || status !== "ready";

  return (
    <DialogContent
      className="max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl"
      data-site-shell-dialog="true"
    >
      <DialogHeader className="border-b px-6 py-4 text-left">
        <DialogTitle>Site shell</DialogTitle>
        <DialogDescription>
          Pick the published navigation menu and footer template rendered around every public page.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 px-6 py-5">
        {status === "error" ? (
          <div className="space-y-4" data-site-shell-dialog-error="load">
            <Alert variant="destructive">
              <AlertTitle>Unable to load site shell settings</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {saveError ? (
              <Alert variant="destructive" data-site-shell-dialog-error="save">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}
            {revalidationError ? (
              <Alert data-site-shell-dialog-error="revalidate">
                <AlertTitle>Showing cached site shell settings</AlertTitle>
                <AlertDescription>{revalidationError}</AlertDescription>
              </Alert>
            ) : null}
            {status === "loading" ? (
              <p className="text-sm text-muted-foreground" data-site-shell-dialog-loading="true">
                Loading site shell settings...
              </p>
            ) : null}
            <SiteShellCard
              values={values}
              menus={menus}
              templates={templates}
              errors={fieldErrors}
              disabled={busy}
              onChange={handleChange}
            />
          </>
        )}
      </div>
      <DialogFooter className="border-t bg-muted/30 px-6 py-4">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={busy}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function SiteShellDialog({ open, onOpenChange }: SiteShellDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <SiteShellDialogForm onOpenChange={onOpenChange} /> : null}
    </Dialog>
  );
}
