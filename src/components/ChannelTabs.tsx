import type { KickChannel } from "../types/channel";

type ChannelTabsProps = {
  channels: KickChannel[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
};

export function ChannelTabs({ channels, selectedSlug, onSelect }: ChannelTabsProps) {
  return (
    <nav className="tabs" aria-label="Abas de canais">
      <button
        className={`tab ${selectedSlug === "all" ? "tab--active" : ""}`}
        type="button"
        onClick={() => onSelect("all")}
      >
        Todos
      </button>
      {channels.map((channel) => (
        <button
          className={`tab tab--${channel.status} ${selectedSlug === channel.slug ? "tab--active" : ""}`}
          key={channel.slug}
          type="button"
          onClick={() => onSelect(channel.slug)}
        >
          {channel.username ?? channel.slug}
        </button>
      ))}
    </nav>
  );
}
