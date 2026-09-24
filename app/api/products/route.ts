import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";
import { checkLimit, limitResponse } from "@/lib/limits";
import { getUserIdFromRequest } from "@/lib/auth-api";
import { getUserResourceLimit } from "@/lib/resource-limits";


export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const sort = searchParams.get("sort") || "created_at:desc";
  const PAGE_SIZE = 10;
  const offset = (page - 1) * PAGE_SIZE;

  const [orderBy, orderDir] = sort.split(":");
  const allowedSortFields = ["name", "type", "price", "project_name", "land_area", "building_area", "bedrooms", "bathrooms", "created_at"];
  const safeOrderBy = allowedSortFields.includes(orderBy) ? orderBy : "created_at";
  const safeOrderDir = orderDir === "asc" ? "ASC" : "DESC";

  try {
    const conditions = ["p.user_id = $1"];
    const params: (string | number)[] = [userId];
    let paramIdx = 2;

    if (q) {
      conditions.push(`(p.name ILIKE $${paramIdx} OR pr.name ILIKE $${paramIdx})`);
      params.push(`%${q}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    const countResult = await pool.query(`SELECT COUNT(*) as total FROM products p LEFT JOIN projects pr ON p.project_id = pr.id WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const { limit } = await getUserResourceLimit(userId, "products");

    const result = await pool.query(
      `SELECT p.id, p.name, p.type, p.price, p.project_id, p.land_area, p.building_area, p.bedrooms, p.bathrooms, p.created_at, pr.name as project_name
       FROM products p LEFT JOIN projects pr ON p.project_id = pr.id
       WHERE ${whereClause}
       ORDER BY p.created_at ASC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    );

    const locked = limit < Infinity;
    const rows = result.rows.map((row, idx) => ({ ...row, _locked: locked && idx >= limit }));

    return NextResponse.json({ rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE), limit });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await checkLimit(userId, "products");
  if (!limit) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!limit.allowed) return limitResponse("products");

  try {
    const { name, type, price, project_id, land_area, building_area, bedrooms, bathrooms } = await req.json();
    if (!name || !type || !price || !project_id) return NextResponse.json({ error: "Name, type, price, project_id wajib diisi" }, { status: 400 });
    if (!land_area || !building_area || !bedrooms || !bathrooms) return NextResponse.json({ error: "Luas tanah, luas bangunan, kamar tidur, kamar mandi wajib diisi" }, { status: 400 });

    // Validate project ownership
    const projectCheck = await pool.query("SELECT id FROM projects WHERE id=$1 AND user_id=$2", [project_id, userId]);
    if (projectCheck.rows.length === 0) return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });

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
