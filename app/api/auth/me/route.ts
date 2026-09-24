import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth-api";
import { verifyToken } from "@/lib/auth";
import { getEffectiveTier } from "@/lib/limits";

export async function GET(req: NextRequest) {
  let userId = await getUserIdFromRequest(req);
  let tokenVersion = req.headers.get("x-token-version");

  try {
    const result = await pool.query(
      "SELECT id, email, name, token_version, role, tier FROM users WHERE id = $1",
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
    // Use effective tier from membership (not static users.tier)
    const effectiveTier = await getEffectiveTier(userId);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, tier: effectiveTier } });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
