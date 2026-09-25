"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState<string|null>(null); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password}) });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) { setError(d.error); return; }
    router.push("/dashboard"); router.refresh();
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center"><div className="text-4xl">🏔️</div><h1 className="mt-2 text-xl font-medium">AdventureHub</h1><p className="text-sm text-foreground/50">Dobrodošli nazad</p></div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div><label className="mb-1 block text-xs text-foreground/60">Email</label>
          <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vas@email.com" className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
        <div><label className="mb-1 block text-xs text-foreground/60">Lozinka</label>
          <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"/></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{loading ? "Prijavljivanje..." : "Prijavi se"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-foreground/60">Nemate nalog? <Link href="/register" className="font-medium text-brand-dark">Registrujte se</Link></p>
    </main>
  );
}
