import db from "@/lib/db";
import { isWebmaster } from "@/lib/users";
import { NextResponse } from "next/server";

export type Resource = "customers" | "payment_plans" | "schemes" | "products" | "projects";

export async function checkLimit(
  userId: string,
  resource: Resource
): Promise<{ allowed: boolean; current: number; limit: number } | null> {
  // Webmaster bypasses all limits
  if (await isWebmaster(userId)) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  // Get the user's active membership (most recent one currently in effect)
  // Active = start_date <= today AND (end_date IS NULL OR end_date >= today)
  const today = new Date().toISOString().split("T")[0];
  const membershipRes = await db.query(
    `SELECT tier FROM user_memberships
     WHERE user_id = $1 AND start_date <= $2 AND (end_date IS NULL OR end_date >= $2)
     ORDER BY start_date DESC LIMIT 1`,
    [userId, today]
  );

  const activeTier = membershipRes.rows[0]?.tier || "free";

  // Check tier is active and within its own date window
  const tierResult = await db.query(
    `SELECT is_active, start_date, end_date FROM tiers WHERE name = $1`,
    [activeTier]
  );
  if (!tierResult.rows.length || !tierResult.rows[0].is_active) {
    return { allowed: false, current: 0, limit: 0 };
  }
  const { start_date, end_date } = tierResult.rows[0];
  if (start_date && new Date(start_date) > new Date()) {
    return { allowed: false, current: 0, limit: 0 }; // tier not yet started
  }
  if (end_date && new Date(end_date) < new Date()) {
    return { allowed: false, current: 0, limit: 0 }; // tier expired
  }

  // Get limit for tier + resource
  const limitResult = await db.query(
    `SELECT limit_val FROM tier_limits WHERE tier = $1 AND resource = $2`,
    [activeTier, resource]
  );
  const limit = limitResult.rows[0]?.limit_val ?? 0;

  // Count current resources
  const countResult = await db.query(
    `SELECT COUNT(*) as count FROM ${resource} WHERE user_id = $1`,
    [userId]
  );
  const current = parseInt(countResult.rows[0].count);

  return { allowed: current < limit, current, limit };
}

export function limitResponse(resource: Resource) {
  return NextResponse.json(
    {
      error: `Limit tercapai. Anda telah mencapai batas maksimal ${resource} untuk tier Anda.`,
    },
    { status: 403 }
  );
}
