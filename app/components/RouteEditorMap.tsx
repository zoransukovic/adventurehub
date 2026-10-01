
"use client";

import { useEffect } from "react";
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

type Props = {
  mode: "auto" | "manual";
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

function calculateDistance(points: Point[]) {
  if (points.length < 2) return 0;

  const R = 6371;

  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];

    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;

    const dLat =
      ((p2.lat - p1.lat) * Math.PI) / 180;

    const dLng =
      ((p2.lng - p1.lng) * Math.PI) / 180;

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

  return Math.round(total * 100) / 100;
}

function MapClickHandler({
  mode,
  points,
  onChange,
}: {
  mode: "auto" | "manual";
  points: Point[];
  onChange: Props["onChange"];
}) {
  useMapEvents({
    click(e) {
      const point = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      };

      /*
       * AUTO:
       *
       * prvi klik = start
       * drugi klik = cilj
       *
       * Za sada spajamo dvije tačke.
       * Kasnije ćemo ovdje priključiti
       * routing servis.
       */
      if (mode === "auto") {
        let newPoints: Point[];

        if (
          points.length === 0 ||
          points.length >= 2
        ) {
          newPoints = [point];
        } else {
          newPoints = [
            points[0],
            point,
          ];
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

        return;
      }

      /*
       * MANUAL:
       *
       * svaki klik dodaje novu
       * tačku rute.
       */
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
    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
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
            ] as [number, number]
        )
      );

    map.fitBounds(bounds, {
      padding: [30, 30],
    });
  }, [map, points]);

  return null;
}

export default function RouteEditorMap({
  mode,
  points,
  startLat,
  startLng,
  endLat,
  endLng,
  onChange,
}: Props) {
  function undoLastPoint() {
    if (points.length === 0) {
      return;
    }

    const newPoints =
      points.slice(0, -1);

    if (newPoints.length === 0) {
      onChange({
        points: [],
        startLat,
        startLng,
        endLat,
        endLng,
        distanceKm: 0,
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
    onChange({
      points: [],
      startLat,
      startLng,
      endLat,
      endLng,
      distanceKm: 0,
    });
  }

  const line =
    points.map(
      (point) =>
        [
          point.lat,
          point.lng,
        ] as [number, number]
    );

  return (
    <div>
      <div className="mb-2 rounded-xl bg-brand-light p-3 text-xs text-brand-dark">
        {mode === "manual" ? (
          <>
            <strong>
              Ručno crtanje:
            </strong>{" "}
            klikajte redom po mapi
            putem kojim se tura kreće.
          </>
        ) : (
          <>
            <strong>
              Automatski režim:
            </strong>{" "}
            kliknite početak, a zatim
            cilj. Automatsko praćenje
            puteva i staza dodaćemo
            kasnije.
          </>
        )}
      </div>

      <div className="h-[420px] overflow-hidden rounded-2xl border border-black/10">
        <MapContainer
          center={[
            42.7,
            19.25,
          ]}
          zoom={8}
          scrollWheelZoom={true}
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

          <MapClickHandler
            mode={mode}
            points={points}
            onChange={onChange}
          />

          <FitRoute
            points={points}
          />

          {points.length > 0 && (
            <Marker
              position={[
                points[0].lat,
                points[0].lng,
              ]}
              icon={startIcon}
            />
          )}

          {points.length >= 2 && (
            <Marker
              position={[
                points[
                  points.length - 1
                ].lat,
                points[
                  points.length - 1
                ].lng,
              ]}
              icon={endIcon}
            />
          )}

          {line.length >= 2 && (
            <Polyline
              positions={line}
              pathOptions={{
                weight: 5,
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-xs text-foreground/55">
          {points.length === 0
            ? "Ruta još nije nacrtana."
            : `${points.length} GPS tačaka · ${calculateDistance(
                points
              ).toFixed(2)} km`}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={
              points.length === 0
            }
            onClick={undoLastPoint}
            className="rounded-lg border border-black/10 px-3 py-2 text-xs disabled:opacity-30"
          >
            ↶ Zadnja
          </button>

          <button
            type="button"
            disabled={
              points.length === 0
            }
            onClick={clearRoute}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-500 disabled:opacity-30"
          >
            Obriši
          </button>
        </div>
      </div>
    </div>
  );
}
