import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json(user ? { authenticated: true, user: { id: user.id, email: user.email, displayName: user.displayName } } : { authenticated: false });
}
