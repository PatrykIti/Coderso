import { Copy, KeyRound, Plus, ShieldAlert } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DATES, RELATIVE_TIMES, pick } from "@/lib/mock";

type KeyRow = {
  name: string;
  masked: string;
  scopes: string[];
  created: string;
  lastUsed: string;
};

const ROWS: KeyRow[] = [
  { name: "Production", masked: "sk_live_••••4f9a", scopes: ["read", "write"], created: pick(DATES, 0), lastUsed: pick(RELATIVE_TIMES, 0) },
  { name: "CI deploy", masked: "sk_live_••••2b71", scopes: ["write"], created: pick(DATES, 2), lastUsed: pick(RELATIVE_TIMES, 3) },
  { name: "Mobile app", masked: "sk_live_••••9c3d", scopes: ["read"], created: pick(DATES, 4), lastUsed: pick(RELATIVE_TIMES, 5) },
  { name: "Analytics export", masked: "sk_live_••••08ef", scopes: ["read", "write"], created: pick(DATES, 6), lastUsed: pick(RELATIVE_TIMES, 7) },
];

const columns: Column<KeyRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <span className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <KeyRound className="size-4" />
        </span>
        <span className="font-medium text-foreground">{row.name}</span>
      </span>
    ),
  },
  {
    key: "key",
    header: "Key",
    render: (row) => (
      <span className="flex items-center gap-1.5">
        <code className="rounded-lg bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{row.masked}</code>
        <Button variant="ghost" size="icon-sm" aria-label="Copy key">
          <Copy className="size-3.5" />
        </Button>
      </span>
    ),
  },
  {
    key: "scopes",
    header: "Scopes",
    render: (row) => (
      <span className="flex flex-wrap items-center gap-1.5">
        {row.scopes.map((scope) => (
          <Badge key={scope} variant="outline">
            {scope}
          </Badge>
        ))}
      </span>
    ),
  },
  { key: "created", header: "Created", render: (row) => <span className="text-sm text-muted-foreground">{row.created}</span> },
  { key: "lastUsed", header: "Last used", render: (row) => <span className="text-sm text-muted-foreground">{row.lastUsed}</span> },
  {
    key: "actions",
    header: "",
    align: "right",
    render: () => (
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
        Revoke
      </Button>
    ),
  },
];

export function ApiKeysPage() {
  return (
    <SettingsLayout
      title="API keys"
      description="Programmatic access to your workspace."
      saveBar={false}
    >
      <div className="flex flex-col gap-4">
        <Card className="flex items-start gap-3 bg-warning-soft p-4 text-warning shadow-none">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <span className="font-medium">Keep your keys secret.</span>{" "}
            <span className="text-warning/90">
              Anyone with a key can access your workspace. Never commit keys to source control or share them publicly.
            </span>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button className="gap-1.5">
            <Plus className="size-4" /> Create key
          </Button>
        </div>

        <DataTable columns={columns} rows={ROWS} />
      </div>
    </SettingsLayout>
  );
}
