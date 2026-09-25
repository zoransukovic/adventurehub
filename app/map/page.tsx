"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import type { TourListItem, ActivityType } from "@/app/lib-client/types";

const TRANSPORT_ICONS: Record<string,string> = { FOOT:"🥾", BIKE:"🚵", CAR:"🚗", ATV:"🏍️", KAYAK:"🛶", DIVING:"🤿", OTHER:"🌿" };

export default function MapPage() {
  const [tours, setTours] = useState<TourListItem[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [filter, setFilter] = useState<string|null>(null);
  const [sel, setSel] = useState<TourListItem|null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/tours").then(r=>r.json()),
      fetch("/api/activities").then(r=>r.json()),
    ]).then(([t,a]) => { setTours(t.tours??[]); setActivities(a.activities??[]); });
  }, []);

  useEffect(() => {
    const params = filter ? `?activityTypeId=${filter}` : "";
    fetch(`/api/tours${params}`).then(r=>r.json()).then(d=>setTours(d.tours??[]));
  }, [filter]);

  const filtered = tours;

  return (
    <div className="flex h-screen flex-col pb-20">
      <Navbar />
      <div className="bg-brand px-4 pb-3 pt-4 shrink-0"><h1 className="text-lg font-medium text-white">Mapa tura</h1></div>

      <div className="flex gap-2 overflow-x-auto px-4 py-2 shrink-0">
        <button onClick={()=>setFilter(null)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${!filter?"border-brand bg-brand text-white":"border-black/10 text-foreground/70"}`}>Sve</button>
        {activities.map(a=><button key={a.id} onClick={()=>setFilter(a.id)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${filter===a.id?"border-brand bg-brand text-white":"border-black/10 text-foreground/70"}`}>{a.name}</button>)}
      </div>

      {/* Mapa placeholder - na produkciji zamijeniti sa Mapbox/Leaflet komponentom */}
      <div className="relative flex-1 bg-gradient-to-br from-green-100 to-emerald-200 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6 bg-white/80 rounded-2xl max-w-xs">
            <div className="text-4xl mb-2">🗺️</div>
            <p className="font-medium text-sm">Interaktivna mapa</p>
            <p className="text-xs text-foreground/60 mt-1">Na produkciji ovdje ide Mapbox ili Leaflet mapa sa stvarnim GPS koordinatama tura. Integriši <code className="bg-black/5 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> u .env i zamijeni ovaj blok sa MapBox komponentom.</p>
          </div>
        </div>
        {/* Simulirani markeri */}
        {filtered.slice(0,6).map((t,i)=>(
          <button key={t.id} onClick={()=>setSel(t)} style={{ position:"absolute", left:`${20+i*12}%`, top:`${25+((i*17)%45)}%`, transform:"translate(-50%,-100%)" }} className="flex flex-col items-center">
            <span className="text-2xl drop-shadow-sm">{TRANSPORT_ICONS[t.transportMode]??"📍"}</span>
            <span className="bg-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm max-w-[80px] truncate">{t.title}</span>
          </button>
        ))}
      </div>

      {/* Bottom sheet - odabrana tura */}
      {sel&&(
        <div className="shrink-0 border-t border-black/10 bg-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-xl bg-brand-light flex items-center justify-center text-2xl shrink-0">{TRANSPORT_ICONS[sel.transportMode]??"🌿"}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{sel.title}</p>
              <p className="text-xs text-foreground/55 mt-0.5">{sel.activityType.name} · {sel.guide.fullName}</p>
              <div className="flex gap-2 mt-1">
                {sel.route?.distanceKm&&<span className="text-[11px] bg-black/5 rounded-full px-2 py-0.5">{sel.route.distanceKm} km</span>}
                {sel.avgRating&&<span className="text-[11px] bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">★ {sel.avgRating.toFixed(1)}</span>}
                <span className="text-[11px] font-medium text-brand-dark">€{sel.pricePerPerson}</span>
              </div>
            </div>
            <button onClick={()=>setSel(null)} className="text-foreground/30 text-lg">✕</button>
          </div>
          <Link href={`/tours/${sel.id}`} className="mt-3 block w-full rounded-xl bg-brand py-3 text-center text-sm font-medium text-white">Pogledaj turu</Link>
        </div>
      )}
    </div>
  );
}
