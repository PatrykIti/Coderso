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
    <AdminShell contentClassName="p-0 overflow-hidden" {...props}>
      <div className="flex h-full min-h-[calc(100vh-4rem)] min-h-0">
        <aside
          className={cn(
            "hidden w-72 shrink-0 border-r bg-background lg:flex",
            leftPanelClassName
          )}
        >
          <div className="flex h-full w-full flex-col overflow-y-auto">
            {leftPanel}
          </div>
        </aside>
        <section className="min-w-0 flex-1 bg-muted/20">
          <div className="flex h-full min-h-0 flex-col overflow-y-auto">
            {children}
          </div>
        </section>
        {rightPanel ? (
          <aside
            className={cn(
              "hidden w-80 shrink-0 border-l bg-background lg:flex",
              rightPanelClassName
            )}
          >
            <div className="flex h-full w-full flex-col overflow-y-auto">
              {rightPanel}
            </div>
          </aside>
        ) : null}
      </div>
    </AdminShell>
  );
}
