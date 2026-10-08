import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };
export const dynamic = "force-dynamic";

export default async function LoginPage(props: PageProps<"/login">) {
  if (await isAuthenticated()) redirect("/");
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";

  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="glass animate-pop w-full max-w-sm rounded-2xl p-7 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="mx-auto mb-4 h-14 w-14 rounded-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">TheOne</h1>
        <p className="muted mt-1 mb-6 text-sm">Tagebuch · Aufgaben · Notizen · Einkauf</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
