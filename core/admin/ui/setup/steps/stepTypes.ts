// TASK-482-05-L02: shared prop shape for the Basic-track step bodies. Each step
// is a controlled component that reads the shared `WizardValues` and pushes
// changes back through `onPatch` (mapped to the wizard reducer's `patch` action
// by SetupWizard's `renderStep`). Persistence to `PATCH /settings` happens once
// at the wizard's commit boundary (see SetupWizard), never per-keystroke.

import type { WizardValues } from "../wizardSteps";

export type WizardStepBodyProps = {
  values: WizardValues;
  onPatch: (patch: Partial<WizardValues>) => void;
  disabled?: boolean;
};
