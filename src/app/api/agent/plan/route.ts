import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";
import { buildPlan } from "@/lib/governance";
import crypto from "node:crypto";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { prompt } = await request.json();
    if (typeof prompt !== "string" || !prompt.trim()) return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    return NextResponse.json({ requestId: crypto.randomUUID(), steps: buildPlan(prompt) });
  } catch {
    return NextResponse.json({ error: "Unable to create plan" }, { status: 400 });
  }
}
