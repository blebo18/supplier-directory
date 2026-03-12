import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placement = searchParams.get("placement");
  const count = Math.min(parseInt(searchParams.get("count") || "1", 10) || 1, 10);

  if (!placement || !["GRID", "SIDEBAR", "LEADERBOARD"].includes(placement)) {
    return NextResponse.json({ error: "Valid placement required" }, { status: 400 });
  }

  const now = new Date();

  const eligible = await prisma.ad.findMany({
    where: {
      active: true,
      placement: placement as "GRID" | "SIDEBAR" | "LEADERBOARD",
      startDate: { lte: now },
      endDate: { gte: now },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      destinationUrl: true,
      placement: true,
      weight: true,
    },
  });

  if (eligible.length === 0) {
    return NextResponse.json({ ads: [] });
  }

  // Weighted random selection
  const selected: typeof eligible = [];
  const pool = [...eligible];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, ad) => sum + ad.weight, 0);
    let random = Math.random() * totalWeight;

    for (let j = 0; j < pool.length; j++) {
      random -= pool[j].weight;
      if (random <= 0) {
        selected.push(pool[j]);
        pool.splice(j, 1);
        break;
      }
    }
  }

  return NextResponse.json({ ads: selected });
}
