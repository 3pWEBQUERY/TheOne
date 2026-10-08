import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };
export const dynamic = "force-dynamic";

export default async function RegisterPage(props: PageProps<"/register">) {
  if (await getCurrentUser()) redirect("/");
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";

  return (
    <AuthCard title="Konto erstellen" subtitle="Dein eigenes Tagebuch, deine Aufgaben, Notizen und Einkaufsliste.">
      <RegisterForm next={next} />
    </AuthCard>
  );
}
