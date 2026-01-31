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
import { Switch } from "@/components/ui/switch";

type SmtpCardProps = {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  password: string;
  passwordConfigured: boolean;
  updatePassword: boolean;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onSecureChange: (value: boolean) => void;
  onUserChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: (value: boolean) => void;
};

export function SmtpCard({
  host,
  port,
  secure,
  user,
  password,
  passwordConfigured,
  updatePassword,
  onHostChange,
  onPortChange,
  onSecureChange,
  onUserChange,
  onPasswordChange,
  onTogglePassword,
}: SmtpCardProps) {
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
              value={host}
              onChange={(event) => onHostChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="smtp-port"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Port
            </label>
            <Input
              id="smtp-port"
              placeholder="587"
              value={port}
              onChange={(event) => onPortChange(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="smtp-encryption"
            className="text-xs font-semibold uppercase text-muted-foreground"
          >
            Encryption Protocol
          </label>
          <Select
            value={secure ? "ssl-tls" : "starttls"}
            onValueChange={(value) => onSecureChange(value === "ssl-tls")}
          >
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
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              SMTP Password
            </p>
            <p className="text-sm font-semibold">
              {passwordConfigured ? "Stored" : "Not configured"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Update</span>
            <Switch checked={updatePassword} onCheckedChange={onTogglePassword} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="smtp-username"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Username
            </label>
            <Input
              id="smtp-username"
              placeholder="smtp-user"
              value={user}
              onChange={(event) => onUserChange(event.target.value)}
            />
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
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              disabled={!updatePassword}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
