import { Image, Upload } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { SettingsSection, SettingsField } from "@/components/patterns/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const COMMENT_ROWS = [
  { label: "Enable comments", desc: "Let readers leave comments on posts and pages.", on: true },
  { label: "Require approval", desc: "Hold new comments for moderation before publishing.", on: true },
  { label: "Allow guests", desc: "Permit comments from visitors without an account.", on: false },
];

export function SiteSettingsPage() {
  return (
    <SettingsLayout title="Site" description="Public site configuration.">
      <div className="divide-y divide-border">
        <SettingsSection title="Identity" description="How your site is named and branded to visitors.">
          <div className="flex flex-col gap-4">
            <SettingsField label="Site name" htmlFor="site-name">
              <Input id="site-name" defaultValue="Acme Studio" />
            </SettingsField>
            <SettingsField label="Site URL" htmlFor="site-url" hint="The public address where your site is served.">
              <Input id="site-url" type="url" defaultValue="https://acme.studio" />
            </SettingsField>
            <SettingsField label="Favicon" hint="ICO, PNG or SVG, square, at least 64×64.">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Image className="size-6" />
                </div>
                <Button variant="outline" className="gap-1.5">
                  <Upload className="size-4" /> Upload favicon
                </Button>
              </div>
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Homepage" description="Choose what visitors see first.">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Homepage">
              <Select defaultValue="latest">
                <option value="latest">Latest posts</option>
                <option value="welcome">Welcome page</option>
                <option value="about">About</option>
                <option value="landing">Landing</option>
              </Select>
            </SettingsField>
            <SettingsField label="Posts page">
              <Select defaultValue="blog">
                <option value="blog">Blog</option>
                <option value="news">News</option>
                <option value="journal">Journal</option>
              </Select>
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Reading" description="How content is paginated and grouped.">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Posts per page" htmlFor="per-page">
              <Input id="per-page" type="number" defaultValue="10" />
            </SettingsField>
            <SettingsField label="Default category">
              <Select defaultValue="general">
                <option value="general">General</option>
                <option value="product">Product</option>
                <option value="engineering">Engineering</option>
                <option value="design">Design</option>
              </Select>
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Comments" description="Control how readers can respond.">
          <div className="divide-y divide-border">
            {COMMENT_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <div className="text-sm font-medium">{row.label}</div>
                  <div className="text-sm text-muted-foreground">{row.desc}</div>
                </div>
                <Switch defaultChecked={row.on} />
              </div>
            ))}
          </div>
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
