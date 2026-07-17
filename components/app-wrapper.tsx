"use client";

import type { ReactNode } from "react";
import { PiAuthProvider, usePiAuth } from "@/contexts/pi-auth-context";
import { VaultProvider } from "@/contexts/vault-context";
import { AuthLoadingScreen } from "./auth-loading-screen";

function AppContent({ children }: { children: ReactNode }) {
  const { isAuthenticated } = usePiAuth();
  if (!isAuthenticated) return <AuthLoadingScreen />;
  return <VaultProvider>{children}</VaultProvider>;
}

export function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <PiAuthProvider>
      <AppContent>{children}</AppContent>
    </PiAuthProvider>
  );
}
