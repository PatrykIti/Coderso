import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  TeamAdvancedEditor,
  TeamVisualEditor,
  TeamWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TeamEditors";
import {
  createTeamWidget,
  normalizeTeamData,
  normalizeTeamMemberCount,
  normalizeTeamMembers,
  normalizeTeamSocialLinks,
  teamDefaults,
  teamMemberMax,
  TeamBlock,
  type TeamData,
} from "../../../core/widgets/core/team";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<TeamData>> = () => null;

test("team renders defaults", () => {
  const html = renderToString(<TeamBlock data={teamDefaults} variant="cards" />);

  expect(html).toContain(teamDefaults.header?.title ?? "");
  expect(html).toContain('data-team-variant="cards"');
  expect(html).toContain('data-team-count="3"');
  expect(html).toContain('data-team-header-align="center"');
  expect(html).toContain('data-team-title-size="2xl"');
  expect(html).toContain('data-team-border-width="1"');
  expect(html).toContain('data-team-compact-mobile-bio="show"');
  expect(html).toContain('aria-label="Meet the team"');
});

test("team normalization keeps deterministic ids, bounds, and allows cleared bios", () => {
  const members = normalizeTeamMembers(
    [
      {
        id: "same",
        name: "A",
        role: "R",
        bio: "   ",
        socialLinks: [
          { id: "same-social", label: "LinkedIn", url: "https://example.com/profile" },
          { id: "same-social", label: "", url: "" },
        ],
      },
      { id: "same", name: "", role: "", bio: "" },
    ],
    2
  );

  expect(members).toHaveLength(2);
  expect(members[0]?.id).toBe("same");
  expect(members[0]?.bio).toBeUndefined();
  expect(members[1]?.id).toBe("member-2");
  expect(members[1]?.name).toBeTruthy();
  expect(members[1]?.role).toBeTruthy();

  const socialLinks = normalizeTeamSocialLinks(members[0]?.socialLinks, 2);
  expect(socialLinks[0]?.id).toBe("same-social");
  expect(socialLinks[1]?.id).toBe("social-2");
  expect(socialLinks[1]?.label).toBeTruthy();
  expect(socialLinks[1]?.url).toBeUndefined();

  expect(normalizeTeamMemberCount(999)).toBe(teamMemberMax);
  expect(normalizeTeamMemberCount(0)).toBe(1);

  const normalized = normalizeTeamData({ members: [] });
  expect(normalized.members).toHaveLength(3);
  expect(normalized.style?.columns).toBe("3");
  expect(normalized.style?.compactMobileBio).toBe("show");

  const partialStyle = normalizeTeamData({
    members: [],
    style: {
      compactMobileBio: "hide",
    },
  });
  expect(partialStyle.style?.cardSurface).toBe(teamDefaults.style?.cardSurface);
  expect(partialStyle.style?.cardBorder).toBe(teamDefaults.style?.cardBorder);
  expect(partialStyle.style?.compactMobileBio).toBe("hide");
});

