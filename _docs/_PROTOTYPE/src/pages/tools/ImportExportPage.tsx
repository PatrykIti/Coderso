import { ArrowDownToLine, ArrowUpFromLine, Upload } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";

type Item = { id: string; label: string; checked: boolean };

const IMPORT_ITEMS: Item[] = [
  { id: "pages", label: "Pages", checked: true },
  { id: "posts", label: "Posts", checked: true },
  { id: "media", label: "Media", checked: false },
  { id: "users", label: "Users", checked: false },
  { id: "settings", label: "Settings", checked: false },
];

const EXPORT_ITEMS: Item[] = [
  { id: "pages", label: "Pages", checked: true },
  { id: "posts", label: "Posts", checked: true },
  { id: "media", label: "Media", checked: true },
  { id: "users", label: "Users", checked: false },
  { id: "settings", label: "Settings", checked: true },
];

type Row = {
  job: string;
  kind: "import" | "export";
  items: string;
  status: string;
  date: string;
};

const ROWS: Row[] = [
  { job: "Full site export", kind: "export", items: "312 items", status: "completed", date: "Jun 27, 2026" },
  { job: "Blog posts import", kind: "import", items: "48 items", status: "completed", date: "Jun 24, 2026" },
  { job: "Media library export", kind: "export", items: "164 items", status: "processing", date: "Jun 22, 2026" },
  { job: "Users import", kind: "import", items: "12 items", status: "failed", date: "Jun 18, 2026" },
  { job: "Settings export", kind: "export", items: "1 file", status: "completed", date: "Jun 12, 2026" },
];

const columns: Column<Row>[] = [
  { key: "job", header: "Job", render: (row) => <span className="text-sm font-medium text-foreground">{row.job}</span> },
  {
    key: "kind",
    header: "Type",
    render: (row) =>
      row.kind === "import" ? (
        <Badge variant="info" className="gap-1">
          <ArrowDownToLine className="size-3" /> Import
        </Badge>
      ) : (
        <Badge variant="soft" className="gap-1">
          <ArrowUpFromLine className="size-3" /> Export
        </Badge>
      ),
  },
  { key: "items", header: "Items", render: (row) => <span className="text-sm text-muted-foreground">{row.items}</span> },
  { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  {
    key: "date",
    header: "Date",
    align: "right",
    render: (row) => <span className="text-sm text-muted-foreground">{row.date}</span>,
  },
];

function ChecklistRow({ item }: { item: Item }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-muted">
      <Checkbox defaultChecked={item.checked} aria-label={item.label} />
      <span className="font-medium">{item.label}</span>
    </label>
  );
}

export function ImportExportPage() {
  return (
    <div>
      <PageHeader
        title="Import / Export"
        description="Move content in and out of your workspace with a single file."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionCard title="Import" description="Bring content into this site" icon={<ArrowDownToLine />}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                <Upload className="size-5" />
              </div>
              <div className="text-sm font-medium">Drag a file or browse</div>
              <div className="mt-1 text-xs text-muted-foreground">Supports JSON, CSV, and ZIP up to 200 MB</div>
              <Button variant="outline" size="sm" className="mt-4">
                Browse files
              </Button>
            </div>

            <div className="mt-5">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What to import
              </div>
              <div className="flex flex-col">
                {IMPORT_ITEMS.map((item) => (
                  <ChecklistRow key={item.id} item={item} />
                ))}
              </div>
            </div>

            <Button type="submit" className="mt-4 w-full gap-1.5">
              <ArrowDownToLine className="size-4" /> Import
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="Export" description="Download a copy of your content" icon={<ArrowUpFromLine />}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What to export
              </div>
              <div className="flex flex-col">
                {EXPORT_ITEMS.map((item) => (
                  <ChecklistRow key={item.id} item={item} />
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium">Format</label>
              <Select defaultValue="json">
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="zip">ZIP archive</option>
              </Select>
            </div>

            <Button type="submit" className="mt-4 w-full gap-1.5">
              <ArrowUpFromLine className="size-4" /> Export
            </Button>
          </form>
        </SectionCard>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-[15px] font-semibold">Recent jobs</h2>
        <DataTable columns={columns} rows={ROWS} />
      </div>
    </div>
  );
}
