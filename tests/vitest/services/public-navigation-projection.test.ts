import { describe, expect, it } from "vitest";
import {
  hasPublicNavigationHref,
  projectPublicNavigationItems,
  type PublicNavigationItem,
} from "../../../core/services/navigation/publicNavigationProjection";

const leaf = (overrides: Partial<PublicNavigationItem> = {}): PublicNavigationItem => ({
  label: "Item",
  href: "/about",
  ...overrides,
});

const group = (overrides: Partial<PublicNavigationItem> = {}): PublicNavigationItem =>
  leaf({
    label: "Services",
    href: "#",
    children: [
      leaf({ label: "Consulting", href: "/consulting" }),
      leaf({ label: "Support", href: "/support" }),
    ],
    ...overrides,
  });

describe("hasPublicNavigationHref", () => {
  it("accepts real paths, hashes, and http(s) URLs", () => {
    expect(hasPublicNavigationHref("/about")).toBe(true);
    expect(hasPublicNavigationHref(" /about ")).toBe(true);
    expect(hasPublicNavigationHref("#section")).toBe(true);
    expect(hasPublicNavigationHref("https://example.com")).toBe(true);
    expect(hasPublicNavigationHref("http://example.com")).toBe(true);
  });

  it("rejects empty and the mapper's '#' sentinel", () => {
    expect(hasPublicNavigationHref("")).toBe(false);
    expect(hasPublicNavigationHref("   ")).toBe(false);
    expect(hasPublicNavigationHref("#")).toBe(false);
    expect(hasPublicNavigationHref(" # ")).toBe(false);
  });
});

describe("projectPublicNavigationItems", () => {
  it("returns empty for empty input", () => {
    expect(projectPublicNavigationItems([])).toEqual([]);
  });

  it("keeps renderable leaves and drops dead leaves", () => {
    const projected = projectPublicNavigationItems([
      leaf({ label: "About", href: "/about" }),
      leaf({ label: "Empty", href: "#" }),
      leaf({ label: "Home", href: "/" }),
    ]);
    expect(projected.map((i) => i.label)).toEqual(["About", "Home"]);
  });

  it("drops a hidden subtree entirely (never flattened into visible children)", () => {
    const projected = projectPublicNavigationItems([
      leaf({
        label: "Account",
        href: "#",
        meta: { visibility: "logged_in", badge: null, description: null, icon: null },
        children: [
          leaf({ label: "Profile", href: "/profile" }),
          leaf({ label: "Settings", href: "/settings" }),
        ],
      }),
      leaf({ label: "Public", href: "/public" }),
    ]);
    expect(projected.map((i) => i.label)).toEqual(["Public"]);
  });

  it("keeps a linkless parent with renderable projected children as a linkless group", () => {
    const projected = projectPublicNavigationItems([group()]);
    expect(projected).toHaveLength(1);
    expect(projected[0].href).toBe("#");
    expect(projected[0].children?.map((c) => c.label)).toEqual(["Consulting", "Support"]);
  });

  it("drops a linkless parent whose children are all dead", () => {
    const projected = projectPublicNavigationItems([
      leaf({
        label: "Empty group",
        href: "#",
        children: [
          leaf({ label: "Dead", href: "#" }),
          leaf({
            label: "Hidden",
            href: "/x",
            meta: { visibility: "logged_in", badge: null, description: null, icon: null },
          }),
        ],
      }),
    ]);
    expect(projected).toEqual([]);
  });

  it("projects deep nesting recursively", () => {
    const projected = projectPublicNavigationItems([
      leaf({
        label: "Root",
        href: "/",
        children: [
          leaf({
            label: "L1 group",
            href: "#",
            children: [
              leaf({ label: "L2 leaf", href: "/deep" }),
              leaf({ label: "L2 dead", href: "#" }),
            ],
          }),
        ],
      }),
    ]);
    expect(projected).toHaveLength(1);
    expect(projected[0].children).toHaveLength(1);
    expect(projected[0].children?.[0].children?.map((c) => c.label)).toEqual(["L2 leaf"]);
  });

  it("preserves metadata, target, and order unchanged", () => {
    const input: PublicNavigationItem[] = [
      leaf({
        label: "Docs",
        href: "/docs",
        target: "blank",
        meta: {
          visibility: "logged_out",
          badge: { label: "New", tone: "accent" },
          description: "Developer docs",
          icon: "book",
          variant: "button",
        },
      }),
      leaf({ label: "Blog", href: "/blog" }),
    ];
    const projected = projectPublicNavigationItems(input);
    expect(projected).toEqual(input); // metadata + order pass through
  });

  it("keeps a dead parent with children as a linkless group even when its href is a real path", () => {
    // A real-href parent REMAINS even with no children (contract: real-href
    // parent stays regardless); with children it also stays, children projected.
    const projected = projectPublicNavigationItems([
      leaf({ label: "Parent", href: "/parent" }),
      leaf({ label: "Dead", href: "#", children: [] }),
    ]);
    expect(projected.map((i) => i.label)).toEqual(["Parent"]);
    // linkless parent with projected child => linkless group
    const withChild = projectPublicNavigationItems([group({ href: "#" })]);
    expect(withChild[0].href).toBe("#");
    expect(withChild[0].children).toHaveLength(2);
  });

  it("does not mutate the input tree", () => {
    const input: PublicNavigationItem[] = [
      group({ children: [leaf({ label: "A", href: "/a" }), leaf({ label: "Dead", href: "#" })] }),
      leaf({
        label: "Hidden",
        href: "/h",
        meta: { visibility: "logged_in", badge: null, description: null, icon: null },
      }),
    ];
    const snapshot = structuredClone(input);
    projectPublicNavigationItems(input);
    expect(input).toEqual(snapshot);
  });

  it("is idempotent", () => {
    const input = [
      group({ children: [leaf({ label: "A", href: "/a" }), leaf({ label: "Dead", href: "#" })] }),
    ];
    const once = projectPublicNavigationItems(input);
    expect(projectPublicNavigationItems(once)).toEqual(once);
  });

  it("never returns cached/mutated arrays or objects", () => {
    const input = [group()];
    const projected = projectPublicNavigationItems(input);
    expect(projected).not.toBe(input);
    expect(projected[0].children).not.toBe(input[0].children);
    expect(projected[0]).not.toBe(input[0]);
  });
});
