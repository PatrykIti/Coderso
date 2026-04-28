import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const iconBaseClasses = "flex h-10 w-10 items-center justify-center rounded-xl";

export type LoginAlertsCardProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  iconWrapperClassName?: string;
  switchSize?: "default" | "sm";
};

export function LoginAlertsCard({
  title,
  description,
  icon,
  checked = true,
  onCheckedChange,
  disabled = false,
  className,
  contentClassName,
  iconWrapperClassName,
  switchSize = "default",
}: LoginAlertsCardProps) {
  const switchProps = onCheckedChange
    ? { checked, onCheckedChange }
    : { defaultChecked: checked };

  return (
    <Card className={cn("border-border/60 shadow-sm", className)}>
      <CardContent
        className={cn("flex items-start justify-between gap-4", contentClassName)}
      >
        <div className="flex gap-4">
          {icon ? (
            <div
              className={cn(
                iconBaseClasses,
                "bg-muted text-muted-foreground",
                iconWrapperClassName
              )}
            >
              {icon}
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch
          size={switchSize}
          disabled={disabled}
          {...switchProps}
          aria-label={`${title} toggle`}
        />
      </CardContent>
    </Card>
  );
}
