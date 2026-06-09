import { Settings, Wifi } from "lucide-react";
import { useMemo, useState } from "react";
import { ChannelCard } from "../components/ChannelCard";
import { ChannelList } from "../components/ChannelList";
import { ChannelTabs } from "../components/ChannelTabs";
import { SettingsPanel } from "../components/SettingsPanel";
import { useChannels } from "../hooks/useChannels";
import { useLiveMonitor } from "../hooks/useLiveMonitor";
import { useSettings } from "../hooks/useSettings";

export function App() {
  const [selectedSlug, setSelectedSlug] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, setSettings } = useSettings();
  const { channels, sortedChannels, setChannels, addChannel, removeChannel } =
    useChannels();
  const { isChecking, liveCount, refreshAll, toasts } = useLiveMonitor({
    channels,
    setChannels,
    settings,
  });

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

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">
            <Wifi size={22} />
          </span>
          <div>
            <h1>Kickerino</h1>
            <p>{liveCount} ao vivo</p>
          </div>
        </div>

        <button
          className={`settings-button ${settingsOpen ? "settings-button--active" : ""}`}
          type="button"
          title="Configuracoes"
          aria-label="Configuracoes"
          onClick={() => setSettingsOpen((current) => !current)}
        >
          <Settings size={19} />
        </button>
      </header>

      <div className="workspace">
        <ChannelList
          channels={sortedChannels}
          selectedSlug={selectedSlug}
          isChecking={isChecking}
          onAdd={addChannel}
          onRefresh={() => void refreshAll()}
          onSelect={setSelectedSlug}
        />

        <section className="content">
          <ChannelTabs
            channels={sortedChannels}
            selectedSlug={selectedSlug}
            onSelect={setSelectedSlug}
          />

          {settingsOpen && (
            <SettingsPanel settings={settings} onChange={setSettings} />
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
      </div>

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </main>
  );
}
