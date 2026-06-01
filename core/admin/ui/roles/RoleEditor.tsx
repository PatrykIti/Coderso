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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";

import type { PermissionGroup } from "@/services/adminRolesClient";

import type { RoleDraft, RoleSummary } from "./types";
import { fallbackPermissionGroups } from "./permissionCatalog";
import { classifyRolePermissionChange, type RolePermissionChangeRisk } from "./rolePermissionRisk";

const emptyRole: RoleDraft = {
  name: "",
  description: "",
  permissions: [],
};

type PermissionConfirmationRequest = {
  kind: "apply" | "save";
  nextDraft: RoleDraft;
  fullAccess: boolean;
  risk: RolePermissionChangeRisk;
};

export type RoleEditorProps = {
  open: boolean;
  role?: RoleSummary | null;
  canManageRoles?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: RoleDraft, mode: "create" | "edit") => void;
  permissionGroups?: PermissionGroup[];
};

export function RoleEditor({
  open,
  role,
  canManageRoles = true,
  onOpenChange,
  onSave,
  permissionGroups,
}: RoleEditorProps) {
  const resolvedGroups =
    permissionGroups && permissionGroups.length > 0 ? permissionGroups : fallbackPermissionGroups;

  const allPermissions = useMemo(
    () => resolvedGroups.flatMap((group) => group.permissions.map((permission) => permission.id)),
    [resolvedGroups]
  );

  const initialFullAccess = role?.permissions.includes("*") ?? false;
  const initialDraft: RoleDraft = role
    ? {
        name: role.name,
        description: role.description ?? "",
        permissions: initialFullAccess ? allPermissions : role.permissions,
      }
    : emptyRole;

  const [draft, setDraft] = useState<RoleDraft>(initialDraft);
  const [fullAccess, setFullAccess] = useState(initialFullAccess);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PermissionConfirmationRequest | null>(null);
  const [confirmedRiskSignature, setConfirmedRiskSignature] = useState<string | null>(null);

  const isValid = draft.name.trim().length > 0;
  const mode: "create" | "edit" = role ? "edit" : "create";
  const sourcePermissions = role?.permissions ?? [];

  const buildRiskSignature = (risk: RolePermissionChangeRisk) =>
    risk.requiresConfirmation
      ? [risk.fullAccessPromotion ? "full-access" : "", ...risk.addedHighRiskPermissions]
          .filter(Boolean)
          .join("|")
      : null;

  const applyPermissionDraft = (nextDraft: RoleDraft, nextFullAccess: boolean) => {
    setDraft(nextDraft);
    setFullAccess(nextFullAccess);
  };

  const submitRole = (nextDraft: RoleDraft, nextFullAccess: boolean) => {
    onSave(
      {
        ...nextDraft,
        permissions: nextFullAccess ? ["*"] : nextDraft.permissions,
      },
      mode
    );
    onOpenChange(false);
  };

  const requestPermissionChange = (nextDraft: RoleDraft, nextFullAccess: boolean) => {
    if (!canManageRoles) return;
    const risk = classifyRolePermissionChange({
      beforePermissions: sourcePermissions,
      nextPermissions: nextFullAccess ? ["*"] : nextDraft.permissions,
      allPermissionIds: allPermissions,
    });
    const riskSignature = buildRiskSignature(risk);
    if (riskSignature && confirmedRiskSignature !== riskSignature) {
      setPendingConfirmation({
        kind: "apply",
        nextDraft,
        fullAccess: nextFullAccess,
        risk,
      });
      return;
    }
    if (!riskSignature) setConfirmedRiskSignature(null);
    applyPermissionDraft(nextDraft, nextFullAccess);
  };

  const togglePermission = (permissionId: string) => {
    if (!canManageRoles || pendingConfirmation) return;
    const exists = draft.permissions.includes(permissionId);
    requestPermissionChange(
      {
        ...draft,
        permissions: exists
          ? draft.permissions.filter((id) => id !== permissionId)
          : [...draft.permissions, permissionId],
      },
      false
    );
  };

  const handleSelectAll = () => {
    if (pendingConfirmation) return;
    requestPermissionChange({ ...draft, permissions: allPermissions }, true);
  };

  const handleClearAll = () => {
    if (pendingConfirmation) return;
    setFullAccess(false);
    setDraft((prev) => ({ ...prev, permissions: [] }));
    setConfirmedRiskSignature(null);
  };

  const handleSave = () => {
    if (!isValid || !canManageRoles || pendingConfirmation) return;
    const risk = classifyRolePermissionChange({
      beforePermissions: sourcePermissions,
      nextPermissions: fullAccess ? ["*"] : draft.permissions,
      allPermissionIds: allPermissions,
    });
    const riskSignature = buildRiskSignature(risk);
    if (riskSignature && confirmedRiskSignature !== riskSignature) {
      setPendingConfirmation({
        kind: "save",
        nextDraft: draft,
        fullAccess,
        risk,
      });
      return;
    }
    submitRole(draft, fullAccess);
  };

  const handleConfirmPermissionRisk = () => {
    if (!pendingConfirmation) return;
    const request = pendingConfirmation;
    const riskSignature = buildRiskSignature(request.risk);
    setPendingConfirmation(null);
    setConfirmedRiskSignature(riskSignature);
    if (request.kind === "apply") {
      applyPermissionDraft(request.nextDraft, request.fullAccess);
      return;
    }
    submitRole(request.nextDraft, request.fullAccess);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setPendingConfirmation(null);
    onOpenChange(nextOpen);
  };

  const pendingTargetLabel = pendingConfirmation?.nextDraft.name.trim() || role?.name || "New role";
  const pendingHighRiskList = pendingConfirmation?.risk.addedHighRiskPermissions.join(", ");

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{role ? "Edit role" : "Create new role"}</DialogTitle>
            <DialogDescription>
              Define access rules for teams and automation workflows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Role name
                </label>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Editor"
                  disabled={!canManageRoles}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Description
                </label>
                <Textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Short summary of responsibilities"
                  rows={2}
                  disabled={!canManageRoles}
                />
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Permission scope</p>
                <p className="text-xs text-muted-foreground">
                  Select the capabilities this role can access.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {fullAccess ? "Full access" : `${draft.permissions.length} selected`}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={!canManageRoles || Boolean(pendingConfirmation)}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={!canManageRoles || Boolean(pendingConfirmation)}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {resolvedGroups.map((group) => (
                <div key={group.id} className="rounded-lg border p-4">
                  <p className="text-sm font-semibold">{group.label}</p>
                  <div className="mt-3 space-y-2">
                    {group.permissions.map((permission) => (
                      <label key={permission.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={draft.permissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                          disabled={!canManageRoles || fullAccess || Boolean(pendingConfirmation)}
                        />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {fullAccess ? (
              <Alert>
                <AlertTitle>Full access enabled</AlertTitle>
                <AlertDescription>
                  This role grants every permission. Use for admins only.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!isValid || !canManageRoles || Boolean(pendingConfirmation)}
              onClick={handleSave}
            >
              {role ? "Save role" : "Create role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmActionDialog
        open={Boolean(pendingConfirmation)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingConfirmation(null);
        }}
        title={
          pendingConfirmation?.risk.fullAccessPromotion
            ? "Confirm full access"
            : "Confirm high-risk permissions"
        }
        description={
          pendingConfirmation?.risk.fullAccessPromotion
            ? "This change grants the role every permission in the catalog."
            : "This change grants sensitive permissions to the role."
        }
        targetLabel={pendingTargetLabel}
        cancelLabel="Keep current permissions"
        confirmLabel="Confirm high-risk change"
        confirmingLabel="Confirming..."
        tone="warning"
        onConfirm={handleConfirmPermissionRisk}
      >
        {pendingConfirmation?.risk.fullAccessPromotion
          ? `Full access will grant ${allPermissions.length} permissions.`
          : `High-risk permissions: ${pendingHighRiskList}.`}
      </ConfirmActionDialog>
    </>
  );
}
