import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { createNotification } from "@/lib/notify";
import { z } from "zod";
const schema = z.object({ bookingId: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().optional(), tags: z.array(z.string()).default([]) });
type P = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, { params }: P) {
  const { error, session } = await guard(); if (error) return error;
  const { id: tourId } = await params;
  const b = schema.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message }, { status: 400 });
  const booking = await prisma.booking.findFirst({ where: { id: b.data.bookingId, userId: session!.userId, tourId, status: "COMPLETED" } });
  if (!booking) return NextResponse.json({ error: "Rezervacija nije pronađena ili nije završena" }, { status: 400 });
  if (await prisma.review.findUnique({ where: { bookingId: b.data.bookingId } }))
    return NextResponse.json({ error: "Već ste ostavili recenziju" }, { status: 409 });
  const review = await prisma.review.create({ data: { ...b.data, tourId, authorId: session!.userId } });
  const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { guideId:true, title:true } });
  if (tour) await createNotification(tour.guideId, "REVIEW_REQUEST", `Nova recenzija za "${tour.title}"`, `Ocjena: ${b.data.rating}/5`, `/tours/${tourId}`);
  return NextResponse.json({ review }, { status: 201 });
}
