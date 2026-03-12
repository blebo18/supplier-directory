import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!requireRole(user, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ads = await prisma.ad.findMany({
    include: {
      _count: {
        select: {
          impressions: { where: { viewedAt: { gte: thirtyDaysAgo } } },
          clicks: { where: { clickedAt: { gte: thirtyDaysAgo } } },
        } as never,
      },
      impressions: {
        where: { viewedAt: { gte: thirtyDaysAgo } },
        select: { id: true },
      },
      clicks: {
        where: { clickedAt: { gte: thirtyDaysAgo } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const adStats = ads.map((ad) => {
    const impressionCount = ad.impressions.length;
    const clickCount = ad.clicks.length;
    return {
      id: ad.id,
      name: ad.name,
      placement: ad.placement,
      active: ad.active,
      impressions: impressionCount,
      clicks: clickCount,
      ctr: impressionCount > 0 ? (clickCount / impressionCount) * 100 : 0,
    };
  });

  const totalImpressions = adStats.reduce((sum, a) => sum + a.impressions, 0);
  const totalClicks = adStats.reduce((sum, a) => sum + a.clicks, 0);

  return NextResponse.json({
    ads: adStats,
    totalImpressions,
    totalClicks,
    totalCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
  });
}
