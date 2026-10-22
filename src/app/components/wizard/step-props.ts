import type { ExperimentGroup } from "../../dto/experiment";
import type { DegradedHandler } from "./esco-options";
import type { WizardData } from "./model";

export interface StepProps {
  data: WizardData;
  update: (patch: Partial<WizardData> | ((data: WizardData) => Partial<WizardData>)) => void;
  errors: Record<string, string>;
  group: ExperimentGroup;
  sessionId: string;
  announce: (message: string) => void;
  onEscoDegraded: DegradedHandler;
}
