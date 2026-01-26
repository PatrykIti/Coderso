import { Lock, Mail, ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export function UserDetailsDrawer() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>SJ</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">Sarah Jenks</h3>
            <p className="text-xs text-muted-foreground">sarah@nextless.com</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          Admin
        </Badge>
      </div>
      <Separator className="my-4" />
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Last active
            </p>
            <p className="mt-1 text-sm font-medium">2 minutes ago</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Permissions summary
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">24 permissions</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Manage users & roles</li>
                <li>Edit content models</li>
                <li>Publish pages</li>
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email notifications
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Weekly summary</p>
                <p className="text-xs text-muted-foreground">
                  Digest of changes and alerts
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Security alerts</p>
                <p className="text-xs text-muted-foreground">
                  Login + permission changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Account controls
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Two-factor authentication is enabled.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
      <Separator className="my-4" />
      <div className="space-y-2">
        <Button className="w-full">Edit permissions</Button>
        <Button variant="outline" className="w-full">
          Reset password
        </Button>
      </div>
    </div>
  );
}
