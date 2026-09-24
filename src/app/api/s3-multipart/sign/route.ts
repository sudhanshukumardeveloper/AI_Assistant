import { NextResponse } from "next/server";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, mediaBucket } from "@/lib/s3";
import { currentUser } from "@/lib/access";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { attachmentId, uploadId, partNumber } = await request.json();
    const attachment = await db.fileAttachment.findUnique({ where: { id: String(attachmentId || "") } });
    if (!attachment || attachment.uploaderId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const n = Number(partNumber);
    if (!Number.isInteger(n) || n < 1 || n > 10000 || !uploadId) return NextResponse.json({ error: "Invalid part" }, { status: 400 });
    const url = await getSignedUrl(getS3Client(), new UploadPartCommand({ Bucket: mediaBucket, Key: attachment.objectKey, UploadId: uploadId, PartNumber: n }), { expiresIn: 900 });
    return NextResponse.json({ url, partNumber: n, expiresIn: 900 });
  } catch (error) {
    console.error("multipart sign error", error);
    return NextResponse.json({ error: "Unable to sign upload part" }, { status: 500 });
  }
}
