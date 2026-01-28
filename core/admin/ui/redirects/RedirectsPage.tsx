import { Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminShell } from "@/ui/layouts/AdminShell"
import { PageHeader } from "@/ui/shared/PageHeader"

import { RedirectDrawer } from "./RedirectDrawer"
import { RedirectsTable } from "./RedirectsTable"

export function RedirectsPage() {
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
            <RedirectDrawer
              trigger={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create redirect
                </Button>
              }
            />
          }
        />
        <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search redirects..." className="pl-9" />
          </div>
        </div>
        <RedirectsTable />
      </div>
    </AdminShell>
  )
}
