
import { NextRequest, NextResponse } from "next/server";

type TransportMode =
  | "FOOT"
  | "BIKE"
  | "CAR"
  | "ATV"
  | "KAYAK"
  | "DIVING"
  | "OTHER";

function getCosting(mode: TransportMode) {
  switch (mode) {
    case "FOOT":
      return "pedestrian";

    case "BIKE":
      return "bicycle";

    case "CAR":
      return "auto";

    case "ATV":
      // Privremeno koristimo auto.
      // Kasnije možemo napraviti poseban ATV profil.
      return "auto";

    default:
      return null;
  }
}

function decodePolyline(
  encoded: string,
  precision = 6
) {
  const coordinates: {
    lat: number;
    lng: number;
  }[] = [];

  let index = 0;
  let lat = 0;
  let lng = 0;

  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte =
        encoded.charCodeAt(index++) - 63;

      result |=
        (byte & 0x1f) << shift;

      shift += 5;
    } while (byte >= 0x20);

    const deltaLat =
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte =
        encoded.charCodeAt(index++) - 63;

      result |=
        (byte & 0x1f) << shift;

      shift += 5;
    } while (byte >= 0x20);

    const deltaLng =
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    lng += deltaLng;

    coordinates.push({
      lat: lat / factor,
      lng: lng / factor,
    });
  }

  return coordinates;
}

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json();

    const {
      startLat,
      startLng,
      endLat,
      endLng,
      transportMode,
    } = body;

    if (
      !Number.isFinite(startLat) ||
      !Number.isFinite(startLng) ||
      !Number.isFinite(endLat) ||
      !Number.isFinite(endLng)
    ) {
      return NextResponse.json(
        {
          error:
            "Koordinate početka ili cilja nijesu ispravne.",
        },
        {
          status: 400,
        }
      );
    }

    const costing = getCosting(
      transportMode
    );

    if (!costing) {
      return NextResponse.json(
        {
          error:
            "Automatsko rutiranje nije dostupno za ovaj način kretanja. Koristite ručno crtanje.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      "https://valhalla1.openstreetmap.de/route",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Client-Id":
            "adventurehub-montenegro",
        },

        body: JSON.stringify({
          locations: [
            {
              lat: startLat,
              lon: startLng,
              type: "break",
            },
            {
              lat: endLat,
              lon: endLng,
              type: "break",
            },
          ],

          costing,

          units: "kilometers",

          language: "sr",
        }),

        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Valhalla error:",
        data
      );

      return NextResponse.json(
        {
          error:
            data?.error ||
            "Nije moguće pronaći rutu između izabranih tačaka.",
        },
        {
          status: 400,
        }
      );
    }

    const legs =
      data?.trip?.legs ?? [];

    if (legs.length === 0) {
      return NextResponse.json(
        {
          error:
            "Routing servis nije pronašao odgovarajuću rutu.",
        },
        {
          status: 404,
        }
      );
    }

    const points: {
      lat: number;
      lng: number;
    }[] = [];

    for (const leg of legs) {
      if (!leg.shape) continue;

      const decoded =
        decodePolyline(
          leg.shape,
          6
        );

      if (points.length > 0) {
        decoded.shift();
      }

      points.push(...decoded);
    }

    if (points.length < 2) {
      return NextResponse.json(
        {
          error:
            "Routing servis nije vratio dovoljno GPS tačaka.",
        },
        {
          status: 404,
        }
      );
    }

    const distanceKm =
      Number(
        data?.trip?.summary?.length ??
          0
      );

    const estimatedMins =
      Math.round(
        Number(
          data?.trip?.summary?.time ??
            0
        ) / 60
      );

    return NextResponse.json({
      points,
      distanceKm,
      estimatedMins,
    });
  } catch (error) {
    console.error(
      "Routing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Došlo je do greške prilikom izračunavanja rute.",
      },
      {
        status: 500,
      }
    );
  }
}
