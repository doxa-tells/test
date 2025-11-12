// web/catalog/app/api/castings/route.ts
import { NextResponse } from "next/server";
import { ensureTables, listMyCastings, createCasting, saveCastingPrefs, query } from "../../../lib/db";
import { currentUser } from "../../../lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function GET() {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const rows = await listMyCastings(user.id);
  return NextResponse.json({ ok: true, items: rows });
}

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const ctype = req.headers.get('content-type') || '';
  // handle form POST
  if (ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data')) {
    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim() || null;
    if (!title) return NextResponse.json({ ok: false, error: "Укажите название" }, { status: 400 });
    const c = await createCasting(user.id, title, description);

    // optional preferences provided at creation time
    const val = (k: string) => (form.get(k) ? String(form.get(k)) : "").trim() || null;
    const num = (k: string) => {
      const s = (form.get(k) ? String(form.get(k)) : "").trim();
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    await saveCastingPrefs(c.id, {
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
      weight_min: num('weight_min'),
      weight_max: num('weight_max'),
      notes: val('notes'),
      requirements: val('requirements'),
    });

    // save attached files, supports multiple input name="files"
    const files: File[] = [];
    const single = form.get('file');
    if (single && typeof single !== 'string') files.push(single as unknown as File);
    const multi = form.getAll('files');
    for (const f of multi) { if (f && typeof f !== 'string') files.push(f as unknown as File); }
    if (files.length > 0) {
      const dir = join(process.cwd(), 'public', 'uploads', String(user.id));
      await mkdir(dir, { recursive: true });
      for (const f of files) {
        const ab = await (f as any).arrayBuffer();
        const filename = `${Date.now()}_${(f as any).name}`;
        const filepath = join(dir, filename);
        await writeFile(filepath, new Uint8Array(ab));
        const url = `/uploads/${user.id}/${filename}`;
        await query(`INSERT INTO casting_files(casting_id, filename, filetype, url) VALUES ($1,$2,$3,$4)`, [c.id, (f as any).name, (f as any).type || null, url]);
      }
    }
    const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '/catalog';
    return NextResponse.redirect(new URL(`${BASE}/my-castings`, req.url));
  }
  // fallback JSON body
  const body = await req.json().catch(()=>({} as any));
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim() || null;
  if (!title) return NextResponse.json({ ok: false, error: "Укажите название" }, { status: 400 });
  const c = await createCasting(user.id, title, description);
  // support optional prefs in JSON: body.prefs or flat keys
  const p = (body.prefs && typeof body.prefs === 'object') ? body.prefs : body;
  await saveCastingPrefs(c.id, {
    role_title: p.role_title ?? null,
    project: p.project ?? null,
    city: p.city ?? null,
    sex: p.sex ?? null,
    look_type: p.look_type ?? null,
    body_type: p.body_type ?? null,
    hair_color: p.hair_color ?? null,
    eye_color: p.eye_color ?? null,
    lang: p.lang ?? null,
    height_min: (typeof p.height_min === 'number') ? p.height_min : null,
    height_max: (typeof p.height_max === 'number') ? p.height_max : null,
    age_from: (typeof p.age_from === 'number') ? p.age_from : null,
    age_to: (typeof p.age_to === 'number') ? p.age_to : null,
    weight_min: (typeof p.weight_min === 'number') ? p.weight_min : null,
    weight_max: (typeof p.weight_max === 'number') ? p.weight_max : null,
    notes: p.notes ?? null,
    requirements: p.requirements ?? null,
  });
  return NextResponse.json({ ok: true, item: c });
}

