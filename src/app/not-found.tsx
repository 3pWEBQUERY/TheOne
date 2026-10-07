import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="glass-strong w-full max-w-sm rounded-[36px] p-8 text-center">
        <div className="mb-3 text-5xl">🫧</div>
        <h1 className="text-2xl font-extrabold">Nicht gefunden</h1>
        <Link href="/" className="btn btn-primary mt-6 w-full">
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
