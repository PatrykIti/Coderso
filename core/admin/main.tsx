import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import { AdminApp } from "./app/AdminApp";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <AdminApp path={window.location.pathname} />
    </StrictMode>
  );
}
