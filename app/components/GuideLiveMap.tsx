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
  Tooltip,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

type RoutePoint = {
  lat: number;
  lng: number;
};

type TrackingPoint = {
  id: string;
  lat: number;
  lng: number;
  elevation: number | null;
  speedKmh: number | null;
  recordedAt: string;
};

type LiveTrackingSession = {
  id: string;

  status: string;

  startedAt: string;
  finishedAt: string | null;

  distanceCoveredKm: number;

  currentLat: number | null;
  currentLng: number | null;

  currentSpeedKmh: number | null;
  currentElevationM: number | null;

  user: {
    id: string;
    fullName: string;
  };

  points: TrackingPoint[];
};

type Props = {
  plannedPoints: RoutePoint[];
  sessions: LiveTrackingSession[];
};

/*
 * Marker za aktivnog učesnika.
 */
const activeIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:24px;
      height:24px;
      border-radius:50%;
      background:#2563eb;
      border:4px solid white;
      box-shadow:
        0 0 0 5px rgba(37,99,235,.20),
        0 2px 8px rgba(0,0,0,.35);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -16],
});

/*
 * Marker za završenu ili
 * pauziranu tracking sesiju.
 */
const inactiveIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:22px;
      height:22px;
      border-radius:50%;
      background:#6b7280;
      border:4px solid white;
      box-shadow:
        0 0 0 4px rgba(107,114,128,.15),
        0 2px 8px rgba(0,0,0,.30);
    "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -15],
});

/*
 * SOS marker.
 */
const sosIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#dc2626;
      border:4px solid white;
      box-shadow:
        0 0 0 7px rgba(220,38,38,.25),
        0 2px 10px rgba(0,0,0,.40);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:16px;
    ">
      🆘
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -21],
});

/*
 * Automatski obuhvati planiranu
 * rutu i trenutne lokacije turista.
 *
 * Ovo se radi samo kada se promijeni
 * skup tracking sesija, a ne pri svakom
 * pomjeranju mape od strane vodiča.
 */
function FitLiveMap({
  plannedPoints,
  sessions,
}: Props) {
  const map = useMap();

  useEffect(() => {
    const coordinates: [
      number,
      number
    ][] = [];

    plannedPoints.forEach(
      (point) => {
        if (
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lng)
        ) {
          coordinates.push([
            point.lat,
            point.lng,
          ]);
        }
      }
    );

    sessions.forEach(
      (session) => {
        if (
          session.currentLat !== null &&
          session.currentLng !== null &&
          Number.isFinite(
            session.currentLat
          ) &&
          Number.isFinite(
            session.currentLng
          )
        ) {
          coordinates.push([
            session.currentLat,
            session.currentLng,
          ]);
        }
      }
    );

    if (
      coordinates.length === 0
    ) {
      return;
    }

    if (
      coordinates.length === 1
    ) {
      map.setView(
        coordinates[0],
        16
      );

      return;
    }

    const bounds =
      L.latLngBounds(
        coordinates
      );

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 16,
      });
    }
  }, [
    map,
    plannedPoints.length,
    sessions.length,
  ]);

  return null;
}

function statusText(
  status: string
) {
  if (status === "ACTIVE") {
    return "Aktivno";
  }

  if (status === "PAUSED") {
    return "Pauzirano";
  }

  if (status === "FINISHED") {
    return "Završeno";
  }

  if (status === "SOS") {
    return "SOS";
  }

  return status;
}

