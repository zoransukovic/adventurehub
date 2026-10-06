import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

/*
 * =========================================================
 * PATCH
 * =========================================================
 *
 * Izmjena administratorskih
 * podešavanja ture.
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { error } =
    await guard("ADMIN");

  if (error) {
    return error;
  }

  try {
    const { id } =
      await params;

    const body =
      await request.json();

    const data: {
      featured?: boolean;
      featuredOrder?:
        | number
        | null;
    } = {};

    if (
      typeof body.featured ===
      "boolean"
    ) {
      data.featured =
        body.featured;

      if (!body.featured) {
        data.featuredOrder =
          null;
      }
    }

    if (
      body.featuredOrder ===
        null ||
      body.featuredOrder === ""
    ) {
      data.featuredOrder =
        null;
    } else if (
      body.featuredOrder !==
      undefined
    ) {
      const order = Number(
        body.featuredOrder
      );

      if (
        !Number.isInteger(
          order
        ) ||
        order < 1
      ) {
        return NextResponse.json(
          {
            error:
              "Redosled mora biti cijeli broj veći od 0.",
          },
          {
            status: 400,
          }
        );
      }

      data.featuredOrder =
        order;
    }

    if (
      Object.keys(data)
        .length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Nema podataka za izmjenu.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Ne dozvoljavamo da dvije
     * istaknute ture imaju isti
     * redni broj.
     */
    if (
      data.featuredOrder !==
        undefined &&
      data.featuredOrder !==
        null
    ) {
      const existing =
        await prisma.tour.findFirst(
          {
            where: {
              id: {
                not: id,
              },

              featured: true,

              featuredOrder:
                data.featuredOrder,
            },

            select: {
              id: true,
              title: true,
            },
          }
        );

      if (existing) {
        return NextResponse.json(
          {
            error: `Redosled ${data.featuredOrder} već koristi tura "${existing.title}".`,
          },
          {
            status: 409,
          }
        );
      }
    }

    const tour =
      await prisma.tour.update(
        {
          where: {
            id,
          },

          data,

          select: {
            id: true,
            title: true,
            active: true,
            featured: true,
            featuredOrder:
              true,
          },
        }
      );

    return NextResponse.json({
      tour,
    });
  } catch (err) {
    console.error(
      "ADMIN TOUR PATCH ERROR:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Greška pri izmjeni ture.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * DELETE
 * =========================================================
 *
 * Trajno brisanje ture.
 *
 * Dostupno samo administratoru.
 */
export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { error } =
    await guard("ADMIN");

  if (error) {
    return error;
  }

  try {
    const { id } =
      await params;

    /*
     * Prvo provjeravamo da li
     * tura postoji.
     */
    const tour =
      await prisma.tour.findUnique(
        {
          where: {
            id,
          },

          select: {
            id: true,
            title: true,

            _count: {
              select: {
                bookings: true,
                reviews: true,
                favorites: true,
              },
            },
          },
        }
      );

    if (!tour) {
      return NextResponse.json(
        {
          error:
            "Tura ne postoji.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Za sada potpuno brisanje
     * dozvoljavamo samo turi koja
     * nema rezervacije.
     *
     * Ovo štiti stvarne rezervacije
     * kada aplikacija počne da se
     * koristi.
     */
    if (
      tour._count.bookings > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Ova tura ima rezervacije i ne može se trajno izbrisati. Može se samo deaktivirati.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Brišemo sve u jednoj
     * transakciji.
     *
     * Route, TourImage i
     * TourDeparture imaju Cascade,
     * ali Favorites brišemo
     * eksplicitno.
     */
    await prisma.$transaction(
      async (tx) => {
        await tx.favorite.deleteMany(
          {
            where: {
              tourId: id,
            },
          }
        );

        /*
         * Review bez Booking-a
         * praktično ne bi trebalo
         * da postoji, ali ga brišemo
         * radi sigurnosti.
         */
        await tx.review.deleteMany(
          {
            where: {
              tourId: id,
            },
          }
        );

        /*
         * Brisanjem Tour-a:
         *
         * Route -> Cascade
         * TourImage -> Cascade
         * TourDeparture -> Cascade
         */
        await tx.tour.delete({
          where: {
            id,
          },
        });
      }
    );

    return NextResponse.json({
      success: true,

      message: `Tura "${tour.title}" je trajno izbrisana.`,
    });
  } catch (err) {
    console.error(
      "ADMIN TOUR DELETE ERROR:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Greška pri brisanju ture.",
      },
      {
        status: 500,
      }
    );
  }
}
