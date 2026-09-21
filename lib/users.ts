import db from "@/lib/db";

export type UserRole = "webmaster" | "user";
export type UserTier = "free" | "premium";

export async function getUserRoleTier(userId: string): Promise<{ role: UserRole; tier: UserTier } | null> {
  const result = await db.query(
    "SELECT role, tier FROM users WHERE id = $1",
    [userId]
  );
  if (!result.rows.length) return null;
  return { role: result.rows[0].role as UserRole, tier: result.rows[0].tier as UserTier };
}

export async function isWebmaster(userId: string): Promise<boolean> {
  const result = await db.query(
    "SELECT role FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0]?.role === "webmaster";
}

export async function isPremium(userId: string): Promise<boolean> {
  const result = await db.query(
    "SELECT tier FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0]?.tier === "premium";
}
