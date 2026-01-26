import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type TokenOverrides = {
  colors?: Record<string, string>;
  neutrals?: Record<string, string>;
  spacing?: Record<string, string>;
  radius?: Record<string, string>;
  typography?: Record<string, string>;
};

export type DesignTokensEditorProps = {
  value: TokenOverrides;
  onChange: (next: TokenOverrides) => void;
  onReset: () => void;
  initialDraft?: string;
};

export function DesignTokensEditor({
  value,
  onChange,
  onReset,
  initialDraft,
}: DesignTokensEditorProps) {
  const initialDraftValue = initialDraft ?? JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(initialDraftValue);
  const [error, setError] = useState<string | null>(() => {
    try {
      JSON.parse(initialDraftValue);
      return null;
    } catch {
      return "Invalid JSON";
    }
  });

  useEffect(() => {
    if (initialDraft) return;
    const nextDraft = JSON.stringify(value, null, 2);
    setDraft(nextDraft);
    try {
      JSON.parse(nextDraft);
      setError(null);
    } catch {
      setError("Invalid JSON");
    }
  }, [value, initialDraft]);

  useEffect(() => {
    try {
      JSON.parse(draft);
      setError(null);
    } catch {
      setError("Invalid JSON");
    }
  }, [draft]);

  const lineNumbers = useMemo(
    () => draft.split("\n").map((_, index) => index + 1).join("\n"),
    [draft]
  );

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
    <div className="flex h-full flex-col rounded-xl border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          theme.json
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex h-2 w-2 rounded-full",
              error ? "bg-rose-500" : "bg-emerald-500"
            )}
          />
          <Badge variant="outline" className="text-[10px] uppercase">
            {error ? "Invalid" : "Valid"}
          </Badge>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-10 border-r bg-muted/40 text-right text-xs font-mono text-muted-foreground">
          <pre className="px-2 py-3 leading-6">{lineNumbers}</pre>
        </div>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          className="h-full min-h-[420px] resize-none border-0 bg-transparent pl-12 pr-4 font-mono text-sm leading-6 focus-visible:ring-0"
        />
      </div>
      {error ? (
        <p className="px-4 py-2 text-xs text-destructive">{error}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
        <Button size="sm" onClick={applyDraft} disabled={Boolean(error)}>
          Apply tokens
        </Button>
        <Button size="sm" variant="outline" onClick={onReset}>
          Reset defaults
        </Button>
      </div>
    </div>
  );
}
