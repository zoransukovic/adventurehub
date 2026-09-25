"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { ActivityType, TourListItem } from "@/app/lib-client/types";

const TRANSPORT_ICONS: Record<string,string> = { FOOT:"🥾", BIKE:"🚵", CAR:"🚗", ATV:"🏍️", KAYAK:"🛶", DIVING:"🤿", OTHER:"🌿" };
const DIFF_LABELS: Record<string,string> = { EASY:"Lako", MODERATE:"Umjereno", HARD:"Teško" };

export default function DashboardPage() {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [tours, setTours] = useState<TourListItem[]>([]);
  const [filter, setFilter] = useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (actId: string|null, q: string) => {
    const params = new URLSearchParams();
    if (actId) params.set("activityTypeId", actId);
    if (q) params.set("search", q);
    const res = await fetch(`/api/tours?${params}`);
    const d = await res.json();
    setTours(d.tours ?? []);
  }, []);

  useEffect(() => {
    Promise.all([fetch("/api/activities").then(r=>r.json()), load(null,"")]).then(([a]) => {
      setActivities(a.activities ?? []);
      setLoading(false);
    });
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(filter, search), 300);
    return () => clearTimeout(t);
  }, [filter, search, load]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-brand px-4 pb-4 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <div><h1 className="text-lg font-medium text-white">Istraži ture</h1><p className="text-xs text-white/70">Explore adventures · Crna Gora</p></div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Pretraži ture..." className="w-full rounded-xl bg-white/20 px-4 py-2.5 text-sm text-white placeholder:text-white/60 outline-none"/>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
        <button onClick={()=>setFilter(null)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${filter===null ? "border-brand bg-brand text-white" : "border-black/10 text-foreground/70"}`}>Sve</button>
        {activities.map(a => (
          <button key={a.id} onClick={()=>setFilter(a.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${filter===a.id ? "border-brand bg-brand text-white" : "border-black/10 text-foreground/70"}`}>{a.name}</button>
        ))}
      </div>

      <div className="px-4">
        {loading && <p className="py-8 text-center text-sm text-foreground/40">Učitavanje...</p>}
        {!loading && tours.length===0 && <p className="py-8 text-center text-sm text-foreground/40">Nema tura za izabrani filter.</p>}
        <div className="flex flex-col gap-3">
          {tours.map(t => (
            <Link key={t.id} href={`/tours/${t.id}`} className="block overflow-hidden rounded-2xl border border-black/8 shadow-sm transition hover:shadow-md">
              <div className="flex h-28 items-center justify-center bg-brand-light">
                <div className="text-center"><div className="text-4xl">{TRANSPORT_ICONS[t.transportMode]??"🌿"}</div><div className="mt-1 text-xs font-medium text-brand-dark">{t.activityType.name}</div></div>
              </div>
              <div className="p-4">
                <div className="font-medium text-foreground">{t.title}</div>
                <div className="mt-0.5 text-xs text-foreground/55">Vodič: {t.guide.fullName}{t.guide.guideCertified ? " ✓" : ""}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.route?.distanceKm && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px]">{t.route.distanceKm} km</span>}
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px]">{DIFF_LABELS[t.difficulty]}</span>
                  {t.avgRating && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">★ {t.avgRating.toFixed(1)} ({t.reviewCount})</span>}
                  {t.departures[0] && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px]">{t.departures[0].spotsLeft} mjesta</span>}
                </div>
                <div className="mt-2 text-sm font-medium text-brand-dark">€{t.pricePerPerson} / osobi</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
