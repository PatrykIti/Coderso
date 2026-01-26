import { useEffect, useState } from "react";

type TokenOverrides = {
  colors?: Record<string, string>;
  neutrals?: Record<string, string>;
  spacing?: Record<string, string>;
  radius?: Record<string, string>;
  typography?: Record<string, string>;
};

type DesignTokensEditorProps = {
  value: TokenOverrides;
  onChange: (next: TokenOverrides) => void;
  onReset: () => void;
};

export function DesignTokensEditor({
  value,
  onChange,
  onReset,
}: DesignTokensEditorProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(JSON.stringify(value, null, 2));
  }, [value]);

  const applyDraft = () => {
    try {
      const parsed = JSON.parse(draft) as TokenOverrides;
      onChange(parsed);
      setError(null);
    } catch {
      setError("Invalid JSON");
    }
  };

  return (
    <section>
      <h3>Design tokens</h3>
      <p>Edit token overrides as JSON.</p>
      <textarea
        rows={12}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      {error ? <p>{error}</p> : null}
      <div>
        <button type="button" onClick={applyDraft}>
          Apply tokens
        </button>
        <button type="button" onClick={onReset}>
          Reset to defaults
        </button>
      </div>
    </section>
  );
}
