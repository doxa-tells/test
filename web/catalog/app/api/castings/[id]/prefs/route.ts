// web/catalog/app/api/castings/[id]/prefs/route.ts
import { NextResponse } from "next/server";
import { ensureTables, getCasting, getCastingPrefs, saveCastingPrefs } from "../../../../../lib/db";
import { currentUser } from "../../../../../lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureTables();
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const id = Number(params.id);
    const casting = await getCasting(id, user.id);
    if (!casting) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    const prefs = await getCastingPrefs(id);
    return NextResponse.json({ ok: true, prefs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureTables();
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const id = Number(params.id);
    const casting = await getCasting(id, user.id);
    if (!casting) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const fd = await req.formData();
    const val = (k: string) => (fd.get(k) ? String(fd.get(k)) : "").trim() || null;
    const num = (k: string) => {
      const s = (fd.get(k) ? String(fd.get(k)) : "").trim();
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    await saveCastingPrefs(id, {
      role_title: val('role_title'),
      project: val('project'),
      city: val('city'),
      sex: val('sex'),
      look_type: val('look_type'),
      body_type: val('body_type'),
      hair_color: val('hair_color'),
      eye_color: val('eye_color'),
      lang: val('lang'),
      height_min: num('height_min'),
      height_max: num('height_max'),
      age_from: num('age_from'),
      age_to: num('age_to'),
      notes: val('notes'),
      requirements: val('requirements'),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
