import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await guard("ADMIN");

  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const data: {
      featured?: boolean;
      featuredOrder?: number | null;
    } = {};

    // Promjena statusa "Istaknuta"
    if (typeof body.featured === "boolean") {
      data.featured = body.featured;

      // Ako više nije istaknuta,
      // brišemo i njen redosled.
      if (!body.featured) {
        data.featuredOrder = null;
      }
    }

    // Promjena redosleda
    if (
      body.featuredOrder === null ||
      body.featuredOrder === ""
    ) {
      data.featuredOrder = null;
    } else if (body.featuredOrder !== undefined) {
      const order = Number(body.featuredOrder);

      if (!Number.isInteger(order) || order < 1) {
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
  } catch (err) {
    console.error("ADMIN TOUR PATCH ERROR:", err);

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
