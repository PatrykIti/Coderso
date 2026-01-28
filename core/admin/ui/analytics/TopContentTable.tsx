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

const trendStyles = {
  up: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  down: "border-rose-500/20 bg-rose-500/10 text-rose-600",
};

type ContentRow = {
  id: string;
  title: string;
  path: string;
  views: string;
  conversionRate: string;
  avgTime: string;
  trend: "up" | "down";
  trendValue: string;
};

const contentRows: ContentRow[] = [
  {
    id: "modern-ui",
    title: "Modern UI Trends",
    path: "/blog/modern-ui-trends",
    views: "12,402",
    conversionRate: "4.6%",
    avgTime: "4m 12s",
    trend: "up",
    trendValue: "+12%",
  },
  {
    id: "analytics-dashboard",
    title: "Analytics Dashboard",
    path: "/features/analytics-dashboard",
    views: "9,821",
    conversionRate: "3.1%",
    avgTime: "3m 45s",
    trend: "up",
    trendValue: "+8%",
  },
  {
    id: "getting-started",
    title: "Getting Started",
    path: "/docs/getting-started",
    views: "7,240",
    conversionRate: "2.4%",
    avgTime: "2m 58s",
    trend: "down",
    trendValue: "-3%",
  },
  {
    id: "pricing",
    title: "Pricing",
    path: "/pricing",
    views: "5,112",
    conversionRate: "1.9%",
    avgTime: "2m 04s",
    trend: "down",
    trendValue: "-6%",
  },
];

export function TopContentTable() {
  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <SectionHeader
          title="Top Content"
          action={
            <Button variant="ghost" size="sm">
              View all
            </Button>
          }
        />
        <p className="text-sm text-muted-foreground">
          Most visited pages with conversion and engagement insights.
        </p>
      </CardHeader>
      <Separator className="mx-6" />
      <CardContent className="pt-4">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Conversion</TableHead>
              <TableHead>Avg. Time</TableHead>
              <TableHead>Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contentRows.map((row) => {
              const TrendIcon = row.trend === "up" ? ArrowUpRight : ArrowDownRight;
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
                    {row.views}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.conversionRate}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.avgTime}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={trendStyles[row.trend]}
                    >
                      <TrendIcon className="h-3 w-3" />
                      {row.trendValue}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
