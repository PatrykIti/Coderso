import { Plus } from "lucide-react";

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
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

const types = [
  {
    id: "blog",
    name: "Blog Post",
    slug: "blog",
    fields: 8,
    status: "published",
  },
  {
    id: "faq",
    name: "FAQ",
    slug: "faq",
    fields: 4,
    status: "draft",
  },
  {
    id: "events",
    name: "Events",
    slug: "events",
    fields: 6,
    status: "published",
  },
];

const statusStyles = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export function ContentTypeList() {
  return (
    <AdminShell
      activeHref="/admin/content-types"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Content Types</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader
          title="Content Types"
          description="Create reusable schemas for structured content entries."
          actions={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New type
            </Button>
          }
        />
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{type.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {type.fields} fields
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {type.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{type.fields}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusStyles[type.status as keyof typeof statusStyles]}
                    >
                      {type.status}
                    </Badge>
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
