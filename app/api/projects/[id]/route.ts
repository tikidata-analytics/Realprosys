import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth-api";
import { isResourceLocked } from "@/lib/resource-limits";


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await pool.query("SELECT id, user_id, name, location, created_at FROM projects WHERE id=$1 AND user_id=$2", [id, userId]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (await isResourceLocked(userId, "projects", id)) return NextResponse.json({ error: "Row locked" }, { status: 403 });
  try {
    const { name, location } = await req.json();
    const result = await pool.query("UPDATE projects SET name=COALESCE($1,name), location=COALESCE($2,location) WHERE id=$3 AND user_id=$4 RETURNING *", [name, location, id, userId]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (await isResourceLocked(userId, "projects", id)) return NextResponse.json({ error: "Row locked" }, { status: 403 });
  try {
    const result = await pool.query("DELETE FROM projects WHERE id=$1 AND user_id=$2 RETURNING id", [id, userId]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
