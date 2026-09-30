
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError("Reset link nije ispravan.");
      return;
    }

    if (password.length < 8) {
      setError("Nova lozinka mora imati najmanje 8 karaktera.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Lozinke se ne podudaraju.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Promjena lozinke nije uspjela.");
        return;
      }

      setSuccess(true);
      setMessage("Lozinka je uspješno promijenjena.");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Došlo je do greške. Pokušajte ponovo.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
        <div className="text-center">
          <div className="text-4xl">⚠️</div>

          <h1 className="mt-3 text-xl font-medium">
            Neispravan reset link
          </h1>

          <p className="mt-2 text-sm text-foreground/50">
            Ovaj link ne sadrži token za promjenu lozinke.
          </p>

          <Link
            href="/forgot-password"
            className="mt-6 inline-block font-medium text-brand-dark"
          >
            Zatraži novi link
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="text-4xl">🔑</div>

        <h1 className="mt-2 text-xl font-medium">
          Nova lozinka
        </h1>

        <p className="mt-2 text-sm text-foreground/50">
          Unesite novu lozinku za vaš AdventureHub nalog.
        </p>
      </div>

      {!success ? (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-foreground/60">
              Nova lozinka
            </label>

            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Najmanje 8 karaktera"
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-foreground/60">
              Ponovite novu lozinku
            </label>

            <input
              required
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ponovite novu lozinku"
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>

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
            {loading ? "Čuvanje..." : "Postavi novu lozinku"}
          </button>
        </form>
      ) : (
        <div className="text-center">
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>

          <Link
            href="/login"
            className="mt-5 block w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white"
          >
            Prijavi se novom lozinkom
          </Link>
        </div>
      )}

      {!success && (
        <div className="mt-5 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-brand-dark"
          >
            ← Nazad na prijavu
          </Link>
        </div>
      )}
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Učitavanje...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
