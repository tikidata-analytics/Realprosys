import db from "@/lib/db";
import { isWebmaster } from "@/lib/users";

export type Resource = "customers" | "payment_plans" | "schemes" | "products" | "projects";

/**
 * Returns the user's effective tier limit for a resource, plus a flag.
 * Webmaster always gets Infinity (no lock).
 * Used by GET routes to mark excess rows as _locked.
 */
export async function getUserResourceLimit(userId: string, resource: Resource): Promise<{ limit: number; isWebmaster: boolean }> {
  if (await isWebmaster(userId)) return { limit: Infinity, isWebmaster: true };

  const today = new Date().toISOString().split("T")[0];
  const membershipRes = await db.query(
    `SELECT tier FROM user_memberships
     WHERE user_id = $1 AND start_date <= $2 AND (end_date IS NULL OR end_date >= $2)
     ORDER BY start_date DESC LIMIT 1`,
    [userId, today]
  );
  const activeTier = membershipRes.rows[0]?.tier || "free";

  const limitRes = await db.query(
    `SELECT limit_val FROM tier_limits WHERE tier = $1 AND resource = $2`,
    [activeTier, resource]
  );
  return { limit: limitRes.rows[0]?.limit_val ?? 0, isWebmaster: false };
}

/**
 * Checks if a specific resource row is locked for the user.
 * Returns true (locked) if: user is not webmaster AND the row's created_at
 * is NOT among the first `limit` oldest rows for that user+resource.
 */
export async function isResourceLocked(userId: string, resource: Resource, rowId: string): Promise<boolean> {
  if (await isWebmaster(userId)) return false;

  const { limit } = await getUserResourceLimit(userId, resource);
  if (limit >= Infinity) return false;

  // Find the row's created_at
  const rowRes = await db.query(`SELECT created_at FROM ${resource} WHERE id = $1 AND user_id = $2`, [rowId, userId]);
  if (!rowRes.rows.length) return true; // not found → treat as locked
  const rowCreatedAt = rowRes.rows[0].created_at;

  // Count how many rows for this user were created BEFORE or AT this row
  const rankRes = await db.query(
    `SELECT COUNT(*) as rank FROM ${resource} WHERE user_id = $1 AND created_at <= $2`,
    [userId, rowCreatedAt]
  );
  const rank = parseInt(rankRes.rows[0].rank, 10);
  return rank > limit;
}
