import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AdminLink } from "@/ui/shared/AdminLink";

import type { EntrySummary } from "@/services/entriesClient";

const statusStyles: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  archived: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const statusLabels: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  scheduled: "Scheduled",
  archived: "Archived",
};

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

type EntryGridProps = {
  entries: EntrySummary[];
  onEdit: (id: string) => void;
  entryTypeSlug?: string | null;
  emptyMessage?: string;
};

export function EntryGrid({ entries, onEdit, entryTypeSlug, emptyMessage }: EntryGridProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        {emptyMessage ?? "No entries to display."}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => {
        const card = (
          <Card className="gap-3 border-border/60 p-4 shadow-sm transition hover:border-primary/40 hover:bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                <p className="text-xs text-muted-foreground">{entry.slug}</p>
              </div>
              <Badge
                variant="outline"
                className={statusStyles[entry.status] ?? statusStyles.draft}
              >
                {statusLabels[entry.status] ?? entry.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated {formatDate(entry.updatedAt)}
            </div>
          </Card>
        );

        return entryTypeSlug ? (
          <AdminLink
            key={entry.id}
            href={`/entries/${encodeURIComponent(entryTypeSlug)}/${encodeURIComponent(entry.id)}`}
            prefetch
            className="text-left"
          >
            {card}
          </AdminLink>
        ) : (
          <button
            key={entry.id}
            type="button"
            className="text-left"
            onClick={() => onEdit(entry.id)}
          >
            {card}
          </button>
        );
      })}
    </div>
  );
}
