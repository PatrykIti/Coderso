import { FileText, MoreHorizontal, Plus, Upload } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/lib/router";
import { DATES, PAGE_TITLES, PEOPLE, pick } from "@/lib/mock";

type Row = {
  title: string;
  slug: string;
  status: string;
  author: string;
  updated: string;
  views: string;
};

const ROWS: Row[] = PAGE_TITLES.map((title, index) => ({
  title,
  slug: `/${title.toLowerCase().replace(/\s+/g, "-")}`,
  status: pick(["published", "published", "draft", "scheduled", "review"], index),
  author: pick(PEOPLE, index).name,
  updated: pick(DATES, index),
  views: `${(index * 731 + 412).toLocaleString()}`,
}));

const columns: Column<Row>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => (
      <Link to="/pages/sample" className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileText className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.title}</span>
          <span className="block truncate font-mono text-xs text-muted-foreground">{row.slug}</span>
        </span>
      </Link>
    ),
  },
  { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  {
    key: "author",
    header: "Author",
    render: (row) => (
      <span className="flex items-center gap-2">
        <Avatar name={row.author} size="sm" />
        <span className="text-sm">{row.author.split(" ")[0]}</span>
      </span>
    ),
  },
  { key: "updated", header: "Updated", render: (row) => <span className="text-sm text-muted-foreground">{row.updated}</span> },
  { key: "views", header: "Views", align: "right", render: (row) => <span className="text-sm tabular-nums">{row.views}</span> },
  {
    key: "actions",
    header: "",
    align: "right",
    render: () => (
      <Button variant="ghost" size="icon-sm" aria-label="Row actions">
        <MoreHorizontal className="size-4" />
      </Button>
    ),
  },
];

export function PageListPage() {
  return (
    <div>
      <PageHeader
        title="Pages"
        description="Create, organize, and publish the pages of your site."
        actions={
          <>
            <Button variant="outline" className="gap-1.5">
              <Upload className="size-4" /> Import
            </Button>
            <Link to="/pages/sample">
              <Button className="gap-1.5">
                <Plus className="size-4" /> New page
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4">
        <Tabs
          variant="underline"
          items={[
            { value: "all", label: "All", count: 86 },
            { value: "published", label: "Published", count: 71 },
            { value: "draft", label: "Drafts", count: 9 },
            { value: "scheduled", label: "Scheduled", count: 4 },
            { value: "trash", label: "Trash", count: 2 },
          ]}
        />
      </div>

      <FilterBar searchPlaceholder="Search pages…" view="list" />

      <DataTable columns={columns} rows={ROWS} selectable onRowClick={() => {}} />
      <Pagination page={1} pageCount={8} total={86} pageSize={12} />
    </div>
  );
}
