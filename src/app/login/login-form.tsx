"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login, type LoginState } from "@/lib/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        className="field"
        placeholder="Passwort"
        autoComplete="current-password"
        autoFocus
        required
      />
      {state.error && <p className="text-sm font-semibold text-[var(--danger)]">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        <LogIn size={17} /> {pending ? "Einen Moment…" : "Anmelden"}
      </button>
    </form>
  );
}
