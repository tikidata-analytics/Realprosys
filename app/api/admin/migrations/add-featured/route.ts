import { NextResponse } from "next/server";
import db from "@/lib/db";

// POST /api/admin/migrations/add-featured
// Adds 'featured' BOOLEAN column to tiers table — run once
export async function POST() {
  try {
    await db.query(`
      ALTER TABLE tiers
      ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false
    `);
    const { rows } = await db.query(`SELECT name, featured FROM tiers`);
    return NextResponse.json({ ok: true, tiers: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
