// web/catalog/app/api/actors/castings/[id]/files/route.ts
import { NextResponse } from "next/server";
import { ensureTables, query } from "../../../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await ensureTables();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  const items = await query(`SELECT id, filename, filetype, url, created_at FROM casting_files WHERE casting_id=$1 ORDER BY created_at DESC`, [id]);
  return NextResponse.json({ ok: true, items });
}
