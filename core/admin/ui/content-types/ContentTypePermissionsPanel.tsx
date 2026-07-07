// TASK-513-04: the editor's 4th tab ("Permissions") — a per-content-type role × capability
// matrix persisted in `config.permissions` (513-01). Presentational only: it loads the admin
// role list INTERNALLY and emits normalize-clean matrices via the pure helper; persistence is
// 513-03's Save → 513-01 envelope. No route/DB code here.
//
// Grid orientation (transpose vs core/admin/ui/roles/PermissionsMatrix.tsx): that canonical
// matrix orients roles across COLUMNS with permission rows. This panel is the transpose —
// rows = roles, columns = the fixed 5-capability allowlist — because the capability set is a
// fixed 5-column axis while roles are the variable-length axis (one row per role reads better
// and scales with workspace roles). Same primitives (Table* + Checkbox) + Type-settings tokens
// (SectionCard) so it matches both the roles-matrix interaction language and the editor idiom.
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAdminRoles, type AdminRole } from "@/services/adminRolesClient";

import { SectionCard } from "@/ui/shared/SectionCard";
import {
  CAPABILITIES,
  resolveRoleCapabilities,
  toggleCapability,
  type Capability,
  type PermissionsMatrix,
} from "./contentTypePermissions";

// Capability labels — local, keyed by the CAPABILITIES allowlist (the render NEVER iterates a
// cap set other than CAPABILITIES; Security Contract).
const CAP_LABELS: Record<Capability, string> = {
  read: "Read",
  create: "Create",
  update: "Update",
  delete: "Delete",
  publish: "Publish",
};

export type ContentTypePermissionsPanelProps = {
  permissions: PermissionsMatrix | undefined;
  onChange: (next: PermissionsMatrix) => void;
  disabled?: boolean;
};

export function ContentTypePermissionsPanel({
  permissions,
  onChange,
  disabled,
}: ContentTypePermissionsPanelProps) {
  const [roles, setRoles] = useState<AdminRole[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped by "Retry" to re-run the fetch effect; the effect never synthesizes a role list.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let live = true;
    listAdminRoles()
      .then((r) => {
        if (live) {
          setRoles(Array.isArray(r) ? r : []);
          setError(null);
        }
      })
      .catch(() => {
        if (live) {
          setRoles([]);
          setError("roles_load_failed");
        }
      });
    return () => {
      live = false;
    };
  }, [reloadToken]);

  const note =
    "Configure which roles can act on entries of this content type. Unset = inherit the global role permission.";

  // Loading: fetch pending (roles === null and no error).
  if (roles === null) {
    return (
      <SectionCard title="Permissions" description={note}>
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          Loading roles…
        </p>
      </SectionCard>
    );
  }

  // Error: do NOT synthesize roles — surface a retry that re-runs the fetch effect.
  if (error) {
    return (
      <SectionCard title="Permissions" description={note}>
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">Could not load roles.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Reset to the loading state in the event handler (not the effect body) then
              // re-run the fetch effect via the reload token.
              setRoles(null);
              setError(null);
              setReloadToken((token) => token + 1);
            }}
          >
            Retry
          </Button>
        </div>
      </SectionCard>
    );
  }

  // Empty: roles fetched but none exist.
  if (roles.length === 0) {
    return (
      <SectionCard title="Permissions" description={note}>
        <p className="text-sm text-muted-foreground">No roles yet.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Permissions"
      description={note}
      action={
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange({})}>
          Reset to defaults
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            {CAPABILITIES.map((cap) => (
              <TableHead key={cap} className="text-center">
                {CAP_LABELS[cap]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => {
            // Matrix key = role.id (stable identifier). resolveRoleCapabilities returns a copy.
            const caps = resolveRoleCapabilities(permissions, role.id);
            return (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                {CAPABILITIES.map((cap) => (
                  <TableCell key={cap} className="text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={caps[cap] === true}
                        disabled={disabled}
                        aria-label={`${CAP_LABELS[cap]} for ${role.name}`}
                        onCheckedChange={(next) =>
                          onChange(toggleCapability(permissions, role.id, cap, next === true))
                        }
                      />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </SectionCard>
  );
}
