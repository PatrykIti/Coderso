import { MoreHorizontal, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { RoleSummary } from "./types";

export type RoleListProps = {
  roles: RoleSummary[];
  selectedId?: string;
  usageCounts?: Record<string, number>;
  canManageRoles?: boolean;
  onSelect: (id: string) => void;
  onEdit: (role: RoleSummary) => void;
  onDuplicate: (role: RoleSummary) => void;
  onDelete: (role: RoleSummary) => void;
};

export function RoleList({
  roles,
  selectedId,
  usageCounts = {},
  canManageRoles = true,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
}: RoleListProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {roles.map((role) => {
        const isSelected = selectedId === role.id;
        const usageCount = usageCounts[role.id] ?? 0;
        const isProtected = role.system || role.id === "admin";

        return (
          <Card
            key={role.id}
            className={cn(
              "transition-colors",
              isSelected && "border-primary/60 bg-primary/5"
            )}
            onClick={() => onSelect(role.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {role.name}
              </CardTitle>
              <CardDescription>{role.description}</CardDescription>
              <CardAction>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      disabled={!canManageRoles}
                      onClick={() => onEdit(role)}
                    >
                      Edit role
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canManageRoles}
                      onClick={() => onDuplicate(role)}
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={!canManageRoles || isProtected}
                      onClick={() => onDelete(role)}
                    >
                      Delete role
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {role.permissions.includes("*")
                    ? "Full access"
                    : `${role.permissions.length} permissions`}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {usageCount} assigned
                </Badge>
                {isProtected ? (
                  <Badge variant="secondary" className="text-xs">
                    System role
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {role.permissions.includes("*")
                  ? "Full platform access across all admin modules."
                  : "Scoped access across admin modules and actions."}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                disabled={!canManageRoles}
                onClick={() => onEdit(role)}
              >
                Configure permissions
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
