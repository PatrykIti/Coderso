import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { MediaFolder, MediaKind } from "@/ui/media/types";

export type MediaAltFilter = "any" | "has" | "missing";

export type MediaFilterState = {
  types: MediaKind[]; // empty = no type facet (matches all)
  tags: string[]; // empty = no tag facet
  folderId: string | null; // null = no folder facet
  alt: MediaAltFilter; // "any" = no alt facet
  dateFrom: string | null; // ISO date (YYYY-MM-DD), null = open lower bound
  dateTo: string | null; // ISO date (YYYY-MM-DD), null = open upper bound
};

export const EMPTY_MEDIA_FILTER: MediaFilterState = {
  types: [],
  tags: [],
  folderId: null,
  alt: "any",
  dateFrom: null,
  dateTo: null,
};

/** Non-empty-facet count for the toolbar badge (each active facet counts once). */
export function countActiveFilters(s: MediaFilterState): number {
  return (
    (s.types.length ? 1 : 0) +
    (s.tags.length ? 1 : 0) +
    (s.folderId ? 1 : 0) +
    (s.alt !== "any" ? 1 : 0) +
    (s.dateFrom || s.dateTo ? 1 : 0)
  );
}

const TYPE_OPTIONS: { value: MediaKind; label: string }[] = [
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
  { value: "audio", label: "Audio" },
];

const ALT_OPTIONS: { value: MediaAltFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "has", label: "Has alt" },
  { value: "missing", label: "Missing alt" },
];

type MediaFilterPanelProps = {
  tags: string[];
  folders: MediaFolder[];
  value: MediaFilterState;
  onChange: (next: MediaFilterState) => void;
  onReset: () => void;
  className?: string;
};

/**
 * TASK-512-05: the prototype "Filters" affordance made functional. CONTROLLED —
 * the page (512-06) holds the canonical `MediaFilterState` and does the actual
 * item filtering; this panel only renders facet controls and emits immutable
 * `onChange` updates. Facets combine with AND; within a multi-select facet,
 * members combine per the documented semantics (types OR, tags AND). Presentational
 * only — no network calls; tags/values render as text nodes.
 */
export function MediaFilterPanel({
  tags,
  folders,
  value,
  onChange,
  onReset,
  className,
}: MediaFilterPanelProps) {
  const activeCount = countActiveFilters(value);

  const toggleType = (type: MediaKind) => {
    const next = value.types.includes(type)
      ? value.types.filter((t) => t !== type)
      : [...value.types, type];
    onChange({ ...value, types: next });
  };

  const toggleTag = (tag: string) => {
    const next = value.tags.includes(tag)
      ? value.tags.filter((t) => t !== tag)
      : [...value.tags, tag];
    onChange({ ...value, tags: next });
  };

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
      active
        ? "border-transparent bg-primary-soft text-primary-soft-foreground"
        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <div className={cn("w-full space-y-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Filters</div>
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {activeCount} active
        </span>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Type
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_OPTIONS.map((option) => {
            const active = value.types.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                className={chipClass(active)}
                onClick={() => toggleType(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const active = value.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  className={chipClass(active)}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="media-filter-folder"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Folder
        </label>
        <select
          id="media-filter-folder"
          value={value.folderId ?? ""}
          onChange={(event) =>
            onChange({ ...value, folderId: event.target.value ? event.target.value : null })
          }
          className="flex h-9 w-full rounded-xl border border-border bg-muted/30 px-3 text-sm"
        >
          <option value="">Any folder</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Alt text
        </div>
        <div className="inline-flex rounded-xl border border-border bg-card p-0.5 shadow-soft">
          {ALT_OPTIONS.map((option) => {
            const active = value.alt === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onChange({ ...value, alt: option.value })}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Date range
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="From date"
            value={value.dateFrom ?? ""}
            onChange={(event) =>
              onChange({ ...value, dateFrom: event.target.value ? event.target.value : null })
            }
            className="h-9"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={value.dateTo ?? ""}
            onChange={(event) =>
              onChange({ ...value, dateTo: event.target.value ? event.target.value : null })
            }
            className="h-9"
          />
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={activeCount === 0}
          onClick={onReset}
        >
          <RotateCcw className="size-3.5" />
          Clear all
        </Button>
      </div>
    </div>
  );
}
