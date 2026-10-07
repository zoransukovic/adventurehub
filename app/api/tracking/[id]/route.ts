import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

type P = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _: NextRequest,
  { params }: P
) {
  try {
    const { error, session } = await guard();

    if (error) return error;

    const { id } = await params;

    const trackingSession =
      await prisma.trackingSession.findUnique({
        where: {
          id,
        },

        include: {
          points: {
            orderBy: {
              recordedAt: "asc",
            },
          },

          departure: {
            include: {
              tour: {
                select: {
                  id: true,
                  title: true,

                  route: {
                    select: {
                      id: true,
                      startLabel: true,
                      endLabel: true,

                      startLat: true,
                      startLng: true,

                      endLat: true,
                      endLng: true,

                      points: true,

                      distanceKm: true,
                      elevationGainM: true,
                      estimatedMins: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    /*
     * Sesija mora postojati i pripadati
     * trenutno prijavljenom korisniku.
     */
    if (
      !trackingSession ||
      trackingSession.userId !== session!.userId
    ) {
      return NextResponse.json(
        {
          error: "Tracking sesija nije pronađena.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      session: trackingSession,
    });
  } catch (error) {
    console.error(
      "Tracking session GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Greška pri učitavanju tracking sesije.",
      },
      {
        status: 500,
      }
    );
  }
}
