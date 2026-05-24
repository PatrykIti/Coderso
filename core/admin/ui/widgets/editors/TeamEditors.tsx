import { type ReactNode, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listMediaCached } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { cn } from "@/lib/utils";

import {
  normalizeTeamData,
  normalizeTeamMemberCount,
  normalizeTeamMembers,
  normalizeTeamSocialLinks,
  resolveTeamCompactMobileBio,
  resolveTeamVariant,
  teamDefaults,
  teamMemberMax,
  teamSocialLinksMax,
  type TeamBorderWidth,
  type TeamColumns,
  type TeamCompactMobileBio,
  type TeamData,
  type TeamGap,
  type TeamHeaderAlign,
  type TeamHeaderTitleSize,
  type TeamMember,
  type TeamRadius,
  type TeamSocialLink,
  type TeamVariantId,
} from "../../../../widgets/core/team";
import { normalizeWidgetSafeHref } from "../../../../widgets/core/widgetSafeHref";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader, resolveColorContrastAdvisory } from "./ClearableFields";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import { WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: TeamVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "cards",
    label: "Cards",
    description: "Responsive cards grid for equal profile emphasis.",
  },
  {
    id: "compact-list",
    label: "Compact List",
    description: "Stacked rows for denser team information.",
  },
  {
    id: "spotlight",
    label: "Spotlight",
    description: "Lead profile with supporting member profiles.",
  },
];

const columnsOptions: Array<{ id: TeamColumns; label: string }> = [
  { id: "1", label: "1 column" },
  { id: "2", label: "2 columns" },
  { id: "3", label: "3 columns" },
  { id: "4", label: "4 columns" },
];

const gapOptions: Array<{ id: TeamGap; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const radiusOptions: Array<{ id: TeamRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const headerAlignOptions: Array<{ id: TeamHeaderAlign; label: string }> = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const titleSizeOptions: Array<{ id: TeamHeaderTitleSize; label: string }> = [
  { id: "xl", label: "XL" },
  { id: "2xl", label: "2XL" },
  { id: "3xl", label: "3XL" },
];

const borderWidthOptions: Array<{ id: TeamBorderWidth; label: string }> = [
  { id: "0", label: "0px" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const compactMobileBioOptions: Array<{ id: TeamCompactMobileBio; label: string }> = [
  { id: "show", label: "Show on mobile" },
  { id: "hide", label: "Hide visually on mobile" },
];

const memberCountOptions = Array.from({ length: teamMemberMax }, (_, index) => String(index + 1));
const estimatedTeamTextColor = "#111827";

type TeamSocialPlatform = "linkedin" | "x" | "github" | "instagram" | "facebook" | "youtube";

const teamSocialPlatformOptions: Array<{
  id: TeamSocialPlatform;
  label: string;
  placeholder: string;
}> = [
  { id: "linkedin", label: "LinkedIn", placeholder: "in/ada-lovelace" },
  { id: "x", label: "X", placeholder: "ada_lovelace" },
  { id: "github", label: "GitHub", placeholder: "ada-lovelace" },
  { id: "instagram", label: "Instagram", placeholder: "ada_lovelace" },
  { id: "facebook", label: "Facebook", placeholder: "ada.lovelace" },
  { id: "youtube", label: "YouTube", placeholder: "ada-lovelace" },
];

const teamSocialPlatformLabels = Object.fromEntries(
  teamSocialPlatformOptions.map((option) => [option.id, option.label])
) as Record<TeamSocialPlatform, string>;

const teamSocialProfilePlaceholders = Object.fromEntries(
  teamSocialPlatformOptions.map((option) => [option.id, option.placeholder])
) as Record<TeamSocialPlatform, string>;

type HeaderData = NonNullable<TeamData["header"]>;
type StyleData = NonNullable<TeamData["style"]>;
type CtaData = NonNullable<TeamData["cta"]>;

type PendingRemoval =
  | { type: "member"; memberId: string }
  | { type: "social"; memberId: string; socialId: string };

function normalizeValue(value: TeamData): TeamData {
  return normalizeTeamData(value);
}

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: TeamVariantId;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
  onClear,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  return (
    <SharedColorControl
      label={label}
      value={value}
      onChange={onChange}
      onClear={onClear}
      placeholder={placeholder}
      pickerFallback={pickerFallback}
    />
  );
}

function updateValue(
  value: TeamData,
  onChange: (next: TeamData) => void,
  updater: (current: TeamData) => TeamData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: TeamData,
  onChange: (next: TeamData) => void,
  patch: Partial<HeaderData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    header: {
      ...current.header,
      ...patch,
    },
  }));
}

function updateStyle(
  value: TeamData,
  onChange: (next: TeamData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateCta(value: TeamData, onChange: (next: TeamData) => void, patch: Partial<CtaData>) {
  updateValue(value, onChange, (current) => ({
    ...current,
    cta: {
      label: current.cta?.label ?? "",
      url: current.cta?.url ?? "",
      ...patch,
    },
  }));
}

function clearStyleField(
  value: TeamData,
  onChange: (next: TeamData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...(current.style ?? {}),
      [key]: "",
    },
  }));
}

