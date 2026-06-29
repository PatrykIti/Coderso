import {
  Heading,
  Image as ImageIcon,
  MousePointerClick,
  TextCursorInput,
  Type,
} from "lucide-react";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { PopupEditorDraft } from "../popupEditorModel";

const InspectorGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-6">
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </h3>
    <div className="flex flex-col gap-4">{children}</div>
  </section>
);

const InspectorRow = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) => (
  <label className="flex flex-col gap-1.5 text-sm">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    {description ? <span className="text-xs text-muted-foreground/80">{description}</span> : null}
    {children}
  </label>
);

const RailItem = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="flex cursor-default items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground">
    {icon}
    {label}
  </div>
);

const previewPlacementClass = (placement: PopupEditorDraft["placement"]) => {
  if (placement === "top_banner") return "max-w-full self-start";
  if (placement === "bottom_right") return "ml-auto max-w-xs self-end";
  return "max-w-sm";
};

function PopupPreview({ draft }: { draft: PopupEditorDraft }) {
  return (
    <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl bg-muted p-6">
      {draft.showOverlay ? (
        <div
          data-testid="popup-backdrop"
          className="pointer-events-none absolute inset-0 p-8 opacity-40"
        >
          <div className="h-4 w-40 rounded bg-muted-foreground/30" />
          <div className="mt-4 h-2.5 w-3/4 rounded bg-muted-foreground/20" />
          <div className="mt-2 h-2.5 w-2/3 rounded bg-muted-foreground/20" />
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-20 rounded-xl bg-muted-foreground/10" />
            ))}
          </div>
        </div>
      ) : null}

      <Card
        className={cn(
          "relative z-10 w-full gap-0 p-6 text-center shadow-card",
          previewPlacementClass(draft.placement)
        )}
      >
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
          <ImageIcon className="size-5" />
        </div>
        <h3 className="font-display text-xl font-semibold tracking-tight">
          {draft.title || "Popup title"}
        </h3>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
          {draft.body || "Popup body copy…"}
        </p>
        {draft.ctaLabel ? <Button className="mt-4 w-full">{draft.ctaLabel}</Button> : null}
        {draft.dismissible ? (
          <button
            type="button"
            className="mt-3 text-xs text-muted-foreground hover:text-foreground"
          >
            No thanks
          </button>
        ) : null}
      </Card>
    </div>
  );
}

type PopupEditorFormProps = {
  draft: PopupEditorDraft;
  onPatch: (patch: Partial<PopupEditorDraft>) => void;
};

