
"use client";

import { useEffect } from "react";
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
  TourListItem,
} from "@/app/lib-client/types";

type Props = {
  tours: TourListItem[];
  selectedTourId: string | null;
  onSelectTour: (
    tour: TourListItem
  ) => void;
};

/*
 * Leaflet marker ikonice ponekad nijesu
 * pravilno pronađene kroz Next.js bundler.
 *
 * Zato koristimo jednostavan DivIcon.
 */
const tourIcon = L.divIcon({
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
        font-size:16px;
      ">
        📍
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38],
});

/*
 * Automatski prilagođava mapu tako
 * da sve ture budu vidljive.
 */
function FitTours({
  tours,
}: {
  tours: TourListItem[];
}) {
  const map = useMap();

  useEffect(() => {
    if (tours.length === 0) return;

    if (tours.length === 1) {
      const route = tours[0].route;

      if (!route) return;

      map.setView(
        [
          route.startLat,
          route.startLng,
        ],
        13
      );

      return;
    }

    const bounds = L.latLngBounds(
      tours
        .filter(
          (tour) => tour.route
        )
        .map((tour) => [
          tour.route!.startLat,
          tour.route!.startLng,
        ])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 40],
      });
    }
  }, [map, tours]);

  return null;
}

export default function ToursMap({
  tours,
  selectedTourId,
  onSelectTour,
}: Props) {
  const selectedTour =
    tours.find(
      (tour) =>
        tour.id === selectedTourId
    ) ?? null;

  /*
   * Početni centar je Crna Gora.
   *
   * FitTours će zatim automatski
   * podesiti prikaz prema turama.
   */
  const defaultCenter:
    [number, number] = [
      42.7,
      19.25,
    ];

  const routePoints =
    selectedTour?.route?.points
      ?.filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lng)
      )
      .map(
        (point) =>
          [
            point.lat,
            point.lng,
          ] as [number, number]
      ) ?? [];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
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

      <FitTours tours={tours} />

      {tours.map((tour) => {
        if (!tour.route) return null;

        return (
          <Marker
            key={tour.id}
            position={[
              tour.route.startLat,
              tour.route.startLng,
            ]}
            icon={tourIcon}
            eventHandlers={{
              click: () =>
                onSelectTour(tour),
            }}
          >
            <Popup>
              <div
                style={{
                  minWidth: 160,
                }}
              >
                <strong>
                  {tour.title}
                </strong>

                <br />

                <span>
                  {
                    tour.activityType
                      .name
                  }
                </span>

                <br />

                <span>
                  €{tour.pricePerPerson} po
                  osobi
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {routePoints.length >= 2 && (
        <Polyline
          positions={routePoints}
          pathOptions={{
            weight: 5,
          }}
        />
      )}
    </MapContainer>
  );
}
