import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import { saveAdFile } from "@/lib/storage";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!requireRole(user, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ads = await prisma.ad.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { impressions: true, clicks: true },
      },
    },
  });

  const result = ads.map((ad) => ({
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
  }));

  return NextResponse.json({ ads: result });
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  destinationUrl: z.string().url().max(2000),
  placement: z.enum(["GRID", "SIDEBAR", "LEADERBOARD"]),
  weight: z.coerce.number().int().min(1).max(10).default(1),
  active: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(true),
  startDate: z.string().pipe(z.coerce.date()),
  endDate: z.string().pipe(z.coerce.date()),
});

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!requireRole(user, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Image file required" }, { status: 400 });
  }

  const fields: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key !== "image") fields[key] = value;
  }

  const parsed = createSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, destinationUrl, placement, weight, active, startDate, endDate } = parsed.data;

  if (endDate <= startDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  // Create ad first to get ID for file storage
  const ad = await prisma.ad.create({
    data: {
      name,
      imageUrl: "", // placeholder
      destinationUrl,
      placement,
      weight,
      active,
      startDate,
      endDate,
    },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageUrl = await saveAdFile(ad.id, file.name, buffer);

  const updated = await prisma.ad.update({
    where: { id: ad.id },
    data: { imageUrl },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    imageUrl: updated.imageUrl,
    destinationUrl: updated.destinationUrl,
    placement: updated.placement,
    weight: updated.weight,
    active: updated.active,
    startDate: updated.startDate.toISOString(),
    endDate: updated.endDate.toISOString(),
    impressions: 0,
    clicks: 0,
    ctr: 0,
  }, { status: 201 });
}
