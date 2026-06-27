import {
  ChevronDown,
  Clock,
  Eye,
  LayoutPanelLeft,
  Plus,
  Rocket,
  Wand2,
} from "lucide-react";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, usePath } from "@/lib/router";
import {
  getScreen,
  parseScreenPath,
  type ScreenColumn,
  type ScreenDef,
  type ScreenRow,
} from "@/lib/screensMock";

function fieldControl(col: ScreenColumn, row: ScreenRow): ReactNode {
  const value = row[col.key];
  switch (col.type) {
    case "status":
      return (
        <Select defaultValue="v">
          <option value="v">{String(value)}</option>
          <option value="a">active</option>
          <option value="r">review</option>
          <option value="c">completed</option>
        </Select>
      );
    case "person":
      return (
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-xl border border-input bg-card px-2.5 text-sm shadow-soft"
        >
          <Avatar name={String(value)} size="sm" className="size-6" />
          <span className="flex-1 truncate text-left">{String(value)}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      );
    case "badge":
      return (
        <Select defaultValue="v">
          <option value="v">{String(value)}</option>
          <option value="o">Other…</option>
        </Select>
      );
    case "progress":
      return (
        <div className="flex items-center gap-3">
          <Progress value={Number(value)} className="flex-1" />
          <Input defaultValue={String(value)} className="w-16 text-center" />
        </div>
      );
    case "tags":
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {(value as string[]).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3" /> Add
          </button>
        </div>
      );
    default:
      return <Input defaultValue={String(value)} />;
  }
}

export function CustomScreenEntryEditorPreview() {
  const path = usePath();
  const { id, entryId } = parseScreenPath(path);
  const screen: ScreenDef = getScreen(id);
  const index = Math.max(0, (Number(entryId) || 1) - 1) % screen.rows.length;
  const entry = screen.rows[index];
  const titleCol = screen.columns.find((c) => c.type === "title");
  const title = String(entry[titleCol?.key ?? "name"]);
  const owner = String(entry["owner"] ?? "Maria Nowak");

  const detailFields = screen.columns.filter(
    (c) => c.type !== "title" && c.type !== "date",
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: screen.name, to: `/advanced/custom-screens/${screen.id}/entries` },
          { label: title },
        ]}
        title={title}
        description={`${screen.singular} · entry in the “${screen.name}” screen`}
        actions={
          <>
            <Badge variant="soft">
              <Eye className="size-3" /> Preview only
            </Badge>
            <Link to={`/advanced/custom-screens/${screen.id}`}>
              <Button variant="outline" className="gap-1.5">
                <LayoutPanelLeft className="size-4" /> Open in builder
              </Button>
            </Link>
            <Button variant="ghost">Save draft</Button>
            <Button className="gap-1.5">
              <Rocket className="size-4" /> Publish
            </Button>
          </>
        }
      />

      <div className="mb-5 flex items-center gap-2 rounded-2xl border border-dashed border-border bg-primary-soft/40 px-4 py-2.5 text-sm">
        <Wand2 className="size-4 shrink-0 text-primary" />
        <span className="text-muted-foreground">
          This entry view is composed by the{" "}
          <span className="font-medium text-foreground">{screen.name}</span> screen.
        </span>
        <Link
          to={`/advanced/custom-screens/${screen.id}`}
          className="ml-auto shrink-0 font-medium text-primary hover:underline"
        >
          Edit layout →
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Main column — the entry view */}
        <div className="flex flex-col gap-5">
          <SectionCard title="Overview">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{titleCol?.label ?? "Title"}</label>
                <Input defaultValue={title} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  className="min-h-24"
                  defaultValue={`Scope, goals, and key context for ${title}. This rich text block was added to the entry view inside the screen builder.`}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Details" description="Fields bound to the content type.">
            <div className="grid gap-4 sm:grid-cols-2">
              {detailFields.map((col) => (
                <div key={col.key} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">{col.label}</label>
                  {fieldControl(col, entry)}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Activity"
            description="A related-list widget placed on the entry view."
            bodyClassName="p-0"
            padded={false}
          >
            <div className="divide-y divide-border">
              {[
                { who: owner, text: "moved this to In progress", time: "2h ago" },
                { who: "Maria Nowak", text: "left a comment", time: "Yesterday" },
                { who: "Jonas Weber", text: "attached a file", time: "2 days ago" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={item.who} size="sm" />
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{item.who.split(" ")[0]}</span>{" "}
                    <span className="text-muted-foreground">{item.text}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          <SectionCard title="Publish">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current status</span>
                <StatusBadge status={String(entry["status"] ?? "active")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Visibility</label>
                <Select defaultValue="team">
                  <option value="team">Team</option>
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </Select>
              </div>
              <div className="mt-1 flex gap-2">
                <Button variant="ghost" className="flex-1">
                  Save draft
                </Button>
                <Button className="flex-1">Publish</Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="People">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <Avatar name={owner} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{owner}</div>
                  <div className="text-xs text-muted-foreground">Owner</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {["Maria Nowak", "Jonas Weber", "Aiko Tanaka"].map((person) => (
                  <Avatar key={person} name={person} size="sm" />
                ))}
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Properties">
            <div className="flex flex-col gap-2.5 text-sm">
              {[
                { k: "Entry ID", v: `${screen.singular.toLowerCase()}_${1000 + index}` },
                { k: "Content type", v: screen.contentType },
                { k: "Created", v: String(entry["created"] ?? entry["since"] ?? "May 03, 2026") },
                { k: "Last edited", v: "2h ago" },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{row.k}</span>
                  <span className="truncate font-medium">{row.v}</span>
                </div>
              ))}
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> Auto-saved
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
