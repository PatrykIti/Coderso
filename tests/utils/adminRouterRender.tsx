import React from "react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { AdminRouterProvider } from "../../core/admin/ui/contexts/AdminRouterContext";

type RenderAdminUiOptions = {
  path?: string;
};

export const renderAdminUi = (
  node: ReactNode,
  options: RenderAdminUiOptions = {}
) => {
  const { path = "/admin" } = options;
  return renderToString(
    <AdminRouterProvider initialPath={path}>{node}</AdminRouterProvider>
  );
};
