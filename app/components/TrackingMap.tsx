
"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = {
  lat: number;
  lng: number;
};

type Props = {
  plannedPoints: Point[];
  traveledPoints: Point[];

  currentLat: number | null;
  currentLng: number | null;

  accuracy?: number | null;
};

const userLocationIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:22px;
      height:22px;
      border-radius:50%;
      background:#2563eb;
      border:4px solid white;
      box-shadow:
        0 0 0 5px rgba(37,99,235,.20),
        0 2px 8px rgba(0,0,0,.35);
    "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -15],
});

function FollowUser({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (
      lat === null ||
      lng === null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    map.setView(
      [lat, lng],
      Math.max(map.getZoom(), 16),
      {
        animate: true,
      }
    );
  }, [lat, lng, map]);

  return null;
}

function FitInitialRoute({
  plannedPoints,
  currentLat,
  currentLng,
}: {
  plannedPoints: Point[];
  currentLat: number | null;
  currentLng: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (plannedPoints.length >= 2) {
      const bounds = L.latLngBounds(
        plannedPoints.map(
          (point) =>
            [point.lat, point.lng] as [
              number,
              number
            ]
        )
      );

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [25, 25],
        });
      }

      return;
    }

    if (
      currentLat !== null &&
      currentLng !== null
    ) {
      map.setView(
        [currentLat, currentLng],
        16
      );
    }
  }, []);

  return null;
}

export default function TrackingMap({
  plannedPoints,
  traveledPoints,
  currentLat,
  currentLng,
  accuracy,
}: Props) {
  const validPlannedPoints =
    plannedPoints.filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng)
    );

  const validTraveledPoints =
    traveledPoints.filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng)
    );

  const hasCurrentLocation =
    currentLat !== null &&
    currentLng !== null &&
    Number.isFinite(currentLat) &&
    Number.isFinite(currentLng);

  let initialCenter: [number, number] = [
    42.7,
    19.25,
  ];

  if (hasCurrentLocation) {
    initialCenter = [
      currentLat,
      currentLng,
    ];
  } else if (
    validPlannedPoints.length > 0
  ) {
    initialCenter = [
      validPlannedPoints[0].lat,
      validPlannedPoints[0].lng,
    ];
  }

  return (
    <MapContainer
      center={initialCenter}
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

      <FitInitialRoute
        plannedPoints={
          validPlannedPoints
        }
        currentLat={currentLat}
        currentLng={currentLng}
      />

      <FollowUser
        lat={currentLat}
        lng={currentLng}
      />

      {validPlannedPoints.length >= 2 && (
        <Polyline
          positions={validPlannedPoints.map(
            (point) => [
              point.lat,
              point.lng,
            ]
          )}
          pathOptions={{
            color: "#16a34a",
            weight: 5,
            opacity: 0.7,
            dashArray: "10 8",
          }}
        />
      )}

      {validTraveledPoints.length >= 2 && (
        <Polyline
          positions={validTraveledPoints.map(
            (point) => [
              point.lat,
              point.lng,
            ]
          )}
          pathOptions={{
            color: "#2563eb",
            weight: 6,
            opacity: 1,
          }}
        />
      )}

      {hasCurrentLocation &&
        accuracy &&
        accuracy > 0 && (
          <Circle
            center={[
              currentLat,
              currentLng,
            ]}
            radius={accuracy}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.08,
              weight: 1,
            }}
          />
        )}

      {hasCurrentLocation && (
        <Marker
          position={[
            currentLat,
            currentLng,
          ]}
          icon={userLocationIcon}
          zIndexOffset={1000}
        >
          <Popup>
            <div
              style={{
                textAlign: "center",
              }}
            >
              <strong>
                Moja lokacija
              </strong>

              {accuracy &&
                accuracy > 0 && (
                  <>
                    <br />

                    <span
                      style={{
                        fontSize: "11px",
                        color: "#666",
                      }}
                    >
                      Preciznost: ±
                      {Math.round(
                        accuracy
                      )}{" "}
                      m
                    </span>
                  </>
                )}
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
