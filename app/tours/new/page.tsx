"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
type Activity = { id:string; name:string };

export default function NewTourPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title:"", descriptionSr:"", descriptionEn:"", activityTypeId:"", pricePerPerson:0,
    maxParticipants:8, durationMinutes:240, difficulty:"MODERATE" as "EASY"|"MODERATE"|"HARD",
    transportMode:"FOOT" as "FOOT"|"BIKE"|"CAR"|"ATV"|"KAYAK"|"DIVING"|"OTHER",
    meetingPoint:"", includesItems:[] as string[],
  });
  const [route, setRoute] = useState({ creationMode:"auto" as "auto"|"manual", startLabel:"", endLabel:"", startLat:42.44, startLng:18.87, endLat:43.14, endLng:19.01, points:[] as {lat:number;lng:number}[], distanceKm:0, elevationGainM:0, estimatedMins:0 });
  const [departures, setDepartures] = useState<{startsAt:string;spotsLeft:number}[]>([]);

  useEffect(() => { fetch("/api/activities").then(r=>r.json()).then(d=>setActivities(d.activities??[])); }, []);

  const INCLUDES = ["Oprema","Vodič","Obrok","Prijevoz","Osiguranje","Foto/video"];
  const toggleInclude = (i:string) => setForm(f=>({ ...f, includesItems: f.includesItems.includes(i) ? f.includesItems.filter(x=>x!==i) : [...f.includesItems,i] }));
  const addDeparture = () => setDepartures(d=>[...d,{startsAt:"",spotsLeft:form.maxParticipants}]);
  const removeDeparture = (i:number) => setDepartures(d=>d.filter((_,idx)=>idx!==i));

  async function submit() {
    setError(null); setLoading(true);
    const res = await fetch("/api/tours", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ ...form, route, departureDates:departures.filter(d=>d.startsAt) }) });
    const d = await res.json(); setLoading(false);
    if (!res.ok) { setError(d.error); return; }
    router.push(`/tours/${d.tour.id}`);
  }

  return (
    <div className="pb-24">
      <Navbar />
      <div className="sticky top-0 z-10 bg-brand px-4 pb-3 pt-4">
        <h1 className="text-lg font-medium text-white">Nova tura</h1>
        <div className="mt-2 flex gap-1">{[1,2,3].map(s=><div key={s} className={`h-1 flex-1 rounded-full ${step>=s?"bg-white":"bg-white/30"}`}/>)}</div>
        <p className="mt-1 text-xs text-white/70">{["Osnovni podaci","Ruta","Termini i objava"][step-1]}</p>
      </div>
      <div className="p-4">

        {step===1 && (
          <div className="flex flex-col gap-3">
            <div><label className="mb-1 block text-xs text-foreground/60">Naziv ture</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="npr. Planinarenje na Lovćen" className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
            <div><label className="mb-1 block text-xs text-foreground/60">Vrsta aktivnosti</label>
              <select value={form.activityTypeId} onChange={e=>setForm(f=>({...f,activityTypeId:e.target.value}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand">
                <option value="">Izaberite aktivnost</option>
                {activities.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs text-foreground/60">Način kretanja</label>
              <div className="grid grid-cols-3 gap-2">
                {([["FOOT","🥾","Pješak"],["BIKE","🚵","Bicikl"],["CAR","🚗","Auto"],["ATV","🏍️","Quad"],["KAYAK","🛶","Kajak"],["DIVING","🤿","Ronjenje"]] as const).map(([v,ic,lb])=>(
                  <button key={v} type="button" onClick={()=>setForm(f=>({...f,transportMode:v}))} className={`rounded-lg border p-2 text-center text-xs ${form.transportMode===v?"border-brand bg-brand-light text-brand-dark":"border-black/10"}`}><div className="text-xl">{ic}</div>{lb}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="mb-1 block text-xs text-foreground/60">Cijena (€/osobi)</label><input type="number" value={form.pricePerPerson||""} onChange={e=>setForm(f=>({...f,pricePerPerson:Number(e.target.value)}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
              <div><label className="mb-1 block text-xs text-foreground/60">Max učesnika</label><input type="number" value={form.maxParticipants} onChange={e=>setForm(f=>({...f,maxParticipants:Number(e.target.value)}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
            </div>
            <div><label className="mb-1 block text-xs text-foreground/60">Težina</label>
              <div className="flex gap-2">{([["EASY","🟢 Lako"],["MODERATE","🟡 Umjereno"],["HARD","🔴 Teško"]] as const).map(([v,l])=><button key={v} type="button" onClick={()=>setForm(f=>({...f,difficulty:v}))} className={`flex-1 rounded-lg border py-2 text-xs ${form.difficulty===v?"border-brand bg-brand-light text-brand-dark":"border-black/10"}`}>{l}</button>)}</div>
            </div>
            <div><label className="mb-1 block text-xs text-foreground/60">Opis (srpski)</label><textarea value={form.descriptionSr} onChange={e=>setForm(f=>({...f,descriptionSr:e.target.value}))} rows={4} className="w-full resize-none rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
            <div><label className="mb-1 block text-xs text-foreground/60">Description (English)</label><textarea value={form.descriptionEn} onChange={e=>setForm(f=>({...f,descriptionEn:e.target.value}))} rows={3} className="w-full resize-none rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
            <div><label className="mb-1 block text-xs text-foreground/60">Uključeno u cijenu</label>
              <div className="flex flex-wrap gap-1.5">{INCLUDES.map(i=><button key={i} type="button" onClick={()=>toggleInclude(i)} className={`rounded-full border px-3 py-1 text-xs ${form.includesItems.includes(i)?"border-brand bg-brand-light text-brand-dark":"border-black/10 text-foreground/60"}`}>{i}</button>)}</div>
            </div>
            <div><label className="mb-1 block text-xs text-foreground/60">Polazna tačka / Meeting point</label><input value={form.meetingPoint} onChange={e=>setForm(f=>({...f,meetingPoint:e.target.value}))} placeholder="npr. Parking Crno jezero" className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
            <button onClick={()=>setStep(2)} className="mt-2 w-full rounded-xl bg-brand py-3 text-sm font-medium text-white">Dalje: Ruta →</button>
          </div>
        )}

        {step===2 && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {(["auto","manual"] as const).map(m=>(
                <button key={m} type="button" onClick={()=>setRoute(r=>({...r,creationMode:m}))} className={`rounded-xl border p-3 text-center text-sm ${route.creationMode===m?"border-brand bg-brand-light text-brand-dark":"border-black/10"}`}>
                  <div className="text-2xl">{m==="auto"?"🗺️":"✏️"}</div>
                  <div className="mt-1 font-medium">{m==="auto"?"Automatski":"Ručno"}</div>
                  <div className="text-xs text-foreground/50">{m==="auto"?"Start + cilj":"Klik po klik"}</div>
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">Na produkciji ovdje ide interaktivna Mapbox/Leaflet mapa. Unesite koordinate ručno ili integrirajte map picker komponentu.</div>
            <div><label className="mb-1 block text-xs text-foreground/60">Naziv polazišta</label><input value={route.startLabel} onChange={e=>setRoute(r=>({...r,startLabel:e.target.value}))} placeholder="npr. Parking Crno jezero" className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
            <div><label className="mb-1 block text-xs text-foreground/60">Naziv cilja</label><input value={route.endLabel} onChange={e=>setRoute(r=>({...r,endLabel:e.target.value}))} placeholder="npr. Bobotov kuk" className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="mb-1 block text-xs text-foreground/60">Start lat</label><input type="number" step="any" value={route.startLat} onChange={e=>setRoute(r=>({...r,startLat:Number(e.target.value)}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
              <div><label className="mb-1 block text-xs text-foreground/60">Start lng</label><input type="number" step="any" value={route.startLng} onChange={e=>setRoute(r=>({...r,startLng:Number(e.target.value)}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
              <div><label className="mb-1 block text-xs text-foreground/60">Kraj lat</label><input type="number" step="any" value={route.endLat} onChange={e=>setRoute(r=>({...r,endLat:Number(e.target.value)}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
              <div><label className="mb-1 block text-xs text-foreground/60">Kraj lng</label><input type="number" step="any" value={route.endLng} onChange={e=>setRoute(r=>({...r,endLng:Number(e.target.value)}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="mb-1 block text-xs text-foreground/60">Dužina (km)</label><input type="number" step="0.1" value={route.distanceKm||""} onChange={e=>setRoute(r=>({...r,distanceKm:Number(e.target.value)}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
              <div><label className="mb-1 block text-xs text-foreground/60">Visinska raz. (m)</label><input type="number" value={route.elevationGainM||""} onChange={e=>setRoute(r=>({...r,elevationGainM:Number(e.target.value)}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
              <div><label className="mb-1 block text-xs text-foreground/60">Trajanje (min)</label><input type="number" value={route.estimatedMins||""} onChange={e=>setRoute(r=>({...r,estimatedMins:Number(e.target.value)}))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setStep(1)} className="flex-1 rounded-xl border border-black/10 py-3 text-sm text-foreground/70">← Nazad</button>
              <button onClick={()=>setStep(3)} className="flex-1 rounded-xl bg-brand py-3 text-sm font-medium text-white">Dalje: Termini →</button>
            </div>
          </div>
        )}

        {step===3 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><p className="font-medium">Termini polaska</p><button type="button" onClick={addDeparture} className="rounded-lg bg-brand px-3 py-1.5 text-xs text-white">+ Dodaj termin</button></div>
            {departures.length===0 && <p className="text-sm text-foreground/50">Nema termina. Dodajte najmanje jedan.</p>}
            {departures.map((d,i)=>(
              <div key={i} className="rounded-xl border border-black/10 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="mb-1 block text-xs text-foreground/60">Datum i vrijeme</label><input type="datetime-local" value={d.startsAt} onChange={e=>setDepartures(ds=>ds.map((x,idx)=>idx===i?{...x,startsAt:e.target.value}:x))} className="w-full rounded-lg border border-black/10 px-2 py-2 text-sm outline-none focus:border-brand"/></div>
                  <div><label className="mb-1 block text-xs text-foreground/60">Slobodna mjesta</label><input type="number" value={d.spotsLeft} onChange={e=>setDepartures(ds=>ds.map((x,idx)=>idx===i?{...x,spotsLeft:Number(e.target.value)}:x))} className="w-full rounded-lg border border-black/10 px-2 py-2 text-sm outline-none focus:border-brand"/></div>
                </div>
                <button type="button" onClick={()=>removeDeparture(i)} className="mt-2 text-xs text-red-500">Ukloni termin</button>
              </div>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={()=>setStep(2)} className="flex-1 rounded-xl border border-black/10 py-3 text-sm text-foreground/70">← Nazad</button>
              <button onClick={submit} disabled={loading} className="flex-1 rounded-xl bg-brand py-3 text-sm font-medium text-white disabled:opacity-60">{loading?"Objavljivanje...":"✓ Objavi turu"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
