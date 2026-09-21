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
    const { email, password, name, username } = await req.json();

    if (!email || !password || !name || !username) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json({ error: "Password minimal 8 karakter, harus ada huruf besar, huruf kecil, dan angka." }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: "Username 3-20 karakter, hanya huruf, angka, dan underscore." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    const [existingEmail, existingUsername] = await Promise.all([
      pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [normalizedEmail]),
      pool.query("SELECT id FROM users WHERE LOWER(username) = LOWER($1)", [normalizedUsername]),
    ]);
    if (existingEmail.rows.length > 0) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }
    if (existingUsername.rows.length > 0) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const id = generateId();
    const tokenVersion = 1;

    await pool.query(
      "INSERT INTO users (id, email, username, password_hash, name, token_version, role, tier) VALUES ($1, $2, $3, $4, $5, $6, 'user', 'free')",
      [id, normalizedEmail, normalizedUsername, passwordHash, name.trim(), tokenVersion]
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
