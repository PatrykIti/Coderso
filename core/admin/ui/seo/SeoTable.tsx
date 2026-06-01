import { Pencil, Share2, ImageOff, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SeoItem = {
  id: string;
  title: string;
  path: string;
  score: number;
  lastAuditAt: string | null;
  metaStatus: "optimized" | "short" | "missing";
  socialStatus: "ready" | "missing";
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  previewUrl: string;
  previewPath: string;
  analysisStatus: "passed" | "attention";
  analysisNotes: string[];
};

export type SeoTableEmptyState = {
  title: string;
  description: string;
  actionLabel?: string;
};

type SeoTableProps = {
  items: SeoItem[];
  activeId?: string | null;
  onEdit?: (id: string) => void;
  emptyState?: SeoTableEmptyState;
  onEmptyAction?: () => void;
  emptyActionDisabled?: boolean;
};

const metaStatusLabels: Record<SeoItem["metaStatus"], string> = {
  optimized: "Optimized",
  short: "Too Short",
  missing: "Missing",
};

const metaStatusStyles: Record<SeoItem["metaStatus"], string> = {
  optimized: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  short: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  missing: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const scoreTones = {
  high: { bar: "bg-emerald-500", text: "text-emerald-600" },
  mid: { bar: "bg-amber-500", text: "text-amber-600" },
  low: { bar: "bg-rose-500", text: "text-rose-600" },
} as const;

function getScoreTone(score: number) {
  if (score >= 80) return scoreTones.high;
  if (score >= 50) return scoreTones.mid;
  return scoreTones.low;
}

export function SeoTable({
  items,
  activeId,
  onEdit,
  emptyState,
  onEmptyAction,
  emptyActionDisabled = false,
}: SeoTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>Page Title</TableHead>
            <TableHead>SEO Score</TableHead>
            <TableHead>Meta Desc</TableHead>
            <TableHead>Social Preview</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {emptyState?.title ?? "No SEO pages found"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {emptyState?.description ?? "Try a different search or status filter."}
                    </p>
                  </div>
                  {emptyState?.actionLabel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEmptyAction}
                      disabled={emptyActionDisabled}
                    >
                      {emptyState.actionLabel}
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => {
            const tone = getScoreTone(item.score);
            const isActive = item.id === activeId;
            return (
              <TableRow
                key={item.id}
                className={cn(
                  "transition-colors",
                  isActive ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted/40"
                )}
              >
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.path}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full", tone.bar)} style={{ width: `${item.score}%` }} />
                    </div>
                    <span className={cn("text-xs font-semibold", tone.text)}>{item.score}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={metaStatusStyles[item.metaStatus]}>
                    {metaStatusLabels[item.metaStatus]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.socialStatus === "ready" ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border bg-background text-sky-500">
                          <Sparkles className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border bg-background text-blue-500">
                          <Share2 className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">Preview ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ImageOff className="h-4 w-4" />
                      <span className="text-xs">Missing assets</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isActive ? (
                    <span className="text-xs font-semibold text-primary">Editing...</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit?.(item.id)}
                      aria-label={`Edit ${item.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
