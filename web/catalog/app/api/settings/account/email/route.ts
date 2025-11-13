// web/catalog/app/api/settings/account/email/route.ts
import { NextResponse } from "next/server";
import { currentUser, verifyPassword } from "../../../../../lib/auth";
import { ensureTables, getUserAuthById, getUserByEmail, updateUserEmail } from "../../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const ctype = req.headers.get('content-type') || '';
  if (!ctype.includes('application/json')) return NextResponse.json({ ok:false, error:'unsupported_media_type' }, { status:415 });

  const { new_email, current_password } = await req.json();
  const email = String(new_email || '').trim().toLowerCase();
  const pass = String(current_password || '');
  if (!email) return NextResponse.json({ ok:false, error:'email_required' }, { status:400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok:false, error:'email_invalid' }, { status:400 });

  const auth = await getUserAuthById(user.id);
  if (!auth) return NextResponse.json({ ok:false, error:'not_found' }, { status:404 });
  const ok = await verifyPassword(pass, auth.pass_hash);
  if (!ok) return NextResponse.json({ ok:false, error:'bad_password' }, { status:400 });

  const exists = await getUserByEmail(email);
  if (exists && exists.id !== user.id) return NextResponse.json({ ok:false, error:'email_taken' }, { status:409 });

  await updateUserEmail(user.id, email);
  return NextResponse.json({ ok:true });
}
