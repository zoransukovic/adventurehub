
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

type P = {
  params: Promise<{
    departureId: string;
  }>;
};

export async function GET(
  _: NextRequest,
  { params }: P
) {
  try {
    const {
      error,
      session,
    } = await guard();

    if (error) return error;

    if (
      session!.role !== "GUIDE" &&
      session!.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Pristup je dozvoljen samo vodiču.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      departureId,
    } = await params;

    const departure =
      await prisma.tourDeparture.findUnique({
        where: {
          id: departureId,
        },

        include: {
          tour: {
            include: {
              route: true,
            },
          },

          trackingSessions: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                },
              },

              points: {
                orderBy: {
                  recordedAt: "asc",
                },
              },
            },

            orderBy: {
              startedAt: "asc",
            },
          },
        },
      });

    if (!departure) {
      return NextResponse.json(
        {
          error:
            "Termin ture nije pronađen.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * GUIDE može gledati samo
     * termine svojih tura.
     *
     * ADMIN može otvoriti svaki termin.
     */
    if (
      session!.role !== "ADMIN" &&
      departure.tour.guideId !==
        session!.userId
    ) {
      return NextResponse.json(
        {
          error:
            "Nemate pristup ovom terminu.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json({
      departure: {
        id: departure.id,
        startsAt:
          departure.startsAt,
        spotsLeft:
          departure.spotsLeft,

        tour: {
          id: departure.tour.id,
          title:
            departure.tour.title,

          route:
            departure.tour.route,
        },
      },

      trackingSessions:
        departure.trackingSessions.map(
          (tracking) => ({
            id: tracking.id,

            status:
              tracking.status,

            startedAt:
              tracking.startedAt,

            finishedAt:
              tracking.finishedAt,

            distanceCoveredKm:
              tracking.distanceCoveredKm,

            currentLat:
              tracking.currentLat,

            currentLng:
              tracking.currentLng,

            currentSpeedKmh:
              tracking.currentSpeedKmh,

            currentElevationM:
              tracking.currentElevationM,

            user: tracking.user,

            points:
              tracking.points.map(
                (point) => ({
                  id: point.id,
                  lat: point.lat,
                  lng: point.lng,
                  elevation:
                    point.elevation,
                  speedKmh:
                    point.speedKmh,
                  recordedAt:
                    point.recordedAt,
                })
              ),
          })
        ),
    });
  } catch (error) {
    console.error(
      "Guide live tracking error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Greška pri učitavanju Live praćenja.",
      },
      {
        status: 500,
      }
    );
  }
}
