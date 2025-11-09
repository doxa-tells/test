// web/catalog/app/api/castings/route.ts
import { NextResponse } from "next/server";
import { ensureTables, listMyCastings, createCasting } from "../../../lib/db";
import { currentUser } from "../../../lib/auth";

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
    return NextResponse.redirect(new URL(`/my-castings/${c.id}`, req.url));
  }
  // fallback JSON body
  const body = await req.json().catch(()=>({} as any));
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim() || null;
  if (!title) return NextResponse.json({ ok: false, error: "Укажите название" }, { status: 400 });
  const c = await createCasting(user.id, title, description);
  return NextResponse.json({ ok: true, item: c });
}
