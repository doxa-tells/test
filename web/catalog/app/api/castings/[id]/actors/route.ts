// web/catalog/app/api/castings/[id]/actors/route.ts
import { NextResponse } from "next/server";
import { ensureTables, getCasting, getCastingPrefs, listActors } from "../../../../../lib/db";
import { currentUser } from "../../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureTables();
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const id = Number(params.id);
    const casting = await getCasting(id, user.id);
    if (!casting) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const prefs = await getCastingPrefs(id);
    const items = await listActors({
      sex: prefs?.sex ?? undefined,
      city: prefs?.city ?? undefined,
      look_type: prefs?.look_type ?? undefined,
      body_type: prefs?.body_type ?? undefined,
      hair_color: prefs?.hair_color ?? undefined,
      eye_color: prefs?.eye_color ?? undefined,
      lang: prefs?.lang ?? undefined,
      heightMin: prefs?.height_min ?? undefined,
      heightMax: prefs?.height_max ?? undefined,
      ageFrom: prefs?.age_from ?? undefined,
      ageTo: prefs?.age_to ?? undefined,
      limit: 100,
      offset: 0,
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
