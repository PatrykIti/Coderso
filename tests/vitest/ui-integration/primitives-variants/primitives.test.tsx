// TASK-479-06-L07: shadcn primitive variant markers (L01 restyle). Static SSR
// markers via `renderAdminUi` -> `expect(html).toContain(...)`.

import { expect, test } from "vitest";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction } from "@/components/ui/card";

import { renderAdminUi } from "../../../utils/adminRouterRender";

const BUTTON_VARIANTS = [
  "default",
  "soft",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

const BUTTON_SIZES = [
  "default",
  "xs",
  "sm",
  "lg",
  "icon",
  "icon-xs",
  "icon-sm",
  "icon-lg",
] as const;

test.each(BUTTON_VARIANTS)("Button variant %s renders its data-variant marker", (v) => {
  const html = renderAdminUi(<Button variant={v}>x</Button>);
  expect(html).toContain(`data-variant="${v}"`);
});

test("the new soft button variant maps to the primary-soft surface", () => {
  const html = renderAdminUi(<Button variant="soft">x</Button>);
  expect(html).toContain("bg-primary-soft");
});

test("the default button keeps the --admin-button-primary token (chrome strategy)", () => {
  const html = renderAdminUi(<Button>x</Button>);
  expect(html).toContain("bg-[var(--admin-button-primary-bg)]");
});

// Guard: every PRE-EXISTING Button size still emits its data-size (no removed
// enum members) — sizes are additive over the old set.
test.each(BUTTON_SIZES)("Button size %s still emits its data-size marker", (s) => {
  const html = renderAdminUi(<Button size={s}>x</Button>);
  expect(html).toContain(`data-size="${s}"`);
});

test.each(["soft", "success", "warning", "info"] as const)(
  "Badge adds the %s soft variant",
  (v) => {
    const html = renderAdminUi(<Badge variant={v}>x</Badge>);
    expect(html).toContain(v === "soft" ? "bg-primary-soft" : `bg-${v}-soft`);
    expect(html).toContain(`data-variant="${v}"`);
  }
);

test("pre-existing Badge variants still render their markers", () => {
  for (const v of ["default", "secondary", "destructive", "outline"] as const) {
    const html = renderAdminUi(<Badge variant={v}>x</Badge>);
    expect(html).toContain(`data-variant="${v}"`);
  }
});

test("Card is rounded-2xl with a soft shadow and supports CardAction", () => {
  const html = renderAdminUi(
    <Card>
      <CardAction>a</CardAction>x
    </Card>
  );
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("shadow-soft");
  expect(html).toContain('data-slot="card-action"');
});
