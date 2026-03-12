import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import { saveAdFile, deleteDirectory } from "@/lib/storage";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  destinationUrl: z.string().url().max(2000).optional(),
  placement: z.enum(["GRID", "SIDEBAR", "LEADERBOARD"]).optional(),
  weight: z.coerce.number().int().min(1).max(10).optional(),
  active: z.preprocess((v) => v === "true" || v === true || (v === "false" ? false : v), z.boolean()).optional(),
  startDate: z.string().pipe(z.coerce.date()).optional(),
  endDate: z.string().pipe(z.coerce.date()).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!requireRole(user, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { adId } = await params;
  const id = parseInt(adId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = await prisma.ad.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  const fields: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key !== "image") fields[key] = value;
  }

  const parsed = updateSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.destinationUrl !== undefined) data.destinationUrl = parsed.data.destinationUrl;
  if (parsed.data.placement !== undefined) data.placement = parsed.data.placement;
  if (parsed.data.weight !== undefined) data.weight = parsed.data.weight;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate;

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    data.imageUrl = await saveAdFile(id, file.name, buffer);
  }

  const ad = await prisma.ad.update({
    where: { id },
    data,
    include: { _count: { select: { impressions: true, clicks: true } } },
  });

  return NextResponse.json({
    id: ad.id,
    name: ad.name,
    imageUrl: ad.imageUrl,
    destinationUrl: ad.destinationUrl,
    placement: ad.placement,
    weight: ad.weight,
    active: ad.active,
    startDate: ad.startDate.toISOString(),
    endDate: ad.endDate.toISOString(),
    impressions: ad._count.impressions,
    clicks: ad._count.clicks,
    ctr: ad._count.impressions > 0
      ? (ad._count.clicks / ad._count.impressions) * 100
      : 0,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!requireRole(user, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { adId } = await params;
  const id = parseInt(adId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = await prisma.ad.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.ad.delete({ where: { id } });
  deleteDirectory(`uploads/ads/${id}`);

  return NextResponse.json({ success: true });
}
