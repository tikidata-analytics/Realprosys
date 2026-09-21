import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { getUserIdFromRequest } from "@/lib/auth-api";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { enabled } = body;

    const existing = await pool.query(
      "SELECT id, share_token FROM schemes WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (!existing.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (enabled) {
      const token = uuidv4();
      await pool.query(
        "UPDATE schemes SET share_token = $1 WHERE id = $2 AND user_id = $3",
        [token, id, userId]
      );
      return NextResponse.json({ share_token: token });
    } else {
      await pool.query(
        "UPDATE schemes SET share_token = NULL WHERE id = $1 AND user_id = $2",
        [id, userId]
      );
      return NextResponse.json({ share_token: null });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
