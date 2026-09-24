import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query("SELECT value FROM app_settings WHERE key = 'admin_wa'");
    return NextResponse.json({ admin_wa: result.rows[0]?.value || "" });
  } catch {
    return NextResponse.json({ admin_wa: "" });
  }
}
