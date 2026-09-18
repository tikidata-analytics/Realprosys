import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await pool.query(
      "SELECT p.*, pr.name as project_name FROM products p LEFT JOIN projects pr ON p.project_id = pr.id WHERE p.id=$1 AND p.user_id=$2",
      [id, userId]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { name, type, price, project_id, land_area, building_area, bedrooms, bathrooms } = await req.json();
    const result = await pool.query(
      "UPDATE products SET name=COALESCE($1,name), type=COALESCE($2,type), price=COALESCE($3,price), project_id=COALESCE($4,project_id), land_area=COALESCE($5,land_area), building_area=COALESCE($6,building_area), bedrooms=COALESCE($7,bedrooms), bathrooms=COALESCE($8,bathrooms) WHERE id=$9 AND user_id=$10 RETURNING *",
      [name, type, price, project_id, land_area, building_area, bedrooms, bathrooms, id, userId]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await pool.query(
      "DELETE FROM products WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, userId]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
