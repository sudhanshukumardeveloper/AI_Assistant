import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";
import { runAgent } from "@/lib/ai";
import { classifyAction } from "@/lib/governance";
import { dispatchTrustedAction } from "@/lib/runner";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

    const result = await runAgent(prompt, async ({ requestId, action, confirmed, payload }) => {
      const risk = classifyAction(action);
      if (risk === "HIGH" && !confirmed) {
        await db.auditEvent.create({
          data: { userId: user.id, requestId, action, risk, status: "DENIED", details: { reason: "explicit_confirmation_required", source: "ai-tool" } }
        });
        return { accepted: false, requiresApproval: true, risk, action };
      }

      try {
        const execution = await dispatchTrustedAction({ requestId, userId: user.id, action, risk, payload });
        await db.auditEvent.create({
          data: { userId: user.id, requestId, action, risk, status: "SUCCEEDED", details: { result: execution, source: "ai-tool" } }
        });
        return { accepted: true, risk, result: execution };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Trusted runner failed";
        await db.auditEvent.create({
          data: { userId: user.id, requestId, action, risk, status: "FAILED", details: { error: message, source: "ai-tool" } }
        });
        return { accepted: false, risk, error: message };
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run agent";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
