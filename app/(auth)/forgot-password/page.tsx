
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Došlo je do greške.");
        return;
      }

      setMessage(
        data.message ||
          "Ako postoji nalog sa ovom email adresom, poslaćemo link za reset lozinke."
      );

      setEmail("");
    } catch {
      setError("Došlo je do greške. Pokušajte ponovo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="text-4xl">🔐</div>

        <h1 className="mt-2 text-xl font-medium">
          Zaboravljena lozinka
        </h1>

        <p className="mt-2 text-sm text-foreground/50">
          Unesite email adresu vašeg AdventureHub naloga.
          Poslaćemo vam link za postavljanje nove lozinke.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-foreground/60">
            Email
          </label>

          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vas@email.com"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>

        {message && (
          <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Slanje..." : "Pošalji link za reset"}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-brand-dark"
        >
          ← Nazad na prijavu
        </Link>
      </div>
    </main>
  );
}
