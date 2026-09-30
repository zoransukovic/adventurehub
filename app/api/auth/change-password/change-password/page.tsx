
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Nove lozinke se ne podudaraju");
      return;
    }

    if (newPassword.length < 8) {
      setError("Nova lozinka mora imati najmanje 8 karaktera");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Greška pri promjeni lozinke");
        return;
      }

      setMessage("Lozinka je uspješno promijenjena.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/profile");
      }, 1500);

    } catch {
      setError("Došlo je do greške. Pokušajte ponovo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8">

      <div className="mx-auto max-w-md">

        <button
          onClick={() => router.back()}
          className="mb-6 text-sm text-foreground/60"
        >
          ← Nazad
        </button>

        <h1 className="text-xl font-medium">
          Promijeni lozinku
        </h1>

        <p className="mt-1 text-sm text-foreground/50">
          Unesite trenutnu i novu lozinku.
        </p>

        <form
          onSubmit={submit}
          className="mt-6 flex flex-col gap-4"
        >

          <input
            type="password"
            placeholder="Trenutna lozinka"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-brand"
            required
          />

          <input
            type="password"
            placeholder="Nova lozinka"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-brand"
            required
          />

          <input
            type="password"
            placeholder="Ponovite novu lozinku"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-brand"
            required
          />

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            disabled={loading}
            className="rounded-xl bg-brand py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Čuvanje..." : "Promijeni lozinku"}
          </button>

        </form>

      </div>
    </div>
  );
}
