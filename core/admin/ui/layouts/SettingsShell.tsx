import { cn } from "@/lib/utils";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { SettingsDirtyNavigationProvider } from "@/ui/settings/SettingsDirtyNavigation";

type SettingsShellProps = {
  sidebar: React.ReactNode;
  preview?: React.ReactNode;
  children: React.ReactNode;
  sidebarClassName?: string;
  previewClassName?: string;
} & React.ComponentProps<typeof AdminShell>;

export function SettingsShell({
  sidebar,
  preview,
  children,
  sidebarClassName,
  previewClassName,
  ...props
}: SettingsShellProps) {
  return (
    <AdminShell contentClassName="p-0 overflow-hidden" {...props}>
      <SettingsDirtyNavigationProvider>
        <div className="flex h-full min-h-0 min-h-[calc(100vh-4rem)] overflow-hidden">
          <aside
            className={cn(
              "hidden h-full min-h-0 w-64 shrink-0 overflow-y-auto overscroll-contain border-r border-[var(--admin-base-border)] bg-[var(--admin-card-bg)] lg:block",
              sidebarClassName
            )}
          >
            {sidebar}
          </aside>
          <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[var(--admin-base-surface)]">
            <div className="shrink-0 border-b border-[var(--admin-base-border)] bg-[var(--admin-card-bg)] lg:hidden">
              {sidebar}
            </div>
            {children}
          </section>
          {preview ? (
            <aside
              className={cn(
                "hidden h-full min-h-0 w-[420px] shrink-0 overflow-y-auto overscroll-contain border-l border-[var(--admin-base-border)] bg-[var(--admin-card-bg)] xl:block",
                previewClassName
              )}
            >
              {preview}
            </aside>
          ) : null}
        </div>
      </SettingsDirtyNavigationProvider>
    </AdminShell>
  );
}
