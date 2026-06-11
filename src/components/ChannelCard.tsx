import { Bot, ExternalLink, Send, Trash2, Settings, Plus, X } from "lucide-react";
import { useState } from "react";
import { openKickChannel } from "../services/live";
import type { KickChannel, ChannelSupportConfig } from "../types/channel";
import { ChannelAvatar } from "./ChannelAvatar";
import { StatusBadge } from "./StatusBadge";
import { formatCountdown } from "../hooks/useSupportBot";

type ChannelCardProps = {
  channel: KickChannel;
  onRemove: (slug: string) => void;
  onSelect: (slug: string) => void;
  openLiveOnDoubleClick: boolean;
  isSupported?: boolean;
  supportTimer?: number;
  onSendNow?: (slug: string) => void;
  onToggleSupport?: (slug: string) => void;
  onUpdateSupportConfig?: (slug: string, config: Partial<ChannelSupportConfig>) => void;
  globalIntervalMinutes?: number;
};

export function ChannelCard({
  channel,
  onRemove,
  onSelect,
  openLiveOnDoubleClick,
  isSupported,
  supportTimer,
  onSendNow,
  onToggleSupport,
  onUpdateSupportConfig,
  globalIntervalMinutes,
}: ChannelCardProps) {
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");

  const displayName = channel.username ?? channel.slug;
  const stats =
    channel.status === "live"
      ? [channel.category, formatViewers(channel.viewers)].filter(Boolean).join(" - ")
      : channel.errorMessage ?? "Aguardando proxima checagem";

  const supportConfig = channel.supportConfig || { messages: [], nextMessageIndex: 0 };
  const messages = supportConfig.messages || [];

  const handleAddMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const updatedMessages = [...messages, newMessageText.trim()];
    if (onUpdateSupportConfig) {
      onUpdateSupportConfig(channel.slug, { messages: updatedMessages });
    }
    setNewMessageText("");
  };

  const handleRemoveMessage = (indexToRemove: number) => {
    const updatedMessages = messages.filter((_, idx) => idx !== indexToRemove);
    let nextIdx = supportConfig.nextMessageIndex;
    if (nextIdx >= updatedMessages.length) {
      nextIdx = 0;
    }
    if (onUpdateSupportConfig) {
      onUpdateSupportConfig(channel.slug, {
        messages: updatedMessages,
        nextMessageIndex: nextIdx,
      });
    }
  };

  const handleIntervalChange = (val: string) => {
    const min = val === "" ? undefined : Math.max(1, parseInt(val, 10));
    if (onUpdateSupportConfig) {
      onUpdateSupportConfig(channel.slug, { intervalMinutes: min });
    }
  };

  const handleSendAllAtOnceChange = (checked: boolean) => {
    if (onUpdateSupportConfig) {
      onUpdateSupportConfig(channel.slug, { sendAllAtOnce: checked });
    }
  };

  return (
    <article
      className={`channel-card channel-card--${channel.status}`}
      style={{ display: "flex", flexDirection: "column", height: "auto", minHeight: "unset", gap: "10px" }}
      onDoubleClick={() => {
        if (openLiveOnDoubleClick) void openKickChannel(channel.slug);
      }}
    >
      <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
        <button
          className="channel-card__main"
          type="button"
          onClick={() => onSelect(channel.slug)}
          style={{ flex: 1 }}
        >
          <ChannelAvatar src={channel.avatarUrl} name={displayName} />
          <span className="channel-card__body">
            <span className="channel-card__topline">
              <strong>{displayName}</strong>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {isSupported && (
                  <span 
                    title="Apoiando no robo (tempo ate a proxima mensagem)" 
                    style={{ 
                      display: "inline-flex", 
                      alignItems: "center", 
                      gap: "4px",
                      fontSize: "11px",
                      color: "#42c773",
                      fontWeight: "bold",
                      background: "rgba(66, 199, 115, 0.1)",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}
                  >
                    <Bot size={13} />
                    {supportTimer !== undefined && (
                      <span>{formatCountdown(supportTimer)}</span>
                    )}
                  </span>
                )}
                <StatusBadge status={channel.status} />
              </span>
            </span>
            <span className="channel-card__title">
              {channel.title ?? `kick.com/${channel.slug}`}
            </span>
            <span className="channel-card__meta">{stats}</span>
          </span>
        </button>

        <div className="channel-card__actions" style={{ marginLeft: "10px" }}>
          {isSupported && onSendNow && (
            <button
              className="icon-button icon-button--success"
              type="button"
              title="Enviar mensagem agora"
              aria-label={`Enviar mensagem para ${displayName}`}
              onClick={() => onSendNow(channel.slug)}
            >
              <Send size={18} />
            </button>
          )}
          {onToggleSupport && (
            <button
              className={`icon-button ${channel.supportEnabled !== false ? "icon-button--success" : ""}`}
              type="button"
              title={channel.supportEnabled !== false ? "Desativar apoio do robô" : "Ativar apoio do robô"}
              aria-label={`Alternar apoio do robô para ${displayName}`}
              onClick={() => onToggleSupport(channel.slug)}
            >
              <Bot size={18} />
            </button>
          )}
          <button
            className={`settings-button ${isConfigPanelOpen ? "settings-button--active" : ""}`}
            type="button"
            title="Configurar mensagens e tempos do canal"
            aria-label="Configurar canal"
            onClick={() => setIsConfigPanelOpen((current) => !current)}
          >
            <Settings size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Abrir live"
            aria-label={`Abrir live de ${displayName}`}
            onClick={() => void openKickChannel(channel.slug)}
          >
            <ExternalLink size={18} />
          </button>
          <button
            className="icon-button icon-button--danger"
            type="button"
            title="Remover canal"
            aria-label={`Remover ${displayName}`}
            onClick={() => onRemove(channel.slug)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {isConfigPanelOpen && (
        <div className="channel-card__config-panel" style={{ width: "100%" }}>
          <h4 className="channel-card__config-title">
            <Settings size={14} /> Configurações do Robô
          </h4>

          <div className="channel-card__config-row">
            <label className="channel-card__config-field">
              <span>Intervalo do Canal (min):</span>
              <input
                type="number"
                min={1}
                placeholder={`${globalIntervalMinutes ?? 10} min (Padrão)`}
                value={supportConfig.intervalMinutes !== undefined ? supportConfig.intervalMinutes : ""}
                onChange={(e) => handleIntervalChange(e.currentTarget.value)}
              />
            </label>

            <label className="channel-card__config-checkbox">
              <input
                type="checkbox"
                checked={!!supportConfig.sendAllAtOnce}
                onChange={(e) => handleSendAllAtOnceChange(e.currentTarget.checked)}
              />
              <span>Enviar todas de uma vez</span>
            </label>
          </div>

          <div className="channel-card__messages-section">
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#a2b4b9" }}>
              Mensagens ({messages.length})
            </label>

            {messages.length > 0 && (
              <div className="channel-card__messages-list">
                {messages.map((msg, idx) => (
                  <div key={idx} className="channel-card__message-item">
                    <span className="channel-card__message-text">{msg}</span>
                    <button
                      type="button"
                      className="channel-card__message-remove"
                      onClick={() => handleRemoveMessage(idx)}
                      title="Excluir mensagem"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddMessage} className="channel-card__message-form">
              <input
                type="text"
                className="channel-card__message-input"
                placeholder="Mensagem (emotes separados por espaço)"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.currentTarget.value)}
              />
              <button type="submit" className="channel-card__message-add-btn">
                <Plus size={14} /> Adicionar
              </button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}

function formatViewers(viewers?: number) {
  if (viewers === undefined) {
    return undefined;
  }

  return `${new Intl.NumberFormat("pt-BR").format(viewers)} viewers`;
}
