import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isWebmaster } from "@/lib/users";
import { getUserIdFromRequest } from "@/lib/auth-api";

interface RouteParams {
  params: { name: string };
}

// PUT /api/config/tiers/[name] — update tier metadata + limits
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isWebmaster(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = params;
  const body = await req.json();
  const { monthly_price, yearly_price, start_date, end_date, is_active, limits } = body;

  if (monthly_price < 0 || yearly_price < 0) {
    return NextResponse.json({ error: "Harga tidak boleh negatif." }, { status: 400 });
  }

  // Cannot deactivate free tier
  if (name === "free" && is_active === false) {
    return NextResponse.json({ error: "Tier 'free' tidak dapat dinonaktifkan." }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Update tier metadata
    await client.query(
      `UPDATE tiers
       SET monthly_price = COALESCE($1, monthly_price),
           yearly_price  = COALESCE($2, yearly_price),
           start_date    = $3,
           end_date      = $4,
           is_active     = COALESCE($5, is_active)
       WHERE name = $6`,
      [monthly_price, yearly_price, start_date ?? null, end_date ?? null, is_active ?? null, name]
    );

    // Update limits if provided
    if (limits && typeof limits === "object") {
      const RESOURCES = ["customers", "payment_plans", "schemes", "products", "projects"];
      for (const resource of RESOURCES) {
        if (limits[resource] !== undefined) {
          await client.query(
            `UPDATE tier_limits SET limit_val = $1 WHERE tier = $2 AND resource = $3`,
            [limits[resource], name, resource]
          );
        }
      }
    }

    await client.query("COMMIT");

    // Fetch updated tier
    const tier = await db.query(`SELECT * FROM tiers WHERE name = $1`, [name]);
    const tierLimits = await db.query(`SELECT resource, limit_val FROM tier_limits WHERE tier = $1`, [name]);
    const limitsMap: Record<string, number> = {};
    for (const row of tierLimits.rows) limitsMap[row.resource] = row.limit_val;

    return NextResponse.json({ ...tier.rows[0], limits: limitsMap });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Gagal memperbarui tier." }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/config/tiers/[name] — delete a tier
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isWebmaster(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = params;

  // Cannot delete free or premium
  if (name === "free" || name === "premium") {
    return NextResponse.json({ error: `Tier '${name}' tidak dapat dihapus.` }, { status: 400 });
  }

  // Check if any users are on this tier
  const users = await db.query(`SELECT COUNT(*) as cnt FROM users WHERE tier = $1`, [name]);
  if (parseInt(users.rows[0].cnt) > 0) {
    return NextResponse.json(
      { error: `Tier '${name}' masih digunakan oleh ${users.rows[0].cnt} user. Pindahkan mereka terlebih dahulu.` },
      { status: 409 }
    );
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM tier_limits WHERE tier = $1`, [name]);
    await client.query(`DELETE FROM tiers WHERE name = $1`, [name]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Gagal menghapus tier." }, { status: 500 });
  } finally {
    client.release();
  }
}
