import { Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const frequencyOptions = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
] as const;

const activeFrequency = "daily";

export function BackupScheduleCard() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="space-y-2">
          <CardTitle className="text-base">Backup Schedule</CardTitle>
          <CardDescription>
            Configure automated backups for your database and assets.
          </CardDescription>
        </div>
        <CardAction>
          <Badge
            variant="outline"
            className="gap-2 rounded-full border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Auto-backup active
          </Badge>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Frequency
            </p>
            <div className="flex gap-2 rounded-lg bg-muted/60 p-1">
              {frequencyOptions.map((option) => {
                const isActive = option.id === activeFrequency;
                return (
                  <Button
                    key={option.id}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex-1 rounded-md",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    )}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Storage Target
            </p>
            <Select defaultValue="s3">
              <SelectTrigger className="w-full">
                <Database className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Storage target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="s3">Cloud Storage (S3)</SelectItem>
                <SelectItem value="local">Local Storage</SelectItem>
                <SelectItem value="drive">Google Drive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" className="w-full">
              Update Schedule
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
