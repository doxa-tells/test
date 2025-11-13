// web/catalog/app/api/settings/avatar/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/auth";
import { mkdir, writeFile, stat, unlink } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

function appRootFromCwd(cwd: string) {
  return cwd.endsWith('/web/catalog') ? cwd : join(cwd, 'web', 'catalog');
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const cwd = process.cwd();
  const appRoot = appRootFromCwd(cwd);
  const base = join(appRoot, 'public', 'uploads', String(user.id), 'profile');
  const candidates = ['avatar.jpg','avatar.jpeg','avatar.png','avatar.webp'];
  for (const name of candidates) {
    try { await stat(join(base, name)); return NextResponse.json({ ok: true, url: `/uploads/${user.id}/profile/${name}` }); } catch {}
  }
  return NextResponse.json({ ok: true, url: null });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const ctype = req.headers.get('content-type') || '';
  if (!(ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded'))) {
    return NextResponse.json({ ok: false, error: 'unsupported_media_type' }, { status: 415 });
  }
  const form = await req.formData();
  const file = form.get('avatar');
  if (!file || typeof file === 'string') return NextResponse.json({ ok: false, error: 'file_required' }, { status: 400 });
  const mime = (file as any).type as string | undefined;
  const ext = mime?.includes('png') ? 'png' : mime?.includes('webp') ? 'webp' : 'jpg';

  const cwd = process.cwd();
  const appRoot = appRootFromCwd(cwd);
  const dir = join(appRoot, 'public', 'uploads', String(user.id), 'profile');
  await mkdir(dir, { recursive: true });
  const ab = await (file as any).arrayBuffer();
  const filepath = join(dir, `avatar.${ext}`);
  await writeFile(filepath, new Uint8Array(ab));
  const url = `/uploads/${user.id}/profile/avatar.${ext}`;
  return NextResponse.json({ ok: true, url });
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const cwd = process.cwd();
  const appRoot = appRootFromCwd(cwd);
  const base = join(appRoot, 'public', 'uploads', String(user.id), 'profile');
  const candidates = ['avatar.jpg','avatar.jpeg','avatar.png','avatar.webp'];
  let removed = false;
  for (const name of candidates) {
    try { await unlink(join(base, name)); removed = true; } catch {}
  }
  return NextResponse.json({ ok: true, removed });
}
