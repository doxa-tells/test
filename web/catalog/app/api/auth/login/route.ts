// web/catalog/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { ensureTables, getUserByEmail } from "../../../../lib/db";
import { verifyPassword, setSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  await ensureTables();
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  if (!email || !password) return NextResponse.json({ ok: false, error: "Заполните email и пароль" }, { status: 400 });

  const u = await getUserByEmail(email);
  if (!u) return NextResponse.json({ ok: false, error: "Неверные данные" }, { status: 401 });
  const ok = await verifyPassword(password, u.pass_hash);
  if (!ok) return NextResponse.json({ ok: false, error: "Неверные данные" }, { status: 401 });

  await setSession(u);
  return NextResponse.json({ ok: true });
}
