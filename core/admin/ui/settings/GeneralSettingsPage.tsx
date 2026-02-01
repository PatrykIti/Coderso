import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { BrandingCard } from "./BrandingCard";
import { BaseUrlCard } from "./BaseUrlCard";
import { AdminAccessCard } from "./AdminAccessCard";
import { LogoUploadCard } from "./LogoUploadCard";
import { SettingsSidebar } from "./SettingsSidebar";

type GeneralSettingsValues = {
  siteName: string;
  siteLocale: string;
  adminBaseUrl: string;
  publicBaseUrl: string;
  adminPath: string;
  adminRedirectEnabled: boolean;
};

type GeneralSettingsPageProps = {
  values?: GeneralSettingsValues;
  onSave?: (values: GeneralSettingsValues) => Promise<void> | void;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
};

const defaultValues: GeneralSettingsValues = {
  siteName: "Nextless",
  siteLocale: "en",
  adminBaseUrl: "",
  publicBaseUrl: "",
  adminPath: "/admin",
  adminRedirectEnabled: false,
};

export function GeneralSettingsPage({
  values = defaultValues,
  onSave,
  isLoading = false,
  isSaving = false,
  error = null,
}: GeneralSettingsPageProps) {
  const normalizeValues = (input: Partial<GeneralSettingsValues>) => ({
    ...defaultValues,
    ...input,
    siteName: input.siteName ?? defaultValues.siteName,
    siteLocale: input.siteLocale ?? defaultValues.siteLocale,
    adminBaseUrl: input.adminBaseUrl ?? defaultValues.adminBaseUrl,
    publicBaseUrl: input.publicBaseUrl ?? defaultValues.publicBaseUrl,
    adminPath: input.adminPath ?? defaultValues.adminPath,
    adminRedirectEnabled:
      input.adminRedirectEnabled ?? defaultValues.adminRedirectEnabled,
  });

  const [form, setForm] = useState(() => normalizeValues(values));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);

  const validateBaseUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (parsed.protocol !== "https:") {
        if (host !== "localhost" && host !== "127.0.0.1") {
          return "HTTPS is required for non-localhost URLs.";
        }
      }
      return null;
    } catch {
      return "Enter a valid URL (e.g. https://example.com).";
    }
  };

  const adminBaseUrlError = validateBaseUrl(form.adminBaseUrl);
  const publicBaseUrlError = validateBaseUrl(form.publicBaseUrl);
  const validateAdminPath = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Admin path is required.";
    const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (normalized.length <= 1) return "Admin path must be longer than '/'.";
    if (!/^\/[a-zA-Z0-9_-]+$/.test(normalized)) {
      return "Use only letters, numbers, dashes, and underscores (single segment).";
    }
    return null;
  };

  const adminPathError = validateAdminPath(form.adminPath);
  const hasValidationErrors = Boolean(
    adminBaseUrlError || publicBaseUrlError || adminPathError
  );

  useEffect(() => {
    setForm(normalizeValues(values));
  }, [values]);

  const handleSave = async () => {
    if (!onSave) return;
    if (hasValidationErrors) return;
    setSaveError(null);
    setSaveSuccess(null);
    setLocalSaving(true);
    try {
      await onSave(form);
      setSaveSuccess("General settings updated.");
    } catch (err) {
      if (isApiClientError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save general settings.");
      }
    } finally {
      setLocalSaving(false);
    }
  };

  const busy = isLoading || isSaving || localSaving;
  const disableSave = busy || hasValidationErrors;

  return (
    <SettingsShell
      activeHref="/admin/settings"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="general" />}
      breadcrumbs={
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground">
            General Settings
          </span>
          <span className="text-xs text-muted-foreground">
            Manage your global site configuration and preferences
          </span>
        </div>
      }
      topbarActions={
        <span className="text-xs text-muted-foreground">
          {busy ? "Saving changes..." : "Manage defaults for the public site"}
        </span>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 pb-28">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Settings error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {saveError ? (
              <Alert variant="destructive">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}
            {saveSuccess ? (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{saveSuccess}</AlertDescription>
              </Alert>
            ) : null}
            <BrandingCard
              siteName={form.siteName}
              siteLocale={form.siteLocale}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
                  siteName: next.siteName,
                  siteLocale: next.siteLocale,
                }))
              }
              disabled={busy}
            />
            <BaseUrlCard
              adminBaseUrl={form.adminBaseUrl}
              publicBaseUrl={form.publicBaseUrl}
              errors={{
                adminBaseUrl: adminBaseUrlError,
                publicBaseUrl: publicBaseUrlError,
              }}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
                  adminBaseUrl: next.adminBaseUrl,
                  publicBaseUrl: next.publicBaseUrl,
                }))
              }
              disabled={busy}
            />
            <AdminAccessCard
              adminPath={form.adminPath}
              redirectEnabled={form.adminRedirectEnabled}
              error={adminPathError}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
                  adminPath: next.adminPath,
                  adminRedirectEnabled: next.redirectEnabled,
                }))
              }
              disabled={busy}
            />
            <LogoUploadCard />
          </div>
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>Auto-save is currently enabled for this session</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" disabled={busy}>
                Discard changes
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={disableSave}
              >
                <CheckCircle2 className="h-4 w-4" />
                {busy ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
