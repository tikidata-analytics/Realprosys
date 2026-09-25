import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; schemeId: string }> }
) {
  try {
    const { username, schemeId } = await params;

    // Look up user by username
    const users = await pool.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
      [username]
    );
    if (!users.rows.length) {
      return NextResponse.json({ error: "Skema tidak ditemukan" }, { status: 404 });
    }
    const userId = users.rows[0].id;

    // Look up scheme by username + schemeId, only if sharing is enabled
    const schemes = await pool.query(
      `SELECT s.id, s.name, s.booking_date, s.schedule,
              c.name as customer_name,
              p.name as product_name, p.price, p.land_area, p.building_area,
              pr.name as project_name,
              u.username
       FROM schemes s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN products p ON p.id = s.product_id
       LEFT JOIN projects pr ON pr.id = p.project_id
       WHERE s.id = $1 AND s.user_id = $2 AND s.share_token IS NOT NULL`,
      [schemeId, userId]
    );

    if (!schemes.rows.length) {
      return NextResponse.json({ error: "Skema tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(schemes.rows[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
