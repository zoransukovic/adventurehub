"use client";

import { useEffect, useState } from "react";
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

type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

/*
 * Marker ture.
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
 * Marker trenutne lokacije korisnika.
 */
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
  popupAnchor: [0, -14],
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
        Number.isFinite(
          tour.route.startLat
        ) &&
        Number.isFinite(
          tour.route.startLng
        )
    );

    if (
      toursWithRoute.length === 0
    ) {
      return;
    }

    if (
      toursWithRoute.length === 1
    ) {
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

    const bounds =
      L.latLngBounds(
        toursWithRoute.map(
          (tour) => [
            tour.route!.startLat,
            tour.route!.startLng,
          ]
        )
      );

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 40],
      });
    }
  }, [map, tours]);

  return null;
}

/*
 * Dugme za trenutnu lokaciju.
 *
 * Mora biti unutar MapContainer-a
 * da bismo mogli koristiti useMap().
 */
function LocationControl({
  onLocation,
}: {
  onLocation: (
    location: UserLocation
  ) => void;
}) {
  const map = useMap();

  const [locating, setLocating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  function locateMe() {
    setError(null);

    if (
      !navigator.geolocation
    ) {
      setError(
        "Ovaj uređaj ne podržava određivanje lokacije."
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat:
            position.coords.latitude,
          lng:
            position.coords.longitude,
          accuracy:
            position.coords.accuracy,
        };

        onLocation(location);

        /*
         * Centriramo mapu na korisnika.
         */
        map.flyTo(
          [
            location.lat,
            location.lng,
          ],
          16,
          {
            animate: true,
            duration: 1,
          }
        );

        setLocating(false);
      },

      (geoError) => {
        console.error(
          "Geolocation error:",
          geoError
        );

        if (
          geoError.code === 1
        ) {
          setError(
            "Pristup lokaciji nije dozvoljen."
          );
        } else if (
          geoError.code === 2
        ) {
          setError(
            "Trenutna lokacija nije dostupna."
          );
        } else if (
          geoError.code === 3
        ) {
          setError(
            "Određivanje lokacije traje predugo. Pokušajte ponovo."
          );
        } else {
          setError(
            "Nije moguće odrediti lokaciju."
          );
        }

        setLocating(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          right: "12px",
          bottom: "24px",
          zIndex: 1000,
        }}
      >
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          title="Moja lokacija"
          aria-label="Moja lokacija"
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            border:
              "1px solid rgba(0,0,0,.15)",
            background: "white",
            boxShadow:
              "0 2px 8px rgba(0,0,0,.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: locating
              ? "wait"
              : "pointer",
            fontSize: "23px",
            color: "#2563eb",
          }}
        >
          {locating ? "…" : "➤"}
        </button>
      </div>

      {error && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "80px",
            transform:
              "translateX(-50%)",
            zIndex: 1000,
            width: "max-content",
            maxWidth:
              "calc(100% - 32px)",
            padding: "8px 12px",
            borderRadius: "10px",
            background:
              "rgba(255,255,255,.97)",
            boxShadow:
              "0 2px 10px rgba(0,0,0,.2)",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
    </>
  );
}

export default function ToursMap({
  tours,
  selectedTourId,
  onSelectTour,
}: Props) {
  const [userLocation, setUserLocation] =
    useState<UserLocation | null>(
      null
    );

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
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitTours tours={tours} />

      {/*
       * Dugme "Moja lokacija".
       */}
      <LocationControl
        onLocation={
          setUserLocation
        }
      />

      {/*
       * Trenutna lokacija korisnika.
       */}
      {userLocation && (
        <Marker
          position={[
            userLocation.lat,
            userLocation.lng,
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

              <br />

              <span
                style={{
                  fontSize: "11px",
                  color: "#666",
                }}
              >
                Preciznost približno{" "}
                {Math.round(
                  userLocation.accuracy
                )}{" "}
                m
              </span>
            </div>
          </Popup>
        </Marker>
      )}

      {/*
       * Rute svih tura.
       */}
      {tours.map((tour) => {
        if (
          !tour.route?.points
        ) {
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

        if (
          points.length < 2
        ) {
          return null;
        }

        const isSelected =
          tour.id ===
          selectedTourId;

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
       * Početne tačke tura.
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
                  {
                    tour.pricePerPerson
                  }{" "}
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
