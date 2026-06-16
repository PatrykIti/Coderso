import { describe, expect, test } from "vitest";

import {
  createPageBlockV2,
  pageBlockPropKeys,
  type PageBlockType,
  type PageBlockV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  commitInlineText,
  inlineEditableTargets,
  inlineListItemPropPath,
  resolveInlineEditTarget,
  sanitizeInlineText,
  type InlineEditableTarget,
} from "../../../core/services/pages/pageInlineEditContract";

const targetFor = (blockType: PageBlockType, propPath: string): InlineEditableTarget => {
  const target = inlineEditableTargets.find(
    (entry) => entry.blockType === blockType && entry.propPath === propPath
  );
  if (!target) throw new Error(`Missing inline edit target ${blockType}.${propPath}`);
  return target;
};

const listBlock = (): PageBlockV2 =>
  createPageBlockV2("list", {
    id: "blk-list",
    props: {
      items: ["First item", "Second item", { label: "Docs", href: "/docs" }],
      ordered: false,
    },
  });

describe("inlineEditableTargets", () => {
  test("covers exactly the contracted text-bearing props", () => {
    const keys = inlineEditableTargets
      .map((target) => `${target.blockType}.${target.propPath}`)
      .sort();
    expect(keys).toEqual(
      [
        "heading.text",
        "text.text",
        "quote.text",
        "quote.cite",
        "statistic.value",
        "statistic.label",
        "statistic.caption",
        "button.label",
        "list.items.*",
      ].sort()
    );
  });

  test("only optional quote.cite and statistic.caption allow empty commits", () => {
    const allowEmptyKeys = inlineEditableTargets
      .filter((target) => target.allowEmpty)
      .map((target) => `${target.blockType}.${target.propPath}`)
      .sort();
    expect(allowEmptyKeys).toEqual(["quote.cite", "statistic.caption"]);
  });

  test("only text.text is multiline", () => {
    const multilineKeys = inlineEditableTargets
      .filter((target) => target.multiline)
      .map((target) => `${target.blockType}.${target.propPath}`);
    expect(multilineKeys).toEqual(["text.text"]);
  });

  test("every target root prop key is a known block prop", () => {
    for (const target of inlineEditableTargets) {
      const rootKey = target.propPath.split(".")[0] ?? "";
      expect(pageBlockPropKeys[target.blockType]).toContain(rootKey);
    }
  });

  test("the map and its entries are frozen", () => {
    expect(Object.isFrozen(inlineEditableTargets)).toBe(true);
    for (const target of inlineEditableTargets) {
      expect(Object.isFrozen(target)).toBe(true);
    }
  });
});

describe("resolveInlineEditTarget", () => {
  test("resolves every direct target on its own block type", () => {
    for (const target of inlineEditableTargets) {
      if (target.propPath.endsWith(".*")) continue;
      const block = createPageBlockV2(target.blockType);
      expect(resolveInlineEditTarget(block, target.propPath)).toBe(target);
    }
  });

  test("text blocks with rich format stay panel-only to avoid lossy inline commits", () => {
    const block = createPageBlockV2("text", {
      props: { text: "Rich copy", format: "rich", align: "left" },
    });
    expect(resolveInlineEditTarget(block, "text")).toBeNull();
  });

  test("resolves indexed list string items to concrete targets", () => {
    const block = listBlock();
    expect(resolveInlineEditTarget(block, "items.0")).toEqual({
      blockType: "list",
      propPath: "items.0",
      multiline: false,
      allowEmpty: false,
    });
    expect(resolveInlineEditTarget(block, inlineListItemPropPath(1))).toEqual({
      blockType: "list",
      propPath: "items.1",
      multiline: false,
      allowEmpty: false,
    });
  });

  test("fails closed for non-contract props on editable block types", () => {
    expect(resolveInlineEditTarget(createPageBlockV2("heading"), "level")).toBeNull();
    expect(resolveInlineEditTarget(createPageBlockV2("button"), "href")).toBeNull();
    expect(resolveInlineEditTarget(createPageBlockV2("text"), "format")).toBeNull();
  });

  test("fails closed for panel-only block types", () => {
    expect(resolveInlineEditTarget(createPageBlockV2("image"), "alt")).toBeNull();
    expect(resolveInlineEditTarget(createPageBlockV2("card"), "title")).toBeNull();
    expect(resolveInlineEditTarget(createPageBlockV2("divider"), "tone")).toBeNull();
    expect(resolveInlineEditTarget(createPageBlockV2("spacer"), "size")).toBeNull();
  });

  test("fails closed for malformed or missing list index segments", () => {
    const block = listBlock();
    expect(resolveInlineEditTarget(block, "items")).toBeNull();
    expect(resolveInlineEditTarget(block, "items.")).toBeNull();
    expect(resolveInlineEditTarget(block, "items.x")).toBeNull();
    expect(resolveInlineEditTarget(block, "items.-1")).toBeNull();
    expect(resolveInlineEditTarget(block, "items.01")).toBeNull();
    expect(resolveInlineEditTarget(block, "items.1.label")).toBeNull();
  });

  test("fails closed for out-of-bounds and non-string list items", () => {
    const block = listBlock();
    expect(resolveInlineEditTarget(block, "items.2")).toBeNull(); // link object item
    expect(resolveInlineEditTarget(block, "items.3")).toBeNull(); // out of bounds
  });

  test("fails closed when the items prop is not an array", () => {
    const block: PageBlockV2 = { ...listBlock(), props: { items: "broken", ordered: false } };
    expect(resolveInlineEditTarget(block, "items.0")).toBeNull();
  });

  test("fails closed when the stored direct value is not a string", () => {
    const block = createPageBlockV2("heading", {
      props: { text: 42, level: "h2", align: "left" },
    });
    expect(resolveInlineEditTarget(block, "text")).toBeNull();
  });
});

