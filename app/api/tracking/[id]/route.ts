import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
type P = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, { params }: P) {
  const { error } = await guard(); if (error) return error;
  const { id } = await params;
  const ts = await prisma.trackingSession.findUnique({ where:{id}, include:{ points:{ orderBy:{ recordedAt:"asc" } } } });
  if (!ts) return NextResponse.json({ error: "Nije pronađena" }, { status: 404 });
  return NextResponse.json({ session: ts });
}
