import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appUrl, hashToken, randomToken } from "@/lib/access";
import { sendApprovedAccessEmail } from "@/lib/mailer";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) return new NextResponse("Missing approval token.", { status: 400 });
  try {
    const item = await db.accessRequest.findUnique({ where: { approvalToken: hashToken(token) } });
    if (!item || item.expiresAt < new Date() || item.status !== "PENDING") return new NextResponse("This approval link is invalid, expired, or already used.", { status: 410 });
    const accessToken = randomToken();
    const updated = await db.accessRequest.update({ where: { id: item.id }, data: { status: "APPROVED", approvedAt: new Date(), requestToken: hashToken(accessToken) } });
    const existingUser = await db.user.findUnique({ where: { email: updated.email } });
    const user = existingUser ?? await db.user.create({ data: { email: updated.email, displayName: updated.displayName } });
    await sendApprovedAccessEmail({ email: updated.email, name: updated.displayName, requestToken: accessToken });
    return new NextResponse(`Access approved for ${updated.email}. A secure sign-in link has been emailed to the requester. You can close this page.`, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    console.error("access approval failed", error);
    return new NextResponse("Approval failed. Check server configuration and email delivery.", { status: 500 });
  }
}
