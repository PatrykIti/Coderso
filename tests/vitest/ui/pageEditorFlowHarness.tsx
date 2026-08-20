import React from "react";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import { useAdminRouter } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { pageEditorState } from "./pageEditorFlowTestUtils";

export function PageEditorNavigationHarness() {
  const router = useAdminRouter();

  return (
    <div>
      <span data-testid="admin-path">{router.path}</span>
      <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
      <button type="button" onClick={() => router.navigate("/admin/pages")}>
        Go pages
      </button>
    </div>
  );
}
