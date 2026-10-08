"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login, type AuthState } from "@/lib/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="label">E-Mail</span>
        <input type="email" name="email" className="field" autoComplete="email" inputMode="email" defaultValue={state.email} required />
      </label>
      <label className="block">
        <span className="label">Passwort</span>
        <input type="password" name="password" className="field" autoComplete="current-password" required />
      </label>
      {state.error && <p className="text-sm font-medium text-[var(--danger)]">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        <LogIn size={17} /> {pending ? "Einen Moment…" : "Anmelden"}
      </button>
      <p className="muted pt-2 text-center text-sm">
        Noch kein Konto?{" "}
        <Link href={next !== "/" ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-[var(--accent-text)]">
          Jetzt registrieren
        </Link>
      </p>
    </form>
  );
}
