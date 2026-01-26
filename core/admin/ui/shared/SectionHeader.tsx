import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}
