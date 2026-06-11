import { Bot, ExternalLink, Send, Trash2 } from "lucide-react";
import { openKickChannel } from "../services/live";
import type { KickChannel } from "../types/channel";
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
}: ChannelCardProps) {
  const displayName = channel.username ?? channel.slug;
  const stats =
    channel.status === "live"
      ? [channel.category, formatViewers(channel.viewers)].filter(Boolean).join(" - ")
      : channel.errorMessage ?? "Aguardando proxima checagem";

  return (
    <article
      className={`channel-card channel-card--${channel.status}`}
      onDoubleClick={() => {
        if (openLiveOnDoubleClick) void openKickChannel(channel.slug);
      }}
    >
      <button
        className="channel-card__main"
        type="button"
        onClick={() => onSelect(channel.slug)}
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


      <div className="channel-card__actions">
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
    </article>
  );
}

function formatViewers(viewers?: number) {
  if (viewers === undefined) {
    return undefined;
  }

  return `${new Intl.NumberFormat("pt-BR").format(viewers)} viewers`;
}
