import { renderToString } from "react-dom/server";

import { AdminApp } from "./app/AdminApp";
import { AdminRouterProvider } from "./ui/contexts/AdminRouterContext";

export function render(path: string) {
  return renderToString(
    <AdminRouterProvider initialPath={path}>
      <AdminApp path={path} />
    </AdminRouterProvider>
  );
}
