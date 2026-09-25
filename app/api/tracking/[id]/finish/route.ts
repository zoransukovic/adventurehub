import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { createNotification } from "@/lib/notify";
type P = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, { params }: P) {
  const { error, session } = await guard(); if (error) return error;
  const { id } = await params;
  const { sos } = await req.json().catch(() => ({ sos: false }));
  const ts = await prisma.trackingSession.findUnique({ where:{id}, include:{ departure:{ include:{ tour:{ include:{ guide:true } } } } } });
  if (!ts || ts.userId !== session!.userId) return NextResponse.json({ error: "Nije pronađena" }, { status: 404 });
  const updated = await prisma.trackingSession.update({ where:{id}, data:{ status: sos ? "SOS" : "FINISHED", finishedAt: new Date() } });
  if (sos && ts.departure?.tour?.guide) {
    await createNotification(ts.departure.tour.guide.id, "SYSTEM", "SOS UPOZORENJE!", `Korisnik treba pomoć na turi "${ts.departure.tour.title}"`, `/admin`);
  }
  return NextResponse.json({ session: updated });
}
