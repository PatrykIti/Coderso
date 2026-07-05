import { useAdminCan } from "@/ui/contexts/AdminAuthContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { DashboardBuilder } from "@/ui/dashboard/DashboardBuilder";

export function DashboardPage() {
  const can = useAdminCan();

  return (
    <AdminShell activeHref="/admin">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <PageHeader
          title="Dashboard"
          description="Operational view for content, security, storage, and traffic."
        />
        <DashboardBuilder canWrite={can("dashboard:write")} />
      </div>
    </AdminShell>
  );
}