function findMemberIndexById(members: TeamMember[], memberId: string) {
  return members.findIndex((member) => member.id === memberId);
}

function updateMember(
  value: TeamData,
  onChange: (next: TeamData) => void,
  memberIndex: number,
  patch: Partial<TeamMember>
) {
  updateValue(value, onChange, (current) => {
    const members = normalizeTeamMembers(current.members);
    if (!members[memberIndex]) return current;

    const nextMembers = [...members];
    nextMembers[memberIndex] = {
      ...nextMembers[memberIndex],
      ...patch,
    };

    return {
      ...current,
      members: nextMembers,
    };
  });
}

function updateMemberSocialLink(
  value: TeamData,
  onChange: (next: TeamData) => void,
  memberIndex: number,
  socialIndex: number,
  patch: Partial<TeamSocialLink>
) {
  updateValue(value, onChange, (current) => {
    const members = normalizeTeamMembers(current.members);
    const member = members[memberIndex];
    if (!member) return current;

    const links = normalizeTeamSocialLinks(member.socialLinks);
    if (!links[socialIndex]) return current;

    const nextLinks = [...links];
    nextLinks[socialIndex] = {
      ...nextLinks[socialIndex],
      ...patch,
    };

    const nextMembers = [...members];
    nextMembers[memberIndex] = {
      ...member,
      socialLinks: nextLinks,
    };

    return {
      ...current,
      members: nextMembers,
    };
  });
}

function detectTeamSocialPlatformFromHref(value: string | undefined): TeamSocialPlatform | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "linkedin.com") return "linkedin";
    if (host === "x.com" || host === "twitter.com") return "x";
    if (host === "github.com") return "github";
    if (host === "instagram.com") return "instagram";
    if (host === "facebook.com") return "facebook";
    if (host === "youtube.com") return "youtube";
  } catch {
    return null;
  }

  return null;
}

function detectTeamSocialPlatformFromLabel(value: string | undefined): TeamSocialPlatform | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return null;
  if (normalized.includes("linkedin")) return "linkedin";
  if (normalized === "x" || normalized.includes("twitter")) return "x";
  if (normalized.includes("github")) return "github";
  if (normalized.includes("instagram")) return "instagram";
  if (normalized.includes("facebook")) return "facebook";
  if (normalized.includes("youtube")) return "youtube";
  return null;
}

function resolveTeamSocialPlatform(link: TeamSocialLink): TeamSocialPlatform | "custom" {
  return (
    detectTeamSocialPlatformFromHref(link.url) ??
    detectTeamSocialPlatformFromLabel(link.label) ??
    "custom"
  );
}

function encodeTeamSocialPath(value: string) {
  return value
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function readTeamSocialProfile(platform: TeamSocialPlatform | "custom", href: string | undefined) {
  if (platform === "custom" || typeof href !== "string" || href.trim().length === 0) return "";

  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const parts = parsed.pathname.split("/").filter(Boolean);

    switch (platform) {
      case "linkedin":
        if (host !== "linkedin.com") return "";
        if ((parts[0] === "in" || parts[0] === "company") && parts[1]) {
          return `${parts[0]}/${parts[1]}`;
        }
        return "";
      case "x":
        return host === "x.com" || host === "twitter.com" ? (parts[0] ?? "") : "";
      case "github":
        return host === "github.com" ? (parts[0] ?? "") : "";
      case "instagram":
        return host === "instagram.com" ? (parts[0] ?? "") : "";
      case "facebook":
        return host === "facebook.com" ? (parts[0] ?? "") : "";
      case "youtube":
        return host === "youtube.com" ? (parts[0]?.replace(/^@/, "") ?? "") : "";
    }
  } catch {
    return "";
  }
}

function buildTeamSocialHref(platform: TeamSocialPlatform, profile: string | undefined) {
  const trimmedProfile = typeof profile === "string" ? profile.trim() : "";
  if (!trimmedProfile) return "";

  let profileSource = trimmedProfile;
  if (/^https?:\/\//i.test(trimmedProfile)) {
    profileSource = readTeamSocialProfile(platform, trimmedProfile);
    if (!profileSource) return "";
  }

  const handle = profileSource.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
  if (!handle) return "";

  switch (platform) {
    case "linkedin": {
      const parts = handle.split("/").filter(Boolean);
      if ((parts[0] === "in" || parts[0] === "company") && parts[1]) {
        return `https://www.linkedin.com/${parts[0]}/${encodeURIComponent(parts[1])}`;
      }
      return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
    }
    case "x":
      return `https://x.com/${encodeURIComponent(handle)}`;
    case "github":
      return `https://github.com/${encodeURIComponent(handle.split("/")[0] ?? "")}`;
    case "instagram":
      return `https://www.instagram.com/${encodeURIComponent(handle)}`;
    case "facebook":
      return `https://www.facebook.com/${encodeTeamSocialPath(handle)}`;
    case "youtube":
      return `https://www.youtube.com/@${encodeURIComponent(handle)}`;
  }
}

