// web/catalog/app/api/castings/[id]/files/route.ts
import { NextResponse } from "next/server";
import { ensureTables, listCastingFiles, getCasting, query } from "../../../../../lib/db";
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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const id = Number(params.id);
  const casting = await getCasting(id, user.id);
  if (!casting) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  let fileIdStr = url.searchParams.get('file_id');
  if (!fileIdStr) {
    // try formData
    const ctype = req.headers.get('content-type') || '';
    if (ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data')) {
      const fd = await req.formData();
      fileIdStr = String(fd.get('file_id') || '');
    } else {
      const body = await req.json().catch(()=>({} as any));
      if (body && body.file_id) fileIdStr = String(body.file_id);
    }
  }
  const file_id = Number(fileIdStr);
  if (!Number.isFinite(file_id)) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  // Ensure file belongs to this casting
  const rows = await query(`SELECT id FROM casting_files WHERE id=$1 AND casting_id=$2`, [file_id, id]);
  if (!rows[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await query(`DELETE FROM casting_files WHERE id=$1`, [file_id]);
  return NextResponse.json({ ok: true });
}
