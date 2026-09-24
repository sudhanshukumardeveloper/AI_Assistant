import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, mediaBucket } from "@/lib/s3";
import { currentUser } from "@/lib/access";
import { db } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { attachmentId } = await context.params;
  const attachment = await db.fileAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.status !== "READY") return NextResponse.json({ error: "File not found" }, { status: 404 });
  const member = await db.roomMember.findUnique({ where: { roomId_userId: { roomId: attachment.roomId, userId: user.id } } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = await getSignedUrl(getS3Client(), new GetObjectCommand({ Bucket: mediaBucket, Key: attachment.objectKey }), { expiresIn: 300 });
  return NextResponse.json({ url, expiresIn: 300 });
}
