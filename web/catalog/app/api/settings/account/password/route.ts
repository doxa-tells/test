// web/catalog/app/api/settings/account/password/route.ts
import { NextResponse } from "next/server";
import { currentUser, verifyPassword, hashPassword } from "../../../../../lib/auth";
import { ensureTables, getUserAuthById, updateUserPasswordHash } from "../../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const ctype = req.headers.get('content-type') || '';
  if (!ctype.includes('application/json')) return NextResponse.json({ ok:false, error:'unsupported_media_type' }, { status:415 });

  const { current_password, new_password } = await req.json();
  const cur = String(current_password || '');
  const next = String(new_password || '');
  if (next.length < 8) return NextResponse.json({ ok:false, error:'password_too_short' }, { status:400 });

  const auth = await getUserAuthById(user.id);
  if (!auth) return NextResponse.json({ ok:false, error:'not_found' }, { status:404 });
  const ok = await verifyPassword(cur, auth.pass_hash);
  if (!ok) return NextResponse.json({ ok:false, error:'bad_password' }, { status:400 });

  const pass_hash = await hashPassword(next);
  await updateUserPasswordHash(user.id, pass_hash);
  return NextResponse.json({ ok:true });
}
