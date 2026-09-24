import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/access";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) return new NextResponse("Missing denial token.", { status: 400 });
  try {
    const item = await db.accessRequest.findUnique({ where: { approvalToken: hashToken(token) } });
    if (!item || item.expiresAt < new Date() || item.status !== "PENDING") return new NextResponse("This decision link is invalid, expired, or already used.", { status: 410 });
    await db.accessRequest.update({ where: { id: item.id }, data: { status: "DENIED", deniedAt: new Date() } });
    return new NextResponse(`Access request from ${item.email} denied. You can close this page.`, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    console.error("access denial failed", error);
    return new NextResponse("Unable to deny the request.", { status: 500 });
  }
}
