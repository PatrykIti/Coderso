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

export type TopContentRow = {
  id: string;
  title: string;
  path: string;
  score: number;
  updatedAt: string;
  type: "page" | "entry";
};

type TopContentTableProps = {
  items: TopContentRow[];
  onViewAll?: () => void;
};

const formatScore = (score: number) => `${score}%`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function TopContentTable({ items, onViewAll }: TopContentTableProps) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-border py-0 shadow-soft">
      <CardHeader className="gap-1 px-5 py-4">
        <SectionHeader
          title="Top Content"
          action={
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View all
            </Button>
          }
        />
        <p className="text-sm text-muted-foreground">
          Updated items in the selected date range with activity score.
        </p>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="px-5">Content</TableHead>
              <TableHead>Activity Score</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-5">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{row.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{row.path}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm tabular-nums text-muted-foreground">
                  {formatScore(row.score)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(row.updatedAt)}
                </TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">
                  {row.type}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No content activity yet. Publish content or widen the date range.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
