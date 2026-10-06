
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { error } = await guard("ADMIN");
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const data: {
      featured?: boolean;
      featuredOrder?: number | null;
    } = {};

    if (typeof body.featured === "boolean") {
      data.featured = body.featured;

      if (body.featured === false) {
        data.featuredOrder = null;
      }
    }

    if (
      body.featuredOrder === null ||
      body.featuredOrder === ""
    ) {
      data.featuredOrder = null;
    } else if (body.featuredOrder !== undefined) {
      const order = Number(body.featuredOrder);

      if (
        !Number.isInteger(order) ||
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

      data.featuredOrder = order;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          error: "Nema podataka za izmjenu.",
        },
        {
          status: 400,
        }
      );
    }

    const tour = await prisma.tour.update({
      where: {
        id,
      },

      data,

      select: {
        id: true,
        title: true,
        active: true,
        featured: true,
        featuredOrder: true,
      },
    });

    return NextResponse.json({
      tour,
    });
  } catch (error) {
    console.error(
      "ADMIN TOUR PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Greška pri izmjeni ture.",
      },
      {
        status: 500,
      }
    );
  }
}
