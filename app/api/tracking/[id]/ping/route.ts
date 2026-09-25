import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
type P = { params: Promise<{ id: string }> };
function hvKm(lat1:number,lng1:number,lat2:number,lng2:number){
  const R=6371, dl=((lat2-lat1)*Math.PI)/180, dg=((lng2-lng1)*Math.PI)/180;
  const a=Math.sin(dl/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dg/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
export async function POST(req: NextRequest, { params }: P) {
  const { error, session } = await guard(); if (error) return error;
  const { id } = await params;
  const { lat, lng, elevation, speedKmh } = await req.json().catch(() => ({}));
  if (!lat || !lng) return NextResponse.json({ error: "Neispravne koordinate" }, { status: 400 });
  const ts = await prisma.trackingSession.findUnique({ where: { id } });
  if (!ts || ts.userId !== session!.userId) return NextResponse.json({ error: "Nije pronađena" }, { status: 404 });
  if (ts.status !== "ACTIVE") return NextResponse.json({ error: "Sesija nije aktivna" }, { status: 409 });
  let addedKm = 0;
  if (ts.currentLat && ts.currentLng) {
    addedKm = hvKm(ts.currentLat, ts.currentLng, lat, lng);
    if (addedKm > 0.5) addedKm = 0;
  }
  const [updated] = await prisma.$transaction([
    prisma.trackingSession.update({ where:{id}, data:{ currentLat:lat, currentLng:lng, currentElevationM:elevation, currentSpeedKmh:speedKmh, distanceCoveredKm:{ increment: addedKm } } }),
    prisma.trackingPoint.create({ data:{ sessionId:id, lat, lng, elevation, speedKmh } }),
  ]);
  return NextResponse.json({ session: updated });
}
