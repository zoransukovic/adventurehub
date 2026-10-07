"use client";

import { useEffect, useRef, useState } from "react";
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
  speedKmh: number | null;
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
 * Plava tačka trenutne lokacije.
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
  popupAnchor: [0, -15],
});

/*
 * Automatski prikaz svih tura.
 */
function FitTours({
  tours,
}: {
  tours: TourListItem[];
}) {
  const map = useMap();

  useEffect(() => {
    const validTours = tours.filter(
      (tour) =>
        tour.route &&
        Number.isFinite(
          tour.route.startLat
        ) &&
        Number.isFinite(
          tour.route.startLng
        )
    );

    if (validTours.length === 0) {
      return;
    }

    if (validTours.length === 1) {
      const route =
        validTours[0].route;

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
        validTours.map(
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
 * GPS kontrola.
 *
 * Prvi klik:
 * - uključuje live praćenje
 * - centrira mapu
 *
 * Dok je praćenje uključeno:
 * - lokacija se osvježava
 * - mapa prati korisnika
 *
 * Drugi klik:
 * - isključuje praćenje
 */
function LocationControl({
  onLocation,
}: {
  onLocation: (
    location: UserLocation
  ) => void;
}) {
  const map = useMap();

  const watchId =
    useRef<number | null>(null);

  const [tracking, setTracking] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Zaustavljanje GPS praćenja
   * kada se komponenta ukloni.
   */
  useEffect(() => {
    return () => {
      if (
        watchId.current !== null
      ) {
        navigator.geolocation.clearWatch(
          watchId.current
        );
      }
    };
  }, []);

  function stopTracking() {
    if (
      watchId.current !== null
    ) {
      navigator.geolocation.clearWatch(
        watchId.current
      );

      watchId.current = null;
    }

    setTracking(false);
    setLocating(false);
  }

  function startTracking() {
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

    watchId.current =
      navigator.geolocation.watchPosition(
        (position) => {
          const speed =
            position.coords.speed;

          const location: UserLocation =
            {
              lat:
                position.coords
                  .latitude,

              lng:
                position.coords
                  .longitude,

              accuracy:
                position.coords
                  .accuracy,

              speedKmh:
                speed !== null
                  ? speed * 3.6
                  : null,
            };

          onLocation(location);

          /*
           * Dok je GPS aktivan,
           * mapa prati korisnika.
           */
          map.setView(
            [
              location.lat,
              location.lng,
            ],
            Math.max(
              map.getZoom(),
              16
            ),
            {
              animate: true,
            }
          );

          setLocating(false);
          setTracking(true);
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
              "Određivanje lokacije traje predugo."
            );
          } else {
            setError(
              "Nije moguće odrediti lokaciju."
            );
          }

          stopTracking();
        },

        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000,
        }
      );
  }

  function toggleTracking() {
    if (tracking) {
      stopTracking();
    } else {
      startTracking();
    }
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
          onClick={toggleTracking}
          title={
            tracking
              ? "Isključi praćenje"
              : "Moja lokacija"
          }
          aria-label={
            tracking
              ? "Isključi praćenje"
              : "Moja lokacija"
          }
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: tracking
              ? "2px solid #2563eb"
              : "1px solid rgba(0,0,0,.15)",
            background: tracking
              ? "#eff6ff"
              : "white",
            boxShadow:
              "0 2px 8px rgba(0,0,0,.25)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            cursor: "pointer",
            fontSize: "24px",
            color: "#2563eb",
          }}
        >
          {locating
            ? "…"
            : tracking
            ? "●"
            : "➤"}
        </button>

        {tracking && (
          <div
            style={{
              marginTop: "5px",
              padding: "3px 6px",
              borderRadius: "6px",
              background:
                "rgba(255,255,255,.95)",
              boxShadow:
                "0 1px 5px rgba(0,0,0,.15)",
              fontSize: "9px",
              fontWeight: 600,
              textAlign: "center",
              color: "#2563eb",
              whiteSpace: "nowrap",
            }}
          >
            GPS AKTIVAN
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "90px",
            transform:
              "translateX(-50%)",
            zIndex: 1000,
            width: "max-content",
            maxWidth:
              "calc(100% - 32px)",
            padding: "9px 12px",
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
  const [
    userLocation,
    setUserLocation,
  ] =
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

      <LocationControl
        onLocation={
          setUserLocation
        }
      />

      {/*
       * GPS preciznost.
       *
       * Providni krug pokazuje približno
       * područje u kojem se korisnik nalazi.
       */}
      {userLocation && (
        <Circle
          center={[
            userLocation.lat,
            userLocation.lng,
          ]}
          radius={
            userLocation.accuracy
          }
          pathOptions={{
            color: "#2563eb",
            fillColor:
              "#2563eb",
            fillOpacity: 0.08,
            weight: 1,
          }}
        />
      )}

      {/*
       * Trenutna lokacija.
       */}
      {userLocation && (
        <Marker
          position={[
            userLocation.lat,
            userLocation.lng,
          ]}
          icon={
            userLocationIcon
          }
          zIndexOffset={1000}
        >
          <Popup>
            <div
              style={{
                minWidth: "140px",
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
                Preciznost: ±
                {Math.round(
                  userLocation.accuracy
                )}{" "}
                m
              </span>

              {userLocation.speedKmh !==
                null && (
                <>
                  <br />

                  <span
                    style={{
                      fontSize:
                        "11px",
                      color:
                        "#666",
                    }}
                  >
                    Brzina:{" "}
                    {userLocation.speedKmh.toFixed(
                      1
                    )}{" "}
                    km/h
                  </span>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      )}

      {/*
       * Rute tura.
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
       * Markeri početnih tačaka tura.
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
