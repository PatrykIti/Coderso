import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref, resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type TeamVariantId = "cards" | "compact-list" | "spotlight";
export type TeamColumns = "1" | "2" | "3" | "4";
export type TeamGap = "none" | "sm" | "md" | "lg";
export type TeamRadius = "none" | "md" | "lg" | "xl";
export type TeamHeaderAlign = "left" | "center" | "right";
export type TeamHeaderTitleSize = "xl" | "2xl" | "3xl";
export type TeamBorderWidth = "0" | "1" | "2" | "3";
export type TeamCompactMobileBio = "show" | "hide";

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
    eyebrow?: string;
    title?: string;
    description?: string;
    align?: TeamHeaderAlign;
    titleSize?: TeamHeaderTitleSize;
  };
  members: TeamMember[];
  spotlightLeadId?: string;
  cta?: {
    label?: string;
    url?: string;
  };
  style?: {
    columns?: TeamColumns;
    gap?: TeamGap;
    sectionBackground?: string;
    cardSurface?: string;
    cardBorder?: string;
    cardBorderWidth?: TeamBorderWidth;
    radius?: TeamRadius;
    compactMobileBio?: TeamCompactMobileBio;
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
  "2": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1",
  "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1",
};

const radiusClassMap: Record<TeamRadius, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

const titleSizeClassMap: Record<TeamHeaderTitleSize, string> = {
  xl: "text-xl sm:text-2xl",
  "2xl": "text-2xl sm:text-3xl",
  "3xl": "text-3xl sm:text-4xl",
};

const headerAlignClassMap: Record<TeamHeaderAlign, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const ctaAlignClassMap: Record<TeamHeaderAlign, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const borderWidthStyleMap: Record<TeamBorderWidth, string> = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
};

const teamMemberMin = 1;
export const teamMemberMax = 12;
export const teamSocialLinksMax = 5;

const hasOwn = (value: object, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);

