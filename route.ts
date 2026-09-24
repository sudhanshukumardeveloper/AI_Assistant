import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, mediaBucket } from "@/lib/s3";
import { currentUser } from "@/lib/access";
import { db } from "@/lib/db";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
const MAX_SINGLE_UPLOAD = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await req.json();
    const roomId = String(body.roomId || "");
    const fileName = String(body.fileName || "").trim();
    const contentType = String(body.contentType || "application/octet-stream").slice(0, 200);
    const sizeBytes = Number(body.sizeBytes || 0);
    if (!roomId || !fileName || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) return NextResponse.json({ error: "Invalid file metadata" }, { status: 400 });
    if (sizeBytes > MAX_SINGLE_UPLOAD) return NextResponse.json({ error: "Files over 100 MB must use multipart upload" }, { status: 413 });
    const member = await db.roomMember.findUnique({ where: { roomId_userId: { roomId, userId: user.id } } });
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!mediaBucket || !process.env.AWS_REGION) throw new Error("Object storage is not configured");
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
    const objectKey = `uploads/${roomId}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeName}`;
    const attachment = await db.fileAttachment.create({ data: { roomId, uploaderId: user.id, objectKey, originalName: safeName, contentType, sizeBytes } });
    const command = new PutObjectCommand({ Bucket: mediaBucket, Key: objectKey, ContentType: contentType, ContentLength: sizeBytes, Metadata: { originalName: safeName, attachmentId: attachment.id } });
    const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 600 });
    return NextResponse.json({ uploadUrl, objectKey, attachmentId: attachment.id, expiresIn: 600 });
  } catch (error) {
    console.error("s3 sign error", error);
    return NextResponse.json({ error: "Unable to create upload URL" }, { status: 500 });
  }
}
