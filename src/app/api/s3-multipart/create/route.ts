import { NextResponse } from "next/server";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getS3Client, mediaBucket } from "@/lib/s3";
import { currentUser } from "@/lib/access";
import { db } from "@/lib/db";
import crypto from "node:crypto";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { roomId, fileName, contentType, sizeBytes } = await request.json();
    if (typeof roomId !== "string" || typeof fileName !== "string" || !Number.isSafeInteger(Number(sizeBytes)) || Number(sizeBytes) <= 100 * 1024 * 1024) return NextResponse.json({ error: "Invalid multipart upload metadata" }, { status: 400 });
    const member = await db.roomMember.findUnique({ where: { roomId_userId: { roomId, userId: user.id } } });
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!mediaBucket) throw new Error("AWS_S3_BUCKET is not configured");
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
    const objectKey = `uploads/${roomId}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeName}`;
    const created = await getS3Client().send(new CreateMultipartUploadCommand({ Bucket: mediaBucket, Key: objectKey, ContentType: String(contentType || "application/octet-stream") }));
    if (!created.UploadId) throw new Error("S3 did not return an upload ID");
    const attachment = await db.fileAttachment.create({ data: { roomId, uploaderId: user.id, objectKey, originalName: safeName, contentType: String(contentType || "application/octet-stream"), sizeBytes: BigInt(Number(sizeBytes)) } });
    return NextResponse.json({ attachmentId: attachment.id, uploadId: created.UploadId, objectKey, partSize: 10 * 1024 * 1024 });
  } catch (error) {
    console.error("multipart create error", error);
    return NextResponse.json({ error: "Unable to start multipart upload" }, { status: 500 });
  }
}
