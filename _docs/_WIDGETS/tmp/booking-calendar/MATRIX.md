# Booking Calendar Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Provider/event type reference | Current Coderso booking-calendar contract | Keep | Visual `Source` section stores safe provider/event reference only; Cal.com remains Adapt reference material with no copied embed code. |
| Calendar/list display modes | FullCalendar | Keep | `displayMode` controls month/week/list/slots when resolver supports data; Tailwind UI Plus calendar polish remains Adapt reference material. |
| Time slot configuration | FullCalendar time grid | Adapt | Advanced exposes display slot bounds; actual availability remains backend-owned. |
| Intake form handoff | React Hook Form, Typeform, Tally | Adapt | Widget can configure copy/display mode; submissions keep booking runtime contract. |
| Provider secrets/CAPTCHA toggles | Cal.com/provider examples | Reject | Secrets, nonce, CAPTCHA, and rate limits are backend-owned. |
| Copying Cal.com scheduler code | Cal.com repo | Reject | AGPL and product complexity make it reference-only for TASK-252. |
