import { deepFreezeExact } from "./core.mjs";
import { SETUP_ACTION_ROWS } from "./actions/setup.mjs";
import { BUTTON_IMAGE_ACTION_ROWS } from "./actions/button-image.mjs";
import { TABS_CONTENT_ACTION_ROWS } from "./actions/tabs-content.mjs";
import { TABS_KEYBOARD_ACTION_ROWS } from "./actions/tabs-keyboard.mjs";
import { SPACE_SELECTION_ACTION_ROWS } from "./actions/space-selection.mjs";
import { DIRTY_GUARD_ACTION_ROWS } from "./actions/dirty-guard.mjs";
import { RECOVERY_CACHE_ACTION_ROWS } from "./actions/recovery-cache.mjs";
import { RETENTION_USER_ACTION_ROWS } from "./actions/retention-user.mjs";
import { TERMINAL_ACTION_ROWS } from "./actions/terminal.mjs";


// Generated from the contract's exhaustive Markdown action tables. The rows are
// intentionally embedded so importing this pure module never reads task files.
export const RAW_ACTION_ROWS = deepFreezeExact([
  ...SETUP_ACTION_ROWS,
  ...BUTTON_IMAGE_ACTION_ROWS,
  ...TABS_CONTENT_ACTION_ROWS,
  ...TABS_KEYBOARD_ACTION_ROWS,
  ...SPACE_SELECTION_ACTION_ROWS,
  ...DIRTY_GUARD_ACTION_ROWS,
  ...RECOVERY_CACHE_ACTION_ROWS,
  ...RETENTION_USER_ACTION_ROWS,
  ...TERMINAL_ACTION_ROWS,
]);
