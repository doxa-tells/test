// web/catalog/app/api/public/castings/[id]/route.ts
import { NextResponse } from "next/server";
import { ensureTables, getCastingPublic, listCastingFiles } from "../../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await ensureTables();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  const item = await getCastingPublic(id);
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const files = await listCastingFiles(id);
  return NextResponse.json({ ok: true, item, files });
}
