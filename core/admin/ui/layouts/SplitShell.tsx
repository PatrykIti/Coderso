import { cn } from "@/lib/utils";
import { AdminShell } from "@/ui/layouts/AdminShell";

type SplitShellProps = {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelClassName?: string;
} & React.ComponentProps<typeof AdminShell>;

export function SplitShell({
  children,
  rightPanel,
  rightPanelClassName,
  ...props
}: SplitShellProps) {
  return (
    <AdminShell {...props}>
      <div className="flex h-full min-h-0 gap-6">
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
        {rightPanel ? (
          <aside
            className={cn(
              "hidden min-h-0 w-90 shrink-0 border-l border-[var(--admin-base-border)] bg-[var(--admin-card-bg)] px-6 py-4 lg:block",
              rightPanelClassName
            )}
          >
            {rightPanel}
          </aside>
        ) : null}
      </div>
    </AdminShell>
  );
}
