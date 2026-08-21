import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  PageSectionContent,
  PageSectionRender,
  toPageBlockRenderProps,
  toPageBlockTypographyStyle,
  toPageSectionBleedStyle,
  toPageSectionRenderProps,
  toPageSectionStyle,
} from "../../../core/services/pages/pageRendererV2";

import {
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
} from "../../../core/services/pages/pageDocumentV2";

test("TASK-532 toPageBlockTypographyStyle: fluid font-size wins over the discrete token", () => {
  const custom = createPageBlockV2("heading", {
    props: { text: "Fluid", level: "h1", align: "left" },
    style: { fontSizeCustom: "clamp(2.6rem,5vw,4.4rem)", fontSize: "lg" },
  });
  expect(toPageBlockTypographyStyle(custom).fontSize).toBe("clamp(2.6rem,5vw,4.4rem)");

  // token-only path intact (regression).
  const tokenOnly = createPageBlockV2("heading", {
    props: { text: "Token", level: "h1", align: "left" },
    style: { fontSize: "lg" },
  });
  expect(toPageBlockTypographyStyle(tokenOnly).fontSize).toBe(pageTypographyFontSizeCssValues.lg);

  // text-transform emitted; heavier weight maps to the css value; unset absent.
  const transformed = createPageBlockV2("heading", {
    props: { text: "Up", level: "h1", align: "left" },
    style: { textTransform: "uppercase", fontWeight: "black" },
  });
  const emitted = toPageBlockTypographyStyle(transformed);
  expect(emitted.textTransform).toBe("uppercase");
  expect(emitted.fontWeight).toBe(pageTypographyFontWeightCssValues.black);
  expect(emitted.fontWeight).toBe("900");

  const bare = createPageBlockV2("heading", {
    props: { text: "Bare", level: "h1", align: "left" },
  });
  const bareEmitted = toPageBlockTypographyStyle(bare);
  expect(bareEmitted).not.toHaveProperty("fontSize");
  expect(bareEmitted).not.toHaveProperty("textTransform");
});

test("TASK-532 heading renders inline fluid font-size + text-transform", () => {
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-532-heading",
        blocks: [
          createPageBlockV2("heading", {
            id: "blk-532-heading",
            props: { text: "Fluid heading", level: "h1", align: "left" },
            style: {
              fontSizeCustom: "clamp(2.6rem,5vw,4.4rem)",
              textTransform: "uppercase",
            },
          }),
        ],
      })}
    />
  );
  expect(html).toContain("font-size:clamp(2.6rem,5vw,4.4rem)");
  expect(html).toContain("text-transform:uppercase");
});

test("TASK-532 divider gradient variant renders a gradient <span>; legacy divider is an <hr>", () => {
  const gradientHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-532-divider-gradient",
        blocks: [
          createPageBlockV2("divider", {
            id: "blk-532-divider-gradient",
            props: { tone: "accent", thickness: 2, width: 34, align: "left", gradient: true },
          }),
        ],
      })}
    />
  );
  expect(gradientHtml).toContain("linear-gradient(90deg");
  expect(gradientHtml).toContain(", transparent)");
  expect(gradientHtml).toContain("width:34px");
  expect(gradientHtml).not.toContain("<hr");

  const legacyHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-532-divider-legacy",
        blocks: [
          createPageBlockV2("divider", {
            id: "blk-532-divider-legacy",
            props: { tone: "neutral", thickness: 1 },
          }),
        ],
      })}
    />
  );
  expect(legacyHtml).toContain("<hr");
  expect(legacyHtml).not.toContain("linear-gradient");
});

