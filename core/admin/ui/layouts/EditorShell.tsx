import { cn } from "@/lib/utils";
import { AdminShell } from "@/ui/layouts/AdminShell";

type EditorShellProps = {
  leftPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
  leftPanelClassName?: string;
  rightPanelClassName?: string;
} & React.ComponentProps<typeof AdminShell>;

export function EditorShell({
  leftPanel,
  rightPanel,
  children,
  leftPanelClassName,
  rightPanelClassName,
  ...props
}: EditorShellProps) {
  return (
    <AdminShell contentClassName="p-0" {...props}>
      <div className="flex h-full min-h-[calc(100vh-4rem)]">
        <aside
          className={cn(
            "hidden w-72 shrink-0 border-r bg-background lg:block",
            leftPanelClassName
          )}
        >
          {leftPanel}
        </aside>
        <section className="min-w-0 flex-1 bg-muted/20">{children}</section>
        {rightPanel ? (
          <aside
            className={cn(
              "hidden w-80 shrink-0 border-l bg-background lg:block",
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
