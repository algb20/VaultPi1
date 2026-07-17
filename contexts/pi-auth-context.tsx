"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { PI_NETWORK_CONFIG } from "@/lib/system-config";
import { setApiAuthToken } from "@/lib/api";
import { checkIncompletePayments, initializeGlobalPayment } from "@/lib/pi-payment";
import { fnUrl, SUPABASE_ANON_KEY } from "@/lib/vaultpi/config";
import { getSupabase } from "@/lib/vaultpi/client";
import { getProfile } from "@/lib/vaultpi/db";
import type { Profile } from "@/lib/vaultpi/types";

export type LoginDTO = {
  id: string;
  username: string;
  credits_balance: number;
  terms_accepted: boolean;
  app_id: string;
};

const COMMUNICATION_REQUEST_TYPE = "@pi:app:sdk:communication_information_request";
const DEFAULT_ERROR_MESSAGE =
  "Failed to authenticate or login. Please refresh and try again.";

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "SecurityError" || error.code === DOMException.SECURITY_ERR || error.code === 18)
    ) {
      return true;
    }
    if (error instanceof Error && /Permission denied/i.test(error.message)) {
      return true;
    }
    throw error;
  }
}

function parseJsonSafely(value: any): any {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return typeof value === "object" && value !== null ? value : null;
}

interface PiAuthContextType {
  isAuthenticated: boolean;
  authMessage: string;
  hasError: boolean;
  piAccessToken: string | null;
  userData: LoginDTO | null;
  profile: Profile | null;
  error: string | null;
  reinitialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const PiAuthContext = createContext<PiAuthContextType | undefined>(undefined);

const loadPiSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    if (!PI_NETWORK_CONFIG.SDK_URL) {
      throw new Error("SDK URL is not set");
    }
    script.src = PI_NETWORK_CONFIG.SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Pi SDK script"));
    document.head.appendChild(script);
  });
};

/** يطلب بيانات الاعتماد من نافذة App Studio الأب (عند التشغيل داخل iframe). */
function requestParentCredentials(): Promise<{ accessToken: string } | null> {
  if (!isInIframe()) return Promise.resolve(null);
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const timeoutMs = 1500;
  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const cleanup = (listener: (event: MessageEvent) => void) => {
      window.removeEventListener("message", listener);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
    const messageListener = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const data = parseJsonSafely(event.data);
      if (!data || data.type !== COMMUNICATION_REQUEST_TYPE || data.id !== requestId) return;
      cleanup(messageListener);
      const payload = typeof data.payload === "object" && data.payload !== null ? data.payload : {};
      const accessToken = typeof payload.accessToken === "string" ? payload.accessToken : null;
      resolve(accessToken ? { accessToken } : null);
    };
    timeoutId = setTimeout(() => {
      cleanup(messageListener);
      resolve(null);
    }, timeoutMs);
    window.addEventListener("message", messageListener);
    window.parent.postMessage(
      JSON.stringify({ type: COMMUNICATION_REQUEST_TYPE, id: requestId }),
      "*",
    );
  });
}

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMessage, setAuthMessage] = useState("Initializing Pi Network...");
  const [hasError, setHasError] = useState(false);
  const [piAccessToken, setPiAccessToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<LoginDTO | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // الجسر: يحوّل رمز Pi إلى جلسة Supabase + يعيد الملف الشخصي
  const bridgeLogin = async (piToken: string): Promise<Profile> => {
    const res = await fetch(fnUrl("vaultpi-auth"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        "x-pi-token": piToken,
      },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error("login: bridge failed " + res.status + " " + t);
    }
    const body = await res.json();
    if (!body?.session?.access_token) throw new Error("login: no session returned");
    await getSupabase().auth.setSession({
      access_token: body.session.access_token,
      refresh_token: body.session.refresh_token,
    });
    return body.profile as Profile;
  };

  const authenticateAndLogin = async (accessToken: string): Promise<void> => {
    setAuthMessage("Securing your vault...");
    const prof = await bridgeLogin(accessToken);
    setPiAccessToken(accessToken);
    setApiAuthToken(accessToken);
    setProfile(prof);
    setUserData({
      id: prof.pi_uid,
      username: prof.username,
      credits_balance: prof.credits_balance,
      terms_accepted: true,
      app_id: "",
    });
  };

  const getErrorMessage = (err: unknown): string => {
    if (!(err instanceof Error)) return "An unexpected error occurred. Please try again.";
    const m = err.message;
    if (m.includes("SDK failed to load"))
      return "Failed to load Pi Network SDK. Please check your internet connection.";
    if (m.includes("authenticate")) return "Pi Network authentication failed. Please try again.";
    if (m.includes("login")) return "Failed to connect to the vault backend. Please try again.";
    return `Authentication error: ${m}`;
  };

  const authenticateViaPiSdk = async (): Promise<void> => {
    setAuthMessage("Initializing Pi Network...");
    await window.Pi.init({ version: "2.0", sandbox: PI_NETWORK_CONFIG.SANDBOX });

    setAuthMessage("Authenticating with Pi Network...");
    const scopes = ["username", "payments"];
    const piAuthResult = await window.Pi.authenticate(scopes, async (payment) => {
      await new Promise((r) => setTimeout(r, 2000));
      await checkIncompletePayments(payment);
    });

    if (!piAuthResult.accessToken) throw new Error(DEFAULT_ERROR_MESSAGE);
    await authenticateAndLogin(piAuthResult.accessToken);
  };

  const initializePiAndAuthenticate = async () => {
    setError(null);
    setHasError(false);
    try {
      const parentCredentials = await requestParentCredentials();
      if (parentCredentials) {
        await authenticateAndLogin(parentCredentials.accessToken);
      } else {
        setAuthMessage("Loading Pi Network SDK...");
        if (typeof window.Pi === "undefined") await loadPiSDK();
        if (typeof window.Pi === "undefined") {
          throw new Error("SDK failed to load: Pi object not available after script load");
        }
        await authenticateViaPiSdk();
      }
      setIsAuthenticated(true);
      setHasError(false);
      initializeGlobalPayment();
    } catch (err) {
      console.error("❌ Pi Network initialization failed:", err);
      setHasError(true);
      const msg = getErrorMessage(err);
      setAuthMessage(msg);
      setError(msg);
    }
  };

  const refreshProfile = async () => {
    try {
      const p = await getProfile();
      if (p) setProfile(p);
    } catch (e) {
      console.error("refreshProfile failed:", e);
    }
  };

  const signOut = async () => {
    try {
      await getSupabase().auth.signOut();
    } catch {
      /* ignore */
    }
    setIsAuthenticated(false);
    setProfile(null);
    setUserData(null);
    setPiAccessToken(null);
  };

  useEffect(() => {
    initializePiAndAuthenticate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: PiAuthContextType = {
    isAuthenticated,
    authMessage,
    hasError,
    piAccessToken,
    userData,
    profile,
    error,
    reinitialize: initializePiAndAuthenticate,
    refreshProfile,
    signOut,
  };

  return <PiAuthContext.Provider value={value}>{children}</PiAuthContext.Provider>;
}

export function usePiAuth() {
  const context = useContext(PiAuthContext);
  if (context === undefined) {
    throw new Error("usePiAuth must be used within a PiAuthProvider");
  }
  return context;
}
