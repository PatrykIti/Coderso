import { PageHeader } from "@/ui/shared/PageHeader";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

import { resolveContentTypeIdFromPath } from "./pathResolvers";

export function CollectionWorkspacePage() {
  const { path } = useAdminRouter();
  const contentTypeId = resolveContentTypeIdFromPath(path);

  return (
    <main className="min-h-screen bg-background px-6 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          title="Collection workspace"
          description={contentTypeId ? `Collection ${contentTypeId}` : "Collection"}
        />
      </div>
    </main>
  );
}
