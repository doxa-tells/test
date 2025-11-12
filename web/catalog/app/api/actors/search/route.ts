// web/catalog/app/api/actors/search/route.ts
import { NextResponse } from "next/server";
import { ensureTables, listActors } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureTables();
  const url = new URL(req.url);
  const q = String(url.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ ok: true, items: [] });
  const items = await listActors({ q, limit: 20, offset: 0 });
  return NextResponse.json({ ok: true, items: items.map(a => ({ user_id: a.user_id, full_name: a.full_name })) });
}
