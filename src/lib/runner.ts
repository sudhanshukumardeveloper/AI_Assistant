import crypto from "node:crypto";

type Risk = "LOW" | "MEDIUM" | "HIGH";

type RunnerInput = {
  requestId: string;
  userId: string;
  action: string;
  risk: Risk;
  payload: unknown;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function dispatchTrustedAction(input: RunnerInput) {
  const url = required("ACTION_RUNNER_URL").replace(/\/$/, "");
  const secret = required("ACTION_RUNNER_SECRET");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(input);
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${url}/v1/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-aegis-timestamp": timestamp,
        "x-aegis-signature": signature,
        "x-aegis-request-id": input.requestId
      },
      body,
      cache: "no-store",
      signal: controller.signal
    });

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 1000) }; }
    }

    if (!response.ok) {
      throw new Error(`Runner returned HTTP ${response.status}`);
    }
    if (!data || typeof data !== "object" || (data as { accepted?: unknown }).accepted !== true) {
      throw new Error("Runner did not explicitly acknowledge the action");
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}
