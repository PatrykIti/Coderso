import { Check, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AdminThemeProfileCard = {
  id: string;
  name: string;
  description: string;
  templateId: string;
  templateName: string;
  palette: string[];
  isActive?: boolean;
};

type ThemeProfileCardProps = {
  profile: AdminThemeProfileCard;
  onEdit?: () => void;
  onActivate?: () => void;
};

export function ThemeProfileCard({
  profile,
  onEdit,
  onActivate,
}: ThemeProfileCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden border-border/60 p-0 transition-shadow hover:shadow-md",
        profile.isActive && "border-primary/60 shadow-lg ring-1 ring-primary/30"
      )}
    >
      <div className="relative border-b bg-muted/40 p-4">
        <div className="flex h-28 w-full flex-col gap-2 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2">
            {profile.palette.map((color, index) => (
              <span
                key={`${profile.id}-color-${index}`}
                className="h-4 w-4 rounded-full border border-background shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="h-2 w-1/2 rounded bg-muted" />
          <div className="h-2 w-full rounded bg-muted/70" />
        </div>
        {profile.isActive ? (
          <Badge className="absolute right-3 top-3 text-[10px] uppercase tracking-wide">
            Active
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{profile.name}</h3>
          <p className="text-xs text-muted-foreground">{profile.description}</p>
          <p className="text-xs text-muted-foreground">
            Template: <span className="font-medium">{profile.templateName}</span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Edit ${profile.name}`}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {profile.isActive ? (
            <Badge
              variant="secondary"
              className="px-2 text-[10px] uppercase tracking-wide"
            >
              Current
            </Badge>
          ) : (
            <Button size="xs" variant="outline" onClick={onActivate}>
              <Check className="h-3 w-3" />
              Activate
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