export const teamSchema = {
  type: "object",
  additionalProperties: false,
  required: ["members"],
  properties: {
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        eyebrow: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        align: { enum: ["left", "center", "right"] },
        titleSize: { enum: ["xl", "2xl", "3xl"] },
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
    spotlightLeadId: { type: "string" },
    cta: {
      type: "object",
      additionalProperties: false,
      properties: {
        label: { type: "string" },
        url: { type: "string" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        columns: { enum: ["1", "2", "3", "4"] },
        gap: { enum: ["none", "sm", "md", "lg"] },
        sectionBackground: { type: "string" },
        cardSurface: { type: "string" },
        cardBorder: { type: "string" },
        cardBorderWidth: { enum: ["0", "1", "2", "3"] },
        radius: { enum: ["none", "md", "lg", "xl"] },
        compactMobileBio: { enum: ["show", "hide"] },
      },
    },
  },
};

export const teamDefaults: TeamData = {
  header: {
    eyebrow: "",
    title: "Meet the team",
    description: "Introduce key people behind delivery, support, and strategy.",
    align: "center",
    titleSize: "2xl",
  },
  members: [
    {
      id: "member-1",
      name: "Anna Kowalska",
      role: "Head of Product",
      bio: "Drives product direction and aligns roadmap with customer goals.",
      photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
      socialLinks: [
        { id: "social-1", label: "LinkedIn", url: "https://www.linkedin.com/in/anna-kowalska" },
        { id: "social-2", label: "X", url: "https://x.com/anna_kowalska" },
      ],
    },
    {
      id: "member-2",
      name: "Marek Nowak",
      role: "Engineering Lead",
      bio: "Owns platform reliability and release workflows across environments.",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
      socialLinks: [
        { id: "social-1", label: "LinkedIn", url: "https://www.linkedin.com/in/marek-nowak" },
      ],
    },
    {
      id: "member-3",
      name: "Ewa Zielinska",
      role: "Content Operations",
      bio: "Turns strategy into clear, conversion-focused content systems.",
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
      socialLinks: [
        { id: "social-1", label: "LinkedIn", url: "https://www.linkedin.com/in/ewa-zielinska" },
      ],
    },
  ],
  style: {
    columns: "3",
    gap: "md",
    sectionBackground: undefined,
    cardSurface: "var(--color-bg)",
    cardBorder: "var(--color-border)",
    cardBorderWidth: "1",
    radius: "lg",
    compactMobileBio: "show",
  },
};

export const teamEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "team.wizard.starter-team",
      title: "Starter team",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["members.count"],
    },
    {
      mode: "visual",
      id: "team.visual.variant-member-structure",
      title: "Variant and member structure",
      role: "visual",
      writablePaths: ["variant", "members.count"],
    },
    {
      mode: "visual",
      id: "team.visual.header-cta",
      title: "Header copy and CTA",
      role: "content",
      writablePaths: ["header", "cta"],
    },
    {
      mode: "visual",
      id: "team.visual.members-content-order",
      title: "Members content and order",
      role: "content",
      writablePaths: [
        "members.*.name",
        "members.*.role",
        "members.*.bio",
        "members.*.photo",
        "members.*.socialLinks",
        "spotlightLeadId",
      ],
    },
    {
      mode: "visual",
      id: "team.visual.section-card-style",
      title: "Section and card style",
      role: "visual",
      writablePaths: [
        "style.columns",
        "style.gap",
        "style.sectionBackground",
        "style.cardSurface",
        "style.cardBorder",
        "style.cardBorderWidth",
        "style.radius",
        "style.compactMobileBio",
      ],
    },
    {
      mode: "advanced",
      id: "team.advanced.layout-summary",
      title: "Layout summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "variant",
        "style.columns",
        "style.gap",
        "style.radius",
        "style.cardBorderWidth",
        "style.compactMobileBio",
      ],
    },
    {
      mode: "advanced",
      id: "team.advanced.surface-summary",
      title: "Surface summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["style.sectionBackground", "style.cardSurface", "style.cardBorder"],
    },
    {
      mode: "advanced",
      id: "team.advanced.content-summary",
      title: "Content summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["header", "members", "spotlightLeadId", "cta"],
    },
    {
      mode: "advanced",
      id: "team.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["editorContract"],
    },
  ],
};

