import { cn } from "@/lib/utils";
import { AdminShell } from "@/ui/layouts/AdminShell";

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
    <AdminShell contentClassName="p-0" {...props}>
      <div className="flex h-full min-h-[calc(100vh-4rem)]">
        <aside
          className={cn(
            "hidden w-64 shrink-0 border-r bg-background lg:block",
            sidebarClassName
          )}
        >
          {sidebar}
        </aside>
        <section className="min-w-0 flex-1 bg-muted/30">{children}</section>
        {preview ? (
          <aside
            className={cn(
              "hidden w-[420px] shrink-0 border-l bg-background xl:block",
              previewClassName
            )}
          >
            {preview}
          </aside>
        ) : null}
      </div>
    </AdminShell>
  );
}
