// web/catalog/app/api/actor-link/route.ts
import { NextResponse } from "next/server";
import { ensureTables, getLinkedActorUserId, setLinkedActorUserId } from "../../../lib/db";
import { currentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const actor_user_id = await getLinkedActorUserId(user.id);
  return NextResponse.json({ ok: true, actor_user_id });
}

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const ctype = req.headers.get('content-type') || '';
  let actorIdStr = '';
  if (ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')) {
    const fd = await req.formData();
    actorIdStr = String(fd.get('actor_user_id') || '').trim();
  } else {
    const body = await req.json().catch(()=>({} as any));
    actorIdStr = String(body.actor_user_id || '').trim();
  }
  const actor_user_id = Number(actorIdStr);
  if (!Number.isFinite(actor_user_id)) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  await setLinkedActorUserId(user.id, actor_user_id);
  return NextResponse.json({ ok: true });
}
