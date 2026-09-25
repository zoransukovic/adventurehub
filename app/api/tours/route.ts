import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { z } from "zod";

const routeSchema = z.object({
  creationMode: z.enum(["auto","manual"]),
  startLabel: z.string().optional(), endLabel: z.string().optional(),
  startLat: z.number(), startLng: z.number(), endLat: z.number(), endLng: z.number(),
  points: z.array(z.object({ lat: z.number(), lng: z.number(), elevation: z.number().optional() })),
  distanceKm: z.number().optional(), elevationGainM: z.number().optional(), estimatedMins: z.number().optional(),
});
const tourSchema = z.object({
  title: z.string().min(3), descriptionSr: z.string().min(10), descriptionEn: z.string().optional(),
  activityTypeId: z.string(), pricePerPerson: z.number().positive(), maxParticipants: z.number().int().positive(),
  durationMinutes: z.number().int().positive().optional(),
  difficulty: z.enum(["EASY","MODERATE","HARD"]).default("MODERATE"),
  transportMode: z.enum(["FOOT","BIKE","CAR","ATV","KAYAK","DIVING","OTHER"]),
  meetingPoint: z.string().optional(), includesItems: z.array(z.string()).default([]),
  departureDates: z.array(z.object({ startsAt: z.string(), spotsLeft: z.number().int() })).optional(),
  route: routeSchema,
});

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const tours = await prisma.tour.findMany({
    where: {
      active: true,
      activityTypeId: sp.get("activityTypeId") || undefined,
      title: sp.get("search") ? { contains: sp.get("search")!, mode: "insensitive" } : undefined,
    },
    include: {
      activityType: true,
      guide: { select: { id:true, fullName:true, avatarUrl:true, guideCertified:true } },
      route: { select: { distanceKm:true, estimatedMins:true } },
      reviews: { select: { rating:true } },
      departures: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt:"asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tours: tours.map(t => ({
    ...t,
    avgRating: t.reviews.length ? t.reviews.reduce((s,r) => s+r.rating, 0)/t.reviews.length : null,
    reviewCount: t.reviews.length,
  }))});
}

export async function POST(req: NextRequest) {
  const { error, session } = await guard("GUIDE");
  if (error) return error;
  const b = tourSchema.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message }, { status: 400 });
  const { route, departureDates, ...tourData } = b.data;
  const tour = await prisma.tour.create({
    data: {
      ...tourData, guideId: session!.userId,
      route: { create: { ...route, points: route.points as never } },
      departures: departureDates ? { create: departureDates.map(d => ({ startsAt: new Date(d.startsAt), spotsLeft: d.spotsLeft })) } : undefined,
    },
    include: { route: true, activityType: true, departures: true },
  });
  return NextResponse.json({ tour }, { status: 201 });
}
