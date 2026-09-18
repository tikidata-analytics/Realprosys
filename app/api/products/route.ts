import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await pool.query(
      "SELECT p.*, pr.name as project_name FROM products p LEFT JOIN projects pr ON p.project_id = pr.id WHERE p.user_id = $1 ORDER BY p.created_at DESC",
      [userId]
    );
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, type, price, project_id, land_area, building_area, bedrooms, bathrooms } = await req.json();
    if (!name || !type || !price || !project_id) return NextResponse.json({ error: "Name, type, price, project_id wajib diisi" }, { status: 400 });
    if (!land_area || !building_area || !bedrooms || !bathrooms) return NextResponse.json({ error: "Luas tanah, luas bangunan, kamar tidur, kamar mandi wajib diisi" }, { status: 400 });

    const id = generateId();
    await pool.query(
      "INSERT INTO products (id, user_id, name, type, price, project_id, land_area, building_area, bedrooms, bathrooms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [id, userId, name, type, price, project_id, land_area, building_area, bedrooms, bathrooms]
    );
    return NextResponse.json({ id, user_id: userId, name, type, price, project_id, land_area, building_area, bedrooms, bathrooms }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
