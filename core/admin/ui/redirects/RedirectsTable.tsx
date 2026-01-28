import { Ban, CheckCircle2, Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type RedirectStatus = "active" | "inactive"

type RedirectRow = {
  id: string
  from: string
  to: string
  type: "301" | "302"
  status: RedirectStatus
  lastHit: string
}

const redirects: RedirectRow[] = [
  {
    id: "redirect-1",
    from: "/old-product-page",
    to: "/products/new-v2-edition",
    type: "301",
    status: "active",
    lastHit: "2 mins ago",
  },
  {
    id: "redirect-2",
    from: "/blog-launch",
    to: "/blog/introducing-nextless",
    type: "301",
    status: "active",
    lastHit: "14 hours ago",
  },
  {
    id: "redirect-3",
    from: "/temporary-offer",
    to: "/pricing?promo=spring",
    type: "302",
    status: "inactive",
    lastHit: "Never",
  },
]

const statusMeta: Record<
  RedirectStatus,
  { label: string; badge: string; dot: string }
> = {
  active: {
    label: "Active",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    badge: "border-slate-500/20 bg-slate-500/10 text-slate-600",
    dot: "bg-slate-400",
  },
}

const typeBadge: Record<RedirectRow["type"], string> = {
  "301": "border-transparent bg-muted text-muted-foreground",
  "302": "border-transparent bg-blue-500/10 text-blue-600",
}

export function RedirectsTable() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              From URL
            </TableHead>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              To URL
            </TableHead>
            <TableHead className="w-24 px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Type
            </TableHead>
            <TableHead className="w-28 px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Last hit
            </TableHead>
            <TableHead className="w-28 px-6 text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {redirects.map((redirect) => {
            const status = statusMeta[redirect.status]

            return (
              <TableRow key={redirect.id} className="group">
                <TableCell className="px-6 py-4 text-sm font-medium text-foreground">
                  {redirect.from}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {redirect.to}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={cn("rounded-md text-[10px] font-semibold", typeBadge[redirect.type])}
                  >
                    {redirect.type}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold",
                      status.badge
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {redirect.lastHit}
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Edit redirect"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        "text-muted-foreground",
                        redirect.status === "active"
                          ? "hover:text-rose-500"
                          : "hover:text-emerald-500"
                      )}
                      aria-label={
                        redirect.status === "active"
                          ? "Disable redirect"
                          : "Enable redirect"
                      }
                    >
                      {redirect.status === "active" ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="flex flex-col items-start gap-3 border-t px-6 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Showing 1-3 of 14 redirects</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
