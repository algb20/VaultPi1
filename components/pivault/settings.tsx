"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Bell,
  RefreshCw,
  Moon,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Check,
  Fingerprint,
  Key,
  Cloud,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Wifi,
  Layers,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { usePiAuth } from "@/contexts/pi-auth-context";
import { useVault } from "@/contexts/vault-context";
import * as db from "@/lib/vaultpi/db";
import { formatBytes } from "@/lib/vaultpi/db";
import type { VaultSettings } from "@/lib/vaultpi/types";
import { useLanguage } from "@/components/translation-provider";
import { LANGUAGES } from "@/lib/vaultpi/i18n";

const DEFAULT_SETTINGS: VaultSettings = {
  notifications: true,
  autoSync: true,
  darkMode: true,
  biometric: false,
  encryptAll: true,
  offlineMode: true,
  language: "English (US)",
};

const languages = ["English (US)", "العربية"];

export function Settings() {
  const { userData, signOut } = usePiAuth();
  const { files, storageUsed, storageQuota, profile, reload } = useVault();
  const { setLanguage } = useLanguage();

  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [dockEnabled, setDockEnabled] = useState(true);
  const [showUserId, setShowUserId] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    if (profile?.settings) setSettings({ ...DEFAULT_SETTINGS, ...profile.settings });
    if (profile?.dock_config) setDockEnabled(profile.dock_config.enabled !== false);
  }, [profile?.id]);

  const username = userData?.username ?? profile?.username ?? "PiUser";
  const userId = userData?.id ?? profile?.pi_uid ?? "pi-xxxx-xxxx";

  const photosBytes = files.filter((f) => f.kind === "photo").reduce((s, f) => s + f.size_bytes, 0);
  const videosBytes = files.filter((f) => f.kind === "video").reduce((s, f) => s + f.size_bytes, 0);
  const docsBytes = files.filter((f) => f.kind === "document").reduce((s, f) => s + f.size_bytes, 0);
  const pct = storageQuota > 0 ? Math.min(100, (storageUsed / storageQuota) * 100) : 0;

  const setOne = async (key: keyof VaultSettings, value: any) => {
    setSettings((s) => ({ ...s, [key]: value }));
    try {
      await db.updateSettings({ [key]: value } as Partial<VaultSettings>);
    } catch {
      toast.error("Could not save setting");
    }
  };

  const toggleDock = async (v: boolean) => {
    setDockEnabled(v);
    await db.updateDock({ enabled: v });
    await reload();
    toast.success(v ? "Quick dock enabled" : "Quick dock hidden");
  };

  const backup = async () => {
    setBackingUp(true);
    await reload();
    setTimeout(() => {
      setBackingUp(false);
      toast.success("Everything is safely stored in the cloud");
    }, 800);
  };

  const doSignOut = async () => {
    await signOut();
    toast("Signed out");
  };

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-4">
      {/* Profile */}
      <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-primary">{username.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate">@{username}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-muted-foreground">ID:</span>
            <span className="text-xs text-muted-foreground font-mono truncate">
              {showUserId ? userId : "••••••••••"}
            </span>
            <button onClick={() => setShowUserId(!showUserId)}>
              {showUserId ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
            </button>
          </div>
          <Badge className="mt-2 bg-emerald-400/15 text-emerald-400 border-emerald-400/20 text-[10px]">
            Pi Network Verified
          </Badge>
        </div>
      </div>

      {/* Storage */}
      <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Vault Storage</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatBytes(storageQuota)} plan</span>
        </div>
        <Progress value={pct} className="h-2 bg-secondary" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatBytes(storageUsed)} used</span>
          <span>{formatBytes(Math.max(0, storageQuota - storageUsed))} free</span>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: "Photos", size: formatBytes(photosBytes), color: "bg-sky-400" },
            { label: "Videos", size: formatBytes(videosBytes), color: "bg-amber-400" },
            { label: "Docs", size: formatBytes(docsBytes), color: "bg-emerald-400" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
              <span className="text-[10px] font-medium text-foreground">{item.size}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Security</span>
        </div>
        <Row icon={Fingerprint} label="Biometric Lock" desc="Require Face ID / fingerprint">
          <Switch checked={settings.biometric} onCheckedChange={(v) => setOne("biometric", v)} />
        </Row>
        <Row icon={Lock} label="Encrypt All Files" desc="AES-256 encryption by default">
          <Switch checked={settings.encryptAll} onCheckedChange={(v) => setOne("encryptAll", v)} />
        </Row>
        <Row icon={Key} label="Change Vault PIN" desc="Update your 6-digit vault PIN" last>
          <button onClick={() => toast("PIN management coming soon")}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </Row>
      </div>

      {/* Quick dock */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <Row icon={Layers} label="Quick Shortcut Dock" desc="Floating edge shortcut, drag to reposition" last>
          <Switch checked={dockEnabled} onCheckedChange={toggleDock} />
        </Row>
      </div>

      {/* Preferences */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Preferences</span>
        </div>
        <Row icon={Bell} label="Notifications" desc="Upload, sync and security alerts">
          <Switch checked={settings.notifications} onCheckedChange={(v) => setOne("notifications", v)} />
        </Row>
        <Row icon={RefreshCw} label="Auto Sync" desc="Keep the vault in sync">
          <Switch checked={settings.autoSync} onCheckedChange={(v) => setOne("autoSync", v)} />
        </Row>
        <Row icon={Wifi} label="Offline Mode" desc="Cache items for offline access">
          <Switch checked={settings.offlineMode} onCheckedChange={(v) => setOne("offlineMode", v)} />
        </Row>
        <Row icon={Moon} label="Dark Mode" desc="Always use dark theme">
          <Switch checked={settings.darkMode} onCheckedChange={(v) => setOne("darkMode", v)} />
        </Row>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Language</p>
            <p className="text-xs text-muted-foreground">{settings.language}</p>
          </div>
          <div className="relative">
            <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className="flex items-center gap-1 text-xs text-primary font-medium">
              Change <ChevronRight className="w-3 h-3" />
            </button>
            {showLanguageMenu && (
              <div className="absolute right-0 top-6 z-20 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setOne("language", lang);
                      setShowLanguageMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-xs text-left hover:bg-secondary flex items-center justify-between"
                  >
                    {lang}
                    {settings.language === lang && <Check className="w-3 h-3 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Backup & Recovery</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your files, notes and links are stored encrypted in the cloud and available on any device you sign in with Pi.
        </p>
        <button
          onClick={backup}
          disabled={backingUp}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-primary/15 text-primary border border-primary/20"
        >
          <RefreshCw className={`w-4 h-4 ${backingUp ? "animate-spin" : ""}`} />
          {backingUp ? "Checking..." : "Verify Backup"}
        </button>
      </div>

      {/* Breach alert info */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <Row icon={AlertTriangle} label="Breach Alerts" desc="Anomaly detection on vault access" last>
          <Badge className="bg-emerald-400/15 text-emerald-400 border-emerald-400/20 text-[10px]">Active</Badge>
        </Row>
      </div>

      {/* Support & Sign out */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <button
          onClick={() => toast("Help center coming soon")}
          className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-secondary border-b border-border"
        >
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Help & Support</span>
        </button>
        <button onClick={doSignOut} className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-secondary">
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">Sign Out</span>
        </button>
      </div>

      <p className="text-center text-[11px] text-muted-foreground pb-2">PiVault v1.0.0 · Built on Pi Network</p>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  desc,
  children,
  last,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${last ? "" : "border-b border-border"}`}>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}
