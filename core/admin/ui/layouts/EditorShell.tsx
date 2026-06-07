import { cn } from "@/lib/utils";
import { AdminShell } from "@/ui/layouts/AdminShell";

type EditorShellProps = {
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
  leftPanelClassName?: string;
  rightPanelClassName?: string;
  centerScroll?: boolean;
  centerPanelClassName?: string;
} & React.ComponentProps<typeof AdminShell>;

export function EditorShell({
  leftPanel,
  rightPanel,
  children,
  leftPanelClassName,
  rightPanelClassName,
  centerScroll = true,
  centerPanelClassName,
  contentClassName,
  ...props
}: EditorShellProps) {
  return (
    <AdminShell contentClassName={cn("p-0 overflow-hidden", contentClassName)} {...props}>
      <div className="flex h-full min-h-0 overflow-hidden">
        {leftPanel ? (
          <aside
            className={cn(
              "hidden h-full min-h-0 w-72 shrink-0 border-r bg-background lg:flex",
              leftPanelClassName
            )}
            data-editor-shell-left-panel="true"
          >
            <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">{leftPanel}</div>
          </aside>
        ) : null}
        <section className="min-h-0 min-w-0 flex-1 bg-muted/20" data-editor-shell-center="true">
          <div
            className={cn(
              "flex h-full min-h-0 flex-col",
              centerScroll ? "overflow-y-auto" : "overflow-hidden",
              centerPanelClassName
            )}
          >
            {children}
          </div>
        </section>
        {rightPanel ? (
          <aside
            className={cn(
              "hidden h-full min-h-0 w-80 shrink-0 border-l bg-background lg:flex",
              rightPanelClassName
            )}
            data-editor-shell-right-panel="true"
          >
            <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">{rightPanel}</div>
          </aside>
        ) : null}
      </div>
    </AdminShell>
  );
}
