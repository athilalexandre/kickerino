import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Bot, Download, RefreshCcw, Settings, UserCheck, UserX, Wifi, HelpCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChannelCard } from "../components/ChannelCard";
import { ChannelList } from "../components/ChannelList";
import { ChannelTabs } from "../components/ChannelTabs";
import { SettingsPanel } from "../components/SettingsPanel";
import { HelpModal } from "../components/HelpModal";
import { KickAccountModal } from "../components/KickAccountModal";
import { useChannels } from "../hooks/useChannels";
import { useLiveMonitor } from "../hooks/useLiveMonitor";
import { useSettings } from "../hooks/useSettings";
import { useSupportBot } from "../hooks/useSupportBot";
import type { AppSettings } from "../types/settings";
import type { ChannelSupportConfig } from "../types/channel";
import {
  checkForUpdates,
  openReleaseDownload,
  type LatestRelease,
} from "../services/updates";
import { ReciprocityDashboard } from "../components/reciprocity/ReciprocityDashboard";
import { useSoundTimers } from "../hooks/useSoundTimers";
import { SoundTimersDashboard } from "../components/SoundTimersDashboard";

type UpdateState = {
  status: "idle" | "checking" | "current" | "available" | "error" | "downloading";
  message?: string;
  release?: LatestRelease;
  progress?: number;
};

