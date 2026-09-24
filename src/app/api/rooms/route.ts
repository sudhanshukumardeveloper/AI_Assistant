import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";
import { db } from "@/lib/db";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const memberships = await db.roomMember.findMany({ where: { userId: user.id }, include: { room: true }, orderBy: { joinedAt: "desc" } });
  return NextResponse.json({ rooms: memberships.map(m => ({ id: m.room.id, name: m.room.name, role: m.role, joinedAt: m.joinedAt })) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name || name.length > 120) return NextResponse.json({ error: "Room name must be 1–120 characters" }, { status: 400 });
    const room = await db.room.create({ data: { name, members: { create: { userId: user.id, role: "OWNER" } } } });
    return NextResponse.json({ room: { id: room.id, name: room.name, role: "OWNER" } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create room" }, { status: 500 });
  }
}
