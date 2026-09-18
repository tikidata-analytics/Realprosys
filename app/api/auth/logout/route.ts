import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

const SESSION_COOKIE = "realprosys_session";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (userId) {
    // Revoke all tokens by incrementing token_version
    await pool.query(
      "UPDATE users SET token_version = token_version + 1 WHERE id = $1",
      [userId]
    );
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
