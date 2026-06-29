import { SettingsField } from "@/ui/shared/SettingsSection";
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

/**
 * TASK-479-28-L02: Site Identity fields re-expressed as the prototype's
 * `SettingsField` rows (Notion-like, no inner card). Bindings unchanged — the
 * name/locale still write through `onChange`; the timezone select stays the
 * disabled "not wired yet" no-op control owned by TASK-359-04.
 */
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
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsField label="Site name" htmlFor="site-name">
          <Input
            id="site-name"
            value={siteName}
            placeholder="e.g. My Awesome Site"
            onChange={(event) => handleNameChange(event.target.value)}
            disabled={disabled}
          />
        </SettingsField>
        <SettingsField label="Primary locale" htmlFor="site-locale">
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
        </SettingsField>
      </div>
      <SettingsField label="Timezone" htmlFor="site-timezone" hint={timezoneUnavailableReason}>
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
      </SettingsField>
    </div>
  );
}
