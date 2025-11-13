// web/catalog/app/api/actors/castings/[id]/route.ts
import { NextResponse } from "next/server";
import { ensureTables, query } from "../../../../../lib/db";
import { currentUser } from "../../../../../lib/auth";
import { join } from "path";
import { stat } from "fs/promises";

export const dynamic = "force-dynamic";

function appRootFromCwd(cwd: string) {
  return cwd.endsWith('/web/catalog') ? cwd : join(cwd, 'web', 'catalog');
}

async function getAvatarUrl(user_id: number) {
  const cwd = process.cwd();
  const appRoot = appRootFromCwd(cwd);
  const base = join(appRoot, 'public', 'uploads', String(user_id), 'profile');
  const candidates = ['avatar.jpg','avatar.jpeg','avatar.png','avatar.webp'];
  for (const name of candidates) {
    try { await stat(join(base, name)); return `/uploads/${user_id}/profile/${name}`; } catch {}
  }
  return null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await ensureTables();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });

  // Casting basic
  const castRows = await query(`SELECT id, user_id, title, description, created_at FROM castings WHERE id=$1`, [id]);
  const casting = castRows[0];
  if (!casting) return NextResponse.json({ ok:false, error:'not_found' }, { status:404 });

  // Director company and avatar
  const companyRows = await query(`SELECT name, role, bio FROM companies WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [casting.user_id]);
  const company = companyRows[0] || null;
  const avatar_url = await getAvatarUrl(casting.user_id);

  // Director portfolio projects with media
  const projects = await query(
    `SELECT id, user_id, title, role, description, links,
            production, year, genre, format, platform, country, city, responsibilities, awards,
            created_at
     FROM user_projects WHERE user_id=$1 ORDER BY created_at DESC`,
    [casting.user_id]
  );
  const pids = projects.map((p:any)=>p.id);
  let media: any[] = [];
  if (pids.length) {
    media = await query(`SELECT id, project_id, url, media_type, created_at FROM user_project_media WHERE project_id = ANY($1::int[]) ORDER BY created_at ASC`, [pids]);
  }
  const portfolio = projects.map((p:any)=> ({...p, media: media.filter(m=>m.project_id===p.id)}));

  // Casting preferences (optional, to help actor)
  const prefsRows = await query(`SELECT * FROM casting_prefs WHERE casting_id=$1`, [id]);
  const prefs = prefsRows[0] || null;

  const user = await currentUser().catch(()=>null as any);
  const owner = !!(user && casting && user.id === casting.user_id);
  return NextResponse.json({ ok:true, casting, company, avatar_url, prefs, portfolio, owner });
}
