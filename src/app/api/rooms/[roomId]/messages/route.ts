import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";
import { db } from "@/lib/db";

async function member(roomId: string, userId: string) {
  return db.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
}

export async function GET(_request: Request, context: { params: Promise<{ roomId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { roomId } = await context.params;
  if (!(await member(roomId, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const messages = await db.message.findMany({ where: { roomId }, include: { sender: { select: { id: true, displayName: true, avatarUrl: true } }, attachment: true }, orderBy: { createdAt: "asc" }, take: 100 });
  return NextResponse.json({ messages: messages.map(m => ({ ...m, attachment: m.attachment ? { ...m.attachment, sizeBytes: m.attachment.sizeBytes.toString() } : null })) });
}

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { roomId } = await context.params;
  if (!(await member(roomId, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const attachmentId = typeof body.attachmentId === "string" ? body.attachmentId : null;
    if (!text && !attachmentId) return NextResponse.json({ error: "Message body or attachment is required" }, { status: 400 });
    if (text.length > 10000) return NextResponse.json({ error: "Message must be at most 10,000 characters" }, { status: 400 });
    let type: "TEXT" | "FILE" = "TEXT";
    if (attachmentId) {
      const attachment = await db.fileAttachment.findUnique({ where: { id: attachmentId } });
      if (!attachment || attachment.roomId !== roomId || attachment.uploaderId !== user.id || attachment.status !== "READY") return NextResponse.json({ error: "Attachment is not available" }, { status: 400 });
      type = "FILE";
    }
    const message = await db.message.create({ data: { roomId, senderId: user.id, type, body: text || null, ...(attachmentId ? { attachment: { connect: { id: attachmentId } } } : {}) }, include: { sender: { select: { id: true, displayName: true, avatarUrl: true } }, attachment: true } });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("message create error", error);
    return NextResponse.json({ error: "Unable to send message" }, { status: 500 });
  }
}
