"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Download, LogOut, Send, Share } from "lucide-react";
import { saveNotificationSettings, sendTestPush } from "@/lib/actions/push";
import { logout } from "@/lib/actions/auth";
import type { NotificationSettings } from "@/lib/settings";
import { useAppConfig } from "./app-context";
import { useToast } from "./toast";
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported } from "./push-client";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function SettingsPanel({ initial }: { initial: NotificationSettings }) {
  const toast = useToast();
  const { vapidPublicKey } = useAppConfig();
  const [pending, start] = useTransition();
  const [cfg, setCfg] = useState(initial);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [env, setEnv] = useState({ supported: true, ios: false, standalone: false });
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setEnv({ supported: pushSupported(), ios: isIOS(), standalone: isStandalone() });
    currentSubscription()
      .then((s) => setSubscribed(!!s && Notification.permission === "granted"))
      .catch(() => setSubscribed(false));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const update = (patch: Partial<NotificationSettings>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    start(async () => {
      await saveNotificationSettings(next);
    });
  };

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="space-y-4">
      {!env.standalone && (
        <section className="glass rounded-[28px] p-5">
          <h2 className="mb-1 flex items-center gap-2 font-bold">
            <Download size={18} /> App installieren
          </h2>
          {installEvt ? (
            <>
              <p className="muted mb-3 text-sm">Installiere TheOne auf deinem Gerät – wie eine native App.</p>
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={async () => {
                  await installEvt.prompt();
                  setInstallEvt(null);
                }}
              >
                Jetzt installieren
              </button>
            </>
          ) : env.ios ? (
            <p className="muted text-sm">
              Tippe in Safari auf <Share size={14} className="inline -translate-y-0.5" /> <b>Teilen</b> und dann auf{" "}
              <b>„Zum Home-Bildschirm“</b>. Danach funktionieren auch Push-Erinnerungen.
            </p>
          ) : (
            <p className="muted text-sm">Öffne das Browser-Menü und wähle „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.</p>
          )}
        </section>
      )}

      <section className="glass rounded-[28px] p-5">
        <h2 className="mb-1 flex items-center gap-2 font-bold">
          <Bell size={18} /> Push-Benachrichtigungen
        </h2>
        <p className="muted mb-4 text-sm">Erinnerungen für Aufgaben, Motivation am Morgen und ein sanfter Tagebuch-Impuls am Abend.</p>

        {subscribed ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await sendTestPush();
                  toast(r.sent ? "Test gesendet 🚀" : "Kein Gerät erreicht", r.sent ? "success" : "error");
                })
              }
            >
              <Send size={16} /> Test senden
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                await disablePush();
                setSubscribed(false);
                toast("Benachrichtigungen deaktiviert");
              }}
            >
              <BellOff size={16} /> Aus
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={subscribed === null}
            onClick={async () => {
              const r = await enablePush(vapidPublicKey);
              if (r.ok) {
                setSubscribed(true);
                toast("Benachrichtigungen aktiviert 🔔", "success");
              } else toast(r.error ?? "Fehler", "error");
            }}
          >
            <Bell size={16} /> Auf diesem Gerät aktivieren
          </button>
        )}
        {!env.supported && env.ios && !env.standalone && (
          <p className="faint mt-2 text-xs">Auf iPhone/iPad funktionieren Push-Nachrichten nur in der installierten App.</p>
        )}

        <div className="mt-5 space-y-3 border-t pt-4" style={{ borderColor: "var(--divider)" }}>
          <ToggleRow
            label="☀️ Tages-Motivation"
            hint="Deine Aufgaben für heute + Zitat des Tages"
            checked={cfg.dailyDigest}
            onChange={(v) => update({ dailyDigest: v })}
            hour={cfg.digestHour}
            onHour={(h) => update({ digestHour: h })}
            hours={hours}
          />
          <ToggleRow
            label="📔 Tagebuch-Erinnerung"
            hint="Nur wenn du heute noch nichts geschrieben hast"
            checked={cfg.journalReminder}
            onChange={(v) => update({ journalReminder: v })}
            hour={cfg.journalHour}
            onHour={(h) => update({ journalHour: h })}
            hours={hours}
          />
        </div>
      </section>

      <section className="glass rounded-[28px] p-5">
        <button
          type="button"
          className="btn btn-ghost w-full"
          style={{ color: "var(--danger)" }}
          onClick={async () => {
            try {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            } catch {}
            await logout();
          }}
        >
          <LogOut size={16} /> Abmelden
        </button>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  hour,
  onHour,
  hours,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hour: number;
  onHour: (h: number) => void;
  hours: number[];
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{label}</p>
        <p className="muted text-xs">{hint}</p>
      </div>
      <select
        className="field !w-auto !rounded-full !py-2 !pr-3 !pl-3 text-sm"
        value={hour}
        onChange={(e) => onHour(Number(e.target.value))}
        disabled={!checked}
        aria-label="Uhrzeit"
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}:00
          </option>
        ))}
      </select>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-[31px] w-[51px] flex-none rounded-full transition-colors"
        style={{ background: checked ? "var(--success)" : "var(--field-border)" }}
      >
        <span
          className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-all"
          style={{ left: checked ? 22 : 2 }}
        />
      </button>
    </div>
  );
}