export function App() {
  const [currentTab, setCurrentTab] = useState<"monitor" | "reciprocity" | "timers">("monitor");
  const [selectedSlug, setSelectedSlug] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>({ status: "idle" });
  const [kickLoginStatus, setKickLoginStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [kickUsername, setKickUsername] = useState<string | null>(null);
  const { settings, setSettings } = useSettings();
  const { timers, addTimer, deleteTimer, updateTimer } = useSoundTimers();
  const { channels, sortedChannels, setChannels, addChannel, removeChannel } =
    useChannels();
  const { isChecking, liveCount, refreshAll, toasts } = useLiveMonitor({
    channels,
    setChannels,
    settings,
  });

  const { activeSupportSlugs, supportTimers, triggerManualMessage } = useSupportBot({
    channels,
    settings,
    setChannels,
  });

  // Check login status on startup
  useEffect(() => {
    void invoke("open_login_window");

    const unlistenPromise = listen<string>("kick-login-event", (event) => {
      const payload = event.payload;
      if (payload.startsWith("connected")) {
        setKickLoginStatus("connected");
        const parts = payload.split(":");
        if (parts.length > 1) {
          setKickUsername(parts[1]);
        } else {
          setKickUsername(null);
        }
      } else {
        setKickLoginStatus("disconnected");
        setKickUsername(null);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Listen to download progress of the updater
  useEffect(() => {
    const unlistenPromise = listen<number>("update-download-progress", (event) => {
      setUpdateState((prev) => ({
        ...prev,
        status: "downloading",
        progress: event.payload,
        message: `Baixando atualização: ${event.payload}%`,
      }));
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  async function handleStartUpdate() {
    if (!updateState.release || !updateState.release.installerUrl) {
      if (updateState.release) {
        void openReleaseDownload(updateState.release);
      }
      return;
    }

    setUpdateState((prev) => ({
      ...prev,
      status: "downloading",
      progress: 0,
      message: "Iniciando download da atualização...",
    }));

    try {
      await invoke("install_update", { url: updateState.release.installerUrl });
    } catch (error) {
      setUpdateState((prev) => ({
        ...prev,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  const visibleChannels = useMemo(() => {
    if (selectedSlug === "all") {
      return sortedChannels;
    }

    return sortedChannels.filter((channel) => channel.slug === selectedSlug);
  }, [selectedSlug, sortedChannels]);

  function removeAndRetainSelection(slug: string) {
    removeChannel(slug);
    if (selectedSlug === slug) {
      setSelectedSlug("all");
    }
  }

  function handleAddChannel(value: string): boolean {
    const slug = addChannel(value);
    if (slug) {
      const currentText = settings.supportMessagesText.trim();
      const newLine = `${slug}:: No apoio`;
      const nextText = currentText ? `${currentText}\n${newLine}` : newLine;
      setSettings({
        ...settings,
        supportMessagesText: nextText,
      });
      return true;
    }
    return false;
  }

  const toggleChannelSupport = (slug: string) => {
    setChannels((current) =>
      current.map((channel) =>
        channel.slug === slug
          ? { ...channel, supportEnabled: channel.supportEnabled === false ? true : false }
          : channel
      )
    );
  };

  const updateChannelSupportConfig = (slug: string, nextConfig: Partial<ChannelSupportConfig>) => {
    setChannels((current) =>
      current.map((channel) =>
        channel.slug === slug
          ? {
              ...channel,
              supportConfig: channel.supportConfig
                ? { ...channel.supportConfig, ...nextConfig }
                : { messages: ["No apoio"], nextMessageIndex: 0, ...nextConfig },
            }
          : channel
      )
    );
  };

  const handleSettingsChange = (nextSettings: AppSettings) => {
    if (nextSettings.supportBotEnabled !== settings.supportBotEnabled) {
      setChannels((current) =>
        current.map((channel) => ({
          ...channel,
          supportEnabled: nextSettings.supportBotEnabled,
        }))
      );
    }
    setSettings(nextSettings);
  };

  async function handleCheckUpdates() {
    setUpdateState({ status: "checking", message: "Checando atualizacoes..." });

    try {
      const release = await checkForUpdates();

      if (release.hasUpdate) {
        setUpdateState({
          status: "available",
          release,
          message: `Nova versao ${release.latestVersion} disponivel. Voce esta na ${release.currentVersion}.`,
        });
        return;
      }

      setUpdateState({
        status: "current",
        release,
        message: `Kickerino ja esta atualizado na versao ${release.currentVersion}.`,
      });
    } catch (error) {
      setUpdateState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel checar atualizacoes agora.",
      });
    }
  }

  return (
    <main className="shell">
      <div className="beta-banner">
        ⚠️ <strong>Versão Beta:</strong> Bugs podem aparecer e emojis não estão funcionando ainda.
      </div>
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">
            <Wifi size={22} />
          </span>
          <div>
            <h1>Kickerino</h1>
            <p>
              {liveCount} ao vivo
              {activeSupportSlugs.length > 0 && (
                <span style={{ marginLeft: "8px", color: "#42c773", fontWeight: "bold" }}>
                  • Robo ativo ({activeSupportSlugs.length})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Custom page tabs */}
        <div className="main-tabs">
          <button
            className={`main-tab ${currentTab === "monitor" ? "main-tab--active" : ""}`}
            type="button"
            onClick={() => setCurrentTab("monitor")}
          >
            Apoio de Canais
          </button>
          <button
            className={`main-tab ${currentTab === "reciprocity" ? "main-tab--active" : ""}`}
            type="button"
            onClick={() => setCurrentTab("reciprocity")}
          >
            Reciprocidade
          </button>
          <button
            className={`main-tab ${currentTab === "timers" ? "main-tab--active" : ""}`}
            type="button"
            onClick={() => setCurrentTab("timers")}
          >
            Timers Sonoros
          </button>
        </div>

        <div className="topbar-actions">
          {/* Kick Login Status */}
          <button
            className={`settings-button ${kickLoginStatus === "connected" ? "settings-button--active" : ""}`}
            type="button"
            title={
              kickLoginStatus === "connected"
                ? "Gerenciar Conta Kick"
                : kickLoginStatus === "checking"
                  ? "Verificando Login da Kick..."
                  : "Conectar Conta Kick"
            }
            aria-label="Status Login Kick"
            onClick={() => {
              if (kickLoginStatus === "connected") {
                setAccountModalOpen(true);
              } else {
                setKickLoginStatus("checking");
                void invoke("open_login_window");
              }
            }}
            disabled={kickLoginStatus === "checking"}
          >
            {kickLoginStatus === "connected" ? (
              <UserCheck size={19} style={{ color: "#42c773" }} />
            ) : kickLoginStatus === "checking" ? (
              <RefreshCcw size={18} className="spin" />
            ) : (
              <UserX size={19} style={{ color: "#dc5d57" }} />
            )}
          </button>

          {/* Support Bot Toggle */}
          <button
            className={`settings-button ${settings.supportBotEnabled ? "settings-button--active" : ""}`}
            type="button"
            title={settings.supportBotEnabled ? "Desativar Robo de Apoio" : "Ativar Robo de Apoio"}
            aria-label="Toggle Robo de Apoio"
            onClick={() => handleSettingsChange({ ...settings, supportBotEnabled: !settings.supportBotEnabled })}
          >
            <Bot size={19} />
          </button>

          {/* Update Check */}
          <button
            className={`settings-button ${updateState.status === "checking" ? "settings-button--active" : ""}`}
            type="button"
            title="Checar atualizacoes"
            aria-label="Checar atualizacoes"
            disabled={updateState.status === "checking"}
            onClick={() => void handleCheckUpdates()}
          >
            <RefreshCcw
              size={18}
              className={updateState.status === "checking" ? "spin" : ""}
            />
          </button>

          {/* Help button */}
          <button
            className={`settings-button ${helpOpen ? "settings-button--active" : ""}`}
            type="button"
            title="Manual de Ajuda"
            aria-label="Manual de Ajuda"
            onClick={() => setHelpOpen((current) => !current)}
          >
            <HelpCircle size={19} />
          </button>

          {/* Settings cog */}
          <button
            className={`settings-button ${settingsOpen ? "settings-button--active" : ""}`}
            type="button"
            title="Configuracoes"
            aria-label="Configuracoes"
            onClick={() => setSettingsOpen((current) => !current)}
          >
            <Settings size={19} />
          </button>
        </div>
      </header>

      <div className="workspace" style={{ gridTemplateColumns: currentTab !== "monitor" ? "1fr" : undefined }}>
        {currentTab === "monitor" ? (
          <>
            <ChannelList
              channels={sortedChannels}
              selectedSlug={selectedSlug}
              isChecking={isChecking}
              onAdd={handleAddChannel}
              onRefresh={() => void refreshAll()}
              onSelect={setSelectedSlug}
              activeSupportSlugs={activeSupportSlugs}
              supportTimers={supportTimers}
            />

            <section className="content">
              <ChannelTabs
                channels={sortedChannels}
                selectedSlug={selectedSlug}
                onSelect={setSelectedSlug}
              />

              {settingsOpen && (
                <SettingsPanel settings={settings} onChange={handleSettingsChange} />
              )}

              {updateState.status !== "idle" && updateState.message && (
                <section className={`update-banner update-banner--${updateState.status}`} style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <span style={{ fontSize: "13px" }}>{updateState.message}</span>
                    {updateState.status === "available" && updateState.release && (
                      <button
                        type="button"
                        onClick={() => void handleStartUpdate()}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
                      >
                        <Download size={17} />
                        <span>Instalar</span>
                      </button>
                    )}
                  </div>
                  {updateState.status === "downloading" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                      <div style={{ flex: 1, height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${updateState.progress ?? 0}%`, height: "100%", background: "#42c773", transition: "width 150ms ease-out" }} />
                      </div>
                      <span style={{ fontSize: "12px", minWidth: "32px", textAlign: "right", fontFamily: "monospace" }}>{updateState.progress ?? 0}%</span>
                    </div>
                  )}
                </section>
              )}

              {visibleChannels.length > 0 ? (
                <div className="cards-grid">
                  {visibleChannels.map((channel) => (
                    <ChannelCard
                      channel={channel}
                      key={channel.slug}
                      onRemove={removeAndRetainSelection}
                      onSelect={setSelectedSlug}
                      openLiveOnDoubleClick={settings.openLiveOnDoubleClick}
                      isSupported={channel.supportEnabled !== false && channel.status === "live"}
                      supportTimer={supportTimers[channel.slug]}
                      onSendNow={triggerManualMessage}
                      onToggleSupport={toggleChannelSupport}
                      onUpdateSupportConfig={updateChannelSupportConfig}
                      globalIntervalMinutes={settings.supportIntervalMinutes}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <strong>Nenhum canal monitorado</strong>
                  <span>Adicione um slug da Kick na lista lateral para comecar.</span>
                </div>
              )}
            </section>
          </>
        ) : currentTab === "reciprocity" ? (
          <section className="content" style={{ padding: "18px 24px" }}>
            <ReciprocityDashboard
              channels={channels}
              kickUsername={kickUsername}
              kickLoginStatus={kickLoginStatus}
            />
          </section>
        ) : (
          <section className="content" style={{ padding: "18px 24px" }}>
            <SoundTimersDashboard
              timers={timers}
              addTimer={addTimer}
              deleteTimer={deleteTimer}
              updateTimer={updateTimer}
            />
          </section>
        )}
      </div>

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <KickAccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        username={kickUsername}
        setKickLoginStatus={setKickLoginStatus}
      />
    </main>
  );
}


