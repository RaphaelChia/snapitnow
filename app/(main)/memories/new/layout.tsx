"use client";

import { Button } from "@/components/ui/button";
import { initialMemoryWizardState, memoryWizardAtom } from "@/lib/state/memory-wizard-atom";
import { useSetAtom } from "jotai";
import { RotateCcw, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const STEPS = [
  { id: 1, title: "Basics", description: "Give your memory a name and date." },
  { id: 2, title: "Experience", description: "How many photos can each guest take?" },
  { id: 3, title: "Look & Feel", description: "Choose the film stock for your photos." },
  { id: 4, title: "Security", description: "Protect your memory with a password." },
];

export default function MemoryWizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setState = useSetAtom(memoryWizardAtom);
  const router = useRouter();
  const pathname = usePathname();

  const currentStep = STEPS.find((s) => pathname.includes(`step-${s.id}`))?.id || 1;

  const handleResetStep = () => {
    if (currentStep === 1) {
      setState((prev) => ({ ...prev, title: initialMemoryWizardState.title, weddingDateLocal: initialMemoryWizardState.weddingDateLocal }));
    } else if (currentStep === 2) {
      setState((prev) => ({ ...prev, rollPreset: initialMemoryWizardState.rollPreset }));
    } else if (currentStep === 3) {
      setState((prev) => ({ ...prev, fixedFilter: initialMemoryWizardState.fixedFilter }));
    } else if (currentStep === 4) {
      setState((prev) => ({ ...prev, password: initialMemoryWizardState.password }));
    }
  };

  const handleExit = () => {
    router.push("/");
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Wizard Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExit}
            className="rounded-full"
          >
            <X className="size-5" />
          </Button>
          <div className="flex flex-col">
            <h2 className="text-sm font-medium">New Memory</h2>
            <p className="text-xs text-muted-foreground">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetStep}
            className="h-8 gap-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3.5" />
            Clear step
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
        <div key={pathname} className="motion-safe-fade-up flex flex-1 flex-col">
          <div className="mb-8 space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {STEPS[currentStep - 1].title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {STEPS[currentStep - 1].description}
            </p>
          </div>

          <div className="flex-1">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
