import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { currentUser } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const secret = process.env.TURN_SECRET;
  const urls = (process.env.TURN_URLS || "").split(",").map(v => v.trim()).filter(Boolean);
  const realm = process.env.TURN_REALM || "localhost";
  if (!secret || urls.length === 0) return NextResponse.json({ error: "TURN service is not configured" }, { status: 503 });
  const expiry = Math.floor(Date.now() / 1000) + 300;
  const username = `${expiry}:${user.id}`;
  const credential = crypto.createHmac("sha1", secret).update(username).digest("base64");
  return NextResponse.json({ iceServers: [{ urls: urls.map(v => v.startsWith("turn:") || v.startsWith("turns:") ? v : "turn:" + v), username, credential }], realm, ttl: 300 });
}
