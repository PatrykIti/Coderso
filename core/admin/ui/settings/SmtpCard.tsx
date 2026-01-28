import { Server } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function SmtpCard() {
  return (
    <Card className="border-muted/60">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-4 w-4 text-primary" />
          SMTP Server Configuration
        </CardTitle>
        <CardDescription>Define your outgoing mail server parameters.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="smtp-host"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              SMTP Host
            </label>
            <Input
              id="smtp-host"
              placeholder="smtp.example.com"
              defaultValue="smtp.postmarkapp.com"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="smtp-port"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Port
            </label>
            <Input id="smtp-port" placeholder="587" defaultValue="587" />
          </div>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="smtp-encryption"
            className="text-xs font-semibold uppercase text-muted-foreground"
          >
            Encryption Protocol
          </label>
          <Select defaultValue="starttls">
            <SelectTrigger id="smtp-encryption" className="w-full">
              <SelectValue placeholder="Select encryption" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starttls">STARTTLS</SelectItem>
              <SelectItem value="ssl-tls">SSL/TLS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="smtp-username"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Username
            </label>
            <Input id="smtp-username" placeholder="smtp-user" defaultValue="api-token-7x92" />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="smtp-password"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Password
            </label>
            <Input
              id="smtp-password"
              type="password"
              placeholder="password"
              defaultValue="password123"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
