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
  expect(html).toContain('aria-label="Meet the team"');
});

test("team normalization keeps deterministic ids and bounds", () => {
  const members = normalizeTeamMembers(
    [
      {
        id: "same",
        name: "A",
        role: "R",
        bio: "B",
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
          title: "Our team",
          description: "People behind product and delivery.",
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
          cardSurface: "#ffffff",
          cardBorder: "#e2e8f0",
          radius: "xl",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("team cleared card surfaces omit card background and border color styles", () => {
  const normalized = normalizeTeamData({
    ...teamDefaults,
    style: {},
  });
  const html = renderToString(<TeamBlock data={normalized} variant="cards" />);

  expect(normalized.style?.cardSurface).toBeUndefined();
  expect(normalized.style?.cardBorder).toBeUndefined();
  expect(html).toContain('data-team-variant="cards"');
  expect(html).not.toContain("background-color:");
  expect(html).not.toContain("border-color:");
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
      }}
      variant="spotlight"
    />
  );

  expect(html).toContain('loading="lazy"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain("javascript:");
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
  expect(html).toContain("Primary member names");
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
  expect(html).toContain("Header copy");
  expect(html).toContain("Members content and order");
  expect(html).toContain("Social links");
  expect(html).toContain("Card and layout style");
});

test("team advanced keeps technical-only scope", () => {
  const html = renderToString(
    <TeamAdvancedEditor
      value={teamDefaults}
      onChange={() => undefined}
      variant="compact-list"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Technical layout tokens");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Members content and order");
});
