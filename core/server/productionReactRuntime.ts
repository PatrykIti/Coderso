import { createRequire } from "node:module";
import { jsx } from "react/jsx-runtime";

type ProductionJsxDevRuntime = {
  jsxDEV?: typeof jsx;
};

const require = createRequire(import.meta.url);
const jsxDevRuntime = require("react/jsx-dev-runtime") as ProductionJsxDevRuntime;

// Bun 1.3.14 emits jsxDEV for runtime TSX, while React 19 production leaves it undefined.
// Delegate to React's production JSX factory to preserve production element semantics.
jsxDevRuntime.jsxDEV ??= jsx;
