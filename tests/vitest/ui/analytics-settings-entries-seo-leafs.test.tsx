// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { AnalyticsCharts } from "../../../core/admin/ui/analytics/AnalyticsCharts";
import { KpiCards } from "../../../core/admin/ui/analytics/KpiCards";
import { TopContentDrawer } from "../../../core/admin/ui/analytics/TopContentDrawer";
import { TopContentTable } from "../../../core/admin/ui/analytics/TopContentTable";
import { EntryFilters } from "../../../core/admin/ui/entries/EntryFilters";
import { EntryGrid } from "../../../core/admin/ui/entries/EntryGrid";
import { ApiKeySecretDialog } from "../../../core/admin/ui/settings/ApiKeySecretDialog";
import { SessionsTable } from "../../../core/admin/ui/settings/SessionsTable";
import { SmtpCard } from "../../../core/admin/ui/settings/SmtpCard";
import { SeoTable } from "../../../core/admin/ui/seo/SeoTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-dialog-open={String(Boolean(open))}>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") {
          return String(child);
        }
        if (React.isValidElement(child)) {
          return flattenText(child.props.children);
        }
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
          },
        ];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-sheet-open={String(Boolean(open))}>{children}</div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <thead className={className}>{children}</thead>
  ),
  TableRow: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  ),
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/ui/shared/SectionHeader", () => ({
  SectionHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div>
      <h3>{title}</h3>
      {action}
    </div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

test("analytics leaf components render empty and populated states", () => {
  const emptyHtml = renderToString(<AnalyticsCharts trend={[]} topPages={[]} />);
  const populatedHtml = renderToString(
    <>
      <AnalyticsCharts
        trend={[
          { date: "Mar 1", value: 2 },
          { date: "Mar 7", value: 8 },
        ]}
        topPages={[{ id: "page-1", path: "/pricing", score: 78 }]}
      />
      <KpiCards
        items={[
          {
            id: "publishedPages",
            label: "Published pages",
            value: "24",
            change: "+12%",
            trend: "up",
          },
          {
            id: "entries",
            label: "Entries",
            value: "16",
            change: "-3%",
            trend: "down",
          },
          {
            id: "media",
            label: "Media",
            value: "128",
            change: "+8%",
            trend: "up",
          },
        ]}
      />
    </>
  );

  expect(emptyHtml).toContain("No content activity yet.");
  expect(populatedHtml).toContain("Mar 1");
  expect(populatedHtml).toContain("Mar 7");
  expect(populatedHtml).toContain("/pricing");
  expect(populatedHtml).toContain("78%");
  expect(populatedHtml).toContain("score");
  expect(populatedHtml).toContain("Published pages");
  expect(populatedHtml).toContain("+12%");
  expect(populatedHtml).toContain("-3%");
});

test("top content components render rows and forward actions", () => {
  const onViewAll = vi.fn();
  const onOpenChange = vi.fn();
  const view = mount(
    <>
      <TopContentTable
        items={[
          {
            id: "item-1",
            title: "Homepage",
            path: "/",
            score: 82,
            updatedAt: "2026-03-06T12:00:00.000Z",
            type: "page",
          },
        ]}
        onViewAll={onViewAll}
      />
      <TopContentDrawer
        open
        onOpenChange={onOpenChange}
        items={[
          {
            id: "item-1",
            title: "Homepage",
            path: "/",
            score: 82,
            updatedAt: "2026-03-06T12:00:00.000Z",
            type: "page",
          },
        ]}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Homepage");
    expect(view.container.textContent).toContain("View all");
    expect(view.container.textContent).toContain("Top Content");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent?.includes("View all"))?.click();
      buttons
        .find((button) => button.getAttribute("aria-label") === "Close top content drawer")
        ?.click();
      buttons.find((button) => button.textContent === "Close")?.click();
      buttons.find((button) => button.textContent === "Export")?.click();
    });

    expect(onViewAll).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenNthCalledWith(1, false);
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);
  } finally {
    view.cleanup();
  }
});

test("top content table and drawer render empty states", () => {
  const html = renderToString(
    <>
      <TopContentTable items={[]} />
      <TopContentDrawer open onOpenChange={() => undefined} items={[]} />
    </>
  );

  expect(html).toContain("No activity for this period.");
  expect(html).toContain("No content activity yet.");
});

