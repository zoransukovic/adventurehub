import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

export async function POST(req: NextRequest) {
  try {
    const { error, session } = await guard("GUIDE");

    if (error) return error;

    const { departureId } = await req.json().catch(() => ({}));

    if (!departureId) {
      return NextResponse.json(
        { error: "departureId je obavezan." },
        { status: 400 }
      );
    }

    // Pronalazimo termin i provjeravamo da pripada turi
    // trenutno prijavljenog vodiča.
    const departure = await prisma.tourDeparture.findFirst({
      where: {
        id: departureId,
        tour: {
          guideId: session!.userId,
        },
      },
      include: {
        tour: {
          select: {
            id: true,
            title: true,
          },
        },
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
        { error: "Termin nije pronađen ili nemate pravo pristupa." },
        { status: 404 }
      );
    }

    // Jedinstveni korisnici sa aktivnim rezervacijama.
    const touristIds = [
      ...new Set(
        departure.bookings.map((booking) => booking.userId)
      ),
    ];

    if (touristIds.length === 0) {
      return NextResponse.json(
        { error: "Za ovaj termin nema prijavljenih turista." },
        { status: 400 }
      );
    }

    const participantIds = [
      session!.userId,
      ...touristIds.filter((id) => id !== session!.userId),
    ];

    // Za svaki termin postoji najviše jedna GROUP konverzacija.
    let conversation = await prisma.conversation.findFirst({
      where: {
        type: "GROUP",
        departureId,
      },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: "GROUP",
          tourId: departure.tour.id,
          departureId,
          participants: {
            create: participantIds.map((userId) => ({
              userId,
            })),
          },
        },
        include: {
          participants: true,
        },
      });
    } else {
      // Sinhronizuj članove grupe sa trenutnim aktivnim rezervacijama.
      const existingIds = new Set(
        conversation.participants.map((participant) => participant.userId)
      );

      const idsToAdd = participantIds.filter(
        (id) => !existingIds.has(id)
      );

      if (idsToAdd.length > 0) {
        await prisma.conversationParticipant.createMany({
          data: idsToAdd.map((userId) => ({
            conversationId: conversation!.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      // Ukloni korisnike koji više nemaju aktivnu rezervaciju.
      await prisma.conversationParticipant.deleteMany({
        where: {
          conversationId: conversation.id,
          userId: {
            notIn: participantIds,
          },
        },
      });
    }

    return NextResponse.json({
      conversationId: conversation.id,
      tourId: departure.tour.id,
      departureId,
      participantsCount: participantIds.length,
    });
  } catch (error) {
    console.error("Group conversation error:", error);

    return NextResponse.json(
      { error: "Greška pri otvaranju grupnog razgovora." },
      { status: 500 }
    );
  }
}