test("TASK-532 rich text block honors textColor; plain path + unset stay unchanged", () => {
  const richColored = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-532-rich-color",
        blocks: [
          createPageBlockV2("text", {
            id: "blk-532-rich-color",
            props: { text: "<p>Aqua body</p>", format: "rich", align: "left" },
            style: { textColor: "#22d3ee" },
          }),
        ],
      })}
    />
  );
  // Wrapper carries the authored color + the inherit-forcing class so every
  // descendant inherits it. NOTE: renderToStaticMarkup asserts EMITTED MARKUP
  // only — the actual PAINTED color on the child <p>/<span> (getComputedStyle)
  // is proven by the LIVE Playwright computed-color smoke (acceptance #5), not
  // here. This codebase ships no @tailwindcss/typography plugin, so the inline
  // wrapper color already paints today; the inherit class is defensive.
  expect(richColored).toContain("color:#22d3ee");
  expect(richColored).toContain("text-[color:inherit]");
  // STRUCTURAL proof (as far as SSR markup can go): the sanitized child <p> is
  // emitted INSIDE the same wrapper <div> that carries BOTH `color:#22d3ee` and
  // the `[&_*]:text-[color:inherit]` descendant utility — so the inherit chain
  // that wins the cascade is really present in the tree. The wrapper's opening
  // tag must precede the child text, and that opening tag must carry both the
  // authored inline color and the inherit-forcing class. (The COMPUTED color on
  // that child stays a live-smoke concern — SSR does not resolve the cascade.)
  const richWrapperOpen = richColored.match(/<div[^>]*data-page-block-text="true"[^>]*>/)?.[0];
  expect(richWrapperOpen).toBeDefined();
  expect(richWrapperOpen).toContain("color:#22d3ee");
  expect(richWrapperOpen).toContain("text-[color:inherit]");
  expect(richColored.indexOf(richWrapperOpen as string)).toBeLessThan(
    richColored.indexOf("Aqua body")
  );

  // A bad color fails soft — no inline color, no inherit class.
  const richBadColor = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-532-rich-badcolor",
        blocks: [
          createPageBlockV2("text", {
            id: "blk-532-rich-badcolor",
            props: { text: "<p>No color</p>", format: "rich", align: "left" },
            style: { textColor: "javascript:alert(1)" },
          }),
        ],
      })}
    />
  );
  expect(richBadColor).not.toContain("text-[color:inherit]");

  // Unset textColor on rich → no inline color, no inherit class (byte-identical).
  const richUnset = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-532-rich-unset",
        blocks: [
          createPageBlockV2("text", {
            id: "blk-532-rich-unset",
            props: { text: "<p>Plain body</p>", format: "rich", align: "left" },
          }),
        ],
      })}
    />
  );
  expect(richUnset).not.toContain("text-[color:inherit]");

  // The PLAIN path keeps its --coderso-block-text var mechanism (regression).
  const plainColored = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-532-plain-color",
        blocks: [
          createPageBlockV2("text", {
            id: "blk-532-plain-color",
            props: { text: "Plain aqua", format: "plain", align: "left" },
            style: { textColor: "#22d3ee" },
          }),
        ],
      })}
    />
  );
  expect(plainColored).toContain("--coderso-block-text");
});