test("settings leaf components forward copy, field changes, and revoke actions", () => {
  const writeText = vi.fn(async () => undefined);
  Object.defineProperty(globalThis.navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  const onOpenChange = vi.fn();
  const onHostChange = vi.fn();
  const onPortChange = vi.fn();
  const onSecureChange = vi.fn();
  const onUserChange = vi.fn();
  const onPasswordChange = vi.fn();
  const onTogglePassword = vi.fn();
  const onRevoke = vi.fn();
  const SessionIcon = React.forwardRef<SVGSVGElement, React.ComponentProps<"svg">>((props, ref) => (
    <svg ref={ref} {...props} />
  ));

  const view = mount(
    <>
      <ApiKeySecretDialog open onOpenChange={onOpenChange} name="Primary" secret="secret-value" />
      <SmtpCard
        host="smtp.example.com"
        port="587"
        secure={false}
        user="mailer"
        password=""
        passwordConfigured
        updatePassword={false}
        onHostChange={onHostChange}
        onPortChange={onPortChange}
        onSecureChange={onSecureChange}
        onUserChange={onUserChange}
        onPasswordChange={onPasswordChange}
        onTogglePassword={onTogglePassword}
      />
      <SessionsTable
        sessions={[
          {
            id: "session-1",
            device: "MacBook Pro",
            deviceDetail: "macOS Safari",
            location: "Warsaw",
            ipAddress: "127.0.0.1",
            lastActive: "Just now",
            status: "current",
            canRevoke: false,
            icon: SessionIcon,
          },
          {
            id: "session-2",
            device: "iPhone",
            deviceDetail: "iOS",
            location: "Krakow",
            ipAddress: "10.0.0.1",
            lastActive: "5 minutes ago",
            status: "active",
            canRevoke: true,
            icon: SessionIcon,
          },
        ]}
        onRevoke={onRevoke}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("API Key created");
    expect(view.container.textContent).toContain("SMTP Server Configuration");
    expect(view.container.textContent).toContain("Current session");

    const inputs = Array.from(view.container.querySelectorAll("input"));
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons.find((button) => button.textContent?.includes("Copy"))?.click();
      buttons
        .find((button) => button.getAttribute("aria-label") === "Close API key dialog")
        ?.click();
      buttons.find((button) => button.textContent === "Done")?.click();

      setInputValue(inputs[1], "smtp.coderso.test");
      setInputValue(inputs[2], "465");
      setSelectValue(selects[0], "ssl-tls");
      (inputs[3] as HTMLInputElement | null | undefined)?.click();
      setInputValue(inputs[4], "mailer-user");
      setInputValue(inputs[5], "super-secret");

      buttons.find((button) => button.textContent?.includes("Revoke"))?.click();
    });

    expect(writeText).toHaveBeenCalledWith("secret-value");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onHostChange).toHaveBeenCalledWith("smtp.coderso.test");
    expect(onPortChange).toHaveBeenCalledWith("465");
    expect(onSecureChange).toHaveBeenCalledWith(true);
    expect(onTogglePassword).toHaveBeenCalledWith(true);
    expect(onUserChange).toHaveBeenCalledWith("mailer-user");
    expect(onPasswordChange).toHaveBeenCalledWith("super-secret");
    expect(onRevoke).toHaveBeenCalledWith(expect.objectContaining({ id: "session-2" }));
  } finally {
    view.cleanup();
  }
});

test("sessions table renders loading and empty fallbacks", () => {
  const SessionIcon = React.forwardRef<SVGSVGElement, React.ComponentProps<"svg">>((props, ref) => (
    <svg ref={ref} {...props} />
  ));
  const html = renderToString(
    <>
      <SessionsTable sessions={[]} isLoading onRevoke={() => undefined} />
      <SessionsTable
        sessions={[
          {
            id: "session-1",
            device: "MacBook Pro",
            deviceDetail: "macOS Safari",
            location: "Warsaw",
            ipAddress: "127.0.0.1",
            lastActive: "Just now",
            status: "current",
            canRevoke: false,
            icon: SessionIcon,
          },
        ]}
      />
    </>
  );

  expect(html).toContain("Loading sessions...");
  expect(html).toContain("Current session");
});

