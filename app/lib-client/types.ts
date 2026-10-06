export type ActivityType = {
  id: string;
  name: string;
  nameEn: string | null;
  icon: string;
};

export type TourRoutePoint = {
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

  /*
   * Administratorski prioritet
   */
  featured: boolean;
  featuredOrder: number | null;

  /*
   * Koristi se za sortiranje
   * "Najnovije".
   */
  createdAt: string;

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

    points: TourRoutePoint[];

    distanceKm: number | null;
    elevationGainM: number | null;
    estimatedMins: number | null;
  } | null;

  images: {
    id: string;
    url: string;
    position: number;
  }[];

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

  role:
    | "TOURIST"
    | "GUIDE"
    | "ADMIN";

  guideStatus:
    | string
    | null;
} | null;