// TASK-533-01-L04 — render emit: block grid span on the frame + section
// columnTemplate inline grid. Present-only ⇒ byte-identical to post-530 when unset.
describe("grid span + asymmetric column ratio render emit (TASK-533-01)", () => {
  test("emits gridRow/gridColumn span on the block frame present-only", () => {
    const rowSpan = createPageBlockV2("heading", {
      id: "blk-row-span",
      props: { text: "Aurora", level: "h2", align: "left" },
      style: { rowSpan: 2 } as never,
    });
    expect(toPageBlockRenderProps(rowSpan).style.gridRow).toBe("span 2");
    const colSpan = createPageBlockV2("heading", {
      id: "blk-col-span",
      props: { text: "Wide", level: "h2", align: "left" },
      style: { colSpan: 2 } as never,
    });
    expect(toPageBlockRenderProps(colSpan).style.gridColumn).toBe("span 2");
    // Both together.
    const both = createPageBlockV2("heading", {
      id: "blk-both-span",
      props: { text: "Both", level: "h2", align: "left" },
      style: { colSpan: 2, rowSpan: 3 } as never,
    });
    expect(toPageBlockRenderProps(both).style.gridColumn).toBe("span 2");
    expect(toPageBlockRenderProps(both).style.gridRow).toBe("span 3");
    // Present-only: an unstyled block emits NEITHER key (byte-identical to post-530).
    const bare = toPageBlockRenderProps(
      createPageBlockV2("heading", {
        id: "blk-no-span",
        props: { text: "Plain", level: "h2", align: "left" },
      })
    ).style as Record<string, unknown>;
    expect("gridRow" in bare).toBe(false);
    expect("gridColumn" in bare).toBe(false);
  });

  test("emits inline gridTemplateColumns overriding the symmetric grid class", () => {
    const section = createPageSectionV2("content", {
      id: "sec-column-template",
      layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        columnTemplate: "1.15fr .85fr",
      } as never,
    });
    const props = toPageSectionRenderProps(section);
    expect(props.style.gridTemplateColumns).toBe("1.15fr .85fr");
    // The symmetric grid class is still present as the fallback tracks (inline wins).
    expect(props.contentClassName).toContain("md:grid-cols-2");
    // Audit remediation (TASK-533): the SAME asymmetric ratio must reach the editor
    // canvas (layoutMode "canvas-device") so the author sees the effect they'll ship
    // — WYSIWYG / publish->front parity. The canvas grid class is symmetric, but the
    // inline gridTemplateColumns overrides it regardless of layout mode. Previously a
    // canvas-device guard suppressed the ratio in the canvas, making the control
    // invisible where the author works; assert parity here to lock the fix in.
    const canvasProps = toPageSectionRenderProps(section, { layoutMode: "canvas-device" });
    expect(canvasProps.style.gridTemplateColumns).toBe("1.15fr .85fr");
    // The canvas still carries its own (symmetric) grid class as the fallback tracks.
    expect(canvasProps.contentClassName).toContain("grid-cols-2");
    // Present-only: a section WITHOUT columnTemplate emits NO gridTemplateColumns,
    // in BOTH the front and the canvas layout mode (byte-identical to post-530).
    const bare = toPageSectionRenderProps(
      createPageSectionV2("content", {
        id: "sec-no-template",
        layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
      })
    ).style as Record<string, unknown>;
    expect("gridTemplateColumns" in bare).toBe(false);
    const bareCanvas = toPageSectionRenderProps(
      createPageSectionV2("content", {
        id: "sec-no-template-canvas",
        layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
      }),
      { layoutMode: "canvas-device" }
    ).style as Record<string, unknown>;
    expect("gridTemplateColumns" in bareCanvas).toBe(false);
  });

  // Audit remediation: span (colSpan/rowSpan) and per-column `column` assignment are
  // MUTUALLY EXCLUSIVE. In the pure auto-flow path the block frame is a direct child of
  // the section content grid, so `grid-column/grid-row: span N` genuinely changes layout.
  // But once ANY root block carries a `column` assignment and the section paints >=2
  // columns, PageSectionContent switches to per-column composition: every block is wrapped
  // in a SINGLE-column `<div data-page-section-column>`. There `grid-column: span 2` is a
  // no-op (one column) and `grid-row: span 2` spans the wrapper's own auto-rows
  // (whitespace) — a silent cosmetic failure. So the span must be DROPPED in that path.
  test("drops the inert block span when the block is inside a per-column composition wrapper", () => {
    const big = createPageBlockV2("text", {
      id: "blk-big-card",
      props: { text: "Large", format: "plain", align: "left" },
      style: { column: 1, colSpan: 2, rowSpan: 2 } as never,
    });
    const sibling = createPageBlockV2("text", {
      id: "blk-small-card",
      props: { text: "Small", format: "plain", align: "left" },
      style: { column: 2 } as never,
    });
    const section = createPageSectionV2("content", {
      id: "sec-span-composition",
      layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
      blocks: [big, sibling],
    });
    const html = renderToStaticMarkup(<PageSectionContent section={section} />);
    // Composition IS active (per-column wrappers present).
    expect(html).toContain('data-page-section-column="1"');
    // The span is NOT emitted anywhere — it would be an inert/misleading rule here.
    expect(html).not.toContain("grid-column:span 2");
    expect(html).not.toContain("grid-row:span 2");
  });

  test("keeps the block span in the pure auto-flow path (no column assignments)", () => {
    // Same big block WITHOUT a `column` assignment ⇒ auto-flow ⇒ the block frame is a
    // direct child of the section content grid ⇒ span genuinely changes layout ⇒ emitted.
    const big = createPageBlockV2("text", {
      id: "blk-big-autoflow",
      props: { text: "Large", format: "plain", align: "left" },
      style: { colSpan: 2, rowSpan: 2 } as never,
    });
    const plain = createPageBlockV2("text", {
      id: "blk-plain-autoflow",
      props: { text: "Plain", format: "plain", align: "left" },
    });
    const section = createPageSectionV2("content", {
      id: "sec-span-autoflow",
      layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
      blocks: [big, plain],
    });
    const html = renderToStaticMarkup(<PageSectionContent section={section} />);
    // No composition wrappers (no assignments) — the span survives on the block frame.
    expect(html).not.toContain("data-page-section-column");
    expect(html).toContain("grid-column:span 2");
    expect(html).toContain("grid-row:span 2");
  });
});

