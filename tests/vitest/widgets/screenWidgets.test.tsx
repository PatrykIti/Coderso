import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ScreenFieldValueBlock } from "../../../core/widgets/core/screenFieldValue";
import { ScreenRecordHeaderBlock } from "../../../core/widgets/core/screenRecordHeader";
import { ScreenFieldGroupBlock } from "../../../core/widgets/core/screenFieldGroup";
import { ScreenTwoColumnBlock } from "../../../core/widgets/core/screenTwoColumn";

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

test("screen widget cleared frame styles omit forced surface classes", () => {
  const header = renderAdminUi(
    <ScreenRecordHeaderBlock
      variant="card"
      data={{
        title: "Record",
        style: {},
      }}
    />
  );
  expect(header).not.toContain("bg-gradient-to-br");
  expect(header).not.toContain("bg-background/70");

  const field = renderAdminUi(
    <ScreenFieldValueBlock
      variant="stacked"
      data={{
        label: "Status",
        value: "Open",
        style: {},
      }}
    />
  );
  expect(field).not.toContain("bg-background/70");

  const group = renderAdminUi(
    <ScreenFieldGroupBlock variant="card" data={{ title: "Group", style: {} }} />
  );
  expect(group).not.toContain("bg-background/80");

  const columns = renderAdminUi(
    <ScreenTwoColumnBlock
      variant="balanced"
      data={{ leftTitle: "Left", rightTitle: "Right", style: {} }}
    />
  );
  expect(columns).not.toContain("bg-background/60");
});