function updateMemberSocialPlatform(
  value: TeamData,
  onChange: (next: TeamData) => void,
  memberIndex: number,
  socialIndex: number,
  nextPlatform: TeamSocialPlatform
) {
  const member = normalizeTeamMembers(value.members)[memberIndex];
  const link = member ? normalizeTeamSocialLinks(member.socialLinks)[socialIndex] : undefined;
  if (!link) return;

  const currentPlatform = resolveTeamSocialPlatform(link);
  const profile = readTeamSocialProfile(currentPlatform, link.url);
  updateMemberSocialLink(value, onChange, memberIndex, socialIndex, {
    label: teamSocialPlatformLabels[nextPlatform],
    url: buildTeamSocialHref(nextPlatform, profile),
  });
}

function setSpotlightLead(value: TeamData, onChange: (next: TeamData) => void, memberId: string) {
  updateValue(value, onChange, (current) => ({
    ...current,
    spotlightLeadId: memberId,
  }));
}

function hasConfiguredTeamMember(member: TeamMember | undefined) {
  if (!member) return false;
  if ((member.name ?? "").trim().length > 0) return true;
  if ((member.role ?? "").trim().length > 0) return true;
  if ((member.bio ?? "").trim().length > 0) return true;
  if ((member.photo ?? "").trim().length > 0) return true;
  return normalizeTeamSocialLinks(member.socialLinks).some(
    (link) => (link.label ?? "").trim().length > 0 || (link.url ?? "").trim().length > 0
  );
}

function addMemberSocialLink(
  value: TeamData,
  onChange: (next: TeamData) => void,
  memberIndex: number
) {
  updateValue(value, onChange, (current) => {
    const members = normalizeTeamMembers(current.members);
    const member = members[memberIndex];
    if (!member) return current;

    const links = normalizeTeamSocialLinks(member.socialLinks);
    if (links.length >= teamSocialLinksMax) return current;

    const nextLinks = normalizeTeamSocialLinks(
      [...links, { label: "LinkedIn", url: "" }],
      links.length + 1
    );

    const nextMembers = [...members];
    nextMembers[memberIndex] = {
      ...member,
      socialLinks: nextLinks,
    };

    return {
      ...current,
      members: nextMembers,
    };
  });
}

function removeMemberSocialLinkById(
  value: TeamData,
  onChange: (next: TeamData) => void,
  memberId: string,
  socialId: string
) {
  updateValue(value, onChange, (current) => {
    const members = normalizeTeamMembers(current.members);
    const memberIndex = findMemberIndexById(members, memberId);
    const member = memberIndex >= 0 ? members[memberIndex] : undefined;
    if (!member) return current;

    const links = normalizeTeamSocialLinks(member.socialLinks);
    if (!links.some((link) => link.id === socialId)) return current;

    const nextLinks = links.filter((link) => link.id !== socialId);
    const nextMembers = [...members];
    nextMembers[memberIndex] = {
      ...member,
      socialLinks: normalizeTeamSocialLinks(nextLinks, nextLinks.length),
    };

    return {
      ...current,
      members: nextMembers,
    };
  });
}

function setMembersCount(value: TeamData, onChange: (next: TeamData) => void, count: number) {
  updateValue(value, onChange, (current) => {
    const nextCount = normalizeTeamMemberCount(count);
    const members = normalizeTeamMembers(current.members);
    if (nextCount >= members.length) {
      return {
        ...current,
        members: normalizeTeamMembers(members, nextCount),
      };
    }

    const removedMembers = members.slice(nextCount);
    const shouldConfirm =
      !removedMembers.some(hasConfiguredTeamMember) ||
      typeof window === "undefined" ||
      typeof window.confirm !== "function" ||
      window.confirm(
        `Reducing the member count will remove the last ${removedMembers.length} profile${
          removedMembers.length === 1 ? "" : "s"
        }. Continue?`
      );

    if (!shouldConfirm) {
      return current;
    }

    return {
      ...current,
      members: normalizeTeamMembers(members, nextCount),
    };
  });
}

function addMember(value: TeamData, onChange: (next: TeamData) => void) {
  updateValue(value, onChange, (current) => {
    const members = normalizeTeamMembers(current.members);
    if (members.length >= teamMemberMax) return current;

    return {
      ...current,
      members: normalizeTeamMembers(
        [
          ...members,
          {
            name: `Team Member ${members.length + 1}`,
            role: "Role",
            bio: "Short bio describing responsibilities and value.",
            photo: undefined,
            socialLinks: [],
          },
        ],
        members.length + 1
      ),
    };
  });
}

function removeMemberById(value: TeamData, onChange: (next: TeamData) => void, memberId: string) {
  updateValue(value, onChange, (current) => {
    const members = normalizeTeamMembers(current.members);
    if (members.length <= 1) return current;
    const memberIndex = findMemberIndexById(members, memberId);
    if (memberIndex < 0) return current;

    const nextMembers = members.filter((member) => member.id !== memberId);

    return {
      ...current,
      members: normalizeTeamMembers(nextMembers, nextMembers.length),
    };
  });
}