function formatLastLocation(
  session: LiveTrackingSession
) {
  const points =
    session.points ?? [];

  if (points.length === 0) {
    return "Nema GPS tačaka";
  }

  const lastPoint =
    points[
      points.length - 1
    ];

  if (!lastPoint.recordedAt) {
    return "Nepoznato";
  }

  const time =
    new Date(
      lastPoint.recordedAt
    ).getTime();

  if (!Number.isFinite(time)) {
    return "Nepoznato";
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (Date.now() - time) /
          1000
      )
    );

  if (seconds < 10) {
    return "upravo sada";
  }

  if (seconds < 60) {
    return `prije ${seconds} s`;
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `prije ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  return `prije ${hours} h`;
}

export default function GuideLiveMap({
  plannedPoints,
  sessions,
}: Props) {
  const validPlannedPoints =
    useMemo(
      () =>
        plannedPoints.filter(
          (point) =>
            Number.isFinite(
              point.lat
            ) &&
            Number.isFinite(
              point.lng
            )
        ),
      [plannedPoints]
    );

  const validSessions =
    useMemo(
      () =>
        sessions.filter(
          (session) =>
            session.currentLat !==
              null &&
            session.currentLng !==
              null &&
            Number.isFinite(
              session.currentLat
            ) &&
            Number.isFinite(
              session.currentLng
            )
        ),
      [sessions]
    );

  let initialCenter:
    [number, number] = [
      42.7,
      19.25,
    ];

  if (
    validPlannedPoints.length >
    0
  ) {
    initialCenter = [
      validPlannedPoints[0].lat,
      validPlannedPoints[0].lng,
    ];
  } else if (
    validSessions.length > 0
  ) {
    initialCenter = [
      validSessions[0]
        .currentLat!,
      validSessions[0]
        .currentLng!,
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

      <FitLiveMap
        plannedPoints={
          validPlannedPoints
        }
        sessions={
          validSessions
        }
      />

      {/*
       * PLANIRANA RUTA
       */}
      {validPlannedPoints.length >=
        2 && (
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
            opacity: 0.65,
            dashArray: "10 8",
          }}
        />
      )}

      {/*
       * PREĐENE PUTANJE
       * svih učesnika.
       */}
      {sessions.map(
        (session) => {
          const points =
            (
              session.points ??
              []
            )
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

          return (
            <Polyline
              key={`track-${session.id}`}
              positions={
                points
              }
              pathOptions={{
                color:
                  session.status ===
                  "SOS"
                    ? "#dc2626"
                    : session.status ===
                      "ACTIVE"
                    ? "#2563eb"
                    : "#6b7280",

                weight:
                  session.status ===
                  "SOS"
                    ? 7
                    : 5,

                opacity:
                  session.status ===
                  "FINISHED"
                    ? 0.55
                    : 0.9,
              }}
            />
          );
        }
      )}

      {/*
       * MARKERI UČESNIKA
       */}
      {validSessions.map(
        (session) => {
          const position:
            [number, number] = [
              session.currentLat!,
              session.currentLng!,
            ];

          const icon =
            session.status ===
            "SOS"
              ? sosIcon
              : session.status ===
                "ACTIVE"
              ? activeIcon
              : inactiveIcon;

          return (
            <Marker
              key={
                session.id
              }
              position={
                position
              }
              icon={icon}
              zIndexOffset={
                session.status ===
                "SOS"
                  ? 2000
                  : 1000
              }
            >
              {/*
               * Ime je stalno
               * prikazano iznad
               * markera.
               */}
              <Tooltip
                permanent
                direction="top"
                offset={[
                  0,
                  session.status ===
                  "SOS"
                    ? -20
                    : -14,
                ]}
                opacity={1}
              >
                <span
                  style={{
                    fontWeight: 600,
                    whiteSpace:
                      "nowrap",
                    color:
                      session.status ===
                      "SOS"
                        ? "#dc2626"
                        : "#111827",
                  }}
                >
                  {session.status ===
                    "SOS" &&
                    "🆘 "}
                  {
                    session.user
                      .fullName
                  }
                </span>
              </Tooltip>

              <Popup>
                <div
                  style={{
                    minWidth:
                      "190px",
                  }}
                >
                  <strong
                    style={{
                      color:
                        session.status ===
                        "SOS"
                          ? "#dc2626"
                          : undefined,
                    }}
                  >
                    {session.status ===
                      "SOS" &&
                      "🆘 "}
                    {
                      session.user
                        .fullName
                    }
                  </strong>

                  <div
                    style={{
                      marginTop:
                        "7px",
                      fontSize:
                        "12px",
                      lineHeight:
                        "1.7",
                    }}
                  >
                    <div>
                      Status:{" "}
                      <strong>
                        {statusText(
                          session.status
                        )}
                      </strong>
                    </div>

                    <div>
                      📍 Pređeno:{" "}
                      <strong>
                        {session.distanceCoveredKm.toFixed(
                          2
                        )}{" "}
                        km
                      </strong>
                    </div>

                    <div>
                      ⚡ Brzina:{" "}
                      <strong>
                        {session.currentSpeedKmh !=
                        null
                          ? `${session.currentSpeedKmh.toFixed(
                              1
                            )} km/h`
                          : "—"}
                      </strong>
                    </div>

                    <div>
                      ⛰ Visina:{" "}
                      <strong>
                        {session.currentElevationM !=
                        null
                          ? `${session.currentElevationM} m`
                          : "—"}
                      </strong>
                    </div>

                    <div>
                      🕐 Lokacija:{" "}
                      <strong>
                        {formatLastLocation(
                          session
                        )}
                      </strong>
                    </div>

                    <div>
                      GPS tačaka:{" "}
                      <strong>
                        {
                          session
                            .points
                            .length
                        }
                      </strong>
                    </div>
                  </div>

                  {session.status ===
                    "SOS" && (
                    <div
                      style={{
                        marginTop:
                          "8px",
                        padding:
                          "7px",
                        borderRadius:
                          "7px",
                        background:
                          "#fef2f2",
                        color:
                          "#dc2626",
                        fontSize:
                          "12px",
                        fontWeight:
                          600,
                      }}
                    >
                      Učesnik traži
                      pomoć!
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        }
      )}
    </MapContainer>
  );
}
