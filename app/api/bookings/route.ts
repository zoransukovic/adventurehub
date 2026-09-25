import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { createNotification } from "@/lib/notify";
import { z } from "zod";
const schema = z.object({ tourId: z.string(), departureId: z.string(), participants: z.number().int().min(1).default(1) });
export async function GET(req: NextRequest) {
  const { error, session } = await guard(); if (error) return error;
  const bookings = await prisma.booking.findMany({
    where: { userId: session!.userId },
    include: { tour:{ select:{id:true,title:true,activityType:true} }, departure:true, review:{ select:{id:true,rating:true} } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ bookings });
}
export async function POST(req: NextRequest) {
  const { error, session } = await guard(); if (error) return error;
  const b = schema.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message }, { status: 400 });
  const { tourId, departureId, participants } = b.data;
  const departure = await prisma.tourDeparture.findUnique({ where:{ id:departureId } });
  if (!departure) return NextResponse.json({ error: "Termin nije pronađen" }, { status: 404 });
  if (departure.spotsLeft < participants) return NextResponse.json({ error: `Dostupno je samo ${departure.spotsLeft} mjesta` }, { status: 400 });
  const tour = await prisma.tour.findUnique({ where:{ id:tourId } });
  if (!tour) return NextResponse.json({ error: "Tura nije pronađena" }, { status: 404 });
  const [booking] = await prisma.$transaction([
    prisma.booking.create({ data:{ userId:session!.userId, tourId, departureId, participants, status:"CONFIRMED", totalPrice: tour.pricePerPerson * participants } }),
    prisma.tourDeparture.update({ where:{ id:departureId }, data:{ spotsLeft:{ decrement: participants } } }),
  ]);
  const user = await prisma.user.findUnique({ where:{id:session!.userId}, select:{fullName:true} });
  await createNotification(tour.guideId, "BOOKING_CONFIRMED", `Nova rezervacija za "${tour.title}"`, `${user?.fullName} - ${participants} osoba`, `/guide/bookings`);
  await createNotification(session!.userId, "BOOKING_CONFIRMED", `Rezervacija potvrđena!`, `${tour.title}`, `/bookings`);
  return NextResponse.json({ booking }, { status: 201 });
}
