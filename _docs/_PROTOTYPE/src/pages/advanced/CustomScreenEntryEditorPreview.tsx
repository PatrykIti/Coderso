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
import { type ReactNode } from "react";

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
  const col = (k: string) => screen.columns.find((c) => c.key === k);

  const titleKey = screen.columns.find((c) => c.type === "title")?.key ?? "name";
  const title = String(entry[titleKey]);
  const owner = String(entry["owner"] ?? "Maria Nowak");
  const ownerFirst = owner.split(" ")[0];

  /** Render a single field VALUE the way its column type wants to be shown. */
  function renderValue(key: string): ReactNode {
    const type = col(key)?.type;
    const value = entry[key];
    if (type === "progress") {
      const n = Number(value) || 0;
      return (
        <div className="mt-1.5 flex items-center gap-2">
          <Progress value={n} className="flex-1" />
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{n}%</span>
        </div>
      );
    }
    if (type === "status") {
      return <StatusBadge status={String(value ?? "active")} />;
    }
    if (type === "person") {
      const person = String(value ?? owner);
      return (
        <div className="mt-1 flex items-center gap-1.5">
          <Avatar name={person} size="sm" className="size-5 text-[10px]" />
          <span className="text-sm font-medium">{person}</span>
        </div>
      );
    }
    // money / text / badge / date — plain string.
    return <div className="mt-1 font-display text-base font-semibold">{String(value)}</div>;
  }

  // Small muted chips for the next 1-2 non-title / non-status / non-owner fields.
  const headerChips = screen.columns
    .filter(
      (c) =>
        c.visible &&
        c.type !== "title" &&
        c.type !== "status" &&
        c.key !== "owner" &&
        entry[c.key] != null &&
        String(entry[c.key]).length > 0,
    )
    .slice(0, 2);

  const checklist = [
    { label: "Kickoff & discovery", status: "completed", done: true },
    { label: "Design review", status: "active", done: false },
    { label: "Build & QA", status: "pending", done: false },
    { label: "Launch", status: "planned", done: false },
  ];

  const activity = [
    { name: owner, action: "logged a call", time: "2h ago" },
    { name: "Aiko Tanaka", action: "updated the plan", time: "Yesterday" },
    { name: "Jonas Weber", action: "sent an invoice", time: "2 days ago" },
    { name: "Maria Nowak", action: "added a note", time: "Last week" },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: screen.name, to: `/advanced/custom-screens/${screen.id}/entries` },
          { label: title },
        ]}
        title={title}
        description={`Edit content · ${screen.singular} in the "${screen.name}" screen`}
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
              {screen.entry.sections.map((section, i) => {
                // ── Header ─────────────────────────────────────────────
                if (section.kind === "header") {
                  return (
                    <div key={i}>
                      <h2 className="font-display text-2xl font-semibold tracking-tight">
                        {title}
                      </h2>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <StatusBadge status={String(entry["status"] ?? "active")} />
                        <span className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pl-0.5 pr-2.5 text-xs font-medium">
                          <Avatar name={owner} size="sm" className="size-5 text-[10px]" />
                          {ownerFirst}
                        </span>
                        {headerChips.map((c) => (
                          <span
                            key={c.key}
                            className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                          >
                            {String(entry[c.key])}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }

                // ── Fields grid ────────────────────────────────────────
                if (section.kind === "fields") {
                  return (
                    <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {section.fieldKeys.map((key) => (
                        <div key={key} className="rounded-xl bg-muted/50 p-3">
                          <div className="text-xs text-muted-foreground">{col(key)?.label}</div>
                          {renderValue(key)}
                        </div>
                      ))}
                    </div>
                  );
                }

                // ── Rich text — the currently edited block ─────────────
                if (section.kind === "richtext") {
                  return (
                    <div key={i} className="relative rounded-xl bg-card p-4 ring-2 ring-primary/60">
                      <Badge variant="soft" className="absolute right-3 top-3">
                        Editing
                      </Badge>
                      <h3 className="text-sm font-semibold">{section.label}</h3>
                      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                        {title} — {section.placeholder} This is the block you're editing right now;
                        use the formatting toolbar below to style the copy inline. Keep it concise and
                        focused on what the people following this {screen.singular.toLowerCase()} need
                        to know.
                      </p>
                    </div>
                  );
                }

                // ── Related · checklist ────────────────────────────────
                if (section.kind === "related" && section.variant === "checklist") {
                  return (
                    <div key={i} className="overflow-hidden rounded-xl border border-border">
                      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
                        {section.label}
                      </div>
                      <div className="divide-y divide-border">
                        {checklist.map((m) => (
                          <div key={m.label} className="flex items-center gap-3 px-4 py-2.5">
                            <Checkbox defaultChecked={m.done} aria-label={m.label} />
                            <span className="flex-1 text-sm">{m.label}</span>
                            <StatusBadge status={m.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // ── Related · activity feed ────────────────────────────
                if (section.kind === "related" && section.variant === "activity") {
                  return (
                    <div key={i} className="overflow-hidden rounded-xl border border-border">
                      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
                        {section.label}
                      </div>
                      <div className="divide-y divide-border">
                        {activity.map((a, j) => (
                          <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                            <Avatar name={a.name} size="sm" />
                            <p className="flex-1 text-sm">
                              <span className="font-medium">{a.name}</span>{" "}
                              <span className="text-muted-foreground">{a.action}</span>
                            </p>
                            <span className="text-xs text-muted-foreground">{a.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
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
              className="mx-0.5 size-5 rounded bg-primary ring-1 ring-border ring-offset-1 ring-offset-popover"
            />

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
