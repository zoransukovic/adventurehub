import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
export async function POST(req: NextRequest) {
  const { error, session } = await guard(); if (error) return error;
  const { departureId } = await req.json().catch(() => ({}));
  if (!departureId) return NextResponse.json({ error: "departureId je obavezan" }, { status: 400 });
  const existing = await prisma.trackingSession.findFirst({ where: { userId: session!.userId, departureId, status: "ACTIVE" } });
  if (existing) return NextResponse.json({ session: existing });
  const ts = await prisma.trackingSession.create({ data: { userId: session!.userId, departureId, status: "ACTIVE" } });
  return NextResponse.json({ session: ts }, { status: 201 });
}
