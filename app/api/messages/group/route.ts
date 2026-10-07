import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

export async function POST(req: NextRequest) {
  try {
    const { error, session } = await guard("GUIDE");
    if (error) return error;

    const { departureId } = await req.json().catch(() => ({}));

    if (!departureId || typeof departureId !== "string") {
      return NextResponse.json(
        { error: "departureId je obavezan." },
        { status: 400 }
      );
    }

    const departure = await prisma.tourDeparture.findFirst({
      where: {
        id: departureId,
        tour: {
          guideId: session!.userId,
        },
      },
      select: {
        id: true,
        tourId: true,
        bookings: {
          where: {
            status: {
              in: ["PENDING", "CONFIRMED"],
            },
          },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!departure) {
      return NextResponse.json(
        { error: "Termin nije pronađen ili ne pripada ovom vodiču." },
        { status: 404 }
      );
    }

    const touristIds = Array.from(
      new Set(departure.bookings.map((booking) => booking.userId))
    );

    if (touristIds.length === 0) {
      return NextResponse.json(
        { error: "Za ovaj termin nema prijavljenih turista." },
        { status: 400 }
      );
    }

    const participantIds = [session!.userId, ...touristIds];

    let conversation = await prisma.conversation.findFirst({
      where: {
        type: "GROUP",
        departureId: departure.id,
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: "GROUP",
          tourId: departure.tourId,
          departureId: departure.id,
          participants: {
            create: participantIds.map((userId) => ({ userId })),
          },
        },
        select: {
          id: true,
        },
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.conversationParticipant.deleteMany({
          where: {
            conversationId: conversation!.id,
            userId: {
              notIn: participantIds,
            },
          },
        });

        const existingParticipants = await tx.conversationParticipant.findMany({
          where: {
            conversationId: conversation!.id,
          },
          select: {
            userId: true,
          },
        });

        const existingIds = new Set(
          existingParticipants.map((participant) => participant.userId)
        );

        const missingIds = participantIds.filter(
          (userId) => !existingIds.has(userId)
        );

        if (missingIds.length > 0) {
          await tx.conversationParticipant.createMany({
            data: missingIds.map((userId) => ({
              conversationId: conversation!.id,
              userId,
            })),
            skipDuplicates: true,
          });
        }
      });
    }

    return NextResponse.json({
      conversationId: conversation.id,
    });

