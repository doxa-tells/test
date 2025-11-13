// web/catalog/app/api/settings/company/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/auth";
import { ensureTables, query, upsertCompany } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const rows = await query(`SELECT id, user_id, name, role, bio FROM companies WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [user.id]);
  const company = rows[0] || null;
  return NextResponse.json({ ok: true, company });
}

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const ctype = req.headers.get('content-type') || '';
  if (ctype.includes('application/json')) {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const role = (body?.role ? String(body.role).trim() : '') || null;
    const bio = (body?.bio ? String(body.bio).trim() : '') || null;
    if (!name) return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
    const item = await upsertCompany(user.id, name, role, bio);
    return NextResponse.json({ ok: true, company: item });
  }

  if (ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data')) {
    const form = await req.formData();
    const name = String(form.get('name') || '').trim();
    const role = (form.get('role') ? String(form.get('role')).trim() : '') || null;
    const bio = (form.get('bio') ? String(form.get('bio')).trim() : '') || null;
    if (!name) return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
    const item = await upsertCompany(user.id, name, role, bio);
    return NextResponse.json({ ok: true, company: item });
  }

  return NextResponse.json({ ok: false, error: 'unsupported_media_type' }, { status: 415 });
}
