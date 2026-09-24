import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";
import { checkLimit, limitResponse } from "@/lib/limits";
import { getUserIdFromRequest } from "@/lib/auth-api";
import { getUserResourceLimit } from "@/lib/resource-limits";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const sort = searchParams.get("sort") || "created_at:desc";
  const PAGE_SIZE = 10;
  const offset = (page - 1) * PAGE_SIZE;

  // Parse sort
  const [orderBy, orderDir] = sort.split(":");
  const allowedSortFields = ["name", "email", "phone", "birth_date", "gender", "created_at"];
  const safeOrderBy = allowedSortFields.includes(orderBy) ? orderBy : "created_at";
  const safeOrderDir = orderDir === "asc" ? "ASC" : "DESC";

  try {
    // Build search condition
    const conditions = ["user_id = $1"];
    const params: (string | number)[] = [userId];
    let paramIdx = 2;

    if (q) {
      conditions.push(`(name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR phone ILIKE $${paramIdx})`);
      params.push(`%${q}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM customers WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get rows
    const { limit } = await getUserResourceLimit(userId, "customers");

    const result = await pool.query(
      `SELECT id, user_id, name, email, phone, birth_date, gender, created_at
       FROM customers
       WHERE ${whereClause}
       ORDER BY created_at ASC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    );

    const locked = limit < Infinity;
    const rows = result.rows.map((row, idx) => ({
      ...row,
      _locked: locked && idx >= limit,
    }));

    return NextResponse.json({
      rows,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
      limit,
    });
  } catch (err) {
    console.error("GET /api/customers error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await checkLimit(userId, "customers");
  if (!limit) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!limit.allowed) return limitResponse("customers");

  try {
    const { name, email, phone, birth_date, gender } = await req.json();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    if (email) {
      const existing = await pool.query("SELECT id FROM customers WHERE user_id=$1 AND LOWER(email)=LOWER($2)", [userId, email]);
      if (existing.rows.length > 0) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const id = generateId();
    await pool.query(
      "INSERT INTO customers (id, user_id, name, email, phone, birth_date, gender) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id, userId, name, email || null, phone || null, birth_date || null, gender || null]
    );
    return NextResponse.json({ id, user_id: userId, name, email, phone, birth_date, gender }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
