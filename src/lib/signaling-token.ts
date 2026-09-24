import crypto from "node:crypto";

const secret = () => {
  const value = process.env.SIGNALING_SECRET || process.env.RESEND_API_KEY;
  if (!value) throw new Error("SIGNALING_SECRET is not configured");
  return value;
};

function b64(value: string) {
  return Buffer.from(value).toString("base64url");
}

export function createSignalingToken(input: { userId: string; roomId: string; expiresInSeconds?: number }) {
  const exp = Math.floor(Date.now() / 1000) + (input.expiresInSeconds || 300);
  const payload = b64(JSON.stringify({ sub: input.userId, room: input.roomId, exp }));
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return payload + "." + signature;
}
