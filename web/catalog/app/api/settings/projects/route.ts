// web/catalog/app/api/settings/projects/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/auth";
import { ensureTables, query } from "../../../../lib/db";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

function appRootFromCwd(cwd: string) {
  return cwd.endsWith('/web/catalog') ? cwd : join(cwd, 'web', 'catalog');
}

export async function GET() {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const projects = await query(
    `SELECT id, user_id, title, role, description, links,
            production, year, genre, format, platform, country, city, responsibilities, awards,
            media_url, media_type, created_at
     FROM user_projects WHERE user_id=$1 ORDER BY created_at DESC`,
    [user.id]
  );
  const ids = projects.map((p:any)=>p.id);
  let media: any[] = [];
  if (ids.length) {
    media = await query(`SELECT id, project_id, url, media_type, created_at FROM user_project_media WHERE project_id = ANY($1::int[]) ORDER BY created_at ASC`, [ids]);
  }
  const items = projects.map((p:any)=> ({...p, media: media.filter(m=>m.project_id===p.id)}));
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const ctype = req.headers.get('content-type') || '';
  if (!(ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded'))) {
    return NextResponse.json({ ok: false, error: 'unsupported_media_type' }, { status: 415 });
  }
  const form = await req.formData();
  const title = String(form.get('title') || '').trim();
  const role = String(form.get('role') || '').trim() || null;
  const description = String(form.get('description') || '').trim() || null;
  const links = String(form.get('links') || '').trim() || null;
  const production = String(form.get('production') || '').trim() || null;
  const yearRaw = String(form.get('year') || '').trim();
  const year = yearRaw ? Number(yearRaw) : null;
  const genre = String(form.get('genre') || '').trim() || null;
  const format = String(form.get('format') || '').trim() || null;
  const platform = String(form.get('platform') || '').trim() || null;
  const country = String(form.get('country') || '').trim() || null;
  const city = String(form.get('city') || '').trim() || null;
  const responsibilities = String(form.get('responsibilities') || '').trim() || null;
  const awards = String(form.get('awards') || '').trim() || null;
  if (!title) return NextResponse.json({ ok: false, error: 'title_required' }, { status: 400 });
  const rows = await query(
    `INSERT INTO user_projects(
        user_id, title, role, description, links,
        production, year, genre, format, platform, country, city, responsibilities, awards
     ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,$11,$12,$13,$14
     ) RETURNING id`,
    [user.id, title, role, description, links, production, (Number.isFinite(year as any) ? year : null), genre, format, platform, country, city, responsibilities, awards]
  );
  const projectId = rows[0].id as number;
  const files = form.getAll('files').filter(f => !!f && typeof f !== 'string') as File[];

  if (files.length) {
    const cwd = process.cwd();
    const appRoot = appRootFromCwd(cwd);
    const base = join(appRoot, 'public', 'uploads', String(user.id), 'projects', String(projectId));
    await mkdir(base, { recursive: true });
    for (const f of files) {
      const ab = await (f as any).arrayBuffer();
      const original = (f as any).name || 'media';
      const filename = `${Date.now()}_${original}`;
      const filepath = join(base, filename);
      await writeFile(filepath, new Uint8Array(ab));
      const url = `/uploads/${user.id}/projects/${projectId}/${filename}`;
      const media_type = (f as any).type || null;
      await query(`INSERT INTO user_project_media(project_id, url, media_type) VALUES ($1,$2,$3)`, [projectId, url, media_type]);
    }
  }

  return NextResponse.json({ ok: true, id: projectId });
}

export async function DELETE(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  // ensure ownership
  const rows = await query(`SELECT 1 FROM user_projects WHERE id=$1 AND user_id=$2`, [id, user.id]);
  if (!rows[0]) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  await query(`DELETE FROM user_projects WHERE id=$1 AND user_id=$2`, [id, user.id]);
  return NextResponse.json({ ok: true });
}
