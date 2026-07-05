import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionHeader } from "@/ui/shared/SectionHeader";

export type TopPageTableRow = {
  path: string;
  views: number;
  visitors: number;
};

type TopPagesTableProps = {
  items: TopPageTableRow[];
  onViewAll?: () => void;
};

const formatCount = (value: number) => value.toLocaleString("en-US");

// TASK-483-05-L02: real top-pages-by-views table (path / views / visitors),
// replacing the content-inventory activity-score table.
export function TopPagesTable({ items, onViewAll }: TopPagesTableProps) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-border py-0 shadow-soft">
      <CardHeader className="gap-1 px-5 py-4">
        <SectionHeader
          title="Top Pages"
          action={
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View all
            </Button>
          }
        />
        <p className="text-sm text-muted-foreground">
          Most-viewed pages in the selected date range.
        </p>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="px-5">Page</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Visitors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.path}>
                <TableCell className="px-5">
                  <span className="font-mono text-xs text-muted-foreground">{row.path}</span>
                </TableCell>
                <TableCell className="text-sm tabular-nums text-muted-foreground">
                  {formatCount(row.views)}
                </TableCell>
                <TableCell className="text-sm tabular-nums text-muted-foreground">
                  {formatCount(row.visitors)}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  No page views yet. Publish content or widen the date range.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
