export type ActivityType = {
  id: string;
  name: string;
  nameEn: string | null;
  icon: string;
};

export type RoutePoint = {
  lat: number;
  lng: number;
  elevation?: number;
};

export type TourListItem = {
  id: string;
  title: string;
  pricePerPerson: number;
  maxParticipants: number;

  difficulty: string;
  transportMode: string;

  activityType: ActivityType;

  guide: {
    id: string;
    fullName: string;
    guideCertified: boolean;
  };

  route: {
    startLat: number;
    startLng: number;

    endLat: number;
    endLng: number;

    startLabel: string | null;
    endLabel: string | null;

    points: RoutePoint[];

    distanceKm: number | null;
    elevationGainM: number | null;
    estimatedMins: number | null;
  } | null;

  avgRating: number | null;
  reviewCount: number;

  departures: {
    id: string;
    startsAt: string;
    spotsLeft: number;
  }[];
};

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: "TOURIST" | "GUIDE" | "ADMIN";
  guideStatus: string | null;
} | null;
