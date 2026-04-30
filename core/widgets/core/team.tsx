import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type TeamVariantId = "cards" | "compact-list" | "spotlight";
export type TeamColumns = "1" | "2" | "3" | "4";
export type TeamGap = "none" | "sm" | "md" | "lg";
export type TeamRadius = "none" | "md" | "lg" | "xl";

export type TeamSocialLink = {
  id?: string;
  label?: string;
  url?: string;
};

export type TeamMember = {
  id?: string;
  name?: string;
  role?: string;
  bio?: string;
  photo?: string;
  socialLinks?: TeamSocialLink[];
};

export type TeamData = {
  header?: {
    title?: string;
    description?: string;
  };
  members: TeamMember[];
  style?: {
    columns?: TeamColumns;
    gap?: TeamGap;
    cardSurface?: string;
    cardBorder?: string;
    radius?: TeamRadius;
  };
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const gapClassMap: Record<TeamGap, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const columnsClassMap: Record<TeamColumns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const spotlightRestColumnsClassMap: Record<TeamColumns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2",
  "4": "grid-cols-1 sm:grid-cols-2",
};

const radiusClassMap: Record<TeamRadius, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

const teamMemberMin = 1;
export const teamMemberMax = 12;
export const teamSocialLinksMax = 5;

export const teamSchema = {
  type: "object",
  additionalProperties: false,
  required: ["members"],
  properties: {
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    members: {
      type: "array",
      minItems: teamMemberMin,
      maxItems: teamMemberMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string" },
          bio: { type: "string" },
          photo: { type: "string" },
          socialLinks: {
            type: "array",
            maxItems: teamSocialLinksMax,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                url: { type: "string" },
              },
            },
          },
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        columns: { enum: ["1", "2", "3", "4"] },
        gap: { enum: ["none", "sm", "md", "lg"] },
        cardSurface: { type: "string" },
        cardBorder: { type: "string" },
        radius: { enum: ["none", "md", "lg", "xl"] },
      },
    },
  },
};

export const teamDefaults: TeamData = {
  header: {
    title: "Meet the team",
    description: "Introduce key people behind delivery, support, and strategy.",
  },
  members: [
    {
      id: "member-1",
      name: "Anna Kowalska",
      role: "Head of Product",
      bio: "Drives product direction and aligns roadmap with customer goals.",
      photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
      socialLinks: [
        { id: "social-1", label: "LinkedIn", url: "#" },
        { id: "social-2", label: "X", url: "#" },
      ],
    },
    {
      id: "member-2",
      name: "Marek Nowak",
      role: "Engineering Lead",
      bio: "Owns platform reliability and release workflows across environments.",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
      socialLinks: [{ id: "social-1", label: "LinkedIn", url: "#" }],
    },
    {
      id: "member-3",
      name: "Ewa Zielinska",
      role: "Content Operations",
      bio: "Turns strategy into clear, conversion-focused content systems.",
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
      socialLinks: [{ id: "social-1", label: "LinkedIn", url: "#" }],
    },
  ],
  style: {
    columns: "3",
    gap: "md",
    cardSurface: "var(--color-bg)",
    cardBorder: "var(--color-border)",
    radius: "lg",
  },
};

