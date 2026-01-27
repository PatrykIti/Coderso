import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

const entries = [
  {
    id: "entry-1",
    title: "Launch announcement",
    status: "published",
    slug: "launch-announcement",
    updated: "Jan 18, 2026",
  },
  {
    id: "entry-2",
    title: "Roadmap update",
    status: "draft",
    slug: "roadmap-update",
    updated: "Jan 16, 2026",
  },
];

const statusStyles = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export function EntryList() {
  return (
    <AdminShell
      activeHref="/admin/entries"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Entries</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader
          title="Entries"
          description="Manage entries for a selected content type."
          actions={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New entry
            </Button>
          }
        />
        <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <Input placeholder="Search by title or slug..." className="lg:max-w-sm" />
          <Button variant="outline" size="sm">
            Filter status
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold">{entry.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusStyles[entry.status as keyof typeof statusStyles]}
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.slug}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.updated}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminShell>
  );
}
