import { UserPlus, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { UserDetailsDrawer } from "./UserDetailsDrawer";
import { UserFilters } from "./UserFilters";
import { UsersTable } from "./UsersTable";

export function UsersRolesPage() {
  return (
    <SplitShell
      activeHref="/admin/users"
      rightPanel={<UserDetailsDrawer />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">Users & Roles</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader
          title="Users & Roles"
          description="Manage team access, roles, and platform permissions."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2">
                <UserCog className="h-4 w-4" />
                Create Role
              </Button>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            </div>
          }
        />
        <UserFilters />
        <UsersTable />
      </div>
    </SplitShell>
  );
}
