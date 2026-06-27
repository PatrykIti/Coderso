import { Fragment } from "react";
import { Check, Minus, Plus, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLES = [
  { name: "Owner", members: 1 },
  { name: "Admin", members: 2 },
  { name: "Editor", members: 2 },
  { name: "Author", members: 2 },
  { name: "Viewer", members: 1 },
];

type PermRow = { label: string; allow: boolean[] };
type PermGroup = { group: string; rows: PermRow[] };

// allow order matches ROLES: [Owner, Admin, Editor, Author, Viewer]
const MATRIX: PermGroup[] = [
  {
    group: "Content",
    rows: [
      { label: "Read", allow: [true, true, true, true, true] },
      { label: "Create", allow: [true, true, true, true, false] },
      { label: "Publish", allow: [true, true, true, false, false] },
      { label: "Delete", allow: [true, true, false, false, false] },
    ],
  },
  {
    group: "Media",
    rows: [
      { label: "Read", allow: [true, true, true, true, true] },
      { label: "Upload", allow: [true, true, true, true, false] },
      { label: "Delete", allow: [true, true, true, false, false] },
    ],
  },
  {
    group: "Users",
    rows: [
      { label: "Read", allow: [true, true, true, false, false] },
      { label: "Invite", allow: [true, true, false, false, false] },
      { label: "Manage", allow: [true, true, false, false, false] },
    ],
  },
  {
    group: "Settings",
    rows: [
      { label: "Read", allow: [true, true, true, false, false] },
      { label: "Write", allow: [true, true, false, false, false] },
    ],
  },
  {
    group: "Billing",
    rows: [{ label: "Manage", allow: [true, false, false, false, false] }],
  },
];

export function PermissionsMatrixPage() {
  return (
    <div>
      <PageHeader
        title="Roles matrix"
        description="Compare exactly what each role can do across your workspace."
        icon={<ShieldCheck />}
        actions={
          <Button className="gap-1.5">
            <Plus className="size-4" /> New role
          </Button>
        }
      />

      <SectionCard
        title="Permissions"
        description="Owner has full access and cannot be restricted."
        bodyClassName="p-0"
        padded={false}
        action={
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" /> Allowed
            </span>
            <span className="flex items-center gap-1.5">
              <Minus className="size-3.5 text-muted-foreground/40" /> No access
            </span>
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card">Permission</TableHead>
              {ROLES.map((role) => (
                <TableHead key={role.name} className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-foreground">{role.name}</span>
                    <Badge variant="outline" className="font-normal normal-case">
                      {role.members} {role.members === 1 ? "member" : "members"}
                    </Badge>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MATRIX.map((group) => (
              <Fragment key={group.group}>
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={ROLES.length + 1}
                    className="sticky left-0 z-10 bg-muted/40 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.group}
                  </TableCell>
                </TableRow>
                {group.rows.map((row) => (
                  <TableRow key={`${group.group}-${row.label}`}>
                    <TableCell className="sticky left-0 z-10 bg-card font-medium text-foreground">
                      {row.label}
                    </TableCell>
                    {row.allow.map((allowed, index) => (
                      <TableCell key={index} className="text-center">
                        {allowed ? (
                          <Check className="mx-auto size-4 text-primary" />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
