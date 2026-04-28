import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SecurityPolicyCardProps = {
  title: string;
  description?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SecurityPolicyCard({
  title,
  description,
  icon,
  action,
  children,
  className,
}: SecurityPolicyCardProps) {
  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="flex flex-row items-start gap-3 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
          {icon}
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}
