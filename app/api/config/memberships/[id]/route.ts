import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isWebmaster } from "@/lib/users";
import { getUserIdFromRequest } from "@/lib/auth-api";

// DELETE /api/config/memberships/[id] — revoke a membership
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isWebmaster(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Get membership to find user_id
  const memRes = await db.query(`SELECT user_id FROM user_memberships WHERE id = $1`, [id]);
  if (memRes.rows.length === 0) return NextResponse.json({ error: "Membership tidak ditemukan." }, { status: 404 });

  const user_id = memRes.rows[0].user_id;

  try {
    await db.query(`DELETE FROM user_memberships WHERE id = $1`, [id]);

    // Revert user to free tier
    await db.query(`UPDATE users SET tier = 'free' WHERE id = $1`, [user_id]);

    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Gagal menghapus membership." }, { status: 500 }); }
}
