// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { SecurityStatusCard } from "../../../core/admin/ui/dashboard/SecurityStatusCard";
import { SiteHealthCard } from "../../../core/admin/ui/dashboard/SiteHealthCard";
import type {
  DashboardSecuritySummary,
  DashboardStorageSummary,
} from "../../../core/services/dashboard/dashboardTypes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const security = (overrides: Partial<DashboardSecuritySummary> = {}): DashboardSecuritySummary => ({
  status: "ok",
  issues: 0,
  checks: [
    { id: "csrf", label: "CSRF protection", status: "ok", detail: "Enabled" },
    { id: "rateLimit", label: "Rate limiting", status: "warning", detail: "Loosened" },
    { id: "headers", label: "Security headers", status: "critical", detail: "Missing" },
  ],
  ...overrides,
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("SiteHealthCard renders storage bytes without a limit and a 100% security score", () => {
  const storage: DashboardStorageSummary = { usedBytes: 0, limitBytes: null, usedPercent: null };
  const view = mount(<SiteHealthCard storage={storage} security={security({ issues: 0 })} />);

  try {
    const text = view.container.textContent ?? "";
    expect(text).toContain("Site Health");
    expect(text).toContain("Storage Usage");
    expect(text).toContain("0 B (no limit)");
    // Zero issues -> checks empty would give 100; here 3 checks, 0 issues -> 100.
    expect(text).toContain("Security Checks");
    expect(text).toContain("3/3 passing");
    expect(text).toContain("Good");
  } finally {
    view.cleanup();
  }
});

test("SiteHealthCard renders percent usage and a fractional security score", () => {
  const storage: DashboardStorageSummary = {
    usedBytes: 1572864,
    limitBytes: 4194304,
    usedPercent: 37.5,
  };
  // One issue out of three checks rounds to 67.
  const view = mount(<SiteHealthCard storage={storage} security={security({ issues: 1 })} />);

  try {
    const text = view.container.textContent ?? "";
    expect(text).toContain("37.5%");
    expect(text).toContain("2/3 passing");
  } finally {
    view.cleanup();
  }
});

test("SiteHealthCard formats KB and MB byte units and warning/critical badges", () => {
  const storage: DashboardStorageSummary = {
    usedBytes: 1536,
    limitBytes: null,
    usedPercent: null,
  };
  const warningView = mount(
    <SiteHealthCard storage={storage} security={security({ status: "warning", issues: 1 })} />
  );

  try {
    expect(warningView.container.textContent).toContain("1.5 KB");
    expect(warningView.container.textContent).toContain("Warning");
    expect(warningView.container.querySelector("[data-variant='warning']")).not.toBeNull();
  } finally {
    warningView.cleanup();
  }

  const criticalView = mount(
    <SiteHealthCard storage={storage} security={security({ status: "critical", issues: 2 })} />
  );
  try {
    expect(criticalView.container.textContent).toContain("Critical");
    expect(criticalView.container.querySelector("[data-variant='destructive']")).not.toBeNull();
  } finally {
    criticalView.cleanup();
  }
});

test("SiteHealthCard renders a whole-number byte value without decimals", () => {
  const storage: DashboardStorageSummary = {
    usedBytes: 2097152,
    limitBytes: null,
    usedPercent: null,
  };
  const view = mount(<SiteHealthCard storage={storage} security={security()} />);

  try {
    expect(view.container.textContent).toContain("2 MB");
  } finally {
    view.cleanup();
  }
});

test("SecurityStatusCard renders ok, warning, and critical check statuses", () => {
  const view = mount(<SecurityStatusCard summary={security()} />);

  try {
    const text = view.container.textContent ?? "";
    expect(text).toContain("Security Status");
    expect(text).toContain("CSRF protection");
    expect(text).toContain("Rate limiting");
    expect(text).toContain("Security headers");
    expect(text).toContain("Enabled");
    expect(text).toContain("Loosened");
    expect(text).toContain("Missing");
    expect(text).toContain("All checks passed.");
  } finally {
    view.cleanup();
  }
});

test("SecurityStatusCard renders issue counts and the empty-checks message", () => {
  const view = mount(
    <SecurityStatusCard summary={security({ status: "critical", issues: 1, checks: [] })} />
  );

  try {
    const text = view.container.textContent ?? "";
    expect(text).toContain("Critical");
    expect(text).toContain("1 issue detected.");
    expect(text).toContain("No security checks reported.");
  } finally {
    view.cleanup();
  }
});