describe("sanitizeInlineText", () => {
  const heading = () => targetFor("heading", "text");
  const text = () => targetFor("text", "text");

  test("strips element markup down to text-only content", () => {
    expect(sanitizeInlineText(heading(), "<b>Bold</b> move")).toBe("Bold move");
    expect(sanitizeInlineText(heading(), '<a href="https://example.com">Link</a> label')).toBe(
      "Link label"
    );
  });

  test("drops dangerous element content entirely", () => {
    expect(sanitizeInlineText(heading(), "<script>alert(1)</script>Hello")).toBe("Hello");
    expect(sanitizeInlineText(heading(), "<style>p{color:red}</style>Hi")).toBe("Hi");
  });

  test("removes attribute-bearing tags and HTML comments", () => {
    expect(
      sanitizeInlineText(heading(), "<img src=x onerror=alert(1)>Safe<!-- hidden note -->")
    ).toBe("Safe");
  });

  test("drops unterminated HTML comments instead of leaving comment openers", () => {
    const sanitized = sanitizeInlineText(
      heading(),
      "One <!-- hidden -->Two <!-- unterminated <span>tail</span>"
    );
    expect(sanitized).toBe("One Two");
    expect(sanitized).not.toContain("<!--");
    expect(sanitized).not.toContain("tail");
  });

  test("never reassembles obfuscated nested markup", () => {
    expect(sanitizeInlineText(heading(), "<<b>script>alert(1)</<b>script>")).toBe("");
  });

  test("never reassembles split dangerous tag names", () => {
    const sanitized = sanitizeInlineText(
      heading(),
      "<scrip<script>hidden</script>t>alert(123)</script>Visible"
    );
    expect(sanitized).toBe("hiddentalert(123)Visible");
    expect(sanitized).not.toContain("<script");
  });

  test("drops raw angle brackets even when they look like prose", () => {
    expect(sanitizeInlineText(heading(), "5 < 10 and a < b > c")).toBe("5  10 and a  b  c");
  });

  test("drops malformed script openers that do not form complete tags", () => {
    const sanitized = sanitizeInlineText(heading(), "Lead <script alert(1) tail");
    expect(sanitized).toBe("Lead script alert(1) tail");
    expect(sanitized).not.toContain("<script");
  });

  test("normalizes non-breaking spaces to regular spaces", () => {
    expect(sanitizeInlineText(heading(), "Hello\u00A0world")).toBe("Hello world");
  });

  test("removes control characters but keeps tabs", () => {
    expect(sanitizeInlineText(heading(), "He\u0000llo\u0007\tworld\u007F!")).toBe("Hello\tworld!");
  });

  test("collapses newlines to single spaces for single-line targets", () => {
    expect(sanitizeInlineText(heading(), "First\r\nSecond\n\n  Third")).toBe("First Second Third");
    expect(sanitizeInlineText(heading(), "a\u2028b\u2029c")).toBe("a b c");
  });

  test("preserves internal newlines for multiline targets", () => {
    expect(sanitizeInlineText(text(), "  First\r\nSecond\n\nThird  ")).toBe(
      "First\nSecond\n\nThird"
    );
  });

  test("trims leading and trailing whitespace", () => {
    expect(sanitizeInlineText(heading(), "   spaced out   ")).toBe("spaced out");
    expect(sanitizeInlineText(text(), "\n\n body \n\n")).toBe("body");
  });
});

describe("commitInlineText", () => {
  test("commits sanitized text for required targets", () => {
    expect(commitInlineText(targetFor("heading", "text"), "Old", "<b>New</b> title ")).toBe(
      "New title"
    );
    expect(commitInlineText(targetFor("button", "label"), "Learn more", "Get started")).toBe(
      "Get started"
    );
  });

  test("keeps the previous value when a required target commits empty", () => {
    expect(commitInlineText(targetFor("heading", "text"), "Old heading", "   \n ")).toBe(
      "Old heading"
    );
    expect(commitInlineText(targetFor("statistic", "value"), "120", "<b></b>")).toBe("120");
    expect(commitInlineText(targetFor("quote", "text"), "Stay hungry.", "")).toBe("Stay hungry.");
  });

  test("keeps the previous list item when an indexed commit is empty", () => {
    const target = resolveInlineEditTarget(listBlock(), "items.0");
    expect(target).not.toBeNull();
    expect(commitInlineText(target as InlineEditableTarget, "First item", "  ")).toBe("First item");
  });

  test("allows optional targets to commit empty", () => {
    expect(commitInlineText(targetFor("quote", "cite"), "Someone", "   ")).toBe("");
    expect(commitInlineText(targetFor("statistic", "caption"), "Per year", "<i></i>")).toBe("");
  });

  test("never emits markup on commit", () => {
    const committed = commitInlineText(
      targetFor("statistic", "label"),
      "Metric",
      '<script>alert(1)</script><span data-x="1">Users</span>'
    );
    expect(committed).toBe("Users");
  });
});

describe("inlineListItemPropPath", () => {
  test("builds the documented items.N convention", () => {
    expect(inlineListItemPropPath(0)).toBe("items.0");
    expect(inlineListItemPropPath(42)).toBe("items.42");
  });

  test("rejects negative and non-integer indexes", () => {
    expect(() => inlineListItemPropPath(-1)).toThrow(RangeError);
    expect(() => inlineListItemPropPath(1.5)).toThrow(RangeError);
    expect(() => inlineListItemPropPath(Number.NaN)).toThrow(RangeError);
  });
});
