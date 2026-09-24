import crypto from "node:crypto";

type Message = { role: "system" | "user" | "assistant" | "tool"; content?: string; tool_call_id?: string; name?: string; tool_calls?: ToolCall[] };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

const tools = [{
  type: "function",
  function: {
    name: "execute_action",
    description: "Execute a governed action through the trusted runner. High-risk actions are never executed without explicit confirmation.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", description: "The concrete action to perform." },
        confirmed: { type: "boolean", description: "Explicit user confirmation for a high-risk action." },
        payload: { type: "object", additionalProperties: true }
      },
      required: ["action"]
    }
  }
}];

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function provider(messages: Message[]) {
  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = required("AI_MODEL");
  const key = required("AI_API_KEY");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, tools, tool_choice: "auto", temperature: 0.2 }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`);
  return response.json() as Promise<{ choices?: Array<{ message?: Message }> }>;
}

export async function runAgent(userPrompt: string, execute: (args: { requestId: string; action: string; confirmed: boolean; payload: unknown }) => Promise<unknown>) {
  const requestId = crypto.randomUUID();
  const messages: Message[] = [
    {
      role: "system",
      content: "You are Aegis, a private personal assistant. Be concise and factual. Use execute_action only for concrete user-requested actions. Never claim an external action succeeded unless the tool reports success. High-risk actions require explicit confirmation and must be surfaced to the user before execution."
    },
    { role: "user", content: userPrompt.slice(0, 4000) }
  ];

  for (let turn = 0; turn < 6; turn++) {
    const result = await provider(messages);
    const message = result.choices?.[0]?.message;
    if (!message) throw new Error("AI provider returned no message");
    messages.push(message);

    if (!message.tool_calls?.length) {
      return { requestId, response: message.content || "", completed: true };
    }

    for (const call of message.tool_calls) {
      if (call.function.name !== "execute_action") continue;
      let args: { action?: unknown; confirmed?: unknown; payload?: unknown };
      try { args = JSON.parse(call.function.arguments); } catch { throw new Error("AI returned invalid action arguments"); }
      if (typeof args.action !== "string" || !args.action.trim()) throw new Error("AI returned an invalid action");
      const result = await execute({
        requestId,
        action: args.action.trim().slice(0, 1000),
        confirmed: args.confirmed === true,
        payload: args.payload ?? {}
      });
      messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: JSON.stringify(result) });
    }
  }

  throw new Error("Agent exceeded its execution-turn limit");
}
