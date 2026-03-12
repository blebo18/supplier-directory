import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  const { adId } = await params;
  const id = parseInt(adId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const ad = await prisma.ad.findUnique({ where: { id } });
  if (!ad) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.adClick.create({ data: { adId: id } });

  return NextResponse.json({ success: true });
}
