import { Plus, Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isApiClientError } from "@/services/apiClient"
import {
  createRedirect,
  listRedirects,
  updateRedirect,
  type RedirectCreateInput,
  type RedirectItem,
} from "@/services/redirectsClient"
import { AdminShell } from "@/ui/layouts/AdminShell"
import { PageHeader } from "@/ui/shared/PageHeader"

import { RedirectDrawer } from "./RedirectDrawer"
import { RedirectsTable, type RedirectRow } from "./RedirectsTable"

export function RedirectsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRedirect, setEditingRedirect] = useState<RedirectRow | null>(null)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<RedirectRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapRow = (item: RedirectItem): RedirectRow => ({
    id: item.id,
    from: item.fromPath,
    to: item.toPath,
    type: String(item.statusCode) as RedirectRow["type"],
    status: item.enabled ? "active" : "inactive",
    lastHit: "—",
  })

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listRedirects()
      setItems(data.map(mapRow))
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message)
      } else {
        setError("Failed to load redirects.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openCreate = () => {
    setEditingRedirect(null)
    setDrawerOpen(true)
  }

  const openEdit = (redirect: RedirectRow) => {
    setEditingRedirect(redirect)
    setDrawerOpen(true)
  }

  const handleSave = async (payload: RedirectCreateInput) => {
    setIsSaving(true)
    setError(null)
    try {
      if (editingRedirect) {
        await updateRedirect(editingRedirect.id, payload)
      } else {
        await createRedirect(payload)
      }
      await refresh()
      return true
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message)
      } else {
        setError("Failed to save redirect.")
      }
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (redirect: RedirectRow) => {
    setIsSaving(true)
    setError(null)
    try {
      await updateRedirect(redirect.id, {
        enabled: redirect.status !== "active",
      })
      await refresh()
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message)
      } else {
        setError("Failed to update redirect.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) =>
      item.from.toLowerCase().includes(needle) ||
      item.to.toLowerCase().includes(needle)
    )
  }, [items, query])

  const activeCount = useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items]
  )

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
          description={`Site management - ${activeCount} active routes.`}
          actions={
            <Button className="gap-2" onClick={openCreate} disabled={isSaving}>
              <Plus className="h-4 w-4" />
              Create redirect
            </Button>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Redirects unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search redirects..."
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <RedirectsTable
          items={filtered}
          isLoading={isLoading}
          isSaving={isSaving}
          onEdit={openEdit}
          onToggle={handleToggle}
        />
      </div>
      <RedirectDrawer
        key={editingRedirect?.id ?? "new-redirect"}
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
        isSaving={isSaving}
        onSave={handleSave}
      />
    </AdminShell>
  )
}
