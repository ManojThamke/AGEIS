import { describe, expect, it } from "vitest";
import { demoResult, demoSteps } from "./demo-workflow";

describe("demo workflow contract", () => {
  it("has an ordered bounded plan with verification last", () => {
    expect(demoSteps).toHaveLength(3);
    expect(demoSteps[0].agent).toBe("orchestrator");
    expect(demoSteps.at(-1)?.agent).toBe("verifier");
  });
  it("labels output as illustrative and disclaims external verification", () => {
    const result = demoResult("Assess a sample risk.");
    expect(result.mode).toBe("demo");
    expect(result.note).toContain("No external sources");
  });
});
