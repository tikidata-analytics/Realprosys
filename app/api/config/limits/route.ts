import { NextRequest, NextResponse } from "next/server";
import { isWebmaster } from "@/lib/users";

export async function GET(req: NextRequest) {
  // Webmaster guard — must have role=webmaster
  const userId = req.headers.get("x-user-id");
  if (!userId || !(await isWebmaster(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await import("@/lib/db");
  const pool = db.default;
  const result = await pool.query(
    "SELECT tier, resource, limit_val FROM tier_limits ORDER BY tier, resource"
  );
  return NextResponse.json(result.rows);
}

export async function PUT(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId || !(await isWebmaster(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be array" }, { status: 400 });
  }

  const db = await import("@/lib/db");
  const pool = db.default;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of body) {
      const { tier, resource, limit: limitVal } = row;
      await client.query(
        `INSERT INTO tier_limits (tier, resource, limit_val)
         VALUES ($1, $2, $3)
         ON CONFLICT (tier, resource) DO UPDATE SET limit_val = $3`,
        [tier, resource, limitVal]
      );
    }
    await client.query("COMMIT");

    const result = await pool.query(
      "SELECT tier, resource, limit_val FROM tier_limits ORDER BY tier, resource"
    );
    return NextResponse.json(result.rows);
  } catch (e: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}
