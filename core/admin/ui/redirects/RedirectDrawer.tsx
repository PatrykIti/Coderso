import { Info, Link2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"

export type RedirectDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  redirect?: {
    from: string
    to: string
    type: "301" | "302"
    active: boolean
  } | null
}

export function RedirectDrawer({
  open,
  onOpenChange,
  mode,
  redirect,
}: RedirectDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-[360px] flex-col p-0 sm:w-[420px]"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Link2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {mode === "create" ? "New Redirect" : "Edit Redirect"}
              </p>
              <p className="text-xs text-muted-foreground">
                Define where traffic should go.
              </p>
            </div>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close redirect drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-6 py-6">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Path configuration
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label
                    htmlFor="redirect-source"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Source URL path
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      /
                    </span>
                    <Input
                      id="redirect-source"
                      placeholder="old-page-link"
                      className="pl-6"
                      defaultValue={redirect?.from ?? ""}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The relative path you want to redirect from.
                  </p>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="redirect-destination"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Destination URL
                  </label>
                  <Input
                    id="redirect-destination"
                    placeholder="https://... or /new-path"
                    defaultValue={redirect?.to ?? ""}
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Type and status
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="redirect-type"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Redirect type
                  </label>
                  <Select defaultValue={redirect?.type ?? "301"}>
                    <SelectTrigger id="redirect-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="301">301 - Permanent</SelectItem>
                      <SelectItem value="302">302 - Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="redirect-active"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Active status
                  </label>
                  <div className="flex h-10 items-center gap-2">
                    <Switch id="redirect-active" defaultChecked={redirect?.active ?? true} />
                    <span className="text-sm text-muted-foreground">
                      Enabled
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground">SEO tip</p>
                  <p className="text-xs text-muted-foreground">
                    Use 301 redirects for permanent changes to pass ranking power
                    to the new URL.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="border-t bg-muted/30 px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button>{mode === "create" ? "Add redirect" : "Save changes"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
