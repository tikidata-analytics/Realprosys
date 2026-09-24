import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  // Only allow in development or when explicitly called
  if (process.env.NODE_ENV === "production") {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Alter user_id from UUID to TEXT to match users.id
    await db.query(`ALTER TABLE user_memberships ALTER COLUMN user_id TYPE TEXT`);
    return NextResponse.json({ ok: true, message: "user_id changed to TEXT" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
