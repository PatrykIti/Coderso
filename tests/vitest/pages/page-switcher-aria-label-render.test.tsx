import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PAGE_SWITCHER_DEFAULT_ARIA_LABEL,
  createPageBlockV2,
  type PageBlockV2,
} from "../../../core/services/pages/pageDocumentV2";
import { PageBlockContent } from "../../../core/services/pages/pageRendererV2";

const switcher = (ariaLabel?: unknown): PageBlockV2 => {
  const block = createPageBlockV2("switcher", {
    id: "style-switcher",
    props: {
      tabs: [{ label: "Minimal" }, { label: "Barn" }],
      activeIndex: 0,
      variant: "pill",
    },
  });
  if (ariaLabel !== undefined) block.props.ariaLabel = ariaLabel;
  return block;
};

const render = (block: PageBlockV2) => renderToStaticMarkup(<PageBlockContent block={block} />);

describe("Page switcher ariaLabel rendering", () => {
  it("renders the exact authored Polish tab-list name", () => {
    expect(render(switcher("Wybór stylu domu"))).toContain(
      'role="tablist" aria-label="Wybór stylu domu"'
    );
  });

  it("keeps unauthored output on the exact legacy fallback", () => {
    const markup = render(switcher());
    expect(markup).toContain(`aria-label="${PAGE_SWITCHER_DEFAULT_ARIA_LABEL}"`);
    expect(render(switcher("   "))).toBe(markup);
  });

  it("fails soft at render for malformed stored values", () => {
    expect(render(switcher(42))).toContain(`aria-label="${PAGE_SWITCHER_DEFAULT_ARIA_LABEL}"`);
    expect(render(switcher("x".repeat(161)))).toContain(
      `aria-label="${PAGE_SWITCHER_DEFAULT_ARIA_LABEL}"`
    );
  });

  it("lets React escape hostile-looking text exactly once", () => {
    const markup = render(switcher('Style"><img src=x onerror=alert(1)>'));
    expect(markup).toContain('aria-label="Style&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"');
    expect(markup).not.toContain("<img src=x");
  });
});
