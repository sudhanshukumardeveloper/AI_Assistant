import { NextResponse } from "next/server";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getS3Client, mediaBucket } from "@/lib/s3";
import { currentUser } from "@/lib/access";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { attachmentId, uploadId, parts } = await request.json();
    const attachment = await db.fileAttachment.findUnique({ where: { id: String(attachmentId || "") } });
    if (!attachment || attachment.uploaderId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!Array.isArray(parts) || !parts.length) return NextResponse.json({ error: "Parts are required" }, { status: 400 });
    const normalized = parts.map((p) => ({ PartNumber: Number(p.PartNumber), ETag: String(p.ETag) })).filter(p => Number.isInteger(p.PartNumber) && p.PartNumber > 0 && p.ETag);
    if (normalized.length !== parts.length) return NextResponse.json({ error: "Invalid parts" }, { status: 400 });
    const result = await getS3Client().send(new CompleteMultipartUploadCommand({ Bucket: mediaBucket, Key: attachment.objectKey, UploadId: String(uploadId), MultipartUpload: { Parts: normalized } }));
    await db.fileAttachment.update({ where: { id: attachment.id }, data: { status: "READY" } });
    return NextResponse.json({ ok: true, location: result.Location, objectKey: attachment.objectKey });
  } catch (error) {
    console.error("multipart complete error", error);
    return NextResponse.json({ error: "Unable to complete multipart upload" }, { status: 500 });
  }
}
