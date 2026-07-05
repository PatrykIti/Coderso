import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsField } from "@/ui/shared/SettingsSection";

import type { WizardStepBodyProps } from "./stepTypes";

// Curated IANA zones. The server (`site.timezone`, 05-L01) validates the value
// against the runtime's zone database via `Intl`, so every option below is a
// real IANA identifier that the normalizer accepts.
const timezoneOptions = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Warsaw",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

// TASK-482-05-L02: Default display timezone, persisted as `site.timezone`.
export function TimezoneStep({ values, onPatch, disabled }: WizardStepBodyProps) {
  return (
    <SettingsField
      label="Timezone"
      htmlFor="setup-site-timezone"
      hint="Used as the default when displaying dates and times."
    >
      <Select
        value={values.siteTimezone}
        onValueChange={(value) => onPatch({ siteTimezone: value })}
        disabled={disabled}
      >
        <SelectTrigger id="setup-site-timezone" className="w-full">
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {timezoneOptions.map((zone) => (
            <SelectItem key={zone} value={zone}>
              {zone}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsField>
  );
}