export function PopupEditorForm({ draft, onPatch }: PopupEditorFormProps) {
  return (
    <div className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="text-sm font-medium">Popup editor</span>
        <Badge variant="outline">{(draft.name || "Untitled") + " · " + draft.status}</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        {/* Left content rail — presentational section affordances. */}
        <aside className="hidden shrink-0 border-r border-border bg-muted/20 p-3 xl:block xl:w-56">
          <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Content
          </div>
          <div className="flex flex-col gap-1">
            <RailItem icon={<Heading />} label="Heading" />
            <RailItem icon={<Type />} label="Text" />
            <RailItem icon={<TextCursorInput />} label="Input" />
            <RailItem icon={<MousePointerClick />} label="Button" />
            <RailItem icon={<ImageIcon />} label="Image" />
          </div>
        </aside>

        {/* Center live preview — READ-ONLY reflection of the draft. */}
        <div className="min-w-0 flex-1 border-b border-border bg-dotted p-6 xl:border-b-0">
          <PopupPreview draft={draft} />
        </div>

        {/* Right inspector — every control bound to the draft via onPatch. */}
        <aside className="w-full shrink-0 overflow-y-auto bg-card p-4 xl:w-80 xl:border-l xl:border-border">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold">Display rules</span>
            <Badge variant="soft">Settings</Badge>
          </div>

          <InspectorGroup title="Identity">
            <InspectorRow label="Name">
              <Input
                value={draft.name}
                onChange={(event) => onPatch({ name: event.target.value })}
                placeholder="Winter Promo Popup"
              />
            </InspectorRow>
            <InspectorRow label="Slug" description="Lowercase URL-safe identifier.">
              <Input
                value={draft.slug}
                onChange={(event) => onPatch({ slug: event.target.value })}
                placeholder="winter-promo-popup"
              />
            </InspectorRow>
            <InspectorRow label="Status">
              <Select
                value={draft.status}
                onValueChange={(value) => onPatch({ status: value as PopupEditorDraft["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </InspectorRow>
          </InspectorGroup>

          <InspectorGroup title="Trigger">
            <InspectorRow label="Trigger type">
              <Select
                value={draft.triggerType}
                onValueChange={(value) =>
                  onPatch({ triggerType: value as PopupEditorDraft["triggerType"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_delay">Time delay</SelectItem>
                  <SelectItem value="scroll_depth">Scroll depth</SelectItem>
                  <SelectItem value="exit_intent">Exit intent</SelectItem>
                  <SelectItem value="cta_click">CTA click</SelectItem>
                </SelectContent>
              </Select>
            </InspectorRow>

            {draft.triggerType === "time_delay" ? (
              <InspectorRow label="Delay (seconds)">
                <Input
                  type="number"
                  min={0}
                  max={3600}
                  value={draft.triggerDelaySeconds}
                  onChange={(event) => onPatch({ triggerDelaySeconds: event.target.value })}
                />
              </InspectorRow>
            ) : null}

            {draft.triggerType === "scroll_depth" ? (
              <InspectorRow label="Scroll depth (%)">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.triggerPercent}
                  onChange={(event) => onPatch({ triggerPercent: event.target.value })}
                />
              </InspectorRow>
            ) : null}

            {draft.triggerType === "cta_click" ? (
              <InspectorRow
                label="CSS selector"
                description="Button/link selector that opens popup."
              >
                <Input
                  value={draft.triggerSelector}
                  onChange={(event) => onPatch({ triggerSelector: event.target.value })}
                  placeholder=".open-popup"
                />
              </InspectorRow>
            ) : null}
          </InspectorGroup>

          <InspectorGroup title="Targeting">
            <InspectorRow
              label="Include paths"
              description="One path per line. Leave empty for all pages."
            >
              <Textarea
                rows={4}
                value={draft.includePathsText}
                onChange={(event) => onPatch({ includePathsText: event.target.value })}
                placeholder="/\n/products\n/blog"
              />
            </InspectorRow>
            <InspectorRow label="Exclude paths" description="One path per line.">
              <Textarea
                rows={3}
                value={draft.excludePathsText}
                onChange={(event) => onPatch({ excludePathsText: event.target.value })}
                placeholder="/checkout\n/account"
              />
            </InspectorRow>
            <InspectorRow label="Audience">
              <Select
                value={draft.audience}
                onValueChange={(value) =>
                  onPatch({ audience: value as PopupEditorDraft["audience"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All visitors</SelectItem>
                  <SelectItem value="logged_in">Logged-in users</SelectItem>
                  <SelectItem value="logged_out">Logged-out users</SelectItem>
                </SelectContent>
              </Select>
            </InspectorRow>
          </InspectorGroup>

          <InspectorGroup title="Frequency">
            <InspectorRow label="Frequency strategy">
              <Select
                value={draft.frequencyStrategy}
                onValueChange={(value) =>
                  onPatch({ frequencyStrategy: value as PopupEditorDraft["frequencyStrategy"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always</SelectItem>
                  <SelectItem value="session_once">Once per session</SelectItem>
                  <SelectItem value="daily_once">Once per day</SelectItem>
                </SelectContent>
              </Select>
            </InspectorRow>
            <InspectorRow label="Cooldown (minutes)">
              <Input
                type="number"
                min={0}
                max={43200}
                value={draft.cooldownMinutesText}
                onChange={(event) => onPatch({ cooldownMinutesText: event.target.value })}
                placeholder="optional"
              />
            </InspectorRow>
          </InspectorGroup>

          <InspectorGroup title="Content">
            <InspectorRow label="Title">
              <Input
                value={draft.title}
                onChange={(event) => onPatch({ title: event.target.value })}
                placeholder="Get 10% off your first order"
              />
            </InspectorRow>
            <InspectorRow label="Body">
              <Textarea
                rows={4}
                value={draft.body}
                onChange={(event) => onPatch({ body: event.target.value })}
                placeholder="Subscribe to receive weekly offers and product updates."
              />
            </InspectorRow>
            <InspectorRow label="Template ID" description="Optional reusable template reference.">
              <Input
                value={draft.templateId}
                onChange={(event) => onPatch({ templateId: event.target.value })}
                placeholder="template-hero-popup"
              />
            </InspectorRow>
            <InspectorRow label="CTA label">
              <Input
                value={draft.ctaLabel}
                onChange={(event) => onPatch({ ctaLabel: event.target.value })}
                placeholder="Claim offer"
              />
            </InspectorRow>
            <InspectorRow label="CTA URL">
              <Input
                value={draft.ctaHref}
                onChange={(event) => onPatch({ ctaHref: event.target.value })}
                placeholder="/promo"
              />
            </InspectorRow>
          </InspectorGroup>

          <InspectorGroup title="Display Settings">
            <InspectorRow label="Placement">
              <Select
                value={draft.placement}
                onValueChange={(value) =>
                  onPatch({ placement: value as PopupEditorDraft["placement"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="bottom_right">Bottom right</SelectItem>
                  <SelectItem value="top_banner">Top banner</SelectItem>
                </SelectContent>
              </Select>
            </InspectorRow>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span className="text-sm font-medium">Dismissible</span>
              <Switch
                checked={draft.dismissible}
                aria-label="Dismissible"
                onCheckedChange={(checked) => onPatch({ dismissible: checked })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span className="text-sm font-medium">Overlay</span>
              <Switch
                checked={draft.showOverlay}
                aria-label="Overlay"
                onCheckedChange={(checked) => onPatch({ showOverlay: checked })}
              />
            </div>
          </InspectorGroup>
        </aside>
      </div>
    </div>
  );
}
