import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth-api";
import { verifyPassword, hashPassword } from "@/lib/auth";


export async function PUT(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, username, currentPassword, newPassword } = await req.json();

    // Password change
    if (currentPassword != null || newPassword != null) {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Password lama dan baru harus diisi." }, { status: 400 });
      }
      if (newPassword.length < 8 || !/[0-9]/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
        return NextResponse.json({ error: "Password baru min 8 karakter, harus ada huruf dan angka." }, { status: 400 });
      }
      // Get current hash
      const userRes = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
      if (userRes.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const valid = await verifyPassword(currentPassword, userRes.rows[0].password_hash);
      if (!valid) return NextResponse.json({ error: "Password lama salah." }, { status: 400 });
      const hash = await hashPassword(newPassword);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
    }

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
  const userId = await getUserIdFromRequest(req);
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
