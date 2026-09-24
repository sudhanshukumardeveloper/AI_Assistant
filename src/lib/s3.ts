import { S3Client } from "@aws-sdk/client-s3";

let s3Client: S3Client | undefined;

export function getS3Client() {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    if (!region) {
      throw new Error("AWS_REGION is not configured");
    }

    s3Client = new S3Client({
      region,
      endpoint: process.env.AWS_S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT)
    });
  }

  return s3Client;
}

export const mediaBucket = process.env.AWS_S3_BUCKET || "";
