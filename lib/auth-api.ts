import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Returns userId from middleware header (x-user-id) OR from verifying the
 * realprosys_session cookie directly. This handles the case where Vercel
 * Edge middleware headers aren't forwarded to serverless function routes.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const fromHeader = req.headers.get("x-user-id");
  if (fromHeader) return fromHeader;

  const cookie = req.cookies.get("realprosys_session");
  if (!cookie) return null;

  const payload = await verifyToken(cookie.value);
  return payload?.userId ?? null;
}
