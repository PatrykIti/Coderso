import { Info, Plus, Search, Save } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { PermissionsMatrix } from "./PermissionsMatrix";
import { RoleEditor } from "./RoleEditor";
import type { RoleDraft } from "./types";

function PermissionsMatrixSearch() {
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search permissions..." className="pl-9" />
    </div>
  );
}

export function PermissionsMatrixPage() {
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);

  const handleSaveRole = (_draft: RoleDraft) => {
    setRoleEditorOpen(false);
  };

  return (
    <AdminShell
      activeHref="/admin/roles"
      breadcrumbs={
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground">
            Permissions Matrix
          </span>
          <span className="text-xs text-muted-foreground">
            Manage access across roles and admin modules.
          </span>
        </div>
      }
      search={<PermissionsMatrixSearch />}
      topbarActions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setRoleEditorOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Role
        </Button>
      }
      contentClassName="p-0"
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 pb-28">
            <PermissionsMatrix />
          </div>
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/80 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>
                Unsaved changes detected in Editor and Contributor roles.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                Cancel
              </Button>
              <Button size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </div>
      <RoleEditor
        open={roleEditorOpen}
        onOpenChange={setRoleEditorOpen}
        onSave={(draft) => handleSaveRole(draft)}
      />
    </AdminShell>
  );
}