test("team validator accepts expanded model", () => {
  clearWidgets();
  const widget = createTeamWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "team-1",
      type: "team",
      variant: "spotlight",
      data: {
        header: {
          eyebrow: "Leadership",
          title: "Our team",
          description: "People behind product and delivery.",
          align: "left",
          titleSize: "3xl",
        },
        spotlightLeadId: "member-2",
        cta: {
          label: "See all roles",
          url: "/careers",
        },
        members: [
          {
            id: "member-1",
            name: "Anna",
            role: "Head of Product",
            bio: "Leads product strategy.",
            photo: "https://cdn.example.com/anna.jpg",
            socialLinks: [{ id: "social-1", label: "LinkedIn", url: "https://example.com/anna" }],
          },
          {
            id: "member-2",
            name: "Marek",
            role: "Engineering Lead",
            bio: "Owns architecture and release quality.",
            photo: "https://cdn.example.com/marek.jpg",
            socialLinks: [{ id: "social-1", label: "X", url: "https://example.com/marek" }],
          },
        ],
        style: {
          columns: "2",
          gap: "lg",
          sectionBackground: "#faf5ff",
          cardSurface: "#ffffff",
          cardBorder: "#e2e8f0",
          cardBorderWidth: "2",
          radius: "xl",
          compactMobileBio: "hide",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("team renderer covers spotlight lead, CTA, and style controls", () => {
  const html = renderToString(
    <TeamBlock
      data={{
        header: {
          eyebrow: "Leadership",
          title: "Meet the leadership",
          description: "Senior owners across product and engineering.",
          align: "left",
          titleSize: "3xl",
        },
        spotlightLeadId: "member-2",
        cta: {
          label: "See all roles",
          url: "/careers",
        },
        members: [
          {
            id: "member-1",
            name: "Anna Kowalska Product Operations Architecture",
            role: "Head of Product Operations Architecture",
            bio: "Leads roadmap across a long cross-functional product operations scope.",
            socialLinks: [
              {
                label: "LinkedIn Company Leadership Profile",
                url: "https://example.com/anna",
              },
            ],
          },
          {
            id: "member-2",
            name: "Marek",
            role: "Engineering Lead",
            bio: "Owns delivery.",
            socialLinks: [{ label: "X", url: "https://example.com/marek" }],
          },
          {
            id: "member-3",
            name: "Ewa",
            role: "Content Operations",
            bio: "Owns messaging.",
            socialLinks: [{ label: "Website", url: "https://example.com/ewa" }],
          },
        ],
        style: {
          columns: "4",
          gap: "lg",
          sectionBackground: "#f8fafc",
          cardSurface: "#ffffff",
          cardBorder: "#cbd5e1",
          cardBorderWidth: "2",
          radius: "xl",
          compactMobileBio: "hide",
        },
      }}
      variant="spotlight"
    />
  );

  expect(html).toContain('data-team-header-align="left"');
  expect(html).toContain('data-team-title-size="3xl"');
  expect(html).toContain('data-team-border-width="2"');
  expect(html).toContain('data-team-compact-mobile-bio="hide"');
  expect(html).toContain('data-team-cta="true"');
  expect(html).toContain('href="/careers"');
  expect(html).toContain("border-width:2px");
  expect(html).toContain("background-color:#f8fafc");
  expect(html.indexOf("Marek")).toBeLessThan(html.indexOf("Anna"));
  expect(html).toContain("grid-cols-1 sm:grid-cols-2 lg:grid-cols-1");
  expect(html).toContain("break-words");
  expect(html.match(/data-team-spotlight-lead="true"/g)).toHaveLength(1);
  expect(Array.from(html.matchAll(/data-team-member="(\d+)"/g), (match) => match[1])).toEqual([
    "2",
    "1",
    "3",
  ]);
});

test("team compact-list can hide bios visually on mobile", () => {
  const html = renderToString(
    <TeamBlock
      data={{
        header: { title: "Meet the team" },
        members: [
          {
            name: "Ada",
            role: "CTO",
            bio: "Builds release systems.",
            socialLinks: [],
          },
        ],
        style: {
          compactMobileBio: "hide",
        },
      }}
      variant="compact-list"
    />
  );

  expect(html).toContain("sr-only sm:not-sr-only sm:block");
});

test("team social links stay safe and member photos lazy-load", () => {
  const html = renderToString(
    <TeamBlock
      data={{
        header: { title: "Leadership" },
        members: [
          {
            name: "Ada",
            role: "CTO",
            photo: "https://cdn.example.com/ada.jpg",
            socialLinks: [
              { label: "Safe", url: "https://example.com/team/ada" },
              { label: "Unsafe", url: "javascript:alert(1)" },
            ],
          },
        ],
        cta: {
          label: "Broken",
          url: "javascript:alert(1)",
        },
      }}
      variant="spotlight"
    />
  );

  expect(html).toContain('loading="lazy"');
  expect(html).toContain('alt="Photo of Ada, CTO"');
  expect(html).toContain('aria-label="Ada, CTO"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain('data-team-cta="true"');
});

test("team fallback avatars stay decorative while member cards keep accessible names", () => {
  const html = renderToString(
    <TeamBlock
      data={{
        header: { title: "Leadership" },
        members: [
          {
            name: "Bea",
            role: "Design Lead",
            socialLinks: [],
          },
        ],
      }}
      variant="cards"
    />
  );

  expect(html).toContain('aria-label="Bea, Design Lead"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).not.toContain("<img");
});

test("team validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createTeamWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "team-2",
      type: "team",
      variant: "unknown",
      data: teamDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("team wizard renders onboarding fields", () => {
  const html = renderToString(
    <TeamWizardEditor
      value={teamDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Team layout");
  expect(html).toContain("Members count");
  expect(html).toContain("Use Visual to change member count");
});

test("team visual renders section-based IA", () => {
  const html = renderToString(
    <TeamVisualEditor
      value={teamDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and member structure");
  expect(html).toContain("Header copy and CTA");
  expect(html).toContain("Members content and order");
  expect(html).toContain("Section and card style");
  expect(html).toContain("Social links");
});

test("team advanced keeps read-only diagnostics scope", () => {
  const html = renderToString(
    <TeamAdvancedEditor
      value={teamDefaults}
      onChange={() => undefined}
      variant="compact-list"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Layout summary");
  expect(html).toContain("Surface summary");
  expect(html).toContain("Content summary");
  expect(html).toContain("Support actions");
  expect(html).toContain("Card border width");
  expect(html).not.toContain("Raw payload snapshot");
  expect(html).not.toContain("Members content and order");
});
