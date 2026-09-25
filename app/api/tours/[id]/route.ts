import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
type P = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, { params }: P) {
  const { id } = await params;
  const tour = await prisma.tour.findUnique({
    where: { id },
    include: {
      activityType: true,
      guide: { select: { id:true, fullName:true, avatarUrl:true, guideCertified:true, guideBio:true } },
      route: true,
      reviews: { include: { author: { select: { id:true, fullName:true, avatarUrl:true } } }, orderBy: { createdAt:"desc" } },
      departures: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt:"asc" } },
    },
  });
  if (!tour) return NextResponse.json({ error: "Tura nije pronađena" }, { status: 404 });
  const avgRating = tour.reviews.length ? tour.reviews.reduce((s,r) => s+r.rating,0)/tour.reviews.length : null;
  return NextResponse.json({ tour: { ...tour, avgRating, reviewCount: tour.reviews.length } });
}
export async function DELETE(_: NextRequest, { params }: P) {
  const { error, session } = await guard("GUIDE"); if (error) return error;
  const { id } = await params;
  const tour = await prisma.tour.findUnique({ where: { id } });
  if (!tour) return NextResponse.json({ error: "Nije pronađena" }, { status: 404 });
  if (tour.guideId !== session!.userId && session!.role !== "ADMIN")
    return NextResponse.json({ error: "Zabranjen pristup" }, { status: 403 });
  await prisma.tour.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
