import { describe, expect, it } from "vitest";

import type { PopupRecord } from "../../../core/admin/services/popupsClient";
import {
  clonePopupDraft,
  createEmptyPopupDraft,
  draftFromPopup,
  toPopupInput,
} from "../../../core/admin/ui/popups/popupEditorModel";

export const samplePopup = (): PopupRecord => ({
  id: "popup-1",
  name: "Winter Promo",
  slug: "winter-promo",
  status: "published",
  trigger: { type: "scroll_depth", percent: 65 },
  targeting: {
    includePaths: ["/shop", "/sale"],
    excludePaths: ["/checkout"],
    audience: "logged_in",
  },
  frequency: { strategy: "daily_once", cooldownMinutes: 720 },
  content: {
    title: "Winter sale",
    body: "Up to 40% off",
    templateId: "tpl-1",
    ctaLabel: "Shop now",
    ctaHref: "/sale",
  },
  settings: { placement: "bottom_right", dismissible: false, showOverlay: false },
  createdAt: "2026-03-01",
  updatedAt: "2026-03-02",
  publishedAt: "2026-03-02",
});

describe("popupEditorModel", () => {
  it("createEmptyPopupDraft exposes the documented defaults", () => {
    const draft = createEmptyPopupDraft();
    expect(draft.status).toBe("draft");
    expect(draft.triggerType).toBe("time_delay");
    expect(draft.triggerDelaySeconds).toBe("3");
    expect(draft.triggerPercent).toBe("50");
    expect(draft.audience).toBe("all");
    expect(draft.frequencyStrategy).toBe("session_once");
    expect(draft.placement).toBe("center");
    expect(draft.dismissible).toBe(true);
    expect(draft.showOverlay).toBe(true);
  });

  it("draftFromPopup round-trips every record field into the draft", () => {
    const draft = draftFromPopup(samplePopup());
    expect(draft.name).toBe("Winter Promo");
    expect(draft.slug).toBe("winter-promo");
    expect(draft.status).toBe("published");
    expect(draft.triggerType).toBe("scroll_depth");
    expect(draft.triggerPercent).toBe("65");
    expect(draft.includePathsText).toBe("/shop\n/sale");
    expect(draft.excludePathsText).toBe("/checkout");
    expect(draft.audience).toBe("logged_in");
    expect(draft.frequencyStrategy).toBe("daily_once");
    expect(draft.cooldownMinutesText).toBe("720");
    expect(draft.title).toBe("Winter sale");
    expect(draft.ctaLabel).toBe("Shop now");
    expect(draft.placement).toBe("bottom_right");
    expect(draft.dismissible).toBe(false);
    expect(draft.showOverlay).toBe(false);
  });

  it.each([
    ["time_delay", { type: "time_delay", delaySeconds: 7 }],
    ["exit_intent", { type: "exit_intent" }],
  ] as const)("toPopupInput maps the %j trigger", (triggerType, expected) => {
    const draft = { ...createEmptyPopupDraft(), triggerType };
    if (triggerType === "time_delay") draft.triggerDelaySeconds = "7";
    const input = toPopupInput(draft);
    expect(input.trigger).toEqual(expected);
  });

  it("falls back to safe trigger defaults for unparseable numbers", () => {
    const delay = toPopupInput({
      ...createEmptyPopupDraft(),
      triggerDelaySeconds: "abc",
    });
    expect(delay.trigger).toEqual({ type: "time_delay", delaySeconds: 3 });

    const scroll = toPopupInput({
      ...createEmptyPopupDraft(),
      triggerType: "scroll_depth",
      triggerPercent: "",
    });
    expect(scroll.trigger).toEqual({ type: "scroll_depth", percent: 50 });
  });

  it("cta_click triggers keep a trimmed selector with a documented default", () => {
    expect(
      toPopupInput({
        ...createEmptyPopupDraft(),
        triggerType: "cta_click",
        triggerSelector: "  #signup  ",
      }).trigger
    ).toEqual({ type: "cta_click", selector: "#signup" });
    expect(toPopupInput({ ...createEmptyPopupDraft(), triggerType: "cta_click" }).trigger).toEqual({
      type: "cta_click",
      selector: ".cta-trigger",
    });
  });

  it("splits path text into trimmed non-empty lists", () => {
    const input = toPopupInput({
      ...createEmptyPopupDraft(),
      includePathsText: " /a \n\n/b\n",
      excludePathsText: "\n/c\n \n",
    });
    expect(input.targeting.includePaths).toEqual(["/a", "/b"]);
    expect(input.targeting.excludePaths).toEqual(["/c"]);
  });

  it("normalizes optional content fields and cooldown minutes", () => {
    const empty = toPopupInput(createEmptyPopupDraft());
    expect(empty.slug).toBeNull();
    expect(empty.content.title).toBeNull();
    expect(empty.frequency.cooldownMinutes).toBeNull();

    const filled = toPopupInput({
      ...createEmptyPopupDraft(),
      name: "N",
      slug: " n ",
      cooldownMinutesText: " 45 ",
      title: " T ",
    });
    expect(filled.slug).toBe("n");
    expect(filled.frequency.cooldownMinutes).toBe(45);
    expect(filled.content.title).toBe("T");

    // non-numeric cooldown degrades to null instead of NaN
    const bad = toPopupInput({ ...createEmptyPopupDraft(), cooldownMinutesText: "soon" });
    expect(bad.frequency.cooldownMinutes).toBeNull();
  });

  it("clonePopupDraft produces an independent copy", () => {
    const draft = createEmptyPopupDraft();
    const clone = clonePopupDraft(draft);
    clone.name = "Changed";
    expect(draft.name).toBe("");
    expect(clone).toEqual({ ...draft, name: "Changed" });
  });
});
