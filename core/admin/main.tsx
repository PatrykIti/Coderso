import { Fragment, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import { AdminApp } from "./app/AdminApp";
import { AdminRouterProvider } from "./ui/contexts/AdminRouterContext";
import { shouldEnableAdminStrictMode } from "./utils/strictMode";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  const initialPath =
    window.location.pathname + window.location.search + window.location.hash;
  const RootMode = shouldEnableAdminStrictMode({
    DEV: Boolean(import.meta.env.DEV),
    VITE_ADMIN_STRICT_MODE: import.meta.env.VITE_ADMIN_STRICT_MODE,
  })
    ? StrictMode
    : Fragment;
  root.render(
    <RootMode>
      <AdminRouterProvider initialPath={initialPath}>
        <AdminApp />
      </AdminRouterProvider>
    </RootMode>
  );
}