const createMemberId = (index: number) => `member-${index + 1}`;
const createSocialLinkId = (index: number) => `social-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolveTeamColumns = (value: string | undefined): TeamColumns => {
  if (value === "1" || value === "2" || value === "4") return value;
  return "3";
};

const resolveTeamGap = (value: string | undefined): TeamGap => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveTeamRadius = (value: string | undefined): TeamRadius => {
  if (value === "none" || value === "md" || value === "xl") return value;
  return "lg";
};

export const resolveTeamVariant = (variant: string): TeamVariantId => {
  if (variant === "compact-list" || variant === "spotlight") return variant;
  return "cards";
};

export const normalizeTeamMemberCount = (value: number) => {
  if (!Number.isFinite(value)) return teamDefaults.members.length;
  return Math.min(teamMemberMax, Math.max(teamMemberMin, Math.floor(value)));
};

export function normalizeTeamSocialLinks(
  links: TeamSocialLink[] | undefined,
  desiredCount?: number
): TeamSocialLink[] {
  const source = Array.isArray(links) ? links : [];
  const fallbackLabels = ["LinkedIn", "X", "GitHub", "Website", "Email"];
  const targetCount =
    typeof desiredCount === "number"
      ? Math.min(teamSocialLinksMax, Math.max(0, Math.floor(desiredCount)))
      : Math.min(teamSocialLinksMax, Math.max(0, source.length));

  const normalized: TeamSocialLink[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};
    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createSocialLinkId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`social-${candidate}`)) {
        candidate += 1;
      }
      id = `social-${candidate}`;
    }
    usedIds.add(id);

    normalized.push({
      id,
      label:
        typeof base.label === "string" && base.label.trim().length > 0
          ? base.label.trim()
          : (fallbackLabels[index] ?? `Social ${index + 1}`),
      url: typeof base.url === "string" && base.url.trim().length > 0 ? base.url.trim() : "#",
    });
  }

  return normalized;
}

export function normalizeTeamMembers(
  members: TeamMember[] | undefined,
  desiredCount?: number
): TeamMember[] {
  const source = Array.isArray(members) ? members : [];
  const fallbackNames = [
    "Team Member 1",
    "Team Member 2",
    "Team Member 3",
    "Team Member 4",
    "Team Member 5",
  ];
  const fallbackRoles = ["Role", "Role", "Role", "Role", "Role"];
  const fallbackBios = [
    "Short bio describing responsibilities and value.",
    "Short bio describing responsibilities and value.",
    "Short bio describing responsibilities and value.",
    "Short bio describing responsibilities and value.",
    "Short bio describing responsibilities and value.",
  ];

  const targetCount =
    typeof desiredCount === "number"
      ? normalizeTeamMemberCount(desiredCount)
      : normalizeTeamMemberCount(source.length > 0 ? source.length : teamDefaults.members.length);

  const normalized: TeamMember[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};
    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createMemberId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`member-${candidate}`)) {
        candidate += 1;
      }
      id = `member-${candidate}`;
    }
    usedIds.add(id);

    normalized.push({
      id,
      name:
        typeof base.name === "string" && base.name.trim().length > 0
          ? base.name.trim()
          : (fallbackNames[index] ?? `Team Member ${index + 1}`),
      role:
        typeof base.role === "string" && base.role.trim().length > 0
          ? base.role.trim()
          : (fallbackRoles[index] ?? "Role"),
      bio:
        typeof base.bio === "string" && base.bio.trim().length > 0
          ? base.bio.trim()
          : (fallbackBios[index] ?? "Short bio describing responsibilities and value."),
      photo: resolveOptionalString(base.photo),
      socialLinks: normalizeTeamSocialLinks(base.socialLinks),
    });
  }

  return normalized;
}

export function normalizeTeamData(data: TeamData): TeamData {
  const headerDefaults = teamDefaults.header ?? {
    title: "",
    description: "",
  };
  const styleDefaults = teamDefaults.style ?? {
    columns: "3",
    gap: "md",
    cardSurface: "var(--color-bg)",
    cardBorder: "var(--color-border)",
    radius: "lg",
  };
  const hasStyleObject = data.style !== undefined;

  return {
    ...data,
    header: {
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
    },
    members: normalizeTeamMembers(data.members),
    style: {
      columns: resolveTeamColumns(data.style?.columns),
      gap: resolveTeamGap(data.style?.gap),
      cardSurface: hasStyleObject
        ? resolveClearableStyleValue(data.style?.cardSurface)
        : styleDefaults.cardSurface,
      cardBorder: hasStyleObject
        ? resolveClearableStyleValue(data.style?.cardBorder)
        : styleDefaults.cardBorder,
      radius: resolveTeamRadius(data.style?.radius),
    },
  };
}

function Avatar({ name, photo, radius }: { name: string; photo?: string; radius: TeamRadius }) {
  const baseClassName = joinClasses(
    "h-16 w-16 border border-[var(--color-border)] object-cover",
    radiusClassMap[radius]
  );
  if (typeof photo === "string" && photo.trim().length > 0) {
    return <img src={photo} alt={name} className={baseClassName} />;
  }

  return (
    <span
      className={joinClasses(
        "inline-flex h-16 w-16 items-center justify-center border border-[var(--color-border)] text-lg font-semibold text-[var(--color-text)]",
        radiusClassMap[radius]
      )}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function SocialLinks({ links }: { links: TeamSocialLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2 text-xs">
      {links.map((link, index) => (
        <li key={link.id ?? `social-link-${index + 1}`}>
          <a
            href={link.url ?? "#"}
            className="inline-flex rounded-md border border-[var(--color-border)] px-2 py-1 text-[var(--color-text)]/80 transition hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function MemberCard({
  member,
  index,
  radius,
  cardStyle,
  compact,
  spotlightLead,
}: {
  member: TeamMember;
  index: number;
  radius: TeamRadius;
  cardStyle: CSSProperties;
  compact: boolean;
  spotlightLead: boolean;
}) {
  const socialLinks = normalizeTeamSocialLinks(member.socialLinks);
  const name = member.name ?? "Team Member";
  const role = member.role ?? "Role";

  return (
    <article
      className={joinClasses(
        "border p-4",
        radiusClassMap[radius],
        compact ? "flex flex-col gap-4 sm:flex-row sm:items-start" : "space-y-3",
        spotlightLead ? "p-6" : undefined
      )}
      style={cardStyle}
      data-team-member={String(index + 1)}
      data-team-social-count={String(socialLinks.length)}
      data-team-spotlight-lead={String(spotlightLead)}
    >
      <Avatar name={name} photo={member.photo} radius={radius} />
      <div className={joinClasses("min-w-0", compact ? "flex-1" : undefined)}>
        <h4
          className={joinClasses(
            "font-semibold text-[var(--color-text)]",
            spotlightLead ? "text-2xl" : "text-lg"
          )}
        >
          {name}
        </h4>
        <p className="text-sm text-[var(--color-text)]/75">{role}</p>
        {(member.bio ?? "").trim().length > 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text)]/80">{member.bio}</p>
        ) : null}
        <SocialLinks links={socialLinks} />
      </div>
    </article>
  );
}

export function TeamBlock({ data, variant }: { data: TeamData; variant: string }) {
  const resolvedVariant = resolveTeamVariant(variant);
  const normalized = normalizeTeamData(data);
  const style = normalized.style ?? teamDefaults.style!;
  const members = normalizeTeamMembers(normalized.members);

  const columns = resolveTeamColumns(style.columns);
  const gap = resolveTeamGap(style.gap);
  const radius = resolveTeamRadius(style.radius);
  const cardStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.cardSurface),
      borderColor: resolveClearableStyleValue(style.cardBorder),
      borderStyle: "solid",
      borderWidth: "1px",
    }) ?? {};

  const showHeader =
    (normalized.header?.title ?? "").trim().length > 0 ||
    (normalized.header?.description ?? "").trim().length > 0;

  const spotlightLead = members[0];
  const spotlightRest = members.slice(1);

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      data-team-variant={resolvedVariant}
      data-team-count={String(members.length)}
      data-team-columns={columns}
      data-team-gap={gap}
      data-team-radius={radius}
    >
      {showHeader ? (
        <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center">
          {(normalized.header?.title ?? "").trim().length > 0 ? (
            <h3 className="text-2xl font-semibold text-[var(--color-text)]">
              {normalized.header?.title}
            </h3>
          ) : null}
          {(normalized.header?.description ?? "").trim().length > 0 ? (
            <p className="text-sm text-[var(--color-text)]/75">{normalized.header?.description}</p>
          ) : null}
        </header>
      ) : null}

      {resolvedVariant === "compact-list" ? (
        <div className={joinClasses("flex flex-col", gapClassMap[gap])}>
          {members.map((member, index) => (
            <MemberCard
              key={member.id ?? `team-member-${index + 1}`}
              member={member}
              index={index}
              radius={radius}
              cardStyle={cardStyle}
              compact
              spotlightLead={false}
            />
          ))}
        </div>
      ) : resolvedVariant === "spotlight" ? (
        <div className={joinClasses("grid grid-cols-1 lg:grid-cols-3", gapClassMap[gap])}>
          <div className="lg:col-span-2">
            <MemberCard
              member={spotlightLead ?? {}}
              index={0}
              radius={radius}
              cardStyle={cardStyle}
              compact={false}
              spotlightLead
            />
          </div>
          <div
            className={joinClasses("grid", spotlightRestColumnsClassMap[columns], gapClassMap[gap])}
          >
            {spotlightRest.map((member, index) => (
              <MemberCard
                key={member.id ?? `team-spotlight-rest-${index + 1}`}
                member={member}
                index={index + 1}
                radius={radius}
                cardStyle={cardStyle}
                compact={false}
                spotlightLead={false}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={joinClasses("grid", columnsClassMap[columns], gapClassMap[gap])}>
          {members.map((member, index) => (
            <MemberCard
              key={member.id ?? `team-card-${index + 1}`}
              member={member}
              index={index}
              radius={radius}
              cardStyle={cardStyle}
              compact={false}
              spotlightLead={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function createTeamWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<TeamData>>;
  visual: ComponentType<WidgetEditorProps<TeamData>>;
  advanced: ComponentType<WidgetEditorProps<TeamData>>;
}): WidgetDefinition<TeamData> {
  return {
    type: "team",
    title: "Team",
    description: "Member section with profile cards, roles, and social links.",
    category: "content",
    variants: [
      {
        id: "cards",
        label: "Cards",
        description: "Responsive team card grid.",
      },
      {
        id: "compact-list",
        label: "Compact List",
        description: "Stacked profile list with compact layout.",
      },
      {
        id: "spotlight",
        label: "Spotlight",
        description: "One highlighted profile with supporting members.",
      },
    ],
    schema: teamSchema,
    defaults: teamDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: TeamBlock,
  };
}
