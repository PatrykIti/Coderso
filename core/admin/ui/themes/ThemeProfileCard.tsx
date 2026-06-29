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

export function ThemeProfileCard({ profile, onEdit, onActivate }: ThemeProfileCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card",
        profile.isActive && "ring-2 ring-ring"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {profile.palette.map((color, index) => (
            <span
              key={`${profile.id}-color-${index}`}
              className="size-6 rounded-full border border-border shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        {profile.isActive ? (
          <Badge variant="success">
            <Check className="size-3" /> Active
          </Badge>
        ) : null}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{profile.name}</h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">{profile.description}</p>
        <p className="text-xs text-muted-foreground">
          Template: <span className="font-medium">{profile.templateName}</span>
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <Button size="icon-xs" variant="ghost" aria-label={`Edit ${profile.name}`} onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {profile.isActive ? (
          <Badge variant="secondary" className="px-2 text-[10px] uppercase tracking-wide">
            Current
          </Badge>
        ) : (
          <Button size="xs" variant="outline" onClick={onActivate}>
            <Check className="h-3 w-3" />
            Activate
          </Button>
        )}
      </div>
    </Card>
  );
}
