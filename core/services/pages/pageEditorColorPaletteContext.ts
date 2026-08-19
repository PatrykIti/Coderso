// TASK-481-03-L01: shared live site-palette context for the page editor. The
// provider lives in PageEditorRoot.tsx and wraps the WHOLE editor body (canvas +
// floating rail), so both the block-level color controls
// (PageEditorRegistryFields) and the inline (per-fragment) text-color toolbar
// inside the canvas read the LIVE site palette instead of a static default.
//
// This is the first React module in the Bun-free core/services layer; it stays
// dependency-free (react createContext/useContext only, no DB/settings/runtime
// coupling) so Vitest can import it without env side effects. The palette
// builder itself stays owned by pageEditorControlUiModel (sole writer
// TASK-539-03-L01); this module only shares the context/hook pair.

import { createContext, useContext } from "react";
import { getPageEditorColorPalette, type PageEditorColorSwatch } from "./pageEditorControlUiModel";

export const PageEditorColorPaletteContext = createContext<readonly PageEditorColorSwatch[]>(
  getPageEditorColorPalette()
);

export const usePageEditorColorPalette = (): readonly PageEditorColorSwatch[] =>
  useContext(PageEditorColorPaletteContext);
