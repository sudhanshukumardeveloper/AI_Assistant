import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";
import { db } from "@/lib/db";
import { createSignalingToken } from "@/lib/signaling-token";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { roomId } = await request.json();
    if (typeof roomId !== "string" || !roomId) return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    const member = await db.roomMember.findUnique({ where: { roomId_userId: { roomId, userId: user.id } } });
    if (!member) return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 });
    return NextResponse.json({ token: createSignalingToken({ userId: user.id, roomId }), expiresIn: 300 });
  } catch {
    return NextResponse.json({ error: "Unable to create signaling token" }, { status: 500 });
  }
}
