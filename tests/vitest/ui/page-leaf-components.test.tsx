import React from "react";
import { expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import { BlockToolbar } from "../../../core/admin/ui/pages/BlockToolbar";
import { CanvasFrame } from "../../../core/admin/ui/pages/CanvasFrame";
import { InspectorPanel } from "../../../core/admin/ui/pages/InspectorPanel";
import { PageList } from "../../../core/admin/ui/pages/PageList";

vi.mock("../../../core/admin/ui/pages/PageListPage", () => ({
  PageListPage: () => <div>Mocked page list shell</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

test("BlockToolbar renders move and delete controls", () => {
  const html = renderToString(<BlockToolbar />);

  expect(html.match(/<button/g)).toHaveLength(3);
  expect(html).toContain("rounded-none");
  expect(html).toContain("text-primary-foreground");
});

test("CanvasFrame renders preview chrome and seeded sections", () => {
  const html = renderToString(<CanvasFrame />);

  expect(html).toContain("100% • 1024px");
  expect(html).toContain("Hero section");
  expect(html).toContain("Build your system with Coderso");
  expect(html).toContain("Versioned content");
  expect(html).toContain("Newsletter");
  expect(html).toContain("Subscribe");
});

test("InspectorPanel renders content, styling, and advanced sections", () => {
  const html = renderToString(<InspectorPanel />);

  expect(html).toContain("Hero Section");
  expect(html).toContain("Primary CTA");
  expect(html).toContain("Background");
  expect(html).toContain("Overlay gradient");
  expect(html).toContain("Custom ID");
  expect(html).toContain("Enable custom script");
});

test("PageList delegates to PageListPage", () => {
  const html = renderToString(<PageList />);

  expect(html).toContain("Mocked page list shell");
});
