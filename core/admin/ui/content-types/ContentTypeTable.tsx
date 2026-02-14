import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { withAdminBasePath } from "@/utils/adminPaths";
import type { ContentTypeSummary } from "@/services/contentTypesClient";

const statusStyles = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export type ContentTypeRow = ContentTypeSummary & {
  fieldCount: number;
  status: "published" | "draft";
};

export type ContentTypeTableProps = {
  rows: ContentTypeRow[];
  basePath: string;
  isLoading?: boolean;
  emptyMessage?: string;
};

export function ContentTypeTable({
  rows,
  basePath,
  isLoading,
  emptyMessage,
}: ContentTypeTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Slug
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fields
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-6 text-sm text-muted-foreground">
                Loading content types...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-6 text-sm text-muted-foreground">
                {emptyMessage ?? "No content types yet. Create the first one to get started."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((type) => {
              const editHref = withAdminBasePath(basePath, `/content-types/${type.id}`);
              return (
                <TableRow key={type.id}>
                  <TableCell className="pl-4 py-4">
                    <div className="space-y-1">
                      <a
                        href={editHref}
                        className="text-sm font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                        aria-label={`Edit content type: ${type.name}`}
                      >
                        {type.name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {type.fieldCount} fields
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground">
                    {type.slug}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline">{type.fieldCount}</Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className={statusStyles[type.status]}>
                      {type.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 pr-4 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={editHref}>Edit</a>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
