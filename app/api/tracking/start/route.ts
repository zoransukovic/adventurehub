import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

export async function POST(req: NextRequest) {
  try {
    const { error, session } = await guard();

    if (error) return error;

    const { departureId } = await req
      .json()
      .catch(() => ({}));

    if (!departureId) {
      return NextResponse.json(
        {
          error: "departureId je obavezan.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Korisnik mora imati aktivnu rezervaciju
     * za termin koji želi da prati.
     */
    const booking =
      await prisma.booking.findFirst({
        where: {
          userId: session!.userId,
          departureId,

          status: {
            in: [
              "PENDING",
              "CONFIRMED",
            ],
          },
        },

        include: {
          departure: {
            include: {
              tour: {
                select: {
                  id: true,
                  title: true,
                  guideId: true,
                },
              },
            },
          },
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Nemate aktivnu rezervaciju za ovaj termin.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Ako već postoji aktivna tracking
     * sesija za ovaj termin, vraćamo nju
     * umjesto kreiranja nove.
     */
    const existing =
      await prisma.trackingSession.findFirst({
        where: {
          userId: session!.userId,
          departureId,
          status: "ACTIVE",
        },
      });

    if (existing) {
      return NextResponse.json({
        session: existing,
        existing: true,
      });
    }

    /*
     * Kreiranje nove tracking sesije.
     */
    const trackingSession =
      await prisma.trackingSession.create({
        data: {
          userId: session!.userId,
          departureId,
          status: "ACTIVE",
        },
      });

    return NextResponse.json(
      {
        session: trackingSession,
        existing: false,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Tracking start error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Greška pri pokretanju praćenja ture.",
      },
      {
        status: 500,
      }
    );
  }
}
