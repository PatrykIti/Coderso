# Booking Calendar Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Provider/event type reference | Cal.com | Keep | Visual `Source` section stores safe provider/event reference only. |
| Calendar/list display modes | FullCalendar, Tailwind UI Plus | Keep | `displayMode` controls month/week/list/slots when resolver supports data. |
| Time slot configuration | FullCalendar time grid | Adapt | Advanced exposes display slot bounds; actual availability remains backend-owned. |
| Intake form handoff | React Hook Form, Typeform, Tally | Adapt | Widget can configure copy/display mode; submissions keep booking runtime contract. |
| Provider secrets/CAPTCHA toggles | Cal.com/provider examples | Reject | Secrets, nonce, CAPTCHA, and rate limits are backend-owned. |
| Copying Cal.com scheduler code | Cal.com repo | Reject | AGPL and product complexity make it reference-only for TASK-252. |
