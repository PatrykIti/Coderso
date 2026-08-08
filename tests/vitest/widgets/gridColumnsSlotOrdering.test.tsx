import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { GridColumnsBlock, type GridColumnsData } from "../../../core/widgets/core/gridColumns";

test("grid columns render live slots in authored order and preserve an orphan last", () => {
  const data: GridColumnsData = {
    columns: [
      { id: "tall", label: "Tall", desktopSpan: "5" },
      { id: "default", label: "Default", desktopSpan: "4" },
      { id: "warm", label: "Warm", desktopSpan: "3" },
    ],
  };
  const html = renderToString(
    <GridColumnsBlock
      data={data}
      variant="asymmetric"
      slots={{
        "column:tall": [{ id: "tall-child", type: "stub", data: {} }],
        "column:warm": [{ id: "warm-child", type: "stub", data: {} }],
        "column:orphan": [{ id: "orphan-child", type: "stub", data: {} }],
        "column:default": [{ id: "default-child", type: "stub", data: {} }],
      }}
      renderBlock={(block) => <span data-child-id={block.id}>{block.id}</span>}
    />
  );

  const renderedSlots = [...html.matchAll(/data-grid-column="([^"]+)"/g)].map((match) => match[1]);
  const renderedChildren = [...html.matchAll(/data-child-id="([^"]+)"/g)].map((match) => match[1]);

  expect(renderedSlots).toEqual(["column:tall", "column:default", "column:warm", "column:orphan"]);
  expect(renderedChildren).toEqual(["tall-child", "default-child", "warm-child", "orphan-child"]);
});
