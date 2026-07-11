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
  sendingStatus?: "pending" | "sending" | "sent" | "failed";
  onSendNow?: (slug: string) => void;
  onToggleSupport?: (slug: string) => void;
  onUpdateSupportConfig?: (slug: string, config: Partial<ChannelSupportConfig>) => void;
  globalIntervalMinutes?: number;
  cooldownSeconds?: number;
};

export function ChannelCard({
  channel,
  onRemove,
  onSelect,
  openLiveOnDoubleClick,
  isSupported,
  sendingStatus,
  onSendNow,
  onToggleSupport,
  onUpdateSupportConfig,
  globalIntervalMinutes,
  cooldownSeconds,
}: ChannelCardProps) {
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);

  const displayName = channel.username ?? channel.slug;
  const stats =
    channel.status === "live"
      ? [channel.category, formatViewers(channel.viewers)].filter(Boolean).join(" - ")
      : channel.errorMessage ?? "Aguardando proxima checagem";

  const supportConfig = channel.supportConfig || { messages: [], nextMessageIndex: 0 };

  const handleIntervalChange = (val: string) => {
    const min = val === "" ? undefined : Math.max(1, parseInt(val, 10));
    if (onUpdateSupportConfig) {
      onUpdateSupportConfig(channel.slug, { intervalMinutes: min });
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
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
        <button
          className="channel-card__main"
          type="button"
          onClick={() => onSelect(channel.slug)}
          style={{ width: "100%" }}
        >
          <ChannelAvatar src={channel.avatarUrl} name={displayName} />
          <span className="channel-card__body">
            <span className="channel-card__topline">
              <strong>{displayName}</strong>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {isSupported && (() => {
                  const hasCooldown = cooldownSeconds !== undefined && cooldownSeconds > 0;
                  let badgeColor = "#3b82f6"; // Pendente (Azul)
                  let badgeBg = "rgba(59, 130, 246, 0.1)";

                  if (sendingStatus === "sending") {
                    badgeColor = "#3b82f6"; // Azul
                    badgeBg = "rgba(59, 130, 246, 0.1)";
                  } else if (hasCooldown) {
                    if (sendingStatus === "failed") {
                      badgeColor = "#dc5d57"; // Vermelho
                      badgeBg = "rgba(220, 93, 87, 0.1)";
                    } else if (sendingStatus === "sent") {
                      badgeColor = "#eab308"; // Amarelo (Em Fila)
                      badgeBg = "rgba(234, 179, 8, 0.1)";
                    } else {
                      badgeColor = "#3b82f6"; // Azul (Pendente)
                      badgeBg = "rgba(59, 130, 246, 0.1)";
                    }
                  } else {
                    if (sendingStatus === "sent") {
                      badgeColor = "#42c773"; // Verde (Enviada)
                      badgeBg = "rgba(66, 199, 115, 0.1)";
                    } else if (sendingStatus === "failed") {
                      badgeColor = "#dc5d57"; // Vermelho
                      badgeBg = "rgba(220, 93, 87, 0.1)";
                    } else {
                      badgeColor = "#3b82f6"; // Azul (Pendente)
                      badgeBg = "rgba(59, 130, 246, 0.1)";
                    }
                  }

                  return (
                    <span 
                      title={`Status de envio: ${sendingStatus || "pending"}`} 
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "4px",
                        fontSize: "11px",
                        color: badgeColor,
                        fontWeight: "bold",
                        background: badgeBg,
                        padding: "2px 6px",
                        borderRadius: "6px"
                      }}
                    >
                      <Bot size={13} />
                      <span>
                        {sendingStatus === "sending" ? "Enviando..." :
                         cooldownSeconds !== undefined && cooldownSeconds > 0 ? `${sendingStatus === "sent" ? "Em fila" : sendingStatus === "failed" ? "Falhou" : "Pendente"} (${formatCountdown(cooldownSeconds)})` :
                         sendingStatus === "sent" ? "Enviada" :
                         sendingStatus === "failed" ? "Falhou" : "Pendente"}
                      </span>
                    </span>
                  );
                })()}
                <StatusBadge status={channel.status} />
              </span>
            </span>
            <span className="channel-card__title">
              {channel.title ?? `kick.com/${channel.slug}`}
            </span>
            <span className="channel-card__meta">{stats}</span>
          </span>
        </button>

        <div className="channel-card__actions" style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #242b30", paddingTop: "10px", width: "100%" }}>
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

          <div className="channel-card__config-row" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
            <label className="channel-card__config-field" style={{ width: "100%" }}>
              <span>Intervalo do Canal (min):</span>
              <input
                type="number"
                min={1}
                placeholder={`${globalIntervalMinutes ?? 10} min (Padrão)`}
                value={supportConfig.intervalMinutes !== undefined ? supportConfig.intervalMinutes : ""}
                onChange={(e) => handleIntervalChange(e.currentTarget.value)}
              />
            </label>
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
