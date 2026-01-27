import { renderToString } from "react-dom/server";

import { AdminApp } from "./app/AdminApp";

export function render(path: string) {
  return renderToString(<AdminApp path={path} />);
}
