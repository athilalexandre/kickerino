import { ExternalLink, Trash2 } from "lucide-react";
import { openKickChannel } from "../services/live";
import type { KickChannel } from "../types/channel";
import { ChannelAvatar } from "./ChannelAvatar";
import { StatusBadge } from "./StatusBadge";

type ChannelCardProps = {
  channel: KickChannel;
  onRemove: (slug: string) => void;
  onSelect: (slug: string) => void;
  openLiveOnDoubleClick: boolean;
};

export function ChannelCard({
  channel,
  onRemove,
  onSelect,
  openLiveOnDoubleClick,
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
            <StatusBadge status={channel.status} />
          </span>
          <span className="channel-card__title">
            {channel.title ?? `kick.com/${channel.slug}`}
          </span>
          <span className="channel-card__meta">{stats}</span>
        </span>
      </button>

      <div className="channel-card__actions">
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
