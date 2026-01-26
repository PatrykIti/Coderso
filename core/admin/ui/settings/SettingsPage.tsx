import { useState } from "react";
import { DesignTokensEditor } from "./DesignTokensEditor";

type SettingsValues = {
  siteName: string;
  siteLocale: string;
};

type TokenOverrides = {
  colors?: Record<string, string>;
  neutrals?: Record<string, string>;
  spacing?: Record<string, string>;
  radius?: Record<string, string>;
  typography?: Record<string, string>;
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
  const [form, setForm] = useState(values);
  const [tokenOverrides, setTokenOverrides] = useState(tokens);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ values: form, tokens: tokenOverrides });
      }}
    >
      <h2>Settings</h2>
      <label>
        Site name
        <input
          value={form.siteName}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, siteName: event.target.value }))
          }
        />
      </label>
      <label>
        Locale
        <input
          value={form.siteLocale}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, siteLocale: event.target.value }))
          }
        />
      </label>
      <DesignTokensEditor
        value={tokenOverrides}
        onChange={setTokenOverrides}
        onReset={onResetTokens}
      />
      <button type="submit">Save settings</button>
    </form>
  );
}
