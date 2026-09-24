import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";
import { classifyAction } from "@/lib/governance";
import { db } from "@/lib/db";
import { dispatchTrustedAction } from "@/lib/runner";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const body = await request.json();
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const confirmed = body.confirmed === true;

    if (!requestId || !action) {
      return NextResponse.json({ error: "requestId and action are required" }, { status: 400 });
    }
    if (requestId.length > 100 || action.length > 1000) {
      return NextResponse.json({ error: "requestId or action is too long" }, { status: 400 });
    }

    const risk = classifyAction(action);
    if (risk === "HIGH" && !confirmed) {
      await db.auditEvent.create({
        data: { userId: user.id, requestId, action, risk, status: "DENIED", details: { reason: "explicit_confirmation_required" } }
      });
      return NextResponse.json({ error: "High-risk action requires explicit confirmation", risk, requiresApproval: true }, { status: 403 });
    }

    const job = await db.executionJob.create({
      data: {
        userId: user.id,
        action,
        risk,
        status: risk === "HIGH" ? "APPROVED" : "RUNNING",
        payload: { requestId }
      }
    });

    await db.auditEvent.create({
      data: {
        userId: user.id,
        requestId,
        action,
        risk,
        status: risk === "HIGH" ? "APPROVED" : "RUNNING",
        details: { jobId: job.id }
      }
    });

    try {
      const result = await dispatchTrustedAction({ requestId, userId: user.id, action, risk, payload: body.payload ?? {} });
      await db.executionJob.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", result, finishedAt: new Date(), startedAt: new Date() }
      });
      await db.auditEvent.create({
        data: { userId: user.id, requestId, action, risk, status: "SUCCEEDED", details: { jobId: job.id, result } }
      });
      return NextResponse.json({ accepted: true, jobId: job.id, executionBoundary: "trusted-runner", result, risk });
    } catch (runnerError) {
      const message = runnerError instanceof Error ? runnerError.message : "Trusted runner unavailable";
      await db.executionJob.update({
        where: { id: job.id },
        data: { status: "FAILED", result: { error: message }, finishedAt: new Date(), startedAt: new Date() }
      });
      await db.auditEvent.create({
        data: { userId: user.id, requestId, action, risk, status: "FAILED", details: { jobId: job.id, error: message } }
      });
      return NextResponse.json({ error: "Trusted execution failed", jobId: job.id, risk, details: message }, { status: 502 });
    }
  } catch (error) {
    console.error("agent execute error", error);
    return NextResponse.json({ error: "Unable to execute governed action" }, { status: 500 });
  }
}
