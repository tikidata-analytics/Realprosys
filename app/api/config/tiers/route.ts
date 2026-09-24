import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isWebmaster } from "@/lib/users";
import { getUserIdFromRequest } from "@/lib/auth-api";

// Tier CRUD API — GET/POST /api/config/tiers
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isWebmaster(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await db.query(
    `SELECT name, monthly_price, yearly_price, start_date, end_date, is_active, created_at
     FROM tiers ORDER BY created_at ASC`
  );

  // Also fetch limits per tier
  const limits = await db.query(`SELECT tier, resource, limit_val FROM tier_limits`);
  const limitsMap: Record<string, Record<string, number>> = {};
  for (const row of limits.rows) {
    if (!limitsMap[row.tier]) limitsMap[row.tier] = {};
    limitsMap[row.tier][row.resource] = row.limit_val;
  }

  const tiers = result.rows.map((t) => ({
    ...t,
    limits: limitsMap[t.name] || {},
  }));

  return NextResponse.json(tiers);
}

// POST /api/config/tiers — create a new tier
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isWebmaster(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, monthly_price = 0, yearly_price = 0, start_date = null, end_date = null, is_active = true } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Nama tier wajib diisi." }, { status: 400 });
  }
  const tierName = name.trim().toLowerCase().replace(/\s+/g, "_");

  if (monthly_price < 0 || yearly_price < 0) {
    return NextResponse.json({ error: "Harga tidak boleh negatif." }, { status: 400 });
  }

  // Check if already exists
  const existing = await db.query(`SELECT name FROM tiers WHERE name = $1`, [tierName]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: `Tier '${tierName}' sudah ada.` }, { status: 409 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO tiers (name, monthly_price, yearly_price, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tierName, monthly_price, yearly_price, start_date || null, end_date || null, is_active]
    );

    // Seed default limits (same as free: 2 per resource) for the new tier
    const RESOURCES = ["customers", "payment_plans", "schemes", "products", "projects"];
    for (const resource of RESOURCES) {
      await client.query(
        `INSERT INTO tier_limits (tier, resource, limit_val) VALUES ($1, $2, $3)`,
        [tierName, resource, 2]
      );
    }

    await client.query("COMMIT");

    const tier = await db.query(`SELECT * FROM tiers WHERE name = $1`, [tierName]);
    return NextResponse.json(tier.rows[0], { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Gagal membuat tier." }, { status: 500 });
  } finally {
    client.release();
  }
}
