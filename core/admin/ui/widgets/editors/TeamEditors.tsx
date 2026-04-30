import { type ReactNode } from "react";

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
import { cn } from "@/lib/utils";

import {
  normalizeTeamData,
  normalizeTeamMembers,
  normalizeTeamSocialLinks,
  resolveTeamVariant,
  teamDefaults,
  teamMemberMax,
  teamSocialLinksMax,
  type TeamColumns,
  type TeamData,
  type TeamGap,
  type TeamMember,
  type TeamRadius,
  type TeamSocialLink,
  type TeamVariantId,
} from "../../../../widgets/core/team";
import type { WidgetEditorProps } from "../../../../widgets/types";

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

const memberCountOptions = Array.from({ length: teamMemberMax }, (_, index) => String(index + 1));

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type HeaderData = NonNullable<TeamData["header"]>;
type StyleData = NonNullable<TeamData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function normalizeValue(value: TeamData): TeamData {
  return normalizeTeamData(value);
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
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
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
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
      [...links, { label: "LinkedIn", url: "#" }],
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

function removeMemberSocialLink(
  value: TeamData,
  onChange: (next: TeamData) => void,
  memberIndex: number,
  socialIndex: number
) {
  updateValue(value, onChange, (current) => {
    const members = normalizeTeamMembers(current.members);
    const member = members[memberIndex];
    if (!member) return current;

    const links = normalizeTeamSocialLinks(member.socialLinks);
    const nextLinks = links.filter((_, index) => index !== socialIndex);

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
  updateValue(value, onChange, (current) => ({
    ...current,
    members: normalizeTeamMembers(current.members, count),
  }));
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
            photo: "",
            socialLinks: [],
          },
        ],
        members.length + 1
      ),
    };
  });
}

function removeMember(value: TeamData, onChange: (next: TeamData) => void, memberIndex: number) {
  updateValue(value, onChange, (current) => {
    const members = normalizeTeamMembers(current.members);
    if (members.length <= 1) return current;

    const nextMembers = members.filter((_, index) => index !== memberIndex);

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

export function TeamWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<TeamData>) {
  const normalized = normalizeValue(value);
  const members = normalizeTeamMembers(normalized.members);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Team layout</p>
        <Select
          value={resolveTeamVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
        >
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
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Primary member names</p>
        {members.slice(0, 3).map((member, index) => (
          <Input
            key={member.id}
            value={member.name}
            onChange={(event) => updateMember(value, onChange, index, { name: event.target.value })}
            placeholder={`Member ${index + 1} name`}
          />
        ))}
      </div>
    </div>
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

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and member structure"
        description="Choose team presentation mode and deterministic member count."
      >
        <VariantCards value={resolveTeamVariant(variant)} onChange={onVariantChange} />

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
        </div>
      </EditorSection>

      <EditorSection
        title="Header copy"
        description="Edit section title and supporting description."
      >
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
      </EditorSection>

      <EditorSection
        title="Members content and order"
        description="Manage names, roles, bios, photos, and member order."
      >
        {members.map((member, memberIndex) => (
          <div key={member.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Member {memberIndex + 1}</p>
              <div className="flex gap-2">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeMember(value, onChange, memberIndex)}
                  disabled={members.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>

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
                value={member.bio}
                onChange={(event) =>
                  updateMember(value, onChange, memberIndex, { bio: event.target.value })
                }
                placeholder="Short bio describing responsibilities and value."
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Photo URL</p>
              <Input
                value={member.photo ?? ""}
                onChange={(event) =>
                  updateMember(value, onChange, memberIndex, { photo: event.target.value })
                }
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>
        ))}

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
        title="Social links"
        description="Manage social links for each member profile."
      >
        {members.map((member, memberIndex) => {
          const socialLinks = normalizeTeamSocialLinks(member.socialLinks);
          return (
            <div key={`social-links-${member.id}`} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {member.name && member.name.trim().length > 0
                    ? member.name
                    : `Member ${memberIndex + 1}`}
                </p>
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
                  {socialLinks.map((link, socialIndex) => (
                    <div
                      key={link.id}
                      className="grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <Input
                        value={link.label}
                        onChange={(event) =>
                          updateMemberSocialLink(value, onChange, memberIndex, socialIndex, {
                            label: event.target.value,
                          })
                        }
                        placeholder="LinkedIn"
                      />
                      <Input
                        value={link.url}
                        onChange={(event) =>
                          updateMemberSocialLink(value, onChange, memberIndex, socialIndex, {
                            url: event.target.value,
                          })
                        }
                        placeholder="https://..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          removeMemberSocialLink(value, onChange, memberIndex, socialIndex)
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </EditorSection>

      <EditorSection
        title="Card and layout style"
        description="Tune columns, spacing, radius, and card colors."
      >
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
        </div>
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
        <ColorField
          label="Card background"
          value={style.cardSurface}
          onChange={(next) => updateStyle(value, onChange, { cardSurface: next })}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />
        <ColorField
          label="Card border"
          value={style.cardBorder}
          onChange={(next) => updateStyle(value, onChange, { cardBorder: next })}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />
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
        description="Low-level layout and style token controls."
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
          <p className="text-sm font-medium">Card surface token</p>
          <Input
            value={style.cardSurface}
            onChange={(event) => updateStyle(value, onChange, { cardSurface: event.target.value })}
            placeholder="var(--color-bg)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Card border token</p>
          <Input
            value={style.cardBorder}
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
