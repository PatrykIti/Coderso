import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import { DEFAULT_TOKENS } from "../../../services/theme/tokenTypes";
import { mergeTokens } from "../../../services/theme/tokenUtils";
import { toCssVariableMap } from "../../../ui/theme/tokenCss";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { DesignTokensEditor, type TokenOverrides } from "./DesignTokensEditor";
import { DesignTokensPreview } from "./DesignTokensPreview";
import { SettingsSidebar } from "./SettingsSidebar";

type SettingsValues = {
  siteName: string;
  siteLocale: string;
};

type SettingsPageProps = {
  values: SettingsValues;
  tokens: TokenOverrides;
  onSave: (input: {
    values: SettingsValues;
    tokens: TokenOverrides;
  }) => Promise<void> | void;
  onResetTokens: () => Promise<void> | void;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
};

export function SettingsPage({
  values,
  tokens,
  onSave,
  onResetTokens,
  isLoading = false,
  isSaving = false,
  error = null,
}: SettingsPageProps) {
  const [form, setForm] = useState(values);
  const [tokenOverrides, setTokenOverrides] = useState(tokens);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);

  const previewStyle = useMemo(() => {
    const resolved = mergeTokens(DEFAULT_TOKENS, tokenOverrides);
    return toCssVariableMap(resolved);
  }, [tokenOverrides]);

  useEffect(() => {
    setTokenOverrides(tokens);
  }, [tokens]);

  useEffect(() => {
    setForm(values);
  }, [values]);

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    setLocalSaving(true);
    try {
      await onSave({ values: form, tokens: tokenOverrides });
      setSaveSuccess("Settings updated.");
    } catch (err) {
      if (isApiClientError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save settings.");
      }
    } finally {
      setLocalSaving(false);
    }
  };

  const handleReset = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    setLocalSaving(true);
    try {
      await onResetTokens();
      setSaveSuccess("Tokens reset to defaults.");
    } catch (err) {
      if (isApiClientError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to reset tokens.");
      }
    } finally {
      setLocalSaving(false);
    }
  };

  const busy = isLoading || isSaving || localSaving;

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar />}
      preview={
        <div style={previewStyle as CSSProperties} className="h-full">
          <DesignTokensPreview />
        </div>
      }
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">Design Tokens</span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={busy}>
            Reset defaults
          </Button>
          <Button variant="outline" size="sm">
            Export JSON
          </Button>
          <Button size="sm" onClick={handleSave} disabled={busy}>
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {error ? (
          <div className="px-6 pt-6">
            <Alert variant="destructive">
              <AlertTitle>Settings error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}
        {saveError ? (
          <div className="px-6 pt-6">
            <Alert variant="destructive">
              <AlertTitle>Save failed</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          </div>
        ) : null}
        {saveSuccess ? (
          <div className="px-6 pt-6">
            <Alert>
              <AlertTitle>Saved</AlertTitle>
              <AlertDescription>{saveSuccess}</AlertDescription>
            </Alert>
          </div>
        ) : null}
        <div className="border-b bg-background/70 px-6 py-4">
          <h1 className="text-2xl font-semibold">Theme Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Customize colors, spacing, and typography tokens for the admin UI.
          </p>
        </div>
        <div className="flex-1 p-6">
          <DesignTokensEditor
            value={tokenOverrides}
            onChange={setTokenOverrides}
            onReset={handleReset}
          />
        </div>
      </div>
    </SettingsShell>
  );
}
