# Booking Calendar Research Cards

Public-write/security note: availability lookup and booking writes must keep
backend-owned provider secrets, CAPTCHA/nonce/HMAC checks, and rate limits.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Cal.com embed | https://cal.com/docs/platform/embed/embed-calendar | docs-example | Cal.com docs/terms; app is open source but hosted embed terms apply. | Embedded scheduling calendar with event type and layout options. | `provider: cal`, `eventTypeId`, `displayMode`, `height`. | Adapt | Summarize only; no copied embed code. |
| Cal.com repo | https://github.com/calcom/cal.com | open-source | AGPL-3.0 repo; strong copyleft, verify before reuse. | Full scheduling product with availability, event types, routing forms. | `eventType`, `availabilityMode`, `timezone`, `routing`. | Adapt | Reference behavior only; do not copy code. |
| FullCalendar React | https://fullcalendar.io/docs/react | open-source | FullCalendar has premium/commercial and open-source plugin distinctions; verify per plugin. | Calendar grid/list views with events, dates, and interactions. | `view`, `initialDate`, `slotDuration`, `showWeekends`. | Keep | Summarize behavior only. |
| FullCalendar time grid | https://fullcalendar.io/docs/timegrid-view | docs-example | Plugin license must be verified. | Time-slot calendar view for appointment availability. | `view: timeGrid`, `slotMinTime`, `slotMaxTime`. | Adapt | Summarize only. |
| React Hook Form | https://react-hook-form.com/get-started | open-source | MIT package; verify. | Client validation for booking details after slot selection. | `fields`, `validation`, `submitCopy`. | Adapt | Summarize behavior only. |
| Typeform scheduling form | https://www.typeform.com/developers/embed/ | docs-example | Typeform terms; embed reference. | Modal/inline flow for booking intake questions. | `intakeMode`, `embedId`, `displayMode`. | Adapt | Summarize only. |
| Tally scheduling form | https://tally.so/help/how-to-embed-a-tally-form | docs-example | Tally terms; embed reference. | Embedded intake form with hidden fields. | `intakeMode`, `hiddenFields`, `successCopy`. | Adapt | Summarize only. |
| Tailwind UI calendar | https://tailwindcss.com/plus/ui-blocks/application-ui/data-display/calendars | premium-reference | Paid reference only. | Calendar UI with month/week/day displays and event list. | `view`, `showAgenda`, `style.density`. | Adapt | Reference UX only. |
| Flowbite datepicker | https://flowbite.com/docs/components/datepicker/ | docs-example | MIT core; verify docs terms. | Date picker and range selection controls. | `dateSelection`, `minDate`, `maxDate`, `locale`. | Adapt | Summarize only. |
| Preline calendar/date controls | https://preline.co/docs/datepicker.html | docs-example | Terms require verification. | Datepicker and date range UI for booking forms. | `dateSelection`, `disabledDates`, `format`. | Adapt | Summarize only. |
