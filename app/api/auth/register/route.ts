import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { hashPassword, createToken, generateId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const SESSION_COOKIE = "realprosys_session";

function isStrongPassword(pwd: string): boolean {
  return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`auth-register:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." }, { status: 429 });
  }

  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json({ error: "Password minimal 8 karakter, harus ada huruf besar, huruf kecil, dan angka." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const id = generateId();

    // Get token_version (default 1 for new users)
    const tokenVersion = 1;

    await pool.query(
      "INSERT INTO users (id, email, password_hash, name, token_version) VALUES ($1, $2, $3, $4, $5)",
      [id, normalizedEmail, passwordHash, name, tokenVersion]
    );

    const token = await createToken(id, tokenVersion);
    const res = NextResponse.json({ user: { id, email: normalizedEmail, name } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
