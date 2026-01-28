import { Plus, Search } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminShell } from "@/ui/layouts/AdminShell"
import { PageHeader } from "@/ui/shared/PageHeader"

import { RedirectDrawer } from "./RedirectDrawer"
import { RedirectsTable, type RedirectRow } from "./RedirectsTable"

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

export function RedirectsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRedirect, setEditingRedirect] = useState<RedirectRow | null>(null)

  const openCreate = () => {
    setEditingRedirect(null)
    setDrawerOpen(true)
  }

  const openEdit = (redirect: RedirectRow) => {
    setEditingRedirect(redirect)
    setDrawerOpen(true)
  }

  return (
    <AdminShell
      activeHref="/admin/redirects"
      showSearch={false}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Site Management</span>
          <span>/</span>
          <span className="text-foreground">Redirects</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Redirects"
          description="Site management - 14 active routes."
          actions={
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create redirect
            </Button>
          }
        />
        <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search redirects..." className="pl-9" />
          </div>
        </div>
        <RedirectsTable items={redirects} onEdit={openEdit} />
      </div>
      <RedirectDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={editingRedirect ? "edit" : "create"}
        redirect={
          editingRedirect
            ? {
                from: editingRedirect.from,
                to: editingRedirect.to,
                type: editingRedirect.type,
                active: editingRedirect.status === "active",
              }
            : null
        }
      />
    </AdminShell>
  )
}
