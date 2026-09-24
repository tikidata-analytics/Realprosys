import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/tiers/public — public tier pricing for homepage
// Returns only active non-expired tiers with name, prices, and limits
export async function GET() {
  const now = new Date();

  const result = await db.query(
    `SELECT name, monthly_price, yearly_price, is_active, permanent, start_date, end_date, featured
     FROM tiers
     WHERE is_active = TRUE
       AND (permanent = TRUE OR (start_date <= $1 AND end_date >= $1))
     ORDER BY featured DESC, monthly_price ASC`,
    [now]
  );

  // Also fetch limits per tier
  const limits = await db.query(`SELECT tier, resource, limit_val FROM tier_limits`);
  const limitsMap: Record<string, Record<string, number>> = {};
  for (const row of limits.rows) {
    if (!limitsMap[row.tier]) limitsMap[row.tier] = {};
    limitsMap[row.tier][row.resource] = row.limit_val;
  }

  const tiers = result.rows.map((t) => ({
    name: t.name,
    monthly_price: t.monthly_price,
    yearly_price: t.yearly_price,
    is_active: t.is_active,
    permanent: t.permanent,
    start_date: t.start_date,
    end_date: t.end_date,
    featured: t.featured,
    limits: limitsMap[t.name] || {},
  }));

  return NextResponse.json(tiers);
}
