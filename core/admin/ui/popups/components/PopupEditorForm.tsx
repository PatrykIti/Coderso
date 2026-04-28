import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

import type { PopupEditorDraft } from "../popupEditorModel";

const Field = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <label className="flex flex-col gap-2 text-sm">
    <span className="font-medium text-foreground">{label}</span>
    {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
    {children}
  </label>
);

type PopupEditorFormProps = {
  draft: PopupEditorDraft;
  onPatch: (patch: Partial<PopupEditorDraft>) => void;
};

export function PopupEditorForm({ draft, onPatch }: PopupEditorFormProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>Name, slug, and campaign status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Name">
            <Input
              value={draft.name}
              onChange={(event) => onPatch({ name: event.target.value })}
              placeholder="Winter Promo Popup"
            />
          </Field>
          <Field label="Slug" description="Lowercase URL-safe identifier.">
            <Input
              value={draft.slug}
              onChange={(event) => onPatch({ slug: event.target.value })}
              placeholder="winter-promo-popup"
            />
          </Field>
          <Field label="Status">
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
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trigger</CardTitle>
          <CardDescription>Choose when the popup should appear.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Trigger type">
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
          </Field>

          {draft.triggerType === "time_delay" ? (
            <Field label="Delay (seconds)">
              <Input
                type="number"
                min={0}
                max={3600}
                value={draft.triggerDelaySeconds}
                onChange={(event) => onPatch({ triggerDelaySeconds: event.target.value })}
              />
            </Field>
          ) : null}

          {draft.triggerType === "scroll_depth" ? (
            <Field label="Scroll depth (%)">
              <Input
                type="number"
                min={1}
                max={100}
                value={draft.triggerPercent}
                onChange={(event) => onPatch({ triggerPercent: event.target.value })}
              />
            </Field>
          ) : null}

          {draft.triggerType === "cta_click" ? (
            <Field label="CSS selector" description="Button/link selector that opens popup.">
              <Input
                value={draft.triggerSelector}
                onChange={(event) => onPatch({ triggerSelector: event.target.value })}
                placeholder=".open-popup"
              />
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Targeting and Frequency</CardTitle>
          <CardDescription>Where it appears and how often it repeats.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <Field label="Include paths" description="One path per line. Leave empty for all pages.">
            <Textarea
              rows={5}
              value={draft.includePathsText}
              onChange={(event) => onPatch({ includePathsText: event.target.value })}
              placeholder="/\n/products\n/blog"
            />
          </Field>
          <Field label="Exclude paths" description="One path per line.">
            <Textarea
              rows={5}
              value={draft.excludePathsText}
              onChange={(event) => onPatch({ excludePathsText: event.target.value })}
              placeholder="/checkout\n/account"
            />
          </Field>

          <Field label="Audience">
            <Select
              value={draft.audience}
              onValueChange={(value) => onPatch({ audience: value as PopupEditorDraft["audience"] })}
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
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Frequency strategy">
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
            </Field>
            <Field label="Cooldown (minutes)">
              <Input
                type="number"
                min={0}
                max={43200}
                value={draft.cooldownMinutesText}
                onChange={(event) => onPatch({ cooldownMinutesText: event.target.value })}
                placeholder="optional"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>Message and CTA shown inside the popup.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Title">
            <Input
              value={draft.title}
              onChange={(event) => onPatch({ title: event.target.value })}
              placeholder="Get 10% off your first order"
            />
          </Field>
          <Field label="Template ID" description="Optional reusable template reference.">
            <Input
              value={draft.templateId}
              onChange={(event) => onPatch({ templateId: event.target.value })}
              placeholder="template-hero-popup"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Body">
              <Textarea
                rows={5}
                value={draft.body}
                onChange={(event) => onPatch({ body: event.target.value })}
                placeholder="Subscribe to receive weekly offers and product updates."
              />
            </Field>
          </div>
          <Field label="CTA label">
            <Input
              value={draft.ctaLabel}
              onChange={(event) => onPatch({ ctaLabel: event.target.value })}
              placeholder="Claim offer"
            />
          </Field>
          <Field label="CTA URL">
            <Input
              value={draft.ctaHref}
              onChange={(event) => onPatch({ ctaHref: event.target.value })}
              placeholder="/promo"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>Placement and behavior options.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Placement">
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
          </Field>
          <Field label="Dismissible">
            <div className="flex h-10 items-center">
              <Switch
                checked={draft.dismissible}
                onCheckedChange={(checked) => onPatch({ dismissible: checked })}
              />
            </div>
          </Field>
          <Field label="Overlay">
            <div className="flex h-10 items-center">
              <Switch
                checked={draft.showOverlay}
                onCheckedChange={(checked) => onPatch({ showOverlay: checked })}
              />
            </div>
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
