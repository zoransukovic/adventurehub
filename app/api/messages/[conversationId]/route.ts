import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { createNotification } from "@/lib/notify";
type P = { params: Promise<{ conversationId: string }> };

export async function GET(_: NextRequest, { params }: P) {
  const { error, session } = await guard(); if (error) return error;
  const { conversationId } = await params;
  const conv = await prisma.conversation.findFirst({
    where: { id:conversationId, participants:{ some:{ userId:session!.userId } } },
    include: {
      participants: { include:{ user:{ select:{id:true,fullName:true,avatarUrl:true,role:true} } } },
      messages: { include:{ sender:{ select:{id:true,fullName:true,avatarUrl:true} } }, orderBy:{ createdAt:"asc" } },
    },
  });
  if (!conv) return NextResponse.json({ error: "Razgovor nije pronađen" }, { status: 404 });
  await prisma.conversationParticipant.updateMany({ where:{ conversationId, userId:session!.userId }, data:{ lastReadAt: new Date() } });
  return NextResponse.json({ conversation: conv });
}

export async function POST(req: NextRequest, { params }: P) {
  const { error, session } = await guard(); if (error) return error;
  const { conversationId } = await params;
  const { body } = await req.json().catch(() => ({}));
  if (!body) return NextResponse.json({ error: "body je obavezan" }, { status: 400 });
  const conv = await prisma.conversation.findFirst({ where:{ id:conversationId, participants:{ some:{ userId:session!.userId } } }, include:{ participants:true } });
  if (!conv) return NextResponse.json({ error: "Nije pronađen" }, { status: 404 });
  const message = await prisma.message.create({ data:{ conversationId, senderId:session!.userId, body }, include:{ sender:{ select:{id:true,fullName:true,avatarUrl:true} } } });
  const sender = await prisma.user.findUnique({ where:{id:session!.userId}, select:{fullName:true} });
  const others = conv.participants.filter(p => p.userId !== session!.userId);
  for (const p of others) {
    await createNotification(p.userId, "MESSAGE", `Nova poruka od ${sender?.fullName}`, body.substring(0,80), `/messages/${conversationId}`);
  }
  return NextResponse.json({ message }, { status: 201 });
}
