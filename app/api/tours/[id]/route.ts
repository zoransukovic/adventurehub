
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

type P = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * GET /api/tours/[id]
 *
 * Vraća kompletnu pojedinačnu turu.
 */
export async function GET(
  _: NextRequest,
  { params }: P
) {
  const { id } = await params;

  const tour =
    await prisma.tour.findUnique({
      where: {
        id,
      },

      include: {
        /*
         * Vrsta aktivnosti.
         */
        activityType: true,

        /*
         * Podaci vodiča.
         */
        guide: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            guideCertified: true,
            guideBio: true,
          },
        },

        /*
         * Fotografije ture.
         *
         * position 0 = naslovna.
         */
        images: {
          orderBy: {
            position: "asc",
          },
        },

        /*
         * Ruta ture.
         */
        route: true,

        /*
         * Recenzije.
         */
        reviews: {
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },

        /*
         * Budući termini.
         */
        departures: {
          where: {
            startsAt: {
              gte: new Date(),
            },
          },

          orderBy: {
            startsAt: "asc",
          },
        },
      },
    });

  /*
   * Ako tura ne postoji.
   */
  if (!tour) {
    return NextResponse.json(
      {
        error:
          "Tura nije pronađena",
      },
      {
        status: 404,
      }
    );
  }

  /*
   * Prosječna ocjena.
   */
  const avgRating =
    tour.reviews.length
      ? tour.reviews.reduce(
          (
            sum,
            review
          ) =>
            sum +
            review.rating,
          0
        ) /
        tour.reviews.length
      : null;

  /*
   * Vraćamo kompletnu turu.
   */
  return NextResponse.json({
    tour: {
      ...tour,

      avgRating,

      reviewCount:
        tour.reviews.length,
    },
  });
}

/*
 * DELETE /api/tours/[id]
 *
 * Turu ne brišemo fizički.
 * Postavljamo active = false.
 */
export async function DELETE(
  _: NextRequest,
  { params }: P
) {
  const {
    error,
    session,
  } = await guard("GUIDE");

  if (error) {
    return error;
  }

  const { id } = await params;

  const tour =
    await prisma.tour.findUnique({
      where: {
        id,
      },
    });

  if (!tour) {
    return NextResponse.json(
      {
        error:
          "Nije pronađena",
      },
      {
        status: 404,
      }
    );
  }

  /*
   * Vodič može deaktivirati samo
   * svoju turu.
   *
   * ADMIN može deaktivirati
   * bilo koju turu.
   */
  if (
    tour.guideId !==
      session!.userId &&
    session!.role !== "ADMIN"
  ) {
    return NextResponse.json(
      {
        error:
          "Zabranjen pristup",
      },
      {
        status: 403,
      }
    );
  }

  await prisma.tour.update({
    where: {
      id,
    },

    data: {
      active: false,
    },
  });

  return NextResponse.json({
    ok: true,
  });
}
