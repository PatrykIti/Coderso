import { MoreHorizontal } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const users = [
  {
    id: "sarah",
    name: "Sarah Jenks",
    email: "sarah@coderso.com",
    role: "Admin",
    status: "active" as const,
    lastActive: "2 mins ago",
  },
  {
    id: "michael",
    name: "Michael Chen",
    email: "m.chen@coderso.com",
    role: "Editor",
    status: "inactive" as const,
    lastActive: "Yesterday",
  },
  {
    id: "dev-bot",
    name: "Dev Bot",
    email: "bot@coderso.com",
    role: "API Access",
    status: "active" as const,
    lastActive: "10 mins ago",
  },
  {
    id: "alex",
    name: "Alex Morgan",
    email: "alex@coderso.com",
    role: "Viewer",
    status: "pending" as const,
    lastActive: "Pending invite",
  },
];

const statusMeta = {
  active: {
    label: "Active",
    className: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    className: "text-slate-500",
    dot: "bg-slate-400",
  },
  pending: {
    label: "Pending",
    className: "text-amber-600",
    dot: "bg-amber-500",
  },
};

const roleBadges: Record<string, string> = {
  Admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Editor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Viewer: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  "API Access": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
};

export function UsersTable() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, index) => {
            const status = statusMeta[user.status];
            return (
              <TableRow
                key={user.id}
                className={cn(
                  index === 0 && "border-l-4 border-l-primary bg-primary/5"
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {user.name
                          .split(" ")
                          .map((chunk) => chunk[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={roleBadges[user.role]}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", status.dot)} />
                    <span className={cn("text-sm", status.className)}>
                      {status.label}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.lastActive}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem>View profile</DropdownMenuItem>
                      <DropdownMenuItem>Edit role</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">
                        Disable user
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
