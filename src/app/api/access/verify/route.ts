import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, hashToken } from "@/lib/access";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) return new NextResponse("Missing access token.", { status: 400 });
  try {
    const item = await db.accessRequest.findUnique({ where: { requestToken: hashToken(token) } });
    if (!item || item.status !== "APPROVED" || item.expiresAt < new Date()) return new NextResponse("This access link is invalid or expired.", { status: 410 });
    const user = await db.user.findUnique({ where: { email: item.email } });
    if (!user) return new NextResponse("Account not found.", { status: 404 });
    await createSession(user.id);
    await db.accessRequest.update({ where: { id: item.id }, data: { requestToken: hashToken("used-" + cryptoSafe()) } });
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("access verification failed", error);
    return new NextResponse("Unable to verify access.", { status: 500 });
  }
}
function cryptoSafe() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
