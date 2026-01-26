import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { PageRowActions } from "./PageRowActions";

const pages = [
  {
    id: "about-us",
    title: "About Us",
    slug: "/about-us",
    status: "published" as const,
    author: "Sarah Jenks",
    updated: "Jan 20, 2026",
  },
  {
    id: "pricing-2024",
    title: "Pricing 2024",
    slug: "/pricing-v2",
    status: "draft" as const,
    author: "Mike Ross",
    updated: "Jan 18, 2026",
  },
  {
    id: "events",
    title: "Events & Workshops",
    slug: "/events",
    status: "scheduled" as const,
    author: "Alex Morgan",
    updated: "Jan 16, 2026",
  },
  {
    id: "careers",
    title: "Careers",
    slug: "/careers",
    status: "published" as const,
    author: "Sarah Jenks",
    updated: "Jan 14, 2026",
  },
];

const statusStyles = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const statusLabels = {
  published: "Published",
  draft: "Draft",
  scheduled: "Scheduled",
};

export function PageTable() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox aria-label="Select all pages" />
            </TableHead>
            <TableHead>Page title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead className="pr-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((page) => (
            <TableRow key={page.id}>
              <TableCell className="pl-4">
                <Checkbox aria-label={`Select ${page.title}`} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">
                    {page.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {page.slug}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={statusStyles[page.status]}
                >
                  {statusLabels[page.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>
                      {page.author
                        .split(" ")
                        .map((chunk) => chunk[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {page.author}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {page.updated}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <PageRowActions />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
