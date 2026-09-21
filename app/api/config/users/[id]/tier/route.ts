import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { isWebmaster } from "@/lib/users";
import { generateId } from "@/lib/auth";

// PUT /api/config/users/[id]/tier — change user tier/role + write audit log
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId || !(await isWebmaster(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { tier, role } = await req.json();

    // Validate inputs
    if (!tier && !role) {
      return NextResponse.json({ error: "tier or role required" }, { status: 400 });
    }
    if (tier && !["free", "premium"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }
    if (role && !["user", "webmaster"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Get current values
    const current = await pool.query(
      "SELECT role, tier FROM users WHERE id = $1",
      [id]
    );
    if (!current.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const fromTier = current.rows[0].tier;
    const fromRole = current.rows[0].role;
    const toTier = tier || fromTier;
    const toRole = role || fromRole;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Update user
      await client.query(
        `UPDATE users SET tier = $1, role = $2 WHERE id = $3`,
        [toTier, toRole, id]
      );

      // Write audit log (only if tier or role changed)
      if (tier || role) {
        await client.query(
          `INSERT INTO tier_changes (id, user_id, from_tier, to_tier, from_role, to_role, changed_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [generateId(), id, fromTier, toTier, fromRole, toRole, userId]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json({
        id,
        tier: toTier,
        role: toRole,
        changed_at: new Date().toISOString(),
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("PUT /api/config/users/[id]/tier error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
