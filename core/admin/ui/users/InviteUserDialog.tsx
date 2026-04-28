import { useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import type { RoleSummary } from "../roles/types";

const permissionPreviewItems = [
  {
    id: "content",
    permission: "content:write",
    allowLabel: "Can create and edit content",
    denyLabel: "Cannot create or edit content",
  },
  {
    id: "media",
    permission: "media:write",
    allowLabel: "Can manage media assets",
    denyLabel: "Cannot manage media assets",
  },
  {
    id: "publish",
    permission: "content:publish",
    allowLabel: "Can publish updates to staging",
    denyLabel: "Cannot publish updates to staging",
  },
  {
    id: "billing",
    permission: "settings:write",
    allowLabel: "Can manage billing or workspace settings",
    denyLabel: "Cannot manage billing or workspace settings",
  },
];

export type InviteUserValues = {
  name: string;
  email: string;
  roleId: string;
};

export type InviteUserDialogProps = {
  open: boolean;
  roles: RoleSummary[];
  onOpenChange: (open: boolean) => void;
  onInvite?: (values: InviteUserValues) => void;
};

export function InviteUserDialog({
  open,
  roles,
  onOpenChange,
  onInvite,
}: InviteUserDialogProps) {
  const defaultRoleId = useMemo(() => {
    const preferredRole = roles.find((role) => role.id === "editor");
    return preferredRole?.id ?? roles[0]?.id ?? "";
  }, [roles]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(defaultRoleId);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === roleId),
    [roleId, roles]
  );

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && roleId.length > 0;

  const hasPermission = (permission: string) =>
    Boolean(
      selectedRole?.permissions.includes("*") ||
        selectedRole?.permissions.includes(permission)
    );

  const handleClose = () => onOpenChange(false);

  const handleSend = () => {
    if (!canSubmit) return;
    onInvite?.({
      name: name.trim(),
      email: email.trim(),
      roleId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="left-auto right-0 top-0 h-full max-h-screen w-full max-w-md translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-l p-0 shadow-2xl sm:max-w-md"
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-5 text-left">
          <div>
            <DialogTitle className="text-lg">Invite User</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new member to your workspace
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Close invite user dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-6 px-6 py-6">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                User Details
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="invite-user-name"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Full Name
                  </label>
                  <Input
                    id="invite-user-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. John Doe"
                    className="bg-muted/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="invite-user-email"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Email Address
                  </label>
                  <Input
                    id="invite-user-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="john@example.com"
                    className="bg-muted/40"
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Access & Role
              </p>
              <div className="space-y-1.5">
                <label
                  htmlFor="invite-user-role"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Workspace Role
                </label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger
                    id="invite-user-role"
                    className="w-full bg-muted/40"
                  >
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold">Permissions Preview</p>
              </div>
              <ul className="mt-3 space-y-2">
                {permissionPreviewItems.map((item) => {
                  const allowed = hasPermission(item.permission);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      {allowed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/50" />
                      )}
                      <span>
                        {allowed ? item.allowLabel : item.denyLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </ScrollArea>
        <div className="border-t px-6 py-5">
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleSend} disabled={!canSubmit}>
              Send Invitation
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
