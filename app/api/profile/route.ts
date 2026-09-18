import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PUT(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, username } = await req.json();

    // Validate username format
    if (username != null && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: "Username 3-20 karakter, hanya huruf, angka, dan underscore." }, { status: 400 });
    }

    // Check uniqueness if username is being changed
    if (username != null) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2",
        [username.toLowerCase().trim(), userId]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "Username sudah digunakan." }, { status: 409 });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name != null) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (username != null) {
      updates.push(`username = $${idx++}`);
      values.push(username.toLowerCase().trim());
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diupdate" }, { status: 400 });
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, name, username, email`,
      values
    );

    return NextResponse.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await pool.query(
      "SELECT id, name, username, email FROM users WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
