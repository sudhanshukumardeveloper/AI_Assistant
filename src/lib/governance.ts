export type Risk = "LOW" | "MEDIUM" | "HIGH";
export type PlanStep = { id: string; action: string; operation: string; risk: Risk; requiresApproval: boolean };

const high = /send|publish|delete|remove|external|call|transfer|purchase|post/i;
const medium = /draft|edit|create|upload|schedule|invite|update/i;

export function classifyAction(action: string): Risk {
  if (high.test(action)) return "HIGH";
  if (medium.test(action)) return "MEDIUM";
  return "LOW";
}

export function buildPlan(input: string): PlanStep[] {
  const normalized = input.trim().slice(0, 1000);
  const risk = classifyAction(normalized);
  return [{ id: "step-1", action: normalized, operation: "agent.action", risk, requiresApproval: risk === "HIGH" }];
}