// TASK-533-02-L04 — render emit: per-edge section border on the box that paints the
// section background in each mode (content box for normal, bleed box for full-bleed).
describe("per-edge section border render emit (TASK-533-02)", () => {
  test("emits per-edge border on the section box (border-block = top+bottom only)", () => {
    const section = createPageSectionV2("content", {
      id: "sec-border-block",
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        border: { top: { color: "#fff2", width: 1 }, bottom: { color: "#fff2", width: 1 } },
      } as never,
    });
    const st = toPageSectionStyle(section) as Record<string, unknown>;
    expect(st.borderTopWidth).toBe("1px");
    expect(st.borderBottomWidth).toBe("1px");
    expect(st.borderTopStyle).toBe("solid");
    // border-block: NO left/right emitted.
    expect("borderLeftWidth" in st).toBe(false);
    expect("borderRightWidth" in st).toBe(false);
  });

  test("emits nothing when border unset (byte-identical to post-530)", () => {
    const st = toPageSectionStyle(
      createPageSectionV2("content", { id: "sec-no-border" })
    ) as Record<string, unknown>;
    expect(Object.keys(st).some((k) => k.startsWith("border") && k !== "borderRadius")).toBe(false);
  });

  test("a full-bleed section frames its border on the BLEED box, not the paint-empty content box", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-bleed-border",
      variant: "default",
      style: {
        background: "#dcfce7",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        fullBleed: true,
        border: { top: { color: "#fff2", width: 1 }, bottom: { color: "#fff2", width: 1 } },
      } as never,
    });
    const bleed = toPageSectionBleedStyle(section) as Record<string, unknown>;
    expect(bleed.borderTopWidth).toBe("1px");
    expect(bleed.borderBottomWidth).toBe("1px");
    // The paint-empty full-bleed content-box return carries NO border (frame rides the bleed box).
    const content = toPageSectionStyle(section) as Record<string, unknown>;
    expect(Object.keys(content).some((k) => k.startsWith("border"))).toBe(false);
  });

  test("a NON-full-bleed section carries the border on the content box; bleed style is undefined", () => {
    const section = createPageSectionV2("content", {
      id: "sec-normal-border",
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        border: { top: { color: "#fff2", width: 1 } },
      } as never,
    });
    const st = toPageSectionStyle(section) as Record<string, unknown>;
    expect(st.borderTopWidth).toBe("1px");
    expect(toPageSectionBleedStyle(section)).toBeUndefined();
  });
});

