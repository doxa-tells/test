// web/catalog/app/api/castings/[id]/auditions/route.ts
import { NextResponse } from "next/server";
import { ensureTables, getCasting, listCastingAuditions, addCastingAudition, query, getLinkedActorUserId } from "../../../../../lib/db";
import { currentUser } from "../../../../../lib/auth";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

// Director lists all submitted auditions for their casting
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  const casting = await getCasting(id, user.id);
  if (!casting) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const items = await listCastingAuditions(id);
  return NextResponse.json({ ok: true, items });
}

// Actor uploads an audition for a casting (multipart/form-data)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await ensureTables();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const actor_user_id = await getLinkedActorUserId(user.id);
  if (!actor_user_id) return NextResponse.json({ ok: false, error: 'link_required' }, { status: 400 });

  const ctype = req.headers.get('content-type') || '';
  if (!(ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded'))) {
    return NextResponse.json({ ok: false, error: 'unsupported_media_type' }, { status: 415 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ ok: false, error: 'file_required' }, { status: 400 });

  // ensure casting exists at least
  const exists = await query(`SELECT 1 FROM castings WHERE id=$1`, [id]);
  if (!exists[0]) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const cwd = process.cwd();
  const appRoot = cwd.endsWith('/web/catalog') ? cwd : join(cwd, 'web', 'catalog');
  const dir = join(appRoot, 'public', 'uploads', String(actor_user_id), 'auditions');
  await mkdir(dir, { recursive: true });
  const ab = await (file as any).arrayBuffer();
  const filename = `${Date.now()}_${(file as any).name || 'audition.mp4'}`;
  const filepath = join(dir, filename);
  await writeFile(filepath, new Uint8Array(ab));
  const url = `/uploads/${actor_user_id}/auditions/${filename}`;
  await addCastingAudition(id, actor_user_id, (file as any).name || filename, url);
  return NextResponse.json({ ok: true, url });
}
