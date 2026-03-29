import { atomWithStorage } from "jotai/utils";
import { type RollPreset } from "@/lib/domain/roll-presets";
import { type FilterId } from "@/lib/filters/presets";
import { getBrowserLocalDate } from "@/lib/dates/local-date";

export interface MemoryWizardState {
  title: string;
  weddingDateLocal: string;
  rollPreset: RollPreset;
  fixedFilter: FilterId;
  password: string;
  currentStep: number;
}

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
