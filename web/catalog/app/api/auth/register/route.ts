// web/catalog/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { ensureTables, getUserByEmail, createUser, upsertCompany } from "../../../../lib/db";
import { hashPassword, setSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  await ensureTables();
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const company = String(form.get("company") || "").trim();
  const role = String(form.get("role") || "").trim() || null;

  if (!email || !password || !company) {
    return NextResponse.json({ ok: false, error: "Заполните email, пароль и компанию" }, { status: 400 });
  }

  const exists = await getUserByEmail(email);
  if (exists) return NextResponse.json({ ok: false, error: "Пользователь уже существует" }, { status: 409 });

  const pass_hash = await hashPassword(password);
  const user = await createUser(email, pass_hash);
  if (company) {
    await upsertCompany(user.id, company, role);
  }
  await setSession(user);

  return NextResponse.json({ ok: true });
}
