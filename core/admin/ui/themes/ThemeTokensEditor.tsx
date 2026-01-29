import { useEffect, useMemo, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DesignTokenOverrides, DesignTokens } from "../../../services/theme/tokenTypes";
import { assertTokenOverrides } from "../../../services/theme/tokenValidation";

import { ThemeRoutesEditor, type ThemeRouteDraft } from "./ThemeRoutesEditor";

const TOKEN_TABS = [
  { value: "colors", label: "Colors" },
  { value: "typography", label: "Typography" },
  { value: "spacing", label: "Spacing" },
  { value: "radius", label: "Radius" },
  { value: "routes", label: "Routes" },
];

type ThemeTokensEditorProps = {
  value: DesignTokenOverrides;
  resolvedTokens: DesignTokens;
  routes: ThemeRouteDraft[];
  pages: Array<{ id: string; title: string }>;
  routesError?: string | null;
  onChange: (next: DesignTokenOverrides) => void;
  onRoutesChange: (next: ThemeRouteDraft[]) => void;
  onValidityChange?: (valid: boolean) => void;
};

type TokenEditorBodyProps = {
  draft: string;
  error: string | null;
  onDraftChange: (next: string) => void;
  resolvedTokens: DesignTokens;
};

function TokenEditorBody({
  draft,
  error,
  onDraftChange,
  resolvedTokens,
}: TokenEditorBodyProps) {
  const lineNumbers = useMemo(
    () => draft.split("\n").map((_, index) => index + 1).join("\n"),
    [draft]
  );

  const activeTokens = [
    {
      label: "Primary",
      value: resolvedTokens.colors.primary,
      swatch: resolvedTokens.colors.primary,
    },
    {
      label: "Accent",
      value: resolvedTokens.colors.accent,
      swatch: resolvedTokens.colors.accent,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-muted/40 px-6 py-3">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          theme.config.json
        </span>
        <div className="flex items-center gap-2 text-[11px]">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              error ? "bg-rose-500" : "bg-emerald-500"
            )}
          />
          <span className="text-muted-foreground">
            {error ? "Invalid JSON" : "Valid JSON"}
          </span>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-background">
        <div className="absolute inset-y-0 left-0 w-10 border-r bg-muted/40 text-right text-xs font-mono text-muted-foreground">
          <pre className="px-2 py-4 leading-6">{lineNumbers}</pre>
        </div>
        <Textarea
          spellCheck={false}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          className="h-full min-h-80 resize-none border-0 bg-transparent pl-12 pr-6 font-mono text-xs leading-6 text-muted-foreground focus-visible:ring-0"
        />
      </div>
      <div className="border-t bg-background px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Active Token Properties
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {activeTokens.map((token) => (
            <div
              key={token.label}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3"
            >
              <div
                className="h-8 w-8 rounded-lg border border-background/60"
                style={{ backgroundColor: token.swatch }}
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase text-muted-foreground">
                  {token.label}
                </p>
                <p className="text-xs font-mono font-semibold text-foreground">
                  {token.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ThemeTokensEditor({
  value,
  resolvedTokens,
  routes,
  pages,
  routesError,
  onChange,
  onRoutesChange,
  onValidityChange,
}: ThemeTokensEditorProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(JSON.stringify(value ?? {}, null, 2));
    setError(null);
    onValidityChange?.(true);
  }, [value, onValidityChange]);

  const handleDraftChange = (next: string) => {
    setDraft(next);
    try {
      const parsed = JSON.parse(next) as unknown;
      assertTokenOverrides(parsed);
      setError(null);
      onValidityChange?.(true);
      onChange(parsed);
    } catch {
      setError("Invalid JSON");
      onValidityChange?.(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="colors" className="flex h-full flex-col">
        <div className="border-b bg-background">
          <TabsList variant="line" className="w-full justify-between px-6">
            {TOKEN_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-[11px] font-semibold uppercase tracking-[0.25em]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TOKEN_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="flex-1">
            {tab.value === "routes" ? (
              <ThemeRoutesEditor
                routes={routes}
                pages={pages}
                error={routesError}
                onChange={onRoutesChange}
              />
            ) : (
              <TokenEditorBody
                draft={draft}
                error={error}
                onDraftChange={handleDraftChange}
                resolvedTokens={resolvedTokens}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
