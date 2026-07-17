"use client";

import { useRef, useState } from "react";
import {
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Link2,
  Upload,
  Camera,
  FolderOpen,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useVault } from "@/contexts/vault-context";
import * as db from "@/lib/vaultpi/db";
import type { ItemKind } from "@/lib/vaultpi/types";

interface UploadModalProps {
  onClose: () => void;
  initialType?: "photo" | "video" | "document" | "link" | null;
}

type UploadType = "photo" | "video" | "document" | "link" | null;

const uploadTypes = [
  { key: "photo" as UploadType, icon: ImageIcon, label: "Photo", color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/20", accept: "image/*" },
  { key: "video" as UploadType, icon: Video, label: "Video", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", accept: "video/*" },
  { key: "document" as UploadType, icon: FileText, label: "Document", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.rtf,.odt" },
  { key: "link" as UploadType, icon: Link2, label: "Link", color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20", accept: "" },
];

export function UploadModal({ onClose, initialType = null }: UploadModalProps) {
  const { reload } = useVault();
  const [selectedType, setSelectedType] = useState<UploadType>(initialType);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [encryptOnUpload, setEncryptOnUpload] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capture, setCapture] = useState(false);

  const meta = uploadTypes.find((t) => t.key === selectedType);

  const openPicker = (useCamera: boolean) => {
    setCapture(useCamera);
    setError(null);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const kindOverride: ItemKind | undefined =
      selectedType === "photo" ? "photo" : selectedType === "video" ? "video" : selectedType === "document" ? "document" : undefined;

    setUploading(true);
    setUploadProgress(5);
    setError(null);
    const timer = setInterval(() => setUploadProgress((p) => Math.min(p + 6, 90)), 200);
    try {
      for (const file of Array.from(files)) {
        await db.uploadFile(file, { encrypt: encryptOnUpload, kindOverride });
      }
      clearInterval(timer);
      setUploadProgress(100);
      await reload();
      setUploading(false);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (e: any) {
      clearInterval(timer);
      setUploading(false);
      setUploadProgress(0);
      setError(
        e?.message === "quota_exceeded"
          ? "Storage quota exceeded. Free up space or upgrade your plan."
          : "Upload failed. Please try again.",
      );
    }
  };

  const saveLink = async () => {
    if (!linkUrl.trim()) {
      setError("Please enter a URL.");
      return;
    }
    setUploading(true);
    setUploadProgress(60);
    setError(null);
    try {
      let url = linkUrl.trim();
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      await db.createLink(linkTitle.trim() || url, url);
      setUploadProgress(100);
      await reload();
      setUploading(false);
      setDone(true);
      setTimeout(onClose, 1000);
    } catch {
      setUploading(false);
      setUploadProgress(0);
      setError("Could not save the link. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border-t border-border rounded-t-3xl p-5 flex flex-col gap-4 z-10">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border" />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={meta?.accept || undefined}
          {...(capture ? { capture: "environment" as any } : {})}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex items-center justify-between mt-2">
          <h2 className="text-base font-bold text-foreground">Upload to Vault</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-400/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-foreground">Saved Successfully</p>
            <p className="text-sm text-muted-foreground">Your item is now securely stored in PiVault</p>
          </div>
        ) : uploading ? (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium">
                {selectedType === "link" ? "Saving link..." : "Uploading & securing..."}
              </span>
              <span className="text-primary">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2 bg-secondary" />
            <p className="text-xs text-muted-foreground text-center">
              {encryptOnUpload && selectedType !== "link" ? "AES-256 encryption applied" : "Stored securely"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {uploadTypes.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setSelectedType(t.key); setError(null); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                    selectedType === t.key ? `${t.bg} ${t.border}` : "bg-secondary border-border"
                  }`}
                >
                  <t.icon className={`w-5 h-5 ${selectedType === t.key ? t.color : "text-muted-foreground"}`} />
                  <span className={`text-[10px] font-medium ${selectedType === t.key ? t.color : "text-muted-foreground"}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

            {selectedType === "link" && (
              <div className="flex flex-col gap-2">
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
                />
                <input
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
                />
              </div>
            )}

            {selectedType && selectedType !== "link" && (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openPicker(true)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary border border-border">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Camera</span>
                </button>
                <button onClick={() => openPicker(false)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary border border-border">
                  <FolderOpen className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Files</span>
                </button>
                <button onClick={() => openPicker(false)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary border border-border">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Browse</span>
                </button>
              </div>
            )}

            {selectedType !== "link" && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Encrypt on upload</p>
                    <p className="text-xs text-muted-foreground">Mark as AES-256 protected</p>
                  </div>
                </div>
                <Switch checked={encryptOnUpload} onCheckedChange={setEncryptOnUpload} />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span className="text-xs text-destructive">{error}</span>
              </div>
            )}

            <button
              disabled={!selectedType}
              onClick={() => (selectedType === "link" ? saveLink() : openPicker(false))}
              className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${
                selectedType ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
            >
              {selectedType === "link"
                ? "Save Link"
                : selectedType
                ? `Choose ${meta?.label} to upload`
                : "Select a type to continue"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
