"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

type Point = {
  lat: number;
  lng: number;
};

type TransportMode =
  | "FOOT"
  | "BIKE"
  | "CAR"
  | "ATV"
  | "KAYAK"
  | "DIVING"
  | "OTHER";

type Props = {
  mode: "auto" | "manual";

  transportMode: TransportMode;

  points: Point[];

  startLat: number;
  startLng: number;

  endLat: number;
  endLng: number;

  onChange: (data: {
    points: Point[];

    startLat: number;
    startLng: number;

    endLat: number;
    endLng: number;

    distanceKm: number;

    estimatedMins?: number;
  }) => void;
};

const startIcon = L.divIcon({
  className: "",

  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#16a34a;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:17px;
    ">
      🟢
    </div>
  `,

  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const endIcon = L.divIcon({
  className: "",

  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#dc2626;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:17px;
    ">
      🏁
    </div>
  `,

  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function calculateDistance(
  points: Point[]
) {
  if (points.length < 2) {
    return 0;
  }

  const R = 6371;

  let total = 0;

  for (
    let i = 1;
    i < points.length;
    i++
  ) {
    const p1 = points[i - 1];
    const p2 = points[i];

    const lat1 =
      (p1.lat * Math.PI) / 180;

    const lat2 =
      (p2.lat * Math.PI) / 180;

    const dLat =
      ((p2.lat - p1.lat) *
        Math.PI) /
      180;

    const dLng =
      ((p2.lng - p1.lng) *
        Math.PI) /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    total += R * c;
  }

  return (
    Math.round(total * 100) / 100
  );
}

function MapClickHandler({
  mode,
  transportMode,
  points,
  onChange,
  setRouting,
  setRoutingError,
}: {
  mode: "auto" | "manual";

  transportMode: TransportMode;

  points: Point[];

  onChange: Props["onChange"];

  setRouting: (
    value: boolean
  ) => void;

  setRoutingError: (
    value: string | null
  ) => void;
}) {
  useMapEvents({
    async click(e) {
      const point = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      };

      /*
       * RUČNO CRTANJE
       */
      if (mode === "manual") {
        const newPoints = [
          ...points,
          point,
        ];

        const start =
          newPoints[0];

        const end =
          newPoints[
            newPoints.length - 1
          ];

        onChange({
          points: newPoints,

          startLat: start.lat,
          startLng: start.lng,

          endLat: end.lat,
          endLng: end.lng,

          distanceKm:
            calculateDistance(
              newPoints
            ),
        });

        return;
      }

      /*
       * AUTO:
       *
       * Ako nema rute:
       * prvi klik postavlja start.
       */
      if (
        points.length === 0 ||
        points.length >= 2
      ) {
        setRoutingError(null);

        onChange({
          points: [point],

          startLat: point.lat,
          startLng: point.lng,

          endLat: point.lat,
          endLng: point.lng,

          distanceKm: 0,

          estimatedMins: 0,
        });

        return;
      }

      /*
       * Drugi klik = cilj.
       *
       * Sada tražimo stvarnu rutu
       * preko našeg API-ja.
       */
      const start = points[0];

      setRouting(true);
      setRoutingError(null);

      try {
        const response =
          await fetch(
            "/api/routing",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  startLat:
                    start.lat,

                  startLng:
                    start.lng,

                  endLat:
                    point.lat,

                  endLng:
                    point.lng,

                  transportMode,
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Ruta nije pronađena."
          );
        }

        const routePoints =
          data.points as Point[];

        onChange({
          points: routePoints,

          startLat:
            routePoints[0].lat,

          startLng:
            routePoints[0].lng,

          endLat:
            routePoints[
              routePoints.length - 1
            ].lat,

          endLng:
            routePoints[
              routePoints.length - 1
            ].lng,

          distanceKm:
            data.distanceKm,

          estimatedMins:
            data.estimatedMins,
        });
      } catch (error) {
        console.error(error);

        setRoutingError(
          error instanceof Error
            ? error.message
            : "Nije moguće pronaći rutu."
        );
      } finally {
        setRouting(false);
      }
    },
  });

  return null;
}

function FitRoute({
  points,
}: {
  points: Point[];
}) {
  const map = useMap();

  useEffect(() => {
    if (
      points.length === 0
    ) {
      return;
    }

    if (
      points.length === 1
    ) {
      map.setView(
        [
          points[0].lat,
          points[0].lng,
        ],
        14
      );

      return;
    }

    const bounds =
      L.latLngBounds(
        points.map(
          (p) =>
            [
              p.lat,
              p.lng,
            ] as [
              number,
              number
            ]
        )
      );

    map.fitBounds(
      bounds,
      {
        padding: [30, 30],
      }
    );
  }, [map, points]);

  return null;
}

