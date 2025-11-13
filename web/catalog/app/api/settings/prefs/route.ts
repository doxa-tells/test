// web/catalog/app/api/settings/prefs/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/auth";
import { ensureTables, getUserPrefs, saveUserPrefs } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const prefs = await getUserPrefs(user.id);
  return NextResponse.json({ ok: true, prefs });
}

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const ctype = req.headers.get('content-type') || '';

  let data: any = {};
  if (ctype.includes('application/json')) {
    data = await req.json();
  } else if (ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data')) {
    const form = await req.formData();
    form.forEach((v, k) => { (data as any)[k] = typeof v === 'string' ? v : String((v as any).name || ''); });
  } else {
    return NextResponse.json({ ok: false, error: 'unsupported_media_type' }, { status: 415 });
  }

  const normalize = (s: any) => (s === undefined || s === null ? null : String(s).trim() || null);
  const toInt = (v: any) => {
    if (v === undefined || v === null || String(v).trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const payload = {
    sex: normalize(data.sex),
    city: normalize(data.city),
    look_type: normalize(data.look_type),
    body_type: normalize(data.body_type),
    hair_color: normalize(data.hair_color),
    eye_color: normalize(data.eye_color),
    lang: normalize(data.lang),
    height_min: toInt(data.height_min),
    height_max: toInt(data.height_max),
    age_from: toInt(data.age_from),
    age_to: toInt(data.age_to),
  };

  await saveUserPrefs(user.id, payload);
  return NextResponse.json({ ok: true });
}
