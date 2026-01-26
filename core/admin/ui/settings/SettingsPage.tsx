import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
  onSave: (input: { values: SettingsValues; tokens: TokenOverrides }) => void;
  onResetTokens: () => void;
};

export function SettingsPage({
  values,
  tokens,
  onSave,
  onResetTokens,
}: SettingsPageProps) {
  const [form] = useState(values);
  const [tokenOverrides, setTokenOverrides] = useState(tokens);

  useEffect(() => {
    setTokenOverrides(tokens);
  }, [tokens]);

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar />}
      preview={<DesignTokensPreview />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">Design Tokens</span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onResetTokens}>
            Reset defaults
          </Button>
          <Button variant="outline" size="sm">
            Export JSON
          </Button>
          <Button size="sm" onClick={() => onSave({ values: form, tokens: tokenOverrides })}>
            Save changes
          </Button>
        </div>
      }
    >
      <div className="flex h-full flex-col">
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
            onReset={onResetTokens}
          />
        </div>
      </div>
    </SettingsShell>
  );
}
