import { Copy, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ThemeProfile = {
  id: string;
  name: string;
  description: string;
  themeName: string;
  tokens?: Record<string, unknown>;
  palette: string[];
  icon: React.ReactNode;
  iconClassName: string;
  isActive?: boolean;
};

type ThemeCardProps = {
  theme: ThemeProfile;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onActivate?: () => void;
};

export function ThemeCard({
  theme,
  onEdit,
  onDuplicate,
  onActivate,
}: ThemeCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden border-border/60 p-0 transition-shadow hover:shadow-md",
        theme.isActive && "border-primary/60 shadow-lg ring-1 ring-primary/30"
      )}
    >
      <div className="relative border-b bg-muted/40 p-4">
        <div className="flex h-32 w-full flex-col gap-2 rounded-lg border bg-background p-4">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              theme.iconClassName
            )}
          >
            {theme.icon}
          </div>
          <div className="h-2 w-1/2 rounded bg-muted" />
          <div className="h-2 w-full rounded bg-muted/70" />
        </div>
        {theme.isActive ? (
          <Badge className="absolute right-3 top-3 text-[10px] uppercase tracking-wide">
            Active
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{theme.name}</h3>
          <p className="text-xs text-muted-foreground">{theme.description}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex -space-x-1">
            {theme.palette.map((color, index) => (
              <span
                key={`${theme.id}-color-${index}`}
                className="h-4 w-4 rounded-full border border-background shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Edit ${theme.name}`}
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Duplicate ${theme.name}`}
              onClick={onDuplicate}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {theme.isActive ? (
              <Badge
                variant="secondary"
                className="px-2 text-[10px] uppercase tracking-wide"
              >
                Current
              </Badge>
            ) : (
              <Button size="xs" variant="outline" onClick={onActivate}>
                Activate
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
