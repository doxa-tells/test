// web/catalog/app/api/prefs/route.ts
import { NextResponse } from "next/server";
import { ensureTables, getUserPrefs, saveUserPrefs } from "../../../lib/db";
import { currentUser } from "../../../lib/auth";

export async function GET() {
  try {
    await ensureTables();
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const prefs = await getUserPrefs(user.id);
    return NextResponse.json({ ok: true, prefs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTables();
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const fd = await req.formData();
    const val = (k: string) => (fd.get(k) ? String(fd.get(k)) : "").trim() || null;
    const num = (k: string) => {
      const s = (fd.get(k) ? String(fd.get(k)) : "").trim();
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };
    await saveUserPrefs(user.id, {
      sex: val('sex'),
      city: val('city'),
      look_type: val('look_type'),
      body_type: val('body_type'),
      hair_color: val('hair_color'),
      eye_color: val('eye_color'),
      lang: val('lang'),
      height_min: num('height_min'),
      height_max: num('height_max'),
      age_from: num('age_from'),
      age_to: num('age_to'),
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
