import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import type { RoleSummary } from "../roles/types";
import type { UserDraft, UserStatus, UserSummary } from "./types";

const emptyDraft: UserDraft = {
  name: "",
  email: "",
  roleIds: [],
  status: "pending",
};

const statusLabels: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
};

export type UserEditorProps = {
  open: boolean;
  user?: UserSummary | null;
  roles: RoleSummary[];
  lockedRoleIds?: string[];
  canManageUsers?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: UserDraft, mode: "create" | "edit") => void;
};

export function UserEditor({
  open,
  user,
  roles,
  lockedRoleIds = [],
  canManageUsers = true,
  onOpenChange,
  onSave,
}: UserEditorProps) {
  const initialDraft: UserDraft = user
    ? {
        name: user.name,
        email: user.email,
        roleIds: user.roleIds,
        status: user.status,
      }
    : emptyDraft;

  const [draft, setDraft] = useState<UserDraft>(initialDraft);

  const lockedSet = useMemo(() => new Set(lockedRoleIds), [lockedRoleIds]);

  const isValid = draft.name.trim().length > 0 && draft.email.trim().length > 0;
  const mode: "create" | "edit" = user ? "edit" : "create";
  const hasLockedRole = draft.roleIds.some((roleId) => lockedSet.has(roleId));

  const handleToggleRole = (roleId: string) => {
    setDraft((prev) => {
      const isSelected = prev.roleIds.includes(roleId);
      if (isSelected && lockedSet.has(roleId)) {
        return prev;
      }
      return {
        ...prev,
        roleIds: isSelected
          ? prev.roleIds.filter((id) => id !== roleId)
          : [...prev.roleIds, roleId],
      };
    });
  };

  const handleSave = () => {
    if (!isValid || !canManageUsers) return;
    onSave(draft, mode);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Invite new user"}</DialogTitle>
          <DialogDescription>
            {user
              ? "Update profile details and access permissions."
              : "Add a teammate and assign the right role for access."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Name</label>
              <Input
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Full name"
                disabled={!canManageUsers}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
              <Input
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="name@company.com"
                disabled={!canManageUsers}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Status</label>
            <Select
              value={draft.status}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  status: value as UserStatus,
                }))
              }
              disabled={!canManageUsers || mode === "create"}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Assign roles</p>
                <p className="text-xs text-muted-foreground">
                  Users can have multiple roles and inherit permissions.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {draft.roleIds.length} selected
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {roles.map((role) => {
                const checked = draft.roleIds.includes(role.id);
                const locked = checked && lockedSet.has(role.id);
                return (
                  <label key={role.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => handleToggleRole(role.id)}
                      disabled={!canManageUsers || locked}
                    />
                    <div>
                      <p className="text-sm font-medium">{role.name}</p>
                      {role.description ? (
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          {hasLockedRole ? (
            <Alert>
              <AlertTitle>Primary admin protected</AlertTitle>
              <AlertDescription>
                The last admin account cannot lose its admin role until another admin is created.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!isValid || !canManageUsers} onClick={handleSave}>
            {user ? "Save changes" : "Invite user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
