"use client";

import { useActionState, useEffect, useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { changePassword, updateProfile, type AuthState } from "@/lib/actions/auth";
import { useToast } from "./toast";

export function ProfilePanel({ name, email }: { name: string; email: string }) {
  const toast = useToast();
  const [showPw, setShowPw] = useState(false);
  const [profile, profileAction, profilePending] = useActionState<AuthState, FormData>(updateProfile, {});
  const [pw, pwAction, pwPending] = useActionState<AuthState, FormData>(changePassword, {});

  useEffect(() => {
    if (profile.ok) toast("Profil gespeichert", "success");
    if (profile.error) toast(profile.error, "error");
  }, [profile, toast]);
  useEffect(() => {
    if (pw.ok) {
      toast("Passwort geändert", "success");
      setShowPw(false);
    }
  }, [pw, toast]);

  const initials = (name || email)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="glass mb-4 rounded-xl p-5">
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold">
        <UserRound size={17} /> Profil
      </h2>
      <div className="mb-4 flex items-center gap-3">
        <span
          className="grid h-12 w-12 flex-none place-items-center rounded-xl text-base font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="muted truncate text-sm">{email}</p>
        </div>
      </div>

      <form action={profileAction} className="flex gap-2">
        <input name="name" defaultValue={name} className="field" placeholder="Dein Name" aria-label="Name" autoComplete="name" />
        <button type="submit" className="btn btn-ghost flex-none" disabled={profilePending}>
          Speichern
        </button>
      </form>

      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        {showPw ? (
          <form action={pwAction} className="space-y-2">
            <input
              type="password"
              name="current"
              className="field"
              placeholder="Aktuelles Passwort"
              autoComplete="current-password"
              required
            />
            <input
              type="password"
              name="password"
              className="field"
              placeholder="Neues Passwort (mind. 8 Zeichen)"
              autoComplete="new-password"
              minLength={8}
              required
            />
            {pw.error && <p className="text-sm font-medium text-[var(--danger)]">{pw.error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowPw(false)}>
                Abbrechen
              </button>
              <button type="submit" className="btn btn-primary flex-1" disabled={pwPending}>
                Passwort ändern
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn btn-ghost w-full" onClick={() => setShowPw(true)}>
            <KeyRound size={16} /> Passwort ändern
          </button>
        )}
      </div>
    </section>
  );
}
