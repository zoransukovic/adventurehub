"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"TOURIST"|"GUIDE">("TOURIST");
  const [fullName, setFullName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [country, setCountry] = useState("Crna Gora");
  const [error, setError] = useState<string|null>(null); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    const res = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password,fullName,role,country}) });
    const d = await res.json(); setLoading(false);
    if (!res.ok) { setError(d.error); return; }
    router.push("/dashboard"); router.refresh();
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="text-xl font-medium">Kreiranje naloga</h1>
      <p className="mt-1 mb-4 text-sm text-foreground/60">Create your account</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(["TOURIST","GUIDE"] as const).map(r => (
          <button key={r} type="button" onClick={()=>setRole(r)} className={`rounded-xl border p-4 text-sm transition ${role===r ? "border-brand bg-brand-light font-medium text-brand-dark" : "border-black/10 text-foreground/70"}`}>
            {r==="TOURIST" ? "🎒 Turista" : "🗺️ Vodič"}
          </button>
        ))}
      </div>
      {role==="GUIDE" && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">Vodiči čekaju odobrenje admina prije objavljivanja tura.</p>}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div><label className="mb-1 block text-xs text-foreground/60">Ime i prezime</label><input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Marko Petrović" className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
        <div><label className="mb-1 block text-xs text-foreground/60">Email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vas@email.com" className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
        <div><label className="mb-1 block text-xs text-foreground/60">Lozinka</label><input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="min. 8 karaktera" className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
        <div><label className="mb-1 block text-xs text-foreground/60">Zemlja</label>
          <select value={country} onChange={e=>setCountry(e.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand">
            <option>Crna Gora</option><option>Srbija</option><option>Hrvatska</option><option>Bosna i Hercegovina</option><option>Ostalo</option>
          </select></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{loading ? "Kreiranje..." : "Registruj se"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-foreground/60">Već imate nalog? <Link href="/login" className="font-medium text-brand-dark">Prijavite se</Link></p>
    </main>
  );
}
