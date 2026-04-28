import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}
