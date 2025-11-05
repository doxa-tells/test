// web/catalog/app/api/send-casting/route.ts
import { NextResponse } from "next/server";
import { ensureTables, getCasting, sendCastingToActor } from "../../../lib/db";
import { currentUser } from "../../../lib/auth";

export async function POST(req: Request) {
  await ensureTables();
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { casting_id, actor_user_id } = await req.json();
  if (!casting_id || !actor_user_id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  const casting = await getCasting(Number(casting_id), user.id);
  if (!casting) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  await sendCastingToActor(Number(casting_id), Number(actor_user_id));
  return NextResponse.json({ ok: true });
}
