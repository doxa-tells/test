// web/catalog/app/api/actors/castings/route.ts
import { NextResponse } from "next/server";
import { ensureTables, query } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureTables();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 20), 1), 50);
  const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);

  // Public list of castings with light director info
  const castings = await query(
    `SELECT c.id, c.user_id, c.title, c.description, c.created_at,
            (SELECT name FROM companies WHERE user_id=c.user_id ORDER BY id DESC LIMIT 1) AS company_name,
            (SELECT role FROM companies WHERE user_id=c.user_id ORDER BY id DESC LIMIT 1) AS company_role
     FROM castings c
     ORDER BY c.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return NextResponse.json({ ok: true, items: castings, limit, offset });
}
