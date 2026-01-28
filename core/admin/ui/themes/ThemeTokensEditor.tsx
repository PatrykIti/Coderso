import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const TOKEN_DRAFT = `{
  "colors": {
    "primary": "#1392ec",
    "primary_hover": "#1181d1",
    "text_main": "#0f172a",
    "text_muted": "#64748b",
    "bg_canvas": "#ffffff",
    "border": "#e2e8f0"
  },
  "typography": {
    "font_sans": "Noto Sans",
    "font_display": "Space Grotesk"
  }
}`.trim();

const LINE_NUMBERS = TOKEN_DRAFT.split("\n")
  .map((_, index) => index + 1)
  .join("\n");

const TOKEN_TABS = [
  { value: "colors", label: "Colors" },
  { value: "typography", label: "Typography" },
  { value: "spacing", label: "Spacing" },
  { value: "radius", label: "Radius" },
];

const ACTIVE_TOKENS = [
  { label: "Primary", value: "#1392ec", swatch: "#1392ec" },
  { label: "Hover", value: "#1181d1", swatch: "#1181d1" },
];

function TokenEditorBody() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-muted/40 px-6 py-3">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          theme.config.json
        </span>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Valid JSON</span>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-background">
        <div className="absolute inset-y-0 left-0 w-10 border-r bg-muted/40 text-right text-xs font-mono text-muted-foreground">
          <pre className="px-2 py-4 leading-6">{LINE_NUMBERS}</pre>
        </div>
        <Textarea
          readOnly
          spellCheck={false}
          value={TOKEN_DRAFT}
          className="h-full min-h-[320px] resize-none border-0 bg-transparent pl-12 pr-6 font-mono text-xs leading-6 text-muted-foreground focus-visible:ring-0"
        />
      </div>
      <div className="border-t bg-background px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Active Token Properties
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ACTIVE_TOKENS.map((token) => (
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

export function ThemeTokensEditor() {
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
            <TokenEditorBody />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
