import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StrengthRule = {
  label: string;
  met: boolean;
};

type PasswordStrengthListProps = {
  rules: StrengthRule[];
};

export function PasswordStrengthList({ rules }: PasswordStrengthListProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Password strength
        </p>
        <Badge variant="outline" className="text-[10px]">
          Live
        </Badge>
      </div>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border",
                rule.met
                  ? "border-emerald-400 bg-emerald-500/15 text-emerald-600"
                  : "border-muted-foreground/30 text-transparent"
              )}
            >
              <Check className="h-3 w-3" />
            </span>
            <span className="text-sm text-muted-foreground">{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
