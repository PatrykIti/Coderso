import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsField } from "@/ui/shared/SettingsSection";

import type { WizardStepBodyProps } from "./stepTypes";

// Curated locales mirroring the general-settings screen; the server accepts any
// non-empty string (`site.locale`), so this list is a convenience, not a gate.
const localeOptions = [
  { value: "en", label: "English" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "pl-PL", label: "Polish (Poland)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German (Germany)" },
];

// TASK-482-05-L02: Default content language, persisted as `site.locale`.
export function LocaleStep({ values, onPatch, disabled }: WizardStepBodyProps) {
  return (
    <SettingsField
      label="Primary locale"
      htmlFor="setup-site-locale"
      hint="The default language for new content and formatting."
    >
      <Select
        value={values.siteLocale}
        onValueChange={(value) => onPatch({ siteLocale: value })}
        disabled={disabled}
      >
        <SelectTrigger id="setup-site-locale" className="w-full">
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
  );
}
