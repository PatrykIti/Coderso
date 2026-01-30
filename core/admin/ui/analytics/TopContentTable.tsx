import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

const trendStyles = {
  up: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  down: "border-rose-500/20 bg-rose-500/10 text-rose-600",
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
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <SectionHeader
          title="Top Content"
          action={
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View all
            </Button>
          }
        />
        <p className="text-sm text-muted-foreground">
          Recently updated items with engagement score.
        </p>
      </CardHeader>
      <Separator className="mx-6" />
      <CardContent className="pt-4">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Activity Score</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => {
              const trend = row.score >= 50 ? "up" : "down";
              const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {row.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.path}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatScore(row.score)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(row.updatedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {row.type}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={trendStyles[trend]}>
                      <TrendIcon className="h-3 w-3" />
                      {trend === "up" ? "+5%" : "-3%"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No activity for this period.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
