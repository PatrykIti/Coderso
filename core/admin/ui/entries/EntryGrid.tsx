import { EyeOff, FileText, Lock } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import type { EntryListItem, EntryVisibility } from "@/services/entriesClient";

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

const resolveAuthorLabel = (author: EntryListItem["author"]) => {
  const full = author?.name ?? author?.email ?? "System";
  return full.trim().split(/\s+/)[0] || full;
};

const resolveAuthorInitials = (author: EntryListItem["author"]) =>
  (author?.name ?? author?.email ?? "NA")
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function VisibilityBadge({ visibility }: { visibility: EntryVisibility }) {
  if (visibility === "public") return null;
  const isPassword = visibility === "password";
  const Icon = isPassword ? Lock : EyeOff;
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Icon className="size-3" />
      {isPassword ? "Password" : "Private"}
    </Badge>
  );
}

type EntryGridProps = {
  entries: EntryListItem[];
  onEdit: (id: string) => void;
  emptyMessage?: string;
};

export function EntryGrid({ entries, onEdit, emptyMessage }: EntryGridProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        {emptyMessage ?? "No entries to display."}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="text-left"
          onClick={() => onEdit(entry.id)}
          aria-label={`Edit entry: ${entry.title}`}
        >
          <Card className="gap-3 border-border/60 p-4 shadow-sm transition hover:border-primary/40 hover:bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold text-foreground">{entry.title}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {entry.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <StatusBadge status={entry.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="soft">{entry.contentType.name}</Badge>
              <VisibilityBadge visibility={entry.visibility} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback>{resolveAuthorInitials(entry.author)}</AvatarFallback>
                </Avatar>
                {resolveAuthorLabel(entry.author)}
              </span>
              <span>Updated {formatDate(entry.updatedAt)}</span>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}
