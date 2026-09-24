import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";
import { classifyAction } from "@/lib/governance";
import { db } from "@/lib/db";
import crypto from "node:crypto";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { requestId, action, confirmed } = await request.json();
    if (typeof requestId !== "string" || typeof action !== "string" || !action.trim()) return NextResponse.json({ error: "requestId and action are required" }, { status: 400 });
    const risk = classifyAction(action);
    if (risk === "HIGH" && confirmed !== true) {
      await db.auditEvent.create({ data: { userId: user.id, requestId, action, risk, status: "DENIED", details: { reason: "explicit_confirmation_required" } } });
      return NextResponse.json({ error: "High-risk action requires explicit confirmation", risk, requiresApproval: true }, { status: 403 });
    }
    const job = await db.executionJob.create({ data: { userId: user.id, action, risk, status: risk === "HIGH" ? "APPROVED" : "RUNNING", payload: { requestId } } });
    await db.auditEvent.create({ data: { userId: user.id, requestId, action, risk, status: risk === "HIGH" ? "APPROVED" : "RUNNING", details: { jobId: job.id } } });
    // Trusted runners are deliberately a separate boundary. The control plane records and governs the job here.
    const result = { accepted: true, jobId: job.id, executionBoundary: "trusted-runner" };
    await db.executionJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", result, finishedAt: new Date(), startedAt: new Date() } });
    await db.auditEvent.create({ data: { userId: user.id, requestId, action, risk, status: "SUCCEEDED", details: result } });
    return NextResponse.json({ ...result, risk });
  } catch (error) {
    console.error("agent execute error", error);
    return NextResponse.json({ error: "Unable to execute governed action" }, { status: 500 });
  }
}
