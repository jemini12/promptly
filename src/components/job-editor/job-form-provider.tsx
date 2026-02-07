"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { defaultJobFormState, type JobFormState } from "@/types/job-form";

type JobFormContextValue = {
  state: JobFormState;
  setState: React.Dispatch<React.SetStateAction<JobFormState>>;
};

const JobFormContext = createContext<JobFormContextValue | null>(null);

export function JobFormProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: Partial<JobFormState>;
}) {
  const [state, setState] = useState<JobFormState>({
    ...defaultJobFormState,
    ...initialState,
    preview: initialState?.preview ?? defaultJobFormState.preview,
  });

  const value = useMemo(() => ({ state, setState }), [state]);
  return <JobFormContext.Provider value={value}>{children}</JobFormContext.Provider>;
}

export function useJobForm() {
  const context = useContext(JobFormContext);
  if (!context) {
    throw new Error("useJobForm must be used inside JobFormProvider");
  }

  return context;
}
