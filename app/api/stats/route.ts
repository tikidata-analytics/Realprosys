import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [customers, products, paymentPlans, schemes] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM customers WHERE user_id = $1", [userId]),
      pool.query("SELECT COUNT(*) as count FROM products WHERE user_id = $1", [userId]),
      pool.query("SELECT COUNT(*) as count FROM payment_plans WHERE user_id = $1", [userId]),
      pool.query("SELECT COUNT(*) as count FROM schemes WHERE user_id = $1", [userId]),
    ]);

    return NextResponse.json({
      totalCustomers: Number(customers.rows[0].count),
      totalProducts: Number(products.rows[0].count),
      totalPaymentPlans: Number(paymentPlans.rows[0].count),
      totalSchemes: Number(schemes.rows[0].count),
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
