import {
  Boxes,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/lib/router";

type Field = { name: string; type: string };

const FIELDS: Field[] = [
  { name: "Title", type: "Text" },
  { name: "Slug", type: "Slug" },
  { name: "Body", type: "Rich text" },
  { name: "Cover image", type: "Media" },
  { name: "Author", type: "Relation" },
  { name: "Category", type: "Relation" },
  { name: "Published at", type: "Date" },
  { name: "Featured", type: "Boolean" },
];

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function ContentTypeEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Engine", to: "/advanced/engine" }, { label: "Article" }]}
        title="Article"
        description="Define the fields and behavior of this content type."
        icon={<Boxes />}
        actions={
          <>
            <Link to="/advanced/engine/sample/schema">
              <Button variant="outline" className="gap-1.5">
                <ExternalLink className="size-4" /> Open schema
              </Button>
            </Link>
            <Button>Save</Button>
          </>
        }
      />

      <div className="mb-5">
        <Tabs
          variant="underline"
          items={[
            { value: "fields", label: "Fields", count: 8 },
            { value: "relations", label: "Relations", count: 2 },
            { value: "settings", label: "Settings" },
            { value: "permissions", label: "Permissions" },
          ]}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SectionCard
          title="Fields"
          description="Drag to reorder. Click a field to edit it."
          action={
            <Button variant="soft" size="sm" className="gap-1.5">
              <Plus className="size-4" /> Add field
            </Button>
          }
          padded={false}
        >
          <div className="divide-y divide-border">
            {FIELDS.map((field) => (
              <div
                key={field.name}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent"
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{field.name}</span>
                <Badge variant="soft">{field.type}</Badge>
                <Button variant="ghost" size="icon-sm" aria-label="Field actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>

        <Card className="h-fit p-5">
          <div className="mb-4 text-sm font-semibold">Type settings</div>

          <div className="space-y-3">
            <SettingRow label="API ID">
              <Input defaultValue="article" className="font-mono text-xs" />
            </SettingRow>
            <SettingRow label="Singular name">
              <Input defaultValue="Article" />
            </SettingRow>
            <SettingRow label="Plural name">
              <Input defaultValue="Articles" />
            </SettingRow>
          </div>

          <div className="mt-4 divide-y divide-border border-t border-border">
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Enable drafts</div>
                <div className="text-xs text-muted-foreground">Save unpublished changes.</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Versioning</div>
                <div className="text-xs text-muted-foreground">Keep a history of edits.</div>
              </div>
              <Switch />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
