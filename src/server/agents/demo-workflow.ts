export const demoSteps = [
  { agent: "orchestrator", title: "Decompose the mission into a bounded plan", kind: "planning" },
  { agent: "research", title: "Prepare a research brief from the mission objective", kind: "analysis" },
  { agent: "verifier", title: "Check trace completeness and label demo provenance", kind: "verification" },
] as const;

export function demoResult(objective: string) {
  return { mode: "demo", note: "This is a workflow demonstration. No external sources were queried and no actions were executed.", objective };
}