// TASK-533-03-L02 — native timeline vertical axis + glow dots. Additive DOM: all
// existing data-page-timeline-* hooks retained; the horizontal variant is not
// regressed. No author-controlled value (axis tinted off --coderso-section-accent).
describe("native timeline vertical axis (TASK-533-03)", () => {
  const makeTimelineSection = (variant: "default" | "compact" | "horizontal") =>
    createPageSectionV2("timeline", {
      id: `sec-timeline-${variant}`,
      variant,
      layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
      blocks: [
        createPageBlockV2("heading", {
          id: `tl-a-${variant}`,
          props: { text: "Step one", level: "h3", align: "left" },
        }),
        createPageBlockV2("heading", {
          id: `tl-b-${variant}`,
          props: { text: "Step two", level: "h3", align: "left" },
        }),
        createPageBlockV2("heading", {
          id: `tl-c-${variant}`,
          props: { text: "Step three", level: "h3", align: "left" },
        }),
      ],
    });

  test("vertical variant draws a CONTINUOUS axis: full-item segments bleed across the row gap", () => {
    const html = renderToStaticMarkup(
      <PageSectionRender section={makeTimelineSection("default")} />
    );
    // 3 items, each with an axis segment + a retained marker + retained content hook.
    expect((html.match(/data-page-timeline-item=/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-axis-line="true"/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-marker="true"/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-content="true"/g) ?? []).length).toBe(3);
    // The axis is tinted off the fixed section-accent gradient literal (not an author
    // string), reinforcing that no author-controlled value reaches the timeline CSS.
    expect(html).toContain("linear-gradient(var(--coderso-section-accent");
    // CONTINUITY (audit remediation 2026-07-09). The section content grid stacks these
    // items with a real 24px ROW gap AND each item carries its own `py-3` (12px) padding.
    // The axis-line must span the FULL item box (`inset-y-0`) so the py padding is INSIDE
    // the segment — otherwise a dot-row-only span leaves a visible ~24px BREAK at every
    // boundary (the pre-fix dashed rule). Assert the axis-line is the full-item `inset-y-0`
    // rule, no longer clamped to the dot-row.
    expect(html).toMatch(
      /data-page-timeline-axis-line="true"[^>]*inset-y-0|inset-y-0[^>]*data-page-timeline-axis-line="true"/
    );
    // The NON-LAST items bleed the bottom by exactly the resolved row gap (24px default) so
    // segment N reaches segment N+1's top — real inter-segment continuity, not just the
    // grid gap. There are 3 items ⇒ 2 non-last segments carry the bleed.
    expect((html.match(/bottom:calc\(-1 \* 24px\)/g) ?? []).length).toBe(2);
    // The LAST item ENDS the rule at its dot (no downward overshoot into empty section
    // space) — mirrors the reference `.timeline:before{bottom:0}` via the resolved
    // marker offset (TASK-533-03 geometry): 100% - marker top (22px default).
    expect(html).toContain("bottom:calc(100% - 22px)");
    // The glow dot carries a box-shadow off the accent (`.timeline article:before`).
    expect(html).toContain("box-shadow:0 0 16px var(--coderso-section-accent");
  });

  test("compact vertical variant bleeds the axis across the CLAMPED (smaller) gap", () => {
    const html = renderToStaticMarkup(
      <PageSectionRender section={makeTimelineSection("compact")} />
    );
    expect((html.match(/data-page-timeline-axis-line="true"/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-marker="true"/g) ?? []).length).toBe(3);
    // Compact scales the section gap (24 → round(24*0.6)=14 via scalePageSectionSpacing,
    // floored at min 8); the bleed offset is DERIVED from the actual resolved gap, so it
    // tracks the scaled value, not the default 24px. Two non-last segments carry it.
    expect((html.match(/bottom:calc\(-1 \* 14px\)/g) ?? []).length).toBe(2);
    expect(html).not.toContain("bottom:calc(-1 * 24px)");
    // Full-item span + last-item flush end are preserved under the compact clamp too
    // (marker offset scales to 18px).
    expect(html).toMatch(
      /data-page-timeline-axis-line="true"[^>]*inset-y-0|inset-y-0[^>]*data-page-timeline-axis-line="true"/
    );
    expect(html).toContain("bottom:calc(100% - 18px)");
  });

  test("horizontal variant still renders (markers retained, no vertical axis, no regression)", () => {
    const html = renderToStaticMarkup(
      <PageSectionRender section={makeTimelineSection("horizontal")} />
    );
    expect((html.match(/data-page-timeline-item=/g) ?? []).length).toBe(3);
    expect((html.match(/data-page-timeline-marker="true"/g) ?? []).length).toBe(3);
    // Horizontal keeps the top-row marker layout and draws NO vertical axis line.
    expect(html).not.toContain('data-page-timeline-axis-line="true"');
    expect(html).toContain("md:grid-rows-[auto_1fr]");
  });
});
