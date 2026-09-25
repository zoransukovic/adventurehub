import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";
import { createNotification } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const { error, session } = await guard(); if (error) return error;
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: session!.userId } } },
    include: {
      participants: { include: { user: { select:{id:true,fullName:true,avatarUrl:true,role:true} } } },
      messages: { orderBy:{ createdAt:"desc" }, take:1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const { error, session } = await guard(); if (error) return error;
  const { recipientId, body, tourId } = await req.json().catch(() => ({}));
  if (!recipientId || !body) return NextResponse.json({ error: "recipientId i body su obavezni" }, { status: 400 });
  const existing = await prisma.conversation.findFirst({
    where: { type:"DIRECT", participants:{ every:{ userId:{ in:[session!.userId, recipientId] } }, some:{ userId:session!.userId } } },
  });
  let conv = existing;
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { type:"DIRECT", tourId, participants:{ create:[{ userId:session!.userId },{ userId:recipientId }] } },
    });
  }
  const message = await prisma.message.create({ data:{ conversationId:conv.id, senderId:session!.userId, body } });
  const sender = await prisma.user.findUnique({ where:{id:session!.userId}, select:{fullName:true} });
  await createNotification(recipientId, "MESSAGE", `Nova poruka od ${sender?.fullName}`, body.substring(0,80), `/messages/${conv.id}`);
  return NextResponse.json({ message, conversationId: conv.id }, { status: 201 });
}
