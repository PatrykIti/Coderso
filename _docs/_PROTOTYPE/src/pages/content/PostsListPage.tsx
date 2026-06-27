import { MessageSquare, MoreHorizontal, Newspaper, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/lib/router";
import { DATES, PEOPLE, POST_TITLES, pick, seeded } from "@/lib/mock";

const CATEGORIES = ["Product", "Engineering", "Design", "Tutorials", "Company", "Releases"];

type Row = {
  title: string;
  category: string;
  status: string;
  author: string;
  published: string;
  comments: number;
};

const ROWS: Row[] = POST_TITLES.map((title, index) => ({
  title,
  category: pick(CATEGORIES, index),
  status: pick(["published", "published", "draft", "scheduled", "review"], index),
  author: pick(PEOPLE, index).name,
  published: pick(DATES, index),
  comments: Math.round(seeded(index, 64, 0)),
}));

const columns: Column<Row>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => (
      <Link to="/posts/sample" className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Newspaper className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{row.category}</span>
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
  {
    key: "published",
    header: "Published",
    render: (row) => <span className="text-sm text-muted-foreground">{row.published}</span>,
  },
  {
    key: "comments",
    header: "Comments",
    align: "right",
    render: (row) => (
      <span className="flex items-center justify-end gap-1.5 text-sm tabular-nums text-muted-foreground">
        <MessageSquare className="size-3.5" />
        {row.comments}
      </span>
    ),
  },
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

export function PostsListPage() {
  return (
    <div>
      <PageHeader
        title="Posts"
        description="Write, schedule, and publish blog posts for your site."
        actions={
          <Link to="/posts/sample">
            <Button className="gap-1.5">
              <Plus className="size-4" /> New post
            </Button>
          </Link>
        }
      />

      <div className="mb-4">
        <Tabs
          variant="underline"
          items={[
            { value: "all", label: "All", count: 48 },
            { value: "published", label: "Published", count: 36 },
            { value: "draft", label: "Drafts", count: 8 },
            { value: "scheduled", label: "Scheduled", count: 4 },
          ]}
        />
      </div>

      <FilterBar searchPlaceholder="Search posts…" view="list" />

      <DataTable columns={columns} rows={ROWS} selectable onRowClick={() => {}} />
      <Pagination page={1} pageCount={4} total={48} pageSize={12} />
    </div>
  );
}
