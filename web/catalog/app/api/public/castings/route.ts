// web/catalog/app/api/public/castings/route.ts
import { NextResponse } from "next/server";
import { ensureTables, listAllCastings } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureTables();
  const items = await listAllCastings(200, 0);
  return NextResponse.json({ ok: true, items });
}
