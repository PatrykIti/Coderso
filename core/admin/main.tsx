import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import { AdminApp } from "./app/AdminApp";
import { AdminRouterProvider } from "./ui/contexts/AdminRouterContext";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  const initialPath =
    window.location.pathname + window.location.search + window.location.hash;
  root.render(
    <StrictMode>
      <AdminRouterProvider initialPath={initialPath}>
        <AdminApp />
      </AdminRouterProvider>
    </StrictMode>
  );
}
