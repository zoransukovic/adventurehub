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
    const toursWithRoute = tours.filter(
      (tour) =>
        tour.route &&
        Number.isFinite(tour.route.startLat) &&
        Number.isFinite(tour.route.startLng)
    );

    if (toursWithRoute.length === 0) {
      return;
    }

    /*
     * Ako postoji samo jedna tura,
     * centriramo mapu na početak njene rute.
     */
    if (toursWithRoute.length === 1) {
      const route =
        toursWithRoute[0].route;

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

    /*
     * Ako postoji više tura,
     * mapa obuhvata njihove početne tačke.
     */
    const bounds = L.latLngBounds(
      toursWithRoute.map((tour) => [
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
  /*
   * Početni centar je Crna Gora.
   *
   * FitTours će nakon učitavanja
   * automatski podesiti prikaz prema turama.
   */
  const defaultCenter:
    [number, number] = [
      42.7,
      19.25,
    ];

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

      {/*
       * Crtamo rutu ZA SVAKU turu
       * koja ima najmanje dvije validne tačke.
       *
       * Izabrana tura ima deblju liniju.
       */}
      {tours.map((tour) => {
        if (!tour.route?.points) {
          return null;
        }

        const points =
          tour.route.points
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

        if (points.length < 2) {
          return null;
        }

        const isSelected =
          tour.id === selectedTourId;

        return (
          <Polyline
            key={`route-${tour.id}`}
            positions={points}
            pathOptions={{
              weight: isSelected
                ? 7
                : 4,
              opacity: isSelected
                ? 1
                : 0.65,
            }}
            eventHandlers={{
              click: () =>
                onSelectTour(tour),
            }}
          />
        );
      })}

      {/*
       * Marker početne tačke svake ture.
       */}
      {tours.map((tour) => {
        if (!tour.route) {
          return null;
        }

        if (
          !Number.isFinite(
            tour.route.startLat
          ) ||
          !Number.isFinite(
            tour.route.startLng
          )
        ) {
          return null;
        }

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
                  €
                  {tour.pricePerPerson}{" "}
                  po osobi
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
