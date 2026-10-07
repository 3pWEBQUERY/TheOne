# TheOne – Dein All-in-One

Eine installierbare **PWA im Liquid-Glass-Design**, optimiert fürs Handy:

| Modul | Funktionen |
| --- | --- |
| 📔 **Tagebuch** | Einträge mit Stimmung (5 Emojis), Datum, Fotos, Stimmungs-Verlauf (14 Tage), „An diesem Tag“-Erinnerungen, Suche |
| ✅ **Aufgaben** | Schnelleingabe mit natürlicher Sprache („Sport morgen 18 Uhr !“), Prioritäten, Fälligkeit, Push-Erinnerungen, Schlummern, Wiederholungen (täglich/werktags/wöchentlich/monatlich), Fotos, Tagesfortschritt, Streak 🔥, Konfetti, Zitat des Tages |
| 🗒️ **Notizen** | Farbige Glas-Karten, Anheften, Fotos, Suche, **Notiz → Aufgaben** und **Notiz → Einkaufsliste** (jede Zeile wird ein Eintrag) |
| 🛒 **Einkauf** | Mehrere Artikel auf einmal („2x Milch, Brot, 500 g Hack“), Mengen-Erkennung, automatische Kategorien, Vorschläge aus dem Kaufverlauf, Autovervollständigung, Fotos (z.B. richtige Marke), „Einkauf abschließen“ |

Alles arbeitet zusammen: Dashboard mit Tagesübersicht, globale Suche über alle Module,
Badges in der Tab-Bar, Push-Benachrichtigungen (Aufgaben-Erinnerungen, Morgen-Motivation, Tagebuch-Impuls am Abend).

## Tech-Stack

- **Next.js 16** (App Router, Server Actions, Turbopack, `proxy.ts`) + React 19 + Tailwind CSS 4
- **Railway Postgres** via Drizzle ORM (Migrationen laufen automatisch beim Start)
- **Railway Bucket** (S3-kompatibel) für Bilder – Upload wird serverseitig mit `sharp` gedreht, verkleinert (max. 2048 px) und als WebP + Thumbnail gespeichert; Auslieferung nur für angemeldete Nutzer über `/api/images/…`
- **PWA**: Manifest, Service Worker (Offline-Seite, Cache für Seiten/Assets/Bilder), Web Push (VAPID), iOS-Homescreen-Support
- Hintergrund-Scheduler (`src/instrumentation.ts`) prüft jede Minute fällige Erinnerungen

## Deployment auf Railway

Das Projekt **TheOne** besteht aus drei Ressourcen:

1. **Postgres** (Template)
2. **Bucket** `theone-images`
3. **App-Service** aus diesem GitHub-Repo (`railway.json` konfiguriert Build, Start & Healthcheck)

Variablen des App-Service:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
S3_ENDPOINT=${{theone-images.ENDPOINT}}
S3_BUCKET=${{theone-images.BUCKET}}
S3_ACCESS_KEY_ID=${{theone-images.ACCESS_KEY_ID}}
S3_SECRET_ACCESS_KEY=${{theone-images.SECRET_ACCESS_KEY}}
S3_REGION=${{theone-images.REGION}}
APP_PASSWORD=…        # dein Login-Passwort
AUTH_SECRET=…         # zufälliger String (≥ 32 Zeichen)
VAPID_PUBLIC_KEY=…    # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=…
VAPID_SUBJECT=mailto:…
TZ=Europe/Berlin
```

## Lokal entwickeln

```bash
cp .env.example .env.local   # Werte eintragen
npm install
npm run migrate
npm run dev
```

Schema ändern: `src/db/schema.ts` anpassen → `npm run db:generate` → Migration wird beim nächsten Start angewendet.

## Auf dem Handy installieren

- **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“. Danach in der App unter *Einstellungen* die Benachrichtigungen aktivieren.
- **Android (Chrome):** Menü → „App installieren“ (oder in den Einstellungen der App auf „Jetzt installieren“).
