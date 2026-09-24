import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, mediaBucket } from "@/lib/s3";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const MAX_SINGLE_UPLOAD = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fileName = String(body.fileName || "");
    const contentType = String(body.contentType || "application/octet-stream");
    const sizeBytes = Number(body.sizeBytes || 0);

    if (!fileName || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json({ error: "Invalid file metadata" }, { status: 400 });
    }

    if (sizeBytes > MAX_SINGLE_UPLOAD) {
      return NextResponse.json(
        { error: "Files over 100 MB must use multipart upload" },
        { status: 413 }
      );
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

    if (!mediaBucket) {
      throw new Error("AWS_S3_BUCKET is not configured");
    }

    const command = new PutObjectCommand({
      Bucket: mediaBucket,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: sizeBytes,
      Metadata: { originalName: safeName }
    });

    const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 600 });

    return NextResponse.json({ uploadUrl, objectKey, expiresIn: 600 });
  } catch {
    return NextResponse.json({ error: "Unable to create upload URL" }, { status: 500 });
  }
}
