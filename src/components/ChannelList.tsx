import { Bot, Plus, RefreshCcw } from "lucide-react";
import { FormEvent, useState } from "react";
import type { KickChannel } from "../types/channel";
import { ChannelAvatar } from "./ChannelAvatar";
import { StatusBadge } from "./StatusBadge";
import { formatCountdown } from "../hooks/useSupportBot";

type ChannelListProps = {
  channels: KickChannel[];
  selectedSlug: string;
  isChecking: boolean;
  onAdd: (value: string) => boolean;
  onRefresh: () => void;
  onSelect: (slug: string) => void;
  activeSupportSlugs: string[];
  channelSupportStatuses?: Record<string, "pending" | "sending" | "sent" | "failed">;
};

export function ChannelList({
  channels,
  selectedSlug,
  isChecking,
  onAdd,
  onRefresh,
  onSelect,
  activeSupportSlugs,
  channelSupportStatuses = {},
}: ChannelListProps) {
  const [draft, setDraft] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (onAdd(draft)) {
      setDraft("");
    }
  }

  return (
    <aside className="sidebar">
      <form className="add-channel" onSubmit={submit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="canal da Kick"
          aria-label="Canal da Kick"
        />
        <button className="icon-button icon-button--primary" type="submit" title="Adicionar canal">
          <Plus size={18} />
        </button>
      </form>

      <button
        className={`sidebar-row ${selectedSlug === "all" ? "sidebar-row--active" : ""}`}
        type="button"
        onClick={() => onSelect("all")}
      >
        <span className="sidebar-row__marker sidebar-row__marker--all" />
        <span>Todos</span>
        <strong>{channels.length}</strong>
      </button>

      <div className="sidebar-list">
        {channels.map((channel) => {
          const displayName = channel.username ?? channel.slug;
          const isSupported = activeSupportSlugs.includes(channel.slug);
          const sendingStatus = channelSupportStatuses[channel.slug];
          return (
            <button
              className={`sidebar-row ${selectedSlug === channel.slug ? "sidebar-row--active" : ""}`}
              key={channel.slug}
              type="button"
              onClick={() => onSelect(channel.slug)}
            >
              <ChannelAvatar src={channel.avatarUrl} name={displayName} />
              <span className="sidebar-row__name">{displayName}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {isSupported && sendingStatus && (
                  <span 
                    title={`Status de envio: ${sendingStatus}`} 
                    style={{ 
                      display: "inline-flex", 
                      alignItems: "center", 
                      gap: "3px",
                      fontSize: "10px",
                      color: sendingStatus === "sent" ? "#42c773" : 
                             sendingStatus === "failed" ? "#dc5d57" :
                             sendingStatus === "sending" ? "#3b82f6" : "#8fa1a8",
                      fontWeight: "bold",
                      background: sendingStatus === "sent" ? "rgba(66, 199, 115, 0.1)" :
                                  sendingStatus === "failed" ? "rgba(220, 93, 87, 0.1)" :
                                  sendingStatus === "sending" ? "rgba(59, 130, 246, 0.1)" : "rgba(143, 161, 168, 0.1)",
                      padding: "1px 4px",
                      borderRadius: "3px"
                    }}
                  >
                    <Bot size={11} />
                    <span>
                      {sendingStatus === "sent" ? "Enviado" :
                       sendingStatus === "failed" ? "Falhou" :
                       sendingStatus === "sending" ? "Env..." : "Pend."}
                    </span>
                  </span>
                )}
                <StatusBadge status={channel.status} />
              </span>
            </button>
          );
        })}
      </div>


      <button className="refresh-button" type="button" onClick={onRefresh} disabled={isChecking}>
        <RefreshCcw size={17} className={isChecking ? "spin" : ""} />
        <span>{isChecking ? "Checando" : "Atualizar"}</span>
      </button>
    </aside>
  );
}