export default function RouteEditorMap({
  mode,
  transportMode,
  points,
  startLat,
  startLng,
  endLat,
  endLng,
  onChange,
}: Props) {
  const [
    routing,
    setRouting,
  ] = useState(false);

  const [
    routingError,
    setRoutingError,
  ] =
    useState<string | null>(
      null
    );

  function undoLastPoint() {
    if (
      points.length === 0
    ) {
      return;
    }

    /*
     * Kod automatske rute
     * "Zadnja" vraća na početak.
     */
    if (
      mode === "auto" &&
      points.length >= 2
    ) {
      const start =
        points[0];

      onChange({
        points: [start],

        startLat: start.lat,
        startLng: start.lng,

        endLat: start.lat,
        endLng: start.lng,

        distanceKm: 0,

        estimatedMins: 0,
      });

      setRoutingError(null);

      return;
    }

    const newPoints =
      points.slice(0, -1);

    if (
      newPoints.length === 0
    ) {
      onChange({
        points: [],

        startLat,
        startLng,

        endLat,
        endLng,

        distanceKm: 0,

        estimatedMins: 0,
      });

      return;
    }

    const start =
      newPoints[0];

    const end =
      newPoints[
        newPoints.length - 1
      ];

    onChange({
      points: newPoints,

      startLat: start.lat,
      startLng: start.lng,

      endLat: end.lat,
      endLng: end.lng,

      distanceKm:
        calculateDistance(
          newPoints
        ),
    });
  }

  function clearRoute() {
    setRoutingError(null);

    onChange({
      points: [],

      startLat,
      startLng,

      endLat,
      endLng,

      distanceKm: 0,

      estimatedMins: 0,
    });
  }

  const line =
    points.map(
      (point) =>
        [
          point.lat,
          point.lng,
        ] as [
          number,
          number
        ]
    );

  const automaticSupported =
    transportMode === "FOOT" ||
    transportMode === "BIKE" ||
    transportMode === "CAR" ||
    transportMode === "ATV";

  return (
    <div>
      <div className="mb-2 rounded-xl bg-brand-light p-3 text-xs text-brand-dark">
        {mode ===
        "manual" ? (
          <>
            <strong>
              Ručno crtanje:
            </strong>{" "}
            klikajte redom po
            mapi putem kojim se
            tura kreće.
          </>
        ) : (
          <>
            <strong>
              Automatski režim:
            </strong>{" "}

            {automaticSupported
              ? "kliknite početak, a zatim cilj. Ruta će automatski pratiti dostupne puteve i staze."
              : "automatsko rutiranje nije dostupno za ovaj način kretanja. Izaberite ručno crtanje."}
          </>
        )}
      </div>

      {routing && (
        <div className="mb-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          🗺️ Tražim najbolju
          rutu...
        </div>
      )}

      {routingError && (
        <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          ⚠ {routingError}
        </div>
      )}

      <div className="h-[420px] overflow-hidden rounded-2xl border border-black/10">
        <MapContainer
          center={[
            42.7,
            19.25,
          ]}
          zoom={8}
          scrollWheelZoom={
            true
          }
          className="h-full w-full"
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {!routing && (
            <MapClickHandler
              mode={mode}
              transportMode={
                transportMode
              }
              points={points}
              onChange={
                onChange
              }
              setRouting={
                setRouting
              }
              setRoutingError={
                setRoutingError
              }
            />
          )}

          <FitRoute
            points={points}
          />

          {points.length >
            0 && (
            <Marker
              position={[
                points[0].lat,
                points[0].lng,
              ]}
              icon={
                startIcon
              }
            />
          )}

          {points.length >=
            2 && (
            <Marker
              position={[
                points[
                  points.length -
                    1
                ].lat,

                points[
                  points.length -
                    1
                ].lng,
              ]}
              icon={
                endIcon
              }
            />
          )}

          {line.length >=
            2 && (
            <Polyline
              positions={
                line
              }
              pathOptions={{
                weight: 5,
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-xs text-foreground/55">
          {points.length ===
          0
            ? "Ruta još nije nacrtana."
            : points.length ===
                  1 &&
                mode ===
                  "auto"
              ? "Početak izabran · sada kliknite cilj."
              : `${points.length} GPS tačaka · ${calculateDistance(
                  points
                ).toFixed(
                  2
                )} km`}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={
              points.length ===
                0 ||
              routing
            }
            onClick={
              undoLastPoint
            }
            className="rounded-lg border border-black/10 px-3 py-2 text-xs disabled:opacity-30"
          >
            ↶ Zadnja
          </button>

          <button
            type="button"
            disabled={
              points.length ===
                0 ||
              routing
            }
            onClick={
              clearRoute
            }
            className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-500 disabled:opacity-30"
          >
            Obriši
          </button>
        </div>
      </div>
    </div>
  );
}
