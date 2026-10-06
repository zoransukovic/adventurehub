"use client";

import {
  useEffect,
  useMemo,
} from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import type {
  TourRoutePoint,
} from "@/app/lib-client/types";

type TourRoute = {
  startLat: number;
  startLng: number;

  endLat: number;
  endLng: number;

  startLabel: string | null;
  endLabel: string | null;

  points: TourRoutePoint[];

  distanceKm: number | null;
  elevationGainM: number | null;
  estimatedMins: number | null;
};

type Props = {
  route: TourRoute;
  title: string;
};

/*
 * POČETNI MARKER
 */
const startIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:36px;
      height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:white;
      border:3px solid #15803d;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="
        transform:rotate(45deg);
        font-size:15px;
        font-weight:bold;
        color:#15803d;
      ">
        A
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38],
});

/*
 * KRAJNJI MARKER
 */
const endIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:36px;
      height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:white;
      border:3px solid #b91c1c;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="
        transform:rotate(45deg);
        font-size:15px;
        font-weight:bold;
        color:#b91c1c;
      ">
        B
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38],
});

/*
 * Automatski podešava mapu tako
 * da se kompletna ruta vidi.
 */
function FitRoute({
  points,
}: {
  points: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    /*
     * Samo jedna tačka.
     */
    if (points.length === 1) {
      map.setView(
        points[0],
        13
      );

      return;
    }

    const bounds =
      L.latLngBounds(points);

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [35, 35],
      });
    }
  }, [map, points]);

  return null;
}

export default function TourDetailMap({
  route,
  title,
}: Props) {
  /*
   * Uklanjamo eventualne
   * neispravne GPS tačke.
   */
  const routePoints =
    useMemo(() => {
      const points =
        (route.points ?? [])
          .filter(
            (point) =>
              Number.isFinite(
                point.lat
              ) &&
              Number.isFinite(
                point.lng
              )
          )
          .map(
            (point) =>
              [
                point.lat,
                point.lng,
              ] as [
                number,
                number
              ]
          );

      /*
       * Ako API nema points,
       * koristimo početak i kraj.
       */
      if (
        points.length === 0
      ) {
        const fallback: [
          number,
          number
        ][] = [];

        if (
          Number.isFinite(
            route.startLat
          ) &&
          Number.isFinite(
            route.startLng
          )
        ) {
          fallback.push([
            route.startLat,
            route.startLng,
          ]);
        }

        if (
          Number.isFinite(
            route.endLat
          ) &&
          Number.isFinite(
            route.endLng
          )
        ) {
          fallback.push([
            route.endLat,
            route.endLng,
          ]);
        }

        return fallback;
      }

      return points;
    }, [route]);

  /*
   * Centar prije nego što FitRoute
   * automatski podesi mapu.
   */
  const center: [
    number,
    number
  ] = Number.isFinite(
    route.startLat
  ) &&
  Number.isFinite(
    route.startLng
  )
    ? [
        route.startLat,
        route.startLng,
      ]
    : [42.7, 19.25];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={true}
      className="h-full w-full"
      style={{
        height: "100%",
        width: "100%",
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitRoute
        points={routePoints}
      />

      {/*
       * LINIJA RUTE
       */}
      {routePoints.length >=
        2 && (
        <Polyline
          positions={
            routePoints
          }
          pathOptions={{
            weight: 6,
            opacity: 0.9,
          }}
        />
      )}

      {/*
       * POČETAK RUTE
       */}
      {Number.isFinite(
        route.startLat
      ) &&
        Number.isFinite(
          route.startLng
        ) && (
          <Marker
            position={[
              route.startLat,
              route.startLng,
            ]}
            icon={startIcon}
          >
            <Popup>
              <div
                style={{
                  minWidth: 150,
                }}
              >
                <strong>
                  Početak ture
                </strong>

                <br />

                {route.startLabel ||
                  title}
              </div>
            </Popup>
          </Marker>
        )}

      {/*
       * KRAJ RUTE
       */}
      {Number.isFinite(
        route.endLat
      ) &&
        Number.isFinite(
          route.endLng
        ) && (
          <Marker
            position={[
              route.endLat,
              route.endLng,
            ]}
            icon={endIcon}
          >
            <Popup>
              <div
                style={{
                  minWidth: 150,
                }}
              >
                <strong>
                  Kraj ture
                </strong>

                <br />

                {route.endLabel ||
                  title}
              </div>
            </Popup>
          </Marker>
        )}
    </MapContainer>
  );
}