test("entry leaf components forward filter and entry actions", () => {
  const onSearchChange = vi.fn();
  const onStatusChange = vi.fn();
  const onTypeChange = vi.fn();
  const onAuthorChange = vi.fn();
  const onUpdatedFromChange = vi.fn();
  const onUpdatedToChange = vi.fn();
  const onAdvancedOpenChange = vi.fn();
  const onClear = vi.fn();
  const onEdit = vi.fn();
  const view = mount(
    <>
      <EntryFilters
        search="hero"
        status="draft"
        typeValue="page"
        typeOptions={[
          { value: "page", label: "Page" },
          { value: "post", label: "Post" },
        ]}
        author="any"
        authorOptions={[{ value: "john", label: "John" }]}
        updatedFrom=""
        updatedTo=""
        advancedOpen={true}
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
        onTypeChange={onTypeChange}
        onAuthorChange={onAuthorChange}
        onUpdatedFromChange={onUpdatedFromChange}
        onUpdatedToChange={onUpdatedToChange}
        onAdvancedOpenChange={onAdvancedOpenChange}
        onClear={onClear}
      />
      <EntryGrid entries={[]} onEdit={onEdit} emptyMessage="Nothing here" />
      <EntryGrid
        entries={[
          {
            id: "entry-1",
            title: "Landing page",
            slug: "landing-page",
            status: "published",
            updatedAt: "2026-03-06T12:00:00.000Z",
          } as never,
        ]}
        onEdit={onEdit}
      />
      <EntryGrid
        entries={[
          {
            id: "entry-2",
            title: "Blog post",
            slug: "blog-post",
            status: "draft",
            updatedAt: "2026-03-06T12:00:00.000Z",
          } as never,
        ]}
        entryTypeSlug="posts"
        onEdit={onEdit}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Nothing here");
    expect(view.container.textContent).toContain("Landing page");
    expect(view.container.innerHTML).toContain("/entries/posts/entry-2");

    const input = view.container.querySelector("input");
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      setInputValue(input ?? undefined, "pricing");
      setSelectValue(selects[0], "published");
      setSelectValue(selects[1], "post");
      setSelectValue(selects[2], "john");
      buttons.find((button) => button.textContent?.includes("Clear"))?.click();
      buttons.find((button) => button.className.includes("text-left"))?.click();
    });

    expect(onSearchChange).toHaveBeenCalledWith("pricing");
    expect(onTypeChange).toHaveBeenCalledWith("post");
    expect(onStatusChange).toHaveBeenCalledWith("published");
    expect(onAuthorChange).toHaveBeenCalledWith("john");
    expect(onClear).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledWith("entry-1");
  } finally {
    view.cleanup();
  }
});

test("seo table renders empty row and edit action", () => {
  const onEdit = vi.fn();
  const view = mount(
    <SeoTable
      items={[
        {
          id: "seo-1",
          title: "Landing page",
          path: "/landing",
          score: 88,
          metaStatus: "optimized",
          socialStatus: "ready",
          metaTitle: "Landing",
          metaDescription: "Landing description",
          keywords: ["landing"],
          previewUrl: "https://coderso.test/landing",
          previewPath: "/landing",
          analysisStatus: "passed",
          analysisNotes: [],
        },
        {
          id: "seo-2",
          title: "Pricing",
          path: "/pricing",
          score: 42,
          metaStatus: "missing",
          socialStatus: "missing",
          metaTitle: "Pricing",
          metaDescription: "Pricing description",
          keywords: ["pricing"],
          previewUrl: "https://coderso.test/pricing",
          previewPath: "/pricing",
          analysisStatus: "attention",
          analysisNotes: ["Missing OG image"],
        },
      ]}
      activeId="seo-1"
      onEdit={onEdit}
    />
  );

  try {
    expect(view.container.textContent).toContain("Editing...");
    expect(view.container.textContent).toContain("Missing assets");

    const button = Array.from(view.container.querySelectorAll("button")).find(
      (item) => item.getAttribute("aria-label") === "Edit Pricing"
    );

    React.act(() => {
      button?.click();
    });

    expect(onEdit).toHaveBeenCalledWith("seo-2");
  } finally {
    view.cleanup();
  }
});
