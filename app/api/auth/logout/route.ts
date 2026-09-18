import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "realprosys_session";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
