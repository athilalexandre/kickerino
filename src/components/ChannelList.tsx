import { invoke } from "@tauri-apps/api/core";
import { Bot, FileDown, Plus, RefreshCcw } from "lucide-react";
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
  channelCooldowns?: Record<string, number>;
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
  channelCooldowns = {},
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
                {isSupported && (() => {
                  const hasCooldown = channelCooldowns[channel.slug] !== undefined && channelCooldowns[channel.slug] > 0;
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

                  let text = "Pend.";
                  if (sendingStatus === "sending") text = "Env...";
                  else if (hasCooldown) {
                    text = sendingStatus === "sent" ? "Fila" : sendingStatus === "failed" ? "Falhou" : "Pend.";
                  } else {
                    text = sendingStatus === "sent" ? "Enviado" : sendingStatus === "failed" ? "Falhou" : "Pend.";
                  }

                  return (
                    <span 
                      title={`Status de envio: ${sendingStatus || "pending"}`} 
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "3px",
                        fontSize: "10px",
                        color: badgeColor,
                        fontWeight: "bold",
                        background: badgeBg,
                        padding: "1px 4px",
                        borderRadius: "5px"
                      }}
                    >
                      <Bot size={11} />
                      <span>{text}</span>
                    </span>
                  );
                })()}
                <StatusBadge status={channel.status} />
              </span>
            </button>
          );
        })}
      </div>


      <div className="sidebar-footer">
        <button className="refresh-button" type="button" onClick={onRefresh} disabled={isChecking}>
          <RefreshCcw size={17} className={isChecking ? "spin" : ""} />
          <span>{isChecking ? "Checando" : "Atualizar"}</span>
        </button>
        <button
          className="refresh-button"
          type="button"
          title="Exportar lista de canais (.txt)"
          onClick={() => {
            const text = channels.map((c) => c.slug).join("\n");
            void invoke("export_channels_txt", { content: text });
          }}
        >
          <FileDown size={17} />
        </button>
      </div>
    </aside>
  );
}