const createMemberId = (index: number) => `member-${index + 1}`;
const createSocialLinkId = (index: number) => `social-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value.trim() : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const resolveTeamColumns = (value: string | undefined): TeamColumns => {
  if (value === "1" || value === "2" || value === "3" || value === "4") return value;
  return "3";
};

const resolveTeamGap = (value: string | undefined): TeamGap => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg") return value;
  return "md";
};

const resolveTeamRadius = (value: string | undefined): TeamRadius => {
  if (value === "none" || value === "md" || value === "lg" || value === "xl") return value;
  return "lg";
};

const resolveTeamHeaderAlign = (value: string | undefined): TeamHeaderAlign => {
  if (value === "left" || value === "center" || value === "right") return value;
  return "center";
};

const resolveTeamHeaderTitleSize = (value: string | undefined): TeamHeaderTitleSize => {
  if (value === "xl" || value === "2xl" || value === "3xl") return value;
  return "2xl";
};

const resolveTeamBorderWidth = (value: string | undefined): TeamBorderWidth => {
  if (value === "0" || value === "1" || value === "2" || value === "3") return value;
  return "1";
};

export const resolveTeamCompactMobileBio = (value: string | undefined): TeamCompactMobileBio =>
  value === "hide" ? "hide" : "show";

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
      url: typeof base.url === "string" && base.url.trim().length > 0 ? base.url.trim() : undefined,
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

    const rawBio = typeof base.bio === "string" ? base.bio.trim() : undefined;

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
        rawBio !== undefined
          ? rawBio || undefined
          : hasOwn(base, "bio")
            ? undefined
            : (fallbackBios[index] ?? "Short bio describing responsibilities and value."),
      photo: resolveOptionalString(base.photo),
      socialLinks: normalizeTeamSocialLinks(base.socialLinks),
    });
  }

  return normalized;
}

const resolveSpotlightLeadId = (candidate: string | undefined, members: TeamMember[]) => {
  const trimmed = resolveOptionalString(candidate);
  if (!trimmed) return undefined;
  return members.some((member) => member.id === trimmed) ? trimmed : undefined;
};

const normalizeTeamCta = (value: TeamData["cta"] | undefined) => {
  if (!value) return undefined;
  return {
    label: resolveString(value.label, ""),
    url: resolveString(value.url, ""),
  };
};

export function normalizeTeamData(data: TeamData): TeamData {
  const headerDefaults = teamDefaults.header ?? {
    eyebrow: "",
    title: "",
    description: "",
    align: "center",
    titleSize: "2xl",
  };
  const styleDefaults = teamDefaults.style ?? {
    columns: "3",
    gap: "md",
    sectionBackground: undefined,
    cardSurface: "var(--color-bg)",
    cardBorder: "var(--color-border)",
    cardBorderWidth: "1",
    radius: "lg",
    compactMobileBio: "show",
  };
  const normalizedMembers = normalizeTeamMembers(data.members);
  const styleSource = data.style ?? {};

  return {
    ...data,
    header: {
      eyebrow: resolveString(data.header?.eyebrow, headerDefaults.eyebrow ?? ""),
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
      align: resolveTeamHeaderAlign(data.header?.align ?? headerDefaults.align),
      titleSize: resolveTeamHeaderTitleSize(data.header?.titleSize ?? headerDefaults.titleSize),
    },
    members: normalizedMembers,
    spotlightLeadId: resolveSpotlightLeadId(data.spotlightLeadId, normalizedMembers),
    cta: normalizeTeamCta(data.cta),
    style: {
      columns: resolveTeamColumns(data.style?.columns),
      gap: resolveTeamGap(data.style?.gap),
      sectionBackground: hasOwn(styleSource, "sectionBackground")
        ? (resolveClearableStyleValue(data.style?.sectionBackground) ?? "")
        : styleDefaults.sectionBackground,
      cardSurface: hasOwn(styleSource, "cardSurface")
        ? (resolveClearableStyleValue(data.style?.cardSurface) ?? "")
        : styleDefaults.cardSurface,
      cardBorder: hasOwn(styleSource, "cardBorder")
        ? (resolveClearableStyleValue(data.style?.cardBorder) ?? "")
        : styleDefaults.cardBorder,
      cardBorderWidth: resolveTeamBorderWidth(
        data.style?.cardBorderWidth ?? styleDefaults.cardBorderWidth
      ),
      radius: resolveTeamRadius(data.style?.radius),
      compactMobileBio: resolveTeamCompactMobileBio(
        data.style?.compactMobileBio ?? styleDefaults.compactMobileBio
      ),
    },
  };
}

function resolveTeamMemberIdentityLabel(name: string, role?: string) {
  const identityParts = [name.trim(), (role ?? "").trim()].filter((part) => part.length > 0);
  return identityParts.join(", ");
}

function resolveTeamAvatarAlt(name: string, role?: string) {
  const memberIdentityLabel = resolveTeamMemberIdentityLabel(name, role);
  return `Photo of ${memberIdentityLabel || name}`;
}

function Avatar({
  name,
  photo,
  radius,
  role,
}: {
  name: string;
  photo?: string;
  radius: TeamRadius;
  role?: string;
}) {
  const baseClassName = joinClasses(
    "h-16 w-16 border border-[var(--color-border)] object-cover",
    radiusClassMap[radius]
  );
  const safePhoto = normalizeWidgetSafeHref(photo, {
    allowRelative: true,
    allowHttp: true,
  });
  if (safePhoto) {
    return (
      <img
        src={safePhoto}
        alt={resolveTeamAvatarAlt(name, role)}
        loading="lazy"
        className={baseClassName}
      />
    );
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
  const renderableLinks = links.flatMap((link, index) => {
    const linkAttrs = resolveWidgetLinkAttrs(link.url, {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
      openExternalInNewTab: true,
    });
    if (!linkAttrs) return [];
    return [{ index, link, linkAttrs }] as const;
  });
  if (renderableLinks.length === 0) return null;
  return (
    <ul className="mt-3 flex min-w-0 flex-wrap gap-2 text-xs">
      {renderableLinks.map(({ index, link, linkAttrs }) => (
        <li key={link.id ?? `social-link-${index + 1}`} className="min-w-0">
          <a
            {...linkAttrs}
            className="inline-flex max-w-full break-words rounded-md border border-[var(--color-border)] px-2 py-1 text-[var(--color-text)]/80 transition hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
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
  compactMobileBio,
}: {
  member: TeamMember;
  index: number;
  radius: TeamRadius;
  cardStyle: CSSProperties;
  compact: boolean;
  spotlightLead: boolean;
  compactMobileBio: TeamCompactMobileBio;
}) {
  const socialLinks = normalizeTeamSocialLinks(member.socialLinks);
  const name = member.name ?? "Team Member";
  const role = member.role ?? "Role";
  const roleText = member.role?.trim();
  const memberIdentityLabel = resolveTeamMemberIdentityLabel(name, roleText);
  const trimmedBio = member.bio?.trim();
  const bioClassName =
    compact && compactMobileBio === "hide"
      ? "mt-2 break-words text-sm text-[var(--color-text)]/80 sr-only sm:not-sr-only sm:block"
      : "mt-2 break-words text-sm text-[var(--color-text)]/80";

  return (
    <article
      aria-label={memberIdentityLabel || name}
      className={joinClasses(
        "min-w-0 border p-4",
        radiusClassMap[radius],
        compact ? "flex flex-col gap-4 sm:flex-row sm:items-start" : "space-y-3",
        spotlightLead ? "p-6" : undefined
      )}
      style={cardStyle}
      data-team-member={String(index + 1)}
      data-team-social-count={String(socialLinks.length)}
      data-team-spotlight-lead={String(spotlightLead)}
    >
      <Avatar name={name} photo={member.photo} radius={radius} role={roleText} />
      <div className={joinClasses("min-w-0", compact ? "flex-1" : undefined)}>
        <h4
          className={joinClasses(
            "break-words font-semibold text-[var(--color-text)]",
            spotlightLead ? "text-2xl" : "text-lg"
          )}
        >
          {name}
        </h4>
        <p className="break-words text-sm text-[var(--color-text)]/75">{role}</p>
        {trimmedBio ? <p className={bioClassName}>{trimmedBio}</p> : null}
        <SocialLinks links={socialLinks} />
      </div>
    </article>
  );
}

function TeamCta({
  cta,
  align,
}: {
  cta: NonNullable<TeamData["cta"]> | undefined;
  align: TeamHeaderAlign;
}) {
  const label = cta?.label?.trim() ?? "";
  const linkAttrs = resolveWidgetLinkAttrs(cta?.url, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openExternalInNewTab: true,
  });
  if (!label || !linkAttrs) return null;
  return (
    <div className={joinClasses("mt-6 flex", ctaAlignClassMap[align])}>
      <a
        {...linkAttrs}
        className="inline-flex items-center rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        data-team-cta="true"
      >
        {label}
      </a>
    </div>
  );
}

export function TeamBlock({ data, variant }: { data: TeamData; variant: string }) {
  const resolvedVariant = resolveTeamVariant(variant);
  const normalized = normalizeTeamData(data);
  const style = normalized.style ?? teamDefaults.style!;
  const members = normalized.members;

  const columns = resolveTeamColumns(style.columns);
  const gap = resolveTeamGap(style.gap);
  const radius = resolveTeamRadius(style.radius);
  const headerAlign = resolveTeamHeaderAlign(
    normalized.header?.align ?? teamDefaults.header?.align
  );
  const titleSize = resolveTeamHeaderTitleSize(
    normalized.header?.titleSize ?? teamDefaults.header?.titleSize
  );
  const borderWidth = resolveTeamBorderWidth(
    style.cardBorderWidth ?? teamDefaults.style?.cardBorderWidth
  );
  const compactMobileBio = resolveTeamCompactMobileBio(style.compactMobileBio);
  const cardStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.cardSurface),
      borderColor: resolveClearableStyleValue(style.cardBorder),
      borderStyle: "solid",
      borderWidth: borderWidthStyleMap[borderWidth],
    }) ?? {};
  const sectionStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.sectionBackground),
    }) ?? {};

  const showHeader =
    (normalized.header?.eyebrow ?? "").trim().length > 0 ||
    (normalized.header?.title ?? "").trim().length > 0 ||
    (normalized.header?.description ?? "").trim().length > 0;

  const spotlightLeadId = resolveSpotlightLeadId(normalized.spotlightLeadId, members);
  const spotlightLead =
    members.find((member) => member.id === spotlightLeadId) ?? members[0] ?? undefined;
  const spotlightRest = spotlightLead
    ? members.filter((member) => member.id !== spotlightLead.id)
    : [];

  return (
    <section
      aria-label={(normalized.header?.title ?? "").trim() || "Team section"}
      className="mx-auto w-full max-w-6xl px-4 py-8"
      style={sectionStyle}
      data-team-variant={resolvedVariant}
      data-team-count={String(members.length)}
      data-team-columns={columns}
      data-team-gap={gap}
      data-team-radius={radius}
      data-team-header-align={headerAlign}
      data-team-title-size={titleSize}
      data-team-border-width={borderWidth}
      data-team-compact-mobile-bio={compactMobileBio}
    >
      {showHeader ? (
        <header
          className={joinClasses(
            "mx-auto mb-6 flex max-w-3xl flex-col gap-2",
            headerAlignClassMap[headerAlign]
          )}
        >
          {(normalized.header?.eyebrow ?? "").trim().length > 0 ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text)]/60">
              {normalized.header?.eyebrow}
            </p>
          ) : null}
          {(normalized.header?.title ?? "").trim().length > 0 ? (
            <h2
              className={joinClasses(
                titleSizeClassMap[titleSize],
                "font-semibold text-[var(--color-text)]"
              )}
            >
              {normalized.header?.title}
            </h2>
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
              compactMobileBio={compactMobileBio}
            />
          ))}
        </div>
      ) : resolvedVariant === "spotlight" ? (
        <div className={joinClasses("grid grid-cols-1 lg:grid-cols-3", gapClassMap[gap])}>
          <div className="lg:col-span-2">
            {spotlightLead ? (
              <MemberCard
                member={spotlightLead}
                index={members.findIndex((member) => member.id === spotlightLead.id)}
                radius={radius}
                cardStyle={cardStyle}
                compact={false}
                spotlightLead
                compactMobileBio={compactMobileBio}
              />
            ) : null}
          </div>
          <div
            className={joinClasses("grid", spotlightRestColumnsClassMap[columns], gapClassMap[gap])}
          >
            {spotlightRest.map((member, index) => (
              <MemberCard
                key={member.id ?? `team-spotlight-rest-${index + 1}`}
                member={member}
                index={members.findIndex((candidate) => candidate.id === member.id)}
                radius={radius}
                cardStyle={cardStyle}
                compact={false}
                spotlightLead={false}
                compactMobileBio={compactMobileBio}
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
              compactMobileBio={compactMobileBio}
            />
          ))}
        </div>
      )}

      <TeamCta cta={normalized.cta} align={headerAlign} />
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
    editorContract: teamEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: TeamBlock,
  };
}
