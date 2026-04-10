import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ScreenFieldValueBlock } from "../../../core/widgets/core/screenFieldValue";
import { ScreenRecordHeaderBlock } from "../../../core/widgets/core/screenRecordHeader";

test("ScreenFieldValueBlock stringifies primitive bound values", () => {
  const html = renderAdminUi(
    <ScreenFieldValueBlock
      variant="stacked"
      data={{
        label: "Area",
        value: 148 as unknown as string,
        helper: true as unknown as string,
        tone: "strong",
      }}
    />
  );

  expect(html).toContain("148");
  expect(html).toContain("true");
});

test("ScreenRecordHeaderBlock stringifies primitive bound metadata", () => {
  const html = renderAdminUi(
    <ScreenRecordHeaderBlock
      variant="card"
      data={{
        eyebrow: "Projects",
        title: 42 as unknown as string,
        subtitle: "Overview",
        description: false as unknown as string,
        badge: 3 as unknown as string,
        align: "start",
      }}
    />
  );

  expect(html).toContain("42");
  expect(html).toContain("false");
  expect(html).toContain("3");
});
