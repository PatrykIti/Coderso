// @vitest-environment happy-dom
//
// TASK-479-06-L07: shared pattern library (L02). Static markers via
// `renderAdminUi`; the DataTable row-click guard is interactive (createRoot/act).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PageHeader } from "@/ui/shared/PageHeader";
import { DataTable, type Column } from "@/ui/shared/DataTable";
import { StatusBadge } from "@/ui/shared/StatusBadge";
import { AreaChart, BarChart, Donut, Sparkline } from "@/ui/shared/Charts";
import { AdminRouterProvider } from "@/ui/contexts/AdminRouterContext";

import { renderAdminUi } from "../../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Row = { name: string; role: string };
const cols: Column<Row>[] = [
  { key: "name", header: "Name" },
  { key: "role", header: "Role" },
];
const rows: Row[] = [
  { name: "Sarah Jenks", role: "Admin" },
  { name: "Dev Bot", role: "Editor" },
];

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("PageHeader renders breadcrumb AdminLinks with resolved hrefs + still renders title-only", () => {
  const html = renderAdminUi(
    <PageHeader title="Pages" breadcrumbs={[{ label: "Home", href: "/" }]} />
  );
  expect(html).toContain("Pages");
  expect(html).toContain("Home");
  expect(html).toContain('href="/admin/"'); // "/" resolves through the admin base path

  const titleOnly = renderAdminUi(<PageHeader title="Solo" />);
  expect(titleOnly).toContain("Solo");
});

test("DataTable renders the header + one row per item; selectable adds checkbox cells", () => {
  const html = renderAdminUi(<DataTable columns={cols} rows={rows} selectable />);
  expect(html).toContain("Name");
  expect(html).toContain("Role");
  expect(html).toContain("Sarah Jenks");
  expect(html).toContain("Dev Bot");
  expect(html).toContain('aria-label="Select all"');
  expect(html).toContain('aria-label="Select row"');
});

test("DataTable onRowClick fires on a data cell but NOT on the checkbox cell", () => {
  const onRowClick = vi.fn();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <DataTable columns={cols} rows={rows} selectable onRowClick={onRowClick} />
      </AdminRouterProvider>
    );
  });

  try {
    const bodyRows = Array.from(container.querySelectorAll("tbody tr"));
    expect(bodyRows.length).toBe(2);
    const firstRowCells = Array.from(bodyRows[0]!.querySelectorAll("td"));
    // cell[0] is the checkbox cell (stops propagation); cell[1] is the name cell.
    React.act(() => {
      firstRowCells[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);

    React.act(() => {
      firstRowCells[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onRowClick).toHaveBeenCalledTimes(1); // checkbox cell did not re-trigger
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});

test("StatusBadge maps known statuses (incl. archived, spam) to a variant; unknown -> outline", () => {
  expect(renderAdminUi(<StatusBadge status="archived" />)).toContain("bg-secondary");
  expect(renderAdminUi(<StatusBadge status="spam" />)).toContain("bg-destructive");
  expect(renderAdminUi(<StatusBadge status="published" />)).toContain("bg-success-soft");
  expect(renderAdminUi(<StatusBadge status="nope" />)).toContain("border-border"); // outline fallback
});

test("Charts render for empty / single-point / normal series without throwing", () => {
  expect(() => renderAdminUi(<AreaChart data={[]} />)).not.toThrow();
  expect(() => renderAdminUi(<AreaChart data={[1]} />)).not.toThrow();
  expect(() => renderAdminUi(<AreaChart data={[3, 9, 4, 12]} />)).not.toThrow();
  expect(() => renderAdminUi(<BarChart data={[]} />)).not.toThrow();
  expect(() => renderAdminUi(<Sparkline data={[1]} />)).not.toThrow();
  expect(() => renderAdminUi(<Donut segments={[]} />)).not.toThrow();
});
