import { ArrowUpRight, FileText, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/lib/router";
import { DATES, PEOPLE, POST_TITLES, pick } from "@/lib/mock";

type Row = {
  title: string;
  status: string;
  author: string;
  updated: string;
};

const ROWS: Row[] = POST_TITLES.map((title, index) => ({
  title,
  status: pick(["published", "published", "draft", "review", "scheduled"], index),
  author: pick(PEOPLE, index + 1).name,
  updated: pick(DATES, index),
}));

const columns: Column<Row>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => (
      <Link to="/advanced/entries/article/sample" className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileText className="size-4" />
        </span>
        <span className="block truncate font-medium text-foreground">{row.title}</span>
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
  {
    key: "updated",
    header: "Updated",
    align: "right",
    render: (row) => <span className="text-sm text-muted-foreground">{row.updated}</span>,
  },
];

export function CollectionWorkspacePage() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Engine", to: "/advanced/engine" }, { label: "Article" }]}
        title="Articles"
        description="Manage entries, the detail template, and collection settings."
        actions={
          <Link to="/advanced/entries/article/sample">
            <Button className="gap-1.5">
              <Plus className="size-4" /> New entry
            </Button>
          </Link>
        }
      />

      <div className="mb-4">
        <Tabs
          variant="underline"
          items={[
            { value: "entries", label: "Entries", count: ROWS.length },
            { value: "template", label: "Detail template" },
            { value: "settings", label: "Settings" },
          ]}
        />
      </div>

      <div className="mb-3 flex justify-end">
        <Link
          to="/advanced/engine/sample/collection/detail-template/1"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Edit detail template <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <FilterBar searchPlaceholder="Search entries…" view="list" />

      <DataTable columns={columns} rows={ROWS} selectable onRowClick={() => {}} />
      <Pagination page={1} pageCount={4} total={48} pageSize={12} />
    </div>
  );
}
