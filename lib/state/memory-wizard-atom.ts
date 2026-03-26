import { atomWithStorage } from "jotai/utils";
import { type RollPreset } from "@/lib/domain/roll-presets";
import { type FilterId } from "@/lib/filters/presets";

export interface MemoryWizardState {
  title: string;
  weddingDateLocal: string;
  rollPreset: RollPreset;
  fixedFilter: FilterId;
  password: string;
  currentStep: number;
}

const getBrowserLocalDate = (): string => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const initialMemoryWizardState: MemoryWizardState = {
  title: "",
  weddingDateLocal: getBrowserLocalDate(),
  rollPreset: 12,
  fixedFilter: "disposable-starter",
  password: "",
  currentStep: 1,
};

// atomWithStorage automatically handles persistence in localStorage
export const memoryWizardAtom = atomWithStorage<MemoryWizardState>(
  "snapitnow_memory_wizard_v1",
  initialMemoryWizardState
);
