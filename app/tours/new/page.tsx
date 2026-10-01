"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

type Activity = {
  id: string;
  name: string;
};

type Departure = {
  startsAt: string;
  bookingDeadline: string;
  spotsLeft: number;
};

export default function NewTourPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    descriptionSr: "",
    descriptionEn: "",
    activityTypeId: "",
    pricePerPerson: 0,
    maxParticipants: 8,
    durationMinutes: 240,
    difficulty: "MODERATE" as "EASY" | "MODERATE" | "HARD",
    transportMode: "FOOT" as
      | "FOOT"
      | "BIKE"
      | "CAR"
      | "ATV"
      | "KAYAK"
      | "DIVING"
      | "OTHER",
    meetingPoint: "",
    includesItems: [] as string[],
  });

  const [route, setRoute] = useState({
    creationMode: "auto" as "auto" | "manual",
    startLabel: "",
    endLabel: "",
    startLat: 42.44,
    startLng: 18.87,
    endLat: 43.14,
    endLng: 19.01,
    points: [] as { lat: number; lng: number }[],
    distanceKm: 0,
    elevationGainM: 0,
    estimatedMins: 0,
  });

  const [departures, setDepartures] = useState<Departure[]>([]);

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => r.json())
      .then((d) => setActivities(d.activities ?? []))
      .catch(() => {
        setErrors(["Nije moguće učitati vrste aktivnosti."]);
      });
  }, []);

  const INCLUDES = [
    "Oprema",
    "Vodič",
    "Obrok",
    "Prijevoz",
    "Osiguranje",
    "Foto/video",
  ];

  const toggleInclude = (item: string) => {
    setForm((f) => ({
      ...f,
      includesItems: f.includesItems.includes(item)
        ? f.includesItems.filter((x) => x !== item)
        : [...f.includesItems, item],
    }));
  };

  const addDeparture = () => {
    setDepartures((d) => [
      ...d,
      {
        startsAt: "",
        bookingDeadline: "",
        spotsLeft: form.maxParticipants,
      },
    ]);
  };

  const removeDeparture = (index: number) => {
    setDepartures((d) => d.filter((_, i) => i !== index));
  };

  /*
   * VALIDACIJA KORAKA 1
   */
  function validateStep1() {
    const e: string[] = [];

    if (!form.title.trim()) {
      e.push("Unesite naziv ture.");
    } else if (form.title.trim().length < 3) {
      e.push("Naziv ture mora imati najmanje 3 karaktera.");
    }

    if (!form.activityTypeId) {
      e.push("Izaberite vrstu aktivnosti.");
    }

    if (form.pricePerPerson <= 0) {
      e.push("Unesite cijenu po osobi veću od 0 €.");
    }

    if (
      !Number.isInteger(form.maxParticipants) ||
      form.maxParticipants < 1
    ) {
      e.push("Maksimalan broj učesnika mora biti najmanje 1.");
    }

    if (!form.descriptionSr.trim()) {
      e.push("Unesite opis ture na srpskom.");
    } else if (form.descriptionSr.trim().length < 10) {
      e.push("Opis ture mora imati najmanje 10 karaktera.");
    }

    setErrors(e);

    return e.length === 0;
  }

  /*
   * VALIDACIJA KORAKA 2
   */
  function validateStep2() {
    const e: string[] = [];

    if (
      !Number.isFinite(route.startLat) ||
      route.startLat < -90 ||
      route.startLat > 90
    ) {
      e.push("Početna geografska širina nije ispravna.");
    }

    if (
      !Number.isFinite(route.startLng) ||
      route.startLng < -180 ||
      route.startLng > 180
