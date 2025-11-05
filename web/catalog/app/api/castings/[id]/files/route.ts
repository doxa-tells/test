// web/catalog/app/api/castings/[id]/files/route.ts
import { NextResponse } from "next/server";
import { ensureTables, listCastingFiles, getCasting } from "../../../../../lib/db";
import { currentUser } from "../../../../../lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const id = Number(params.id);
  const casting = await getCasting(id, user.id);
  if (!casting) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const files = await listCastingFiles(id);
  return NextResponse.json({ ok: true, items: files });
}
