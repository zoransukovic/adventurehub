
"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

type Point = {
  lat: number;
  lng: number;
};

type Props = {
  points: Point[];
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

const startIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:white;
      border:3px solid #16a34a;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:16px;
    ">🟢</div>
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
      background:white;
      border:3px solid #dc2626;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:16px;
    ">🏁</div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function FitRoute({ points }: { points: Point[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }

    const bounds = L.latLngBounds(
      points.map(
        (p) => [p.lat, p.lng] as [number, number]
      )
    );

    map.fitBounds(bounds, {
      padding: [30, 30],
    });
  }, [map, points]);

  return null;
}

export default function TourRouteMap({
  points,
  startLat,
  startLng,
  endLat,
  endLng,
}: Props) {
  const validPoints = points.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng)
  );

  const validStart =
    Number.isFinite(startLat) &&
    Number.isFinite(startLng);

  const validEnd =
    Number.isFinite(endLat) &&
    Number.isFinite(endLng);

  const center: [number, number] =
    validPoints.length > 0
      ? [validPoints[0].lat, validPoints[0].lng]
      : validStart
      ? [startLat, startLng]
      : [42.7, 19.25];

  return (
    <div className="h-[380px] overflow-hidden rounded-xl">
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
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitRoute points={validPoints} />

        {validStart && (
          <Marker
            position={[startLat, startLng]}
            icon={startIcon}
          />
        )}

        {validEnd && (
          <Marker
            position={[endLat, endLng]}
            icon={endIcon}
          />
        )}

        {validPoints.length >= 2 && (
          <Polyline
            positions={validPoints.map(
              (p) =>
                [p.lat, p.lng] as [number, number]
            )}
            pathOptions={{
              weight: 5,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
