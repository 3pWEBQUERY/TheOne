"use client";

import { createContext, useContext } from "react";
import { ToastProvider } from "./toast";

type AppConfig = { vapidPublicKey: string };

const AppContext = createContext<AppConfig>({ vapidPublicKey: "" });

export function useAppConfig() {
  return useContext(AppContext);
}

export function AppProviders({ config, children }: { config: AppConfig; children: React.ReactNode }) {
  return (
    <AppContext.Provider value={config}>
      <ToastProvider>{children}</ToastProvider>
    </AppContext.Provider>
  );
}
