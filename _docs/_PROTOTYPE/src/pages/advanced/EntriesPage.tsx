import { FileText, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/lib/router";
import { DATES, PAGE_TITLES, PEOPLE, POST_TITLES, pick } from "@/lib/mock";

type Row = {
  title: string;
  type: string;
  status: string;
  author: string;
  updated: string;
};

const TITLES = [...PAGE_TITLES.slice(0, 6), ...POST_TITLES.slice(0, 6)];

const ROWS: Row[] = TITLES.map((title, index) => ({
  title,
  type: pick(["Article", "Product", "Event", "Author", "FAQ"], index),
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
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.title}</span>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            #{(row.title.length * 137 + 1024).toString(16)}
          </span>
        </span>
      </Link>
    ),
  },
  { key: "type", header: "Type", render: (row) => <Badge variant="soft">{row.type}</Badge> },
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

export function EntriesPage() {
  return (
    <div>
      <PageHeader
        title="Entries"
        description="Every piece of structured content across your content types."
        actions={
          <>
            <Select defaultValue="all" className="w-40">
              <option value="all">All types</option>
              <option value="article">Article</option>
              <option value="product">Product</option>
              <option value="event">Event</option>
            </Select>
            <Link to="/advanced/entries/article/sample">
              <Button className="gap-1.5">
                <Plus className="size-4" /> New entry
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4">
        <Tabs
          variant="underline"
          items={[
            { value: "all", label: "All", count: 124 },
            { value: "published", label: "Published", count: 92 },
            { value: "draft", label: "Drafts", count: 18 },
            { value: "review", label: "In review", count: 9 },
            { value: "scheduled", label: "Scheduled", count: 5 },
          ]}
        />
      </div>

      <FilterBar searchPlaceholder="Search entries…" view="list" />

      <DataTable columns={columns} rows={ROWS} selectable onRowClick={() => {}} />
      <Pagination page={1} pageCount={11} total={124} pageSize={12} />
    </div>
  );
}
