import { Globe2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const localeOptions = [
  { value: "en", label: "English" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "pl-PL", label: "Polish (Poland)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German (Germany)" },
];

const timezoneOptions = [
  { value: "utc-08", label: "(UTC-08:00) Pacific Time (US & Canada)" },
  { value: "utc+00", label: "(UTC+00:00) Greenwich Mean Time" },
  { value: "utc+01", label: "(UTC+01:00) Central European Time" },
  { value: "utc+09", label: "(UTC+09:00) Tokyo" },
];

const labelClassName = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const timezoneUnavailableReason =
  "Timezone is not wired into the settings save payload yet. TASK-359-04 owns persistence.";

type BrandingCardProps = {
  siteName: string;
  siteLocale: string;
  onChange?: (next: { siteName: string; siteLocale: string }) => void;
  disabled?: boolean;
};

const defaultValues = {
  siteName: "Coderso",
  siteLocale: "en",
};

export function BrandingCard({
  siteName = defaultValues.siteName,
  siteLocale = defaultValues.siteLocale,
  onChange,
  disabled = false,
}: BrandingCardProps) {
  const handleNameChange = (value: string) => {
    onChange?.({ siteName: value, siteLocale });
  };

  const handleLocaleChange = (value: string) => {
    onChange?.({ siteName, siteLocale: value });
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Site Identity</CardTitle>
            <CardDescription>Update the name and locale defaults for your site.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="site-name">
              Site name
            </label>
            <Input
              id="site-name"
              value={siteName}
              placeholder="e.g. My Awesome Site"
              onChange={(event) => handleNameChange(event.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="site-locale">
              Primary locale
            </label>
            <Select value={siteLocale} onValueChange={handleLocaleChange} disabled={disabled}>
              <SelectTrigger id="site-locale" className="w-full">
                <SelectValue placeholder="Select locale" />
              </SelectTrigger>
              <SelectContent>
                {localeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelClassName} htmlFor="site-timezone">
              Timezone
            </label>
            <Select defaultValue="utc-08" disabled>
              <SelectTrigger
                id="site-timezone"
                className="w-full"
                title={timezoneUnavailableReason}
                data-no-op-control="settings-timezone"
              >
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{timezoneUnavailableReason}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
