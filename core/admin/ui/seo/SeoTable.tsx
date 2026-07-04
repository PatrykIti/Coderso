import { FileText, Pencil, Share2, ImageOff, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  canonicalUrl: string;
  robots: string;
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

const metaStatusVariants: Record<SeoItem["metaStatus"], "success" | "warning" | "destructive"> = {
  optimized: "success",
  short: "warning",
  missing: "destructive",
};

// TASK-479-26-L02: token-driven score tone (real thresholds preserved: >=80
// success, >=50 warning, else destructive).
function getScoreToneClass(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
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
            const isActive = item.id === activeId;
            return (
              <TableRow
                key={item.id}
                className={cn(
                  "transition-colors",
                  isActive
                    ? "bg-primary-soft/40 ring-1 ring-inset ring-primary/20"
                    : "hover:bg-muted"
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {item.path}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "w-7 text-sm font-semibold tabular-nums",
                        getScoreToneClass(item.score)
                      )}
                    >
                      {item.score}
                    </span>
                    <Progress value={item.score} className="w-20" />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={metaStatusVariants[item.metaStatus]}>
                    {metaStatusLabels[item.metaStatus]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.socialStatus === "ready" ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <span className="flex size-7 items-center justify-center rounded-full border border-border bg-background text-info">
                          <Sparkles className="size-3.5" />
                        </span>
                        <span className="flex size-7 items-center justify-center rounded-full border border-border bg-background text-primary">
                          <Share2 className="size-3.5" />
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">Preview ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ImageOff className="size-4" />
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
