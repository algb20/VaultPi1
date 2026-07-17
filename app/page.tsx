"use client";

import { useState } from "react";
import { Header } from "@/components/pivault/header";
import { BottomNav } from "@/components/pivault/bottom-nav";
import { Dashboard } from "@/components/pivault/dashboard";
import { Files } from "@/components/pivault/files";
import { AiOrganizer } from "@/components/pivault/ai-organizer";
import { Settings } from "@/components/pivault/settings";
import { PrivacyDashboard } from "@/components/pivault/privacy-dashboard";
import { Notes } from "@/components/pivault/notes";
import { UploadModal } from "@/components/pivault/upload-modal";
import { EdgeDock } from "@/components/pivault/edge-dock";

type Tab = "dashboard" | "files" | "ai" | "settings" | "privacy" | "notes";
export type UploadType = "photo" | "video" | "document" | "link" | null;

const tabTitles: Record<Tab, string> = {
  dashboard: "PiVault",
  files: "My Files",
  ai: "AI Assistant",
  settings: "Settings",
  privacy: "Privacy & Recovery",
  notes: "Notes",
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadInitial, setUploadInitial] = useState<UploadType>(null);
  const [filesFilter, setFilesFilter] = useState<string | null>(null);
  const [pendingNewNote, setPendingNewNote] = useState(false);

  const mainTabs: Tab[] = ["dashboard", "files", "ai", "settings"];
  const isMainNav = mainTabs.includes(activeTab);

  const openUpload = (initial: UploadType = null) => {
    setUploadInitial(initial);
    setShowUpload(true);
  };
  const openNotes = (autoNew = false) => {
    setPendingNewNote(autoNew);
    setActiveTab("notes");
  };
  const goFiles = (filter?: string) => {
    setFilesFilter(filter ?? null);
    setActiveTab("files");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <Header
        title={tabTitles[activeTab]}
        showSearch={activeTab === "files"}
        onSearchClick={() => setActiveTab("ai")}
        onPrivacyClick={() => setActiveTab("privacy")}
      />

      <main className="flex-1 overflow-y-auto">
        {activeTab === "dashboard" && (
          <Dashboard
            onUpload={() => openUpload()}
            onOpenTab={(t) => setActiveTab(t as Tab)}
            onOpenFiles={goFiles}
            onOpenNotes={() => openNotes(false)}
          />
        )}
        {activeTab === "files" && <Files initialFilter={filesFilter} />}
        {activeTab === "ai" && <AiOrganizer onOpenFiles={goFiles} />}
        {activeTab === "settings" && <Settings />}
        {activeTab === "privacy" && <PrivacyDashboard />}
        {activeTab === "notes" && (
          <Notes autoNew={pendingNewNote} onAutoNewConsumed={() => setPendingNewNote(false)} />
        )}
      </main>

      {isMainNav && (
        <BottomNav
          active={activeTab as "dashboard" | "files" | "ai" | "settings"}
          onChange={(tab) => setActiveTab(tab)}
          onUpload={() => openUpload()}
          onScanLink={() => openUpload("link")}
          onNewNote={() => openNotes(true)}
          onOpenNotes={() => openNotes(false)}
        />
      )}

      {!isMainNav && (
        <button
          onClick={() => setActiveTab("dashboard")}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          ← Back
        </button>
      )}

      <EdgeDock
        onUpload={() => openUpload()}
        onNewNote={() => openNotes(true)}
        onSearch={() => setActiveTab("ai")}
        onStarred={() => goFiles("starred")}
        onFiles={() => goFiles()}
      />

      {showUpload && (
        <UploadModal initialType={uploadInitial} onClose={() => setShowUpload(false)} />
      )}
    </div>
  );
}
