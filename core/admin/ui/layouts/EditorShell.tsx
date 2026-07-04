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
  // TASK-479-06-L05: "panels" (default) keeps the existing 3-pane side-rail
  // layout; "canvas" hosts a single full-height surface that fills the center
  // region. The shared `shared/CanvasEditor` editor-chrome shell (TASK-496-01,
  // now wired into the Pages + Page-Templates builder branch; Screens via
  // TASK-496-02) renders such a surface. Additive, backward compatible —
  // existing editors stay on "panels".
  variant?: "panels" | "canvas";
} & React.ComponentProps<typeof AdminShell>;

export function EditorShell({
  leftPanel,
  rightPanel,
  children,
  leftPanelClassName,
  rightPanelClassName,
  centerScroll = true,
  centerPanelClassName,
  variant = "panels",
  contentClassName,
  ...props
}: EditorShellProps) {
  if (variant === "canvas") {
    return (
      <AdminShell contentClassName={cn("p-0 overflow-hidden", contentClassName)} {...props}>
        <div
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--admin-base-surface)]"
          data-editor-shell-canvas="true"
        >
          {children}
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell contentClassName={cn("p-0 overflow-hidden", contentClassName)} {...props}>
      <div className="flex h-full min-h-0 overflow-hidden">
        {leftPanel ? (
          <aside
            className={cn(
              "hidden h-full min-h-0 w-72 shrink-0 border-r border-[var(--admin-base-border)] bg-[var(--admin-card-bg)] lg:flex",
              leftPanelClassName
            )}
            data-editor-shell-left-panel="true"
          >
            <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">{leftPanel}</div>
          </aside>
        ) : null}
        <section
          className="min-h-0 min-w-0 flex-1 bg-[var(--admin-base-surface)]"
          data-editor-shell-center="true"
        >
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
              "hidden h-full min-h-0 w-80 shrink-0 border-l border-[var(--admin-base-border)] bg-[var(--admin-card-bg)] lg:flex",
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