function moveMember(
  value: TeamData,
  onChange: (next: TeamData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const members = normalizeTeamMembers(current.members);
    if (toIndex < 0 || toIndex >= members.length) return current;

    const nextMembers = [...members];
    const [moved] = nextMembers.splice(fromIndex, 1);
    if (!moved) return current;
    nextMembers.splice(toIndex, 0, moved);

    return {
      ...current,
      members: nextMembers,
    };
  });
}

function DiagnosticsSnapshot({ value }: { value: TeamData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function resolveTeamPhotoState(
  member: TeamMember,
  selectedMediaId: string | null | undefined
): {
  kind: "empty" | "invalid" | "saved" | "picked";
  previewUrl?: string;
  message: string;
} {
  const rawPhoto = (member.photo ?? "").trim();
  const safePhoto = normalizeWidgetSafeHref(rawPhoto, {
    allowRelative: true,
    allowHttp: true,
  });

  if (safePhoto) {
    return {
      kind: selectedMediaId ? "picked" : "saved",
      previewUrl: safePhoto,
      message: selectedMediaId
        ? "Using the selected media-library image for this member."
        : "A saved photo is configured. Browse media to replace it or clear the photo.",
    };
  }

  if (rawPhoto.length > 0) {
    return {
      kind: "invalid",
      message:
        "The saved photo cannot be used. Runtime falls back to initials until it is cleared.",
    };
  }

  return {
    kind: "empty",
    message: "No photo selected. Team preview and runtime fall back to initials.",
  };
}

function TeamPhotoPreview({
  member,
  selectedMediaId,
}: {
  member: TeamMember;
  selectedMediaId: string | null | undefined;
}) {
  const state = resolveTeamPhotoState(member, selectedMediaId);
  const name = (member.name ?? "Team Member").trim() || "Team Member";

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center gap-3">
        {state.previewUrl ? (
          <img
            src={state.previewUrl}
            alt={name}
            className="h-14 w-14 rounded-lg border object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-background text-lg font-semibold text-foreground">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">Photo preview</p>
          <p className="text-xs text-muted-foreground">{state.message}</p>
        </div>
      </div>
      {state.kind === "invalid" ? <p className="text-xs text-amber-700">{state.message}</p> : null}
    </div>
  );
}

function TeamSocialProfileField({
  value,
  onChange,
  memberIndex,
  socialIndex,
  link,
}: {
  value: TeamData;
  onChange: (next: TeamData) => void;
  memberIndex: number;
  socialIndex: number;
  link: TeamSocialLink;
}) {
  const platform = resolveTeamSocialPlatform(link);
  const profile = readTeamSocialProfile(platform, link.url);
  const hasSavedDestination = (link.url ?? "").trim().length > 0;
  const hasLegacyDestination = hasSavedDestination && profile.length === 0;
  const hasUnsafeDestination =
    hasSavedDestination &&
    !normalizeWidgetSafeHref(link.url, {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    });

  if (platform === "custom") {
    return (
      <div className="space-y-2 rounded-md border border-dashed bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Profile destination</p>
        <p className="text-xs text-muted-foreground">
          Pick a known platform to create a safe destination from a profile name. Saved custom
          destinations stay compatible and can be cleared here.
        </p>
        {hasSavedDestination ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateMemberSocialLink(value, onChange, memberIndex, socialIndex, { url: "" })
            }
          >
            Clear saved destination
          </Button>
        ) : null}
        {hasUnsafeDestination ? (
          <p className="text-xs text-amber-700">
            The saved destination is unsafe and will not render publicly.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Profile name</p>
      <Input
        value={profile}
        onChange={(event) =>
          updateMemberSocialLink(value, onChange, memberIndex, socialIndex, {
            url: buildTeamSocialHref(platform, event.target.value),
          })
        }
        placeholder={teamSocialProfilePlaceholders[platform]}
      />
      <p className="text-xs text-muted-foreground">
        Enter only the public profile name or handle. The editor builds the safe destination.
      </p>
      {hasLegacyDestination ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p>
            A saved destination is still stored for this social link. Replace it with a profile name
            or clear it before publishing changes.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateMemberSocialLink(value, onChange, memberIndex, socialIndex, { url: "" })
            }
          >
            Clear saved destination
          </Button>
        </div>
      ) : null}
      {hasUnsafeDestination ? (
        <p className="text-xs text-amber-700">
          The saved destination is unsafe and will not render publicly.
        </p>
      ) : null}
    </div>
  );
}

function contrastTextClass(status: "ok" | "warning" | "unknown") {
  if (status === "warning") return "text-amber-700";
  if (status === "ok") return "text-emerald-700";
  return "text-muted-foreground";
}

function ContrastAdvisoryNote({
  label,
  background,
  fallbackBackground,
}: {
  label: string;
  background?: string;
  fallbackBackground?: string;
}) {
  const advisory = resolveColorContrastAdvisory({
    foreground: estimatedTeamTextColor,
    background,
    fallbackBackground,
  });

  return (
    <p className={cn("text-xs", contrastTextClass(advisory.status))}>
      {label}: {advisory.message} Contrast is estimated against the default theme text color.
    </p>
  );
}

function resolveActivePendingRemoval(
  members: TeamMember[],
  pendingRemoval: PendingRemoval | null
): PendingRemoval | null {
  if (!pendingRemoval) return null;
  const member = members.find((candidate) => candidate.id === pendingRemoval.memberId);
  if (!member) return null;
  if (pendingRemoval.type === "member") return pendingRemoval;
  const links = normalizeTeamSocialLinks(member.socialLinks);
  return links.some((link) => link.id === pendingRemoval.socialId) ? pendingRemoval : null;
}

export function TeamWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<TeamData>) {
  const normalized = normalizeValue(value);
  const members = normalizeTeamMembers(normalized.members);
  const handleVariantChange = (next: string) => {
    if (next !== "spotlight" || members.length <= 6) {
      onVariantChange?.(next);
      return;
    }

    const nextValue = {
      ...normalized,
      members: normalizeTeamMembers(normalized.members, 3),
    };
    if (onBlockPatch) {
      onBlockPatch((current) => ({
        ...current,
        variant: next,
        data: nextValue,
      }));
      return;
    }
    onVariantChange?.(next);
    onChange(nextValue);
  };

  return (
    <WidgetEditorSection
      id="team.wizard.starter-team"
      mode="wizard"
      role="setup"
      title="Starter team"
      description="Seed the layout, member count, and first member names."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Team layout</p>
          <Select value={resolveTeamVariant(variant)} onValueChange={handleVariantChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select variant" />
            </SelectTrigger>
            <SelectContent>
              {variantOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Members count</p>
          <Select
            value={String(members.length)}
            onValueChange={(next) => setMembersCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select count" />
            </SelectTrigger>
            <SelectContent>
              {memberCountOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Team intentionally supports up to 12 members. Use multiple Team sections for larger
            directories.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Primary member names</p>
          {members.slice(0, 3).map((member, index) => (
            <div key={member.id} className="grid gap-3 sm:grid-cols-2">
              <Input
                value={member.name ?? ""}
                onChange={(event) =>
                  updateMember(value, onChange, index, { name: event.target.value })
                }
                placeholder={`Member ${index + 1} name`}
              />
              <Input
                value={member.role ?? ""}
                onChange={(event) =>
                  updateMember(value, onChange, index, { role: event.target.value })
                }
                placeholder={`Member ${index + 1} role`}
              />
            </div>
          ))}
        </div>
      </div>
    </WidgetEditorSection>
  );
}

export function TeamVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<TeamData>) {
  const normalized = normalizeValue(value);
  const header = normalized.header ?? teamDefaults.header!;
  const style = normalized.style ?? teamDefaults.style!;
  const members = normalizeTeamMembers(normalized.members);
  const cta = normalized.cta ?? { label: "", url: "" };
  const resolvedVariant = resolveTeamVariant(variant);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [selectedPhotoMediaIds, setSelectedPhotoMediaIds] = useState<Record<string, string | null>>(
    {}
  );
  const [photoPickerErrors, setPhotoPickerErrors] = useState<Record<string, string>>({});

  const activePendingRemoval = resolveActivePendingRemoval(members, pendingRemoval);
  const spotlightLeadId =
    normalized.spotlightLeadId && members.some((member) => member.id === normalized.spotlightLeadId)
      ? normalized.spotlightLeadId
      : members[0]?.id;
  const ctaHref = normalizeWidgetSafeHref(cta.url, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });
  const showCtaGuidance = (cta.label ?? "").trim().length > 0 || (cta.url ?? "").trim().length > 0;

  const clearPhotoPickerError = (memberId: string) => {
    setPhotoPickerErrors((current) => {
      if (!current[memberId]) return current;
      const { [memberId]: _removed, ...rest } = current;
      return rest;
    });
  };

  const clearSelectedPhotoMedia = (memberId: string) => {
    setSelectedPhotoMediaIds((current) => {
      if (!(memberId in current)) return current;
      const { [memberId]: _removed, ...rest } = current;
      return rest;
    });
  };

  const handleTeamPhotoMediaSelection = async (
    memberId: string,
    memberIndex: number,
    nextValue: unknown
  ) => {
    const mediaId = typeof nextValue === "string" ? nextValue : null;
    clearPhotoPickerError(memberId);

    if (!mediaId) {
      clearSelectedPhotoMedia(memberId);
      updateMember(value, onChange, memberIndex, { photo: undefined });
      return;
    }

    try {
      const mediaItems = await listMediaCached({ force: false });
      const media = mediaItems.find((item) => item.id === mediaId);
      if (!media?.url) throw new Error("missing_media_url");
      setSelectedPhotoMediaIds((current) => ({ ...current, [memberId]: mediaId }));
      updateMember(value, onChange, memberIndex, { photo: media.url });
    } catch {
      clearSelectedPhotoMedia(memberId);
      setPhotoPickerErrors((current) => ({
        ...current,
        [memberId]: "Failed to resolve selected media.",
      }));
    }
  };

  const handleClearPhoto = (memberId: string, memberIndex: number) => {
    clearSelectedPhotoMedia(memberId);
    clearPhotoPickerError(memberId);
    updateMember(value, onChange, memberIndex, { photo: undefined });
  };

  const confirmPendingRemoval = () => {
    if (!activePendingRemoval) return;
    if (activePendingRemoval.type === "member") {
      clearSelectedPhotoMedia(activePendingRemoval.memberId);
      clearPhotoPickerError(activePendingRemoval.memberId);
      removeMemberById(value, onChange, activePendingRemoval.memberId);
    } else {
      removeMemberSocialLinkById(
        value,
        onChange,
        activePendingRemoval.memberId,
        activePendingRemoval.socialId
      );
    }
    setPendingRemoval(null);
  };

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and member structure"
        description="Choose team presentation mode and deterministic member count."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Members count</p>
          <Select
            value={String(members.length)}
            onValueChange={(next) => setMembersCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select count" />
            </SelectTrigger>
            <SelectContent>
              {memberCountOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Team intentionally supports up to 12 members. Use multiple Team sections for larger
            directories.
          </p>
          {resolvedVariant === "spotlight" ? (
            <p className="text-xs text-muted-foreground">
              Spotlight uses the selected lead member below and still honors the supporting-columns
              control in Section and card style.
            </p>
          ) : null}
        </div>
      </EditorSection>

      <EditorSection
        title="Header copy and CTA"
        description="Edit section eyebrow, copy, presentation, and the optional Team CTA."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Eyebrow</p>
          <Input
            value={header.eyebrow ?? ""}
            onChange={(event) => updateHeader(value, onChange, { eyebrow: event.target.value })}
            placeholder="Our team"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={header.title}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Meet the team"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={header.description}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Introduce key people behind delivery, support, and strategy."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Header alignment</p>
            <Select
              value={header.align ?? "center"}
              onValueChange={(next) =>
                updateHeader(value, onChange, { align: next as TeamHeaderAlign })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent>
                {headerAlignOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Title size</p>
            <Select
              value={header.titleSize ?? "2xl"}
              onValueChange={(next) =>
                updateHeader(value, onChange, { titleSize: next as TeamHeaderTitleSize })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select title size" />
              </SelectTrigger>
              <SelectContent>
                {titleSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">CTA label</p>
            <Input
              value={cta.label ?? ""}
              onChange={(event) => updateCta(value, onChange, { label: event.target.value })}
              placeholder="See all positions"
            />
          </div>
          <LinkDestinationField
            fieldId="team-cta-destination"
            label="CTA destination"
            value={cta.url}
            onChange={(next) => updateCta(value, onChange, { url: next })}
            emptyLabel="No destination"
            helpText="Pick a site page for the Team CTA. Hand-typed links from older edits stay until you replace or clear them."
            feedback={
              (cta.url ?? "").trim().length > 0 && !ctaHref
                ? "The saved CTA destination is unsafe and will not render publicly."
                : null
            }
            feedbackTone="destructive"
          />
        </div>
        {showCtaGuidance && !(cta.label ?? "").trim().length ? (
          <p className="text-xs text-muted-foreground">
            CTA requires both a label and a safe destination.
          </p>
        ) : null}
        {showCtaGuidance && !(cta.url ?? "").trim().length ? (
          <p className="text-xs text-muted-foreground">
            CTA requires both a label and a safe destination.
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Members content and order"
        description="Manage names, roles, bios, photos, social links, spotlight lead, and member order."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            Add members from the top when the list gets long. The secondary action stays at the
            bottom for parity with existing flows.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addMember(value, onChange)}
            disabled={members.length >= teamMemberMax}
          >
            Add member
          </Button>
        </div>

        {members.map((member, memberIndex) => {
          const socialLinks = normalizeTeamSocialLinks(member.socialLinks);
          const memberName = (member.name ?? "").trim() || `Member ${memberIndex + 1}`;
          const memberId = member.id ?? `member-${memberIndex + 1}`;
          const isLead = spotlightLeadId === memberId;
          const pendingMemberRemoval =
            activePendingRemoval?.type === "member" && activePendingRemoval.memberId === memberId;

          return (
            <div key={memberId} className="space-y-4 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{memberName}</p>
                  {resolvedVariant === "spotlight" && isLead ? (
                    <Badge variant="outline">Spotlight Lead</Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {resolvedVariant === "spotlight" && !isLead ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSpotlightLead(value, onChange, memberId)}
                    >
                      Set as spotlight lead
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveMember(value, onChange, memberIndex, memberIndex - 1)}
                    disabled={memberIndex === 0}
                  >
                    Move up
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveMember(value, onChange, memberIndex, memberIndex + 1)}
                    disabled={memberIndex === members.length - 1}
                  >
                    Move down
                  </Button>
                  {pendingMemberRemoval ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={confirmPendingRemoval}
                      >
                        Confirm remove
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingRemoval(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingRemoval({ type: "member", memberId })}
                      disabled={members.length <= 1}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              {pendingMemberRemoval ? (
                <p className="text-xs text-muted-foreground">
                  Remove this member profile and all of its photo, bio, and social-link content?
                </p>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium">Name</p>
                <Input
                  value={member.name}
                  onChange={(event) =>
                    updateMember(value, onChange, memberIndex, { name: event.target.value })
                  }
                  placeholder="Anna Kowalska"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Role</p>
                <Input
                  value={member.role}
                  onChange={(event) =>
                    updateMember(value, onChange, memberIndex, { role: event.target.value })
                  }
                  placeholder="Head of Product"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Bio</p>
                <Textarea
                  value={member.bio ?? ""}
                  onChange={(event) =>
                    updateMember(value, onChange, memberIndex, { bio: event.target.value })
                  }
                  placeholder="Short bio describing responsibilities and value."
                />
                <p className="text-xs text-muted-foreground">
                  Clear the bio if you want the runtime card to omit it.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Photo</p>
                <TeamPhotoPreview
                  member={member}
                  selectedMediaId={selectedPhotoMediaIds[memberId] ?? null}
                />
                <div className="flex flex-wrap gap-2">
                  <MediaPicker
                    value={selectedPhotoMediaIds[memberId] ?? null}
                    onChange={(next) => {
                      void handleTeamPhotoMediaSelection(memberId, memberIndex, next);
                    }}
                    multiple={false}
                    accept={["image/*"]}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleClearPhoto(memberId, memberIndex)}
                    disabled={!member.photo && !(selectedPhotoMediaIds[memberId] ?? null)}
                  >
                    Clear photo
                  </Button>
                </div>
                {photoPickerErrors[memberId] ? (
                  <p className="text-xs text-destructive">{photoPickerErrors[memberId]}</p>
                ) : null}
              </div>

              <div className="space-y-3 rounded-md border bg-muted/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Social links</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addMemberSocialLink(value, onChange, memberIndex)}
                    disabled={socialLinks.length >= teamSocialLinksMax}
                  >
                    Add link
                  </Button>
                </div>

                {socialLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No social links configured.</p>
                ) : (
                  <div className="space-y-2">
                    {socialLinks.map((link, socialIndex) => {
                      const socialId = link.id ?? `social-${socialIndex + 1}`;
                      const platform = resolveTeamSocialPlatform(link);
                      const pendingSocialRemoval =
                        activePendingRemoval?.type === "social" &&
                        activePendingRemoval.memberId === memberId &&
                        activePendingRemoval.socialId === socialId;

                      return (
                        <div
                          key={socialId}
                          className="space-y-3 rounded-md border p-3"
                          data-team-social-link={socialId}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">Social link {socialIndex + 1}</p>
                            {pendingSocialRemoval ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={confirmPendingRemoval}
                                >
                                  Confirm remove
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPendingRemoval(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setPendingRemoval({ type: "social", memberId, socialId })
                                }
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                Platform
                              </p>
                              <Select
                                value={platform}
                                onValueChange={(next) =>
                                  updateMemberSocialPlatform(
                                    value,
                                    onChange,
                                    memberIndex,
                                    socialIndex,
                                    next as TeamSocialPlatform
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select platform" />
                                </SelectTrigger>
                                <SelectContent>
                                  {platform === "custom" ? (
                                    <SelectItem value="custom" disabled>
                                      Custom saved destination
                                    </SelectItem>
                                  ) : null}
                                  {teamSocialPlatformOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                Public label
                              </p>
                              <Input
                                value={link.label}
                                onChange={(event) =>
                                  updateMemberSocialLink(
                                    value,
                                    onChange,
                                    memberIndex,
                                    socialIndex,
                                    {
                                      label: event.target.value,
                                    }
                                  )
                                }
                                placeholder="LinkedIn"
                              />
                            </div>
                          </div>
                          <TeamSocialProfileField
                            value={value}
                            onChange={onChange}
                            memberIndex={memberIndex}
                            socialIndex={socialIndex}
                            link={link}
                          />
                          {pendingSocialRemoval ? (
                            <p className="text-xs text-muted-foreground">
                              Remove this social link from {memberName}?
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={() => addMember(value, onChange)}
          disabled={members.length >= teamMemberMax}
        >
          Add member
        </Button>
      </EditorSection>

      <EditorSection
        title="Section and card style"
        description="Tune section background, card presentation, and compact-list mobile density."
      >
        <ColorField
          label="Section background"
          value={style.sectionBackground}
          onChange={(next) => updateStyle(value, onChange, { sectionBackground: next })}
          onClear={() => clearStyleField(value, onChange, "sectionBackground")}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />
        {(style.sectionBackground ?? "").trim().length > 0 ? (
          <ContrastAdvisoryNote
            label="Section background contrast"
            background={style.sectionBackground}
          />
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">Columns</p>
          <Select
            value={style.columns}
            onValueChange={(next) => updateStyle(value, onChange, { columns: next as TeamColumns })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select columns" />
            </SelectTrigger>
            <SelectContent>
              {columnsOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resolvedVariant === "spotlight" ? (
            <p className="text-xs text-muted-foreground">
              Spotlight now applies the selected 1-4 supporting columns instead of collapsing 2, 3,
              and 4 into the same layout.
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Gap</p>
            <Select
              value={style.gap}
              onValueChange={(next) => updateStyle(value, onChange, { gap: next as TeamGap })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Card radius</p>
            <Select
              value={style.radius}
              onValueChange={(next) => updateStyle(value, onChange, { radius: next as TeamRadius })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select radius" />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ColorField
          label="Card background"
          value={style.cardSurface}
          onChange={(next) => updateStyle(value, onChange, { cardSurface: next })}
          onClear={() => clearStyleField(value, onChange, "cardSurface")}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />
        <ColorField
          label="Card border"
          value={style.cardBorder}
          onChange={(next) => updateStyle(value, onChange, { cardBorder: next })}
          onClear={() => clearStyleField(value, onChange, "cardBorder")}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />
        {(style.cardSurface ?? "").trim().length > 0 ? (
          <ContrastAdvisoryNote
            label="Card background contrast"
            background={style.cardSurface}
            fallbackBackground={style.sectionBackground}
          />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Card border width</p>
            <Select
              value={style.cardBorderWidth ?? "1"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { cardBorderWidth: next as TeamBorderWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Border width" />
              </SelectTrigger>
              <SelectContent>
                {borderWidthOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Compact-list mobile bio</p>
            <Select
              value={resolveTeamCompactMobileBio(style.compactMobileBio)}
              onValueChange={(next) =>
                updateStyle(value, onChange, { compactMobileBio: next as TeamCompactMobileBio })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Mobile bio behavior" />
              </SelectTrigger>
              <SelectContent>
                {compactMobileBioOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Compact-list mobile bio affects only the Compact List variant. Hiding keeps the bio
          available to assistive technology on small screens.
        </p>
      </EditorSection>
    </div>
  );
}

export function TeamAdvancedEditor({ value, onChange }: WidgetEditorProps<TeamData>) {
  const normalized = normalizeValue(value);
  const style = normalized.style ?? teamDefaults.style!;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical layout tokens"
        description="Low-level layout and style token controls. Visual owns the member and CTA experience."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Columns token</p>
          <Select
            value={style.columns}
            onValueChange={(next) => updateStyle(value, onChange, { columns: next as TeamColumns })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select columns token" />
            </SelectTrigger>
            <SelectContent>
              {columnsOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Gap token</p>
          <Select
            value={style.gap}
            onValueChange={(next) => updateStyle(value, onChange, { gap: next as TeamGap })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gap token" />
            </SelectTrigger>
            <SelectContent>
              {gapOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Radius token</p>
          <Select
            value={style.radius}
            onValueChange={(next) => updateStyle(value, onChange, { radius: next as TeamRadius })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select radius token" />
            </SelectTrigger>
            <SelectContent>
              {radiusOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Border width token</p>
          <Select
            value={style.cardBorderWidth ?? "1"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { cardBorderWidth: next as TeamBorderWidth })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select border width token" />
            </SelectTrigger>
            <SelectContent>
              {borderWidthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Compact-list mobile bio token</p>
          <Select
            value={resolveTeamCompactMobileBio(style.compactMobileBio)}
            onValueChange={(next) =>
              updateStyle(value, onChange, { compactMobileBio: next as TeamCompactMobileBio })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select compact mobile bio token" />
            </SelectTrigger>
            <SelectContent>
              {compactMobileBioOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Section background token"
            value={style.sectionBackground}
            onClear={() => clearStyleField(value, onChange, "sectionBackground")}
            onRestoreValue={(next) => updateStyle(value, onChange, { sectionBackground: next })}
          />
          <Input
            value={style.sectionBackground ?? ""}
            onChange={(event) =>
              updateStyle(value, onChange, { sectionBackground: event.target.value })
            }
            placeholder="var(--color-bg)"
          />
        </div>
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Card surface token"
            value={style.cardSurface}
            onClear={() => clearStyleField(value, onChange, "cardSurface")}
            onRestoreValue={(next) => updateStyle(value, onChange, { cardSurface: next })}
          />
          <Input
            value={style.cardSurface ?? ""}
            onChange={(event) => updateStyle(value, onChange, { cardSurface: event.target.value })}
            placeholder="var(--color-bg)"
          />
        </div>
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Card border token"
            value={style.cardBorder}
            onClear={() => clearStyleField(value, onChange, "cardBorder")}
            onRestoreValue={(next) => updateStyle(value, onChange, { cardBorder: next })}
          />
          <Input
            value={style.cardBorder ?? ""}
            onChange={(event) => updateStyle(value, onChange, { cardBorder: event.target.value })}
            placeholder="var(--color-border)"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic fallback data and structure."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(normalizeValue(value))}>
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => onChange(teamDefaults)}>
            Reset to defaults
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="Raw payload snapshot">
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}
