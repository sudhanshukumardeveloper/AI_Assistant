import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";
import { db } from "@/lib/db";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const events = await db.auditEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ events });
}
