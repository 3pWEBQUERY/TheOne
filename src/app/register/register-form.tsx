"use client";

import Link from "next/link";
import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { register, type AuthState } from "@/lib/actions/auth";

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="label">Name</span>
        <input name="name" className="field" autoComplete="name" defaultValue={state.name} required maxLength={80} />
      </label>
      <label className="block">
        <span className="label">E-Mail</span>
        <input type="email" name="email" className="field" autoComplete="email" inputMode="email" defaultValue={state.email} required />
      </label>
      <label className="block">
        <span className="label">Passwort</span>
        <input type="password" name="password" className="field" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="block">
        <span className="label">Passwort wiederholen</span>
        <input type="password" name="confirm" className="field" autoComplete="new-password" minLength={8} required />
      </label>
      {state.error && <p className="text-sm font-medium text-[var(--danger)]">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        <UserPlus size={17} /> {pending ? "Einen Moment…" : "Registrieren"}
      </button>
      <p className="muted pt-2 text-center text-sm">
        Schon registriert?{" "}
        <Link href="/login" className="font-semibold text-[var(--accent-text)]">
          Anmelden
        </Link>
      </p>
    </form>
  );
}
