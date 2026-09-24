import { scanObject } from "./malwareScanner";

export async function processObject(objectKey: string, contentType: string) {
  const verdict = await scanObject(objectKey);
  if (verdict !== "clean") return { status: "QUARANTINED" };

  if (contentType.startsWith("video/")) {
    // Production hook: FFmpeg thumbnail extraction, EXIF handling,
    // and adaptive HLS transcoding.
  }

  return { status: "READY" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("media worker ready");
}
