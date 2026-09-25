"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Session = { id:string; status:string; distanceCoveredKm:number; currentLat:number|null; currentLng:number|null; currentSpeedKmh:number|null; currentElevationM:number|null };
type TourRoute = { distanceKm:number|null; elevationGainM:number|null; estimatedMins:number|null };

export default function TrackingPage() {
  const { id } = useParams<{id:string}>();
  const router = useRouter();
  const [session, setSession] = useState<Session|null>(null);
  const [route, setRoute] = useState<TourRoute|null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const watchRef = useRef<number|null>(null);

  useEffect(() => {
    fetch(`/api/tracking/${id}`).then(r=>r.json()).then(d => {
      setSession(d.session);
      if (d.session?.departure?.tour?.route) setRoute(d.session.departure.tour.route);
    });
    elapsedRef.current = setInterval(() => setElapsed(e => e+1), 1000);
    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(pos => {
        fetch(`/api/tracking/${id}/ping`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ lat:pos.coords.latitude, lng:pos.coords.longitude, elevation:pos.coords.altitude??undefined, speedKmh:pos.coords.speed != null ? pos.coords.speed*3.6 : undefined }) }).then(r=>r.json()).then(d=>setSession(d.session));
      }, null, { enableHighAccuracy:true, maximumAge:5000, timeout:10000 });
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [id]);

  async function finish(sos=false) {
    await fetch(`/api/tracking/${id}/finish`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({sos}) });
    setDone(true);
    if (sos) alert("SOS signal poslan vodiču!");
    else router.push("/dashboard");
  }

  const fmt = (s:number) => `${Math.floor(s/3600)}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const progress = session && route?.distanceKm ? Math.min(100, (session.distanceCoveredKm/route.distanceKm)*100) : 0;
  const remaining = session && route?.distanceKm ? Math.max(0, route.distanceKm - session.distanceCoveredKm) : null;
  const eta = session?.currentSpeedKmh && remaining ? Math.round((remaining/session.currentSpeedKmh)*60) : null;

  if (done) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"><div className="text-6xl">✅</div><h2 className="text-xl font-medium">Tura završena!</h2><p className="text-sm text-foreground/60">Pređeno: {session?.distanceCoveredKm.toFixed(2)} km</p><Link href="/dashboard" className="rounded-xl bg-brand px-6 py-3 text-sm font-medium text-white">Nazad na početnu</Link></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand px-4 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium text-white">Live Tracking</h1>
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 animate-pulse rounded-full bg-green-300"/><span className="text-xs text-white/80">GPS aktivan</span></div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="relative flex h-52 items-center justify-center bg-gradient-to-br from-brand-light to-emerald-100">
            <div className="text-center">
              <div className="text-5xl">🗺️</div>
              <p className="mt-2 text-xs text-brand-dark">GPS ruta se prikazuje ovde</p>
              {session?.currentLat && <p className="text-xs text-brand-dark/70">{session.currentLat.toFixed(5)}, {session.currentLng?.toFixed(5)}</p>}
            </div>
            <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/90 px-3 py-2">
              <div className="mb-1 flex justify-between text-xs text-foreground/60"><span>Napredak</span><span>{progress.toFixed(0)}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-brand transition-all" style={{width:`${progress}%`}}/></div>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {[
            ["📍 Pređeno", `${session?.distanceCoveredKm.toFixed(2)??0} km`],
            ["🏁 Ostalo", remaining!=null ? `${remaining.toFixed(2)} km` : "—"],
            ["⏱ Trajanje", fmt(elapsed)],
            ["⚡ Brzina", session?.currentSpeedKmh ? `${session.currentSpeedKmh.toFixed(1)} km/h` : "—"],
            ["⛰ Visina", session?.currentElevationM ? `${session.currentElevationM} m` : "—"],
            ["⏰ Procj. dolazak", eta ? `za ${eta} min` : "—"],
          ].map(([l,v]) => (
            <div key={l as string} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="text-xs text-foreground/50">{l}</div>
              <div className="mt-0.5 text-lg font-medium text-foreground">{v}</div>
            </div>
          ))}
        </div>

        {!navigator.geolocation && <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">GPS nije dostupan u ovom browseru. Na mobilnom uređaju će raditi.</div>}

        <button onClick={()=>finish(false)} className="w-full rounded-xl bg-brand py-3 text-sm font-medium text-white">✓ Završi turu</button>
        <button onClick={()=>{ if(confirm("Poslati SOS signal vodiču?")) finish(true); }} className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-600">🆘 SOS — Trebam pomoć</button>
      </div>
    </div>
  );
}
