// web/catalog/app/feed/page.tsx
import { NextResponse } from "next/server";
import { bp } from "../../lib/http";

export const dynamic = "force-dynamic";

export default function FeedIndexPage() {
  return NextResponse.redirect(bp('/my-castings'));
}

