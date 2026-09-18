import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const tokenVersion = req.headers.get("x-token-version");
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, name, token_version FROM users WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ user: null }, { status: 404 });
    }
    const user = result.rows[0];
    // Revocation check: compare tokenVersion from JWT with DB
    if (tokenVersion && String(user.token_version) !== tokenVersion) {
      return NextResponse.json({ user: null, revoked: true }, { status: 401 });
    }
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
