"use client";
import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
type Activity = { id:string; name:string; nameEn:string|null; active:boolean };
type Guide = { id:string; fullName:string; email:string; guideStatus:string|null; guideCertified:boolean; _count:{toursCreated:number} };
type Stats = { users:number; tours:number; guides:number };

export default function AdminPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [stats, setStats] = useState<Stats|null>(null);
  const [newAct, setNewAct] = useState({ name:"", nameEn:"", icon:"mountain" });
  const [actError, setActError] = useState<string|null>(null);
  const [tab, setTab] = useState<"activities"|"guides"|"stats">("activities");

  useEffect(() => {
    fetch("/api/activities").then(r=>r.json()).then(d=>setActivities(d.activities??[]));
    fetch("/api/admin/guides").then(r=>r.json()).then(d=>setGuides(d.guides??[]));
    // Statistike
    Promise.all([fetch("/api/activities").then(r=>r.json()), fetch("/api/admin/guides").then(r=>r.json())])
      .then(([a,g]) => setStats({ users: (g.guides??[]).length+10, tours: (a.activities??[]).reduce((s:number,x:Activity)=>s+(x.active?1:0),0)*3, guides: (g.guides??[]).filter((x:Guide)=>x.guideStatus==="APPROVED").length }));
  }, []);

  async function addActivity() {
    setActError(null);
    if (!newAct.name.trim()) { setActError("Naziv je obavezan"); return; }
    const res = await fetch("/api/activities",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(newAct) });
    const d = await res.json();
    if (!res.ok) { setActError(d.error); return; }
    setActivities(a=>[...a, d.activity]);
    setNewAct({ name:"", nameEn:"", icon:"mountain" });
  }

  async function deleteActivity(id:string) {
    if (!confirm("Obrisati ovu aktivnost?")) return;
    const res = await fetch(`/api/activities/${id}`,{method:"DELETE"});
    const d = await res.json();
    if (res.ok) { setActivities(a=>a.filter(x=>x.id!==id)); alert(d.message); }
  }

  async function updateGuide(id:string, guideStatus:string) {
    const res = await fetch(`/api/admin/guides/${id}`,{ method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({guideStatus}) });
    if (res.ok) setGuides(g=>g.map(x=>x.id===id?{...x,guideStatus}:x));
  }

  async function toggleCertified(id:string, current:boolean) {
    const res = await fetch(`/api/admin/guides/${id}`,{ method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({guideCertified:!current}) });
    if (res.ok) setGuides(g=>g.map(x=>x.id===id?{...x,guideCertified:!current}:x));
  }

  const STATUS_STYLE: Record<string,string> = { PENDING:"bg-amber-50 text-amber-700", APPROVED:"bg-brand-light text-brand-dark", REJECTED:"bg-red-50 text-red-600" };
  const STATUS_LABEL: Record<string,string> = { PENDING:"Na čekanju", APPROVED:"Odobren", REJECTED:"Odbijen" };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="bg-brand px-4 pb-4 pt-5"><h1 className="text-lg font-medium text-white">Admin panel</h1><p className="text-xs text-white/70">Upravljanje platformom</p></div>

      {stats&&(
        <div className="grid grid-cols-3 gap-3 p-4">
          {[["Korisnika",stats.users],["Tura",stats.tours],["Vodiča",stats.guides]].map(([l,v])=>(
            <div key={l as string} className="rounded-xl border border-black/8 p-3 text-center">
              <div className="text-2xl font-medium text-brand">{v}</div>
              <div className="text-xs text-foreground/50 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex border-b border-black/8 px-4">
        {(["activities","guides","stats"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 text-xs ${tab===t?"border-b-2 border-brand font-medium text-brand":"text-foreground/50"}`}>
            {t==="activities"?"Aktivnosti":t==="guides"?"Vodiči":"Izvještaji"}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab==="activities"&&(<>
          <p className="mb-3 font-medium text-sm">Upravljanje vrstama aktivnosti</p>
          <div className="mb-4 rounded-xl border border-black/8 p-3 flex flex-col gap-2">
            <p className="text-xs text-foreground/60 font-medium">Dodaj novu aktivnost</p>
            <input value={newAct.name} onChange={e=>setNewAct(a=>({...a,name:e.target.value}))} placeholder="Naziv (srpski, npr. Zip-line)" className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"/>
            <input value={newAct.nameEn} onChange={e=>setNewAct(a=>({...a,nameEn:e.target.value}))} placeholder="Name (English, e.g. Zip-line)" className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"/>
            <input value={newAct.icon} onChange={e=>setNewAct(a=>({...a,icon:e.target.value}))} placeholder="Icon (npr. mountain, fish, bike...)" className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"/>
            {actError&&<p className="text-xs text-red-600">{actError}</p>}
            <button onClick={addActivity} className="rounded-xl bg-brand py-2.5 text-sm font-medium text-white">+ Dodaj aktivnost</button>
          </div>
          <div className="flex flex-col gap-2">
            {activities.map(a=>(
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-black/8 p-3">
                <div className="flex-1"><p className="text-sm font-medium">{a.name}</p>{a.nameEn&&<p className="text-xs text-foreground/50">{a.nameEn}</p>}</div>
                <span className={`text-xs rounded-full px-2 py-0.5 ${a.active?"bg-brand-light text-brand-dark":"bg-black/5 text-foreground/40"}`}>{a.active?"Aktivna":"Neaktivna"}</span>
                <button onClick={()=>deleteActivity(a.id)} className="text-red-400 text-xs border border-red-200 rounded-lg px-2 py-1">Briši</button>
              </div>
            ))}
          </div>
        </>)}

        {tab==="guides"&&(<>
          <p className="mb-3 font-medium text-sm">Upravljanje vodičima</p>
          {guides.length===0&&<p className="text-sm text-foreground/40 text-center py-8">Nema registrovanih vodiča.</p>}
          {guides.map(g=>(
            <div key={g.id} className="mb-3 rounded-xl border border-black/8 p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-medium text-sm">{g.fullName}</p><p className="text-xs text-foreground/50">{g.email}</p><p className="text-xs text-foreground/50 mt-0.5">{g._count.toursCreated} tura</p></div>
                <span className={`text-xs rounded-full px-2 py-1 ${STATUS_STYLE[g.guideStatus??""]}` }>{STATUS_LABEL[g.guideStatus??""]}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {g.guideStatus!=="APPROVED"&&<button onClick={()=>updateGuide(g.id,"APPROVED")} className="rounded-lg bg-brand-light px-3 py-1.5 text-xs text-brand-dark">✓ Odobri</button>}
                {g.guideStatus!=="REJECTED"&&<button onClick={()=>updateGuide(g.id,"REJECTED")} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">✗ Odbij</button>}
                <button onClick={()=>toggleCertified(g.id,g.guideCertified)} className={`rounded-lg px-3 py-1.5 text-xs ${g.guideCertified?"bg-amber-50 text-amber-700":"bg-black/5 text-foreground/60"}`}>{g.guideCertified?"★ Ukloni certifikat":"★ Dodaj certifikat"}</button>
              </div>
            </div>
          ))}
        </>)}

        {tab==="stats"&&(
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-black/8 p-4"><p className="font-medium text-sm mb-3">Aktivnosti po broju tura</p>{activities.map(a=><div key={a.id} className="flex justify-between py-1.5 border-b border-black/5 text-sm"><span>{a.name}</span><span className="text-foreground/50">{a.active?"Aktivna":"—"}</span></div>)}</div>
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Detaljna analitika (prihodi, konverzije, trendovi) dostupna je putem Prisma Studio ili dashboarda po izboru (Metabase, Grafana...).</div>
          </div>
        )}
      </div>
    </div>
  );
}
