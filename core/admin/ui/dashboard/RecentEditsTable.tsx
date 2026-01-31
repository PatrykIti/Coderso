import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const rows = [
  {
    title: "About Us Page",
    path: "/about-us",
    author: "Admin",
    status: "Draft",
    updatedAt: "2 mins ago",
  },
  {
    title: "Pricing Update Q3",
    path: "/pricing",
    author: "John Doe",
    status: "Published",
    updatedAt: "2 hours ago",
  },
  {
    title: "Blog: Modern CMS Guide",
    path: "/blog/modern-cms",
    author: "Admin",
    status: "Published",
    updatedAt: "1 day ago",
  },
  {
    title: "Terms of Service",
    path: "/legal/terms",
    author: "System",
    status: "Archived",
    updatedAt: "3 days ago",
  },
];

const statusClassMap: Record<string, string> = {
  Draft: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  Published: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  Archived: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export function RecentEditsTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead className="hidden md:table-cell">Author</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
          <TableHead className="hidden lg:table-cell text-right">Last Edited</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.title}-${row.updatedAt}`}>
            <TableCell>
              <div className="font-medium">{row.title}</div>
              <div className="text-xs text-muted-foreground">{row.path}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                <span>{row.author}</span>
                <span className="text-muted-foreground/60">•</span>
                <Badge
                  variant="outline"
                  className={statusClassMap[row.status] ?? ""}
                >
                  {row.status}
                </Badge>
                <span className="text-muted-foreground/60">•</span>
                <span>{row.updatedAt}</span>
              </div>
            </TableCell>
            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
              {row.author}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Badge
                variant="outline"
                className={statusClassMap[row.status] ?? ""}
              >
                {row.status}
              </Badge>
            </TableCell>
            <TableCell className="hidden text-right text-sm text-muted-foreground lg:table-cell">
              {row.updatedAt}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
