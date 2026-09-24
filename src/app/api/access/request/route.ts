import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/access";
import { sendAccessRequestEmail } from "@/lib/mailer";

const recent = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.displayName || "").trim();
    if (!displayName || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid name and email address." }, { status: 400 });
    if (!process.env.DATABASE_URL || !process.env.RESEND_API_KEY || !process.env.OWNER_APPROVAL_EMAIL) return NextResponse.json({ error: "Access approval is not configured yet. Ask the administrator to configure DATABASE_URL, RESEND_API_KEY and OWNER_APPROVAL_EMAIL." }, { status: 503 });
    const now = Date.now();
    const previous = recent.get(email) || 0;
    if (now - previous < 60000) return NextResponse.json({ error: "Please wait before submitting another request." }, { status: 429 });
    recent.set(email, now);
    const existing = await db.accessRequest.findFirst({ where: { email, status: "PENDING", expiresAt: { gt: new Date() } } });
    if (existing) return NextResponse.json({ ok: true, message: "Your request is already pending administrator approval." });
    const approvalToken = randomToken();
    const requestToken = randomToken();
    const item = await db.accessRequest.create({
      data: { email, displayName, approvalToken: hashToken(approvalToken), requestToken: hashToken(requestToken), expiresAt: new Date(Date.now() + 24 * 3600000) }
    });
    await sendAccessRequestEmail({ requestId: item.id, requesterName: displayName, requesterEmail: email, approvalToken });
    return NextResponse.json({ ok: true, message: "Request received. The administrator has been notified by email." });
  } catch (error) {
    console.error("access request failed", error);
    return NextResponse.json({ error: "Unable to submit the access request." }, { status: 500 });
  }
}
