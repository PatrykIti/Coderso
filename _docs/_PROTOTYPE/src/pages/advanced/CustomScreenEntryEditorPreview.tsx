import {
  AlignCenter,
  AlignLeft,
  Bold,
  Eye,
  Heading,
  Italic,
  LayoutPanelLeft,
  Link2,
  List,
  Rocket,
  Strikethrough,
  Underline,
} from "lucide-react";

import { CanvasEditor } from "@/components/patterns/CanvasEditor";
import { PageHeader } from "@/components/patterns/PageHeader";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Link, usePath } from "@/lib/router";
import { getScreen, parseScreenPath } from "@/lib/screensMock";

export function CustomScreenEntryEditorPreview() {
  const { id, entryId } = parseScreenPath(usePath());
  const screen = getScreen(id);
  const index = Math.max(0, (Number(entryId) || 1) - 1) % screen.rows.length;
  const entry = screen.rows[index];
  const titleKey = screen.columns.find((c) => c.type === "title")?.key ?? "name";
  const title = String(entry[titleKey]);
  const owner = String(entry["owner"] ?? "Maria Nowak");
  const ownerFirst = owner.split(" ")[0];

  const status = String(entry["status"] ?? "active");
  const budget = String(entry["budget"] ?? entry["mrr"] ?? "$48,000");
  const progress = Number(entry["progress"] ?? entry["health"]) || 60;
  const phase = String(entry["phase"] ?? entry["plan"] ?? "Discovery");
  const due = String(entry["due"] ?? entry["since"] ?? "Jul 18, 2026");

  const milestones = [
    { label: "Kickoff & discovery", status: "completed", done: true },
    { label: "Design review", status: "active", done: false },
    { label: "Build & QA", status: "pending", done: false },
    { label: "Launch", status: "planned", done: false },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: screen.name, to: `/advanced/custom-screens/${screen.id}/entries` },
          { label: title },
        ]}
        title={title}
        description={`Edit content · entry in the “${screen.name}” screen`}
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

      <CanvasEditor
        title="Entry content"
        badge={
          <Badge variant="soft">
            <Eye className="size-3" /> Preview only
          </Badge>
        }
        toolbar={<Badge variant="outline">Content editing</Badge>}
        panelPosition="bottom"
        canvas={
          <div className="mx-auto max-w-2xl">
            <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
              {/* (1) Header */}
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={status} />
                  <span className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pl-0.5 pr-2.5 text-xs font-medium">
                    <Avatar name={owner} size="sm" className="size-5 text-[10px]" />
                    {ownerFirst}
                  </span>
                  {entry["phase"] ? (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      {String(entry["phase"])}
                    </span>
                  ) : null}
                  {entry["due"] ? (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      Due {String(entry["due"])}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* (2) Value tiles */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Budget</div>
                  <div className="mt-1 font-display text-base font-semibold">{budget}</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Progress</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={progress} className="flex-1" />
                    <span className="text-xs font-semibold tabular-nums">{progress}%</span>
                  </div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Phase</div>
                  <div className="mt-1 font-display text-base font-semibold">{phase}</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Due</div>
                  <div className="mt-1 font-display text-base font-semibold">{due}</div>
                </div>
              </div>

              {/* (3) Description — the currently edited block */}
              <div className="relative rounded-xl bg-card p-4 ring-2 ring-primary/60">
                <Badge variant="soft" className="absolute right-3 top-3">
                  Editing
                </Badge>
                <h3 className="text-sm font-semibold">Description</h3>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {title} is on track this cycle, with the team aligned on scope and the next set of
                  deliverables. This description block lives on the entry view your screen designed —
                  edit it inline using the formatting toolbar below. Keep it short, scannable, and
                  focused on what matters to the people following along.
                </p>
              </div>

              {/* (4) Milestones — related-list widget */}
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
                  Milestones
                </div>
                <div className="divide-y divide-border">
                  {milestones.map((m) => (
                    <div key={m.label} className="flex items-center gap-3 px-4 py-2.5">
                      <Checkbox defaultChecked={m.done} aria-label={m.label} />
                      <span className="flex-1 text-sm">{m.label}</span>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        }
        panel={
          <div className="flex items-center gap-1 px-2 py-1.5">
            <span className="px-1.5 text-xs font-medium text-muted-foreground">Aa</span>
            <Button variant="ghost" size="icon-sm" aria-label="Bold">
              <Bold className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Italic">
              <Italic className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Underline">
              <Underline className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Strikethrough">
              <Strikethrough className="size-4" />
            </Button>

            <div className="mx-1 h-5 w-px bg-border" />

            <Button variant="ghost" size="icon-sm" aria-label="Heading">
              <Heading className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Bullet list">
              <List className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Link">
              <Link2 className="size-4" />
            </Button>
            <button
              type="button"
              aria-label="Text color"
              className="flex size-8 items-center justify-center rounded-lg hover:bg-accent"
            >
              <span className="size-5 rounded bg-primary ring-1 ring-border ring-offset-1 ring-offset-popover" />
            </button>

            <div className="mx-1 h-5 w-px bg-border" />

            <Button variant="ghost" size="icon-sm" aria-label="Align left">
              <AlignLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Align center">
              <AlignCenter className="size-4" />
            </Button>
          </div>
        }
      />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Edit content inline — the layout is defined by the screen.{" "}
        <Link
          to={`/advanced/custom-screens/${screen.id}`}
          className="font-medium text-primary hover:underline"
        >
          Edit layout →
        </Link>
      </p>
    </div>
  );
}
