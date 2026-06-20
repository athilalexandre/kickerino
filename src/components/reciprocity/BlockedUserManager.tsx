import type React from "react";
import { useState } from "react";
import { ShieldAlert, Trash2, Search, ArrowLeft } from "lucide-react";

interface BlockedUserManagerProps {
  blockedUsers: string[]; // List of lowercase "platform:username" keys
  onUnblock: (key: string) => void;
  onClose: () => void;
}

export function BlockedUserManager({
  blockedUsers,
  onUnblock,
  onClose,
}: BlockedUserManagerProps) {
  const [filterText, setFilterText] = useState("");

  const filtered = blockedUsers.filter((key) => {
    return key.toLowerCase().includes(filterText.toLowerCase());
  });

  return (
    <div className="friend-manager-panel">
      <div className="friend-manager-panel__header">
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldAlert size={20} style={{ color: "#dc5d57" }} />
          Canais Ocultados da Reciprocidade
        </h3>
        <button type="button" className="btn btn--link" onClick={onClose}>
          <ArrowLeft size={16} />
          <span>Voltar ao Painel</span>
        </button>
      </div>

      <div style={{
        padding: "20px",
        borderRadius: "8px",
        border: "1px solid #28343a",
        background: "#151b1f",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        <p style={{ margin: "0", fontSize: "13px", color: "#8fa1a8" }}>
          Espectadores adicionados a esta lista são ocultados do ranking semanal e do ranking eterno. Útil para ignorar robôs ou perfis que você não deseja monitorar.
        </p>

        {/* Search filter */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Pesquisar por usuário bloqueado..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              paddingLeft: "36px",
              height: "38px",
              background: "#101417",
              border: "1px solid #2a3338",
              borderRadius: "6px",
              color: "#edf4f6",
              width: "100%",
              outline: "none"
            }}
          />
          <Search size={16} style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#8fa1a8"
          }} />
        </div>

        {blockedUsers.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            color: "#8fa1a8",
            textAlign: "center"
          }}>
            <strong>Nenhum canal ocultado</strong>
            <span style={{ fontSize: "12px", marginTop: "4px" }}>
              Você pode ocultar canais diretamente clicando no ícone de lixeira/bloqueio na tabela de ranking.
            </span>
          </div>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            maxHeight: "360px",
            overflowY: "auto"
          }} className="friend-manager-list">
            {filtered.length === 0 ? (
              <p style={{ color: "#8fa1a8", fontSize: "12px", textAlign: "center", padding: "10px" }}>
                Nenhum resultado para a busca.
              </p>
            ) : (
              filtered.map((userKey) => {
                const parts = userKey.split(":");
                const platform = parts[0] || "Kick";
                const username = parts[1] || "";
                
                // Format capitalize platform
                const formattedPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);

                return (
                  <div key={userKey} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "rgba(17, 20, 23, 0.4)",
                    border: "1px solid #242b30",
                    borderRadius: "6px"
                  }} className="friend-manager-item">
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <span className="platform-pill" data-platform={formattedPlatform} style={{ fontSize: "10px", padding: "1px 5px" }}>
                        {formattedPlatform}
                      </span>
                      <strong style={{ color: "#f6fafb" }}>{username}</strong>
                    </div>

                    <button
                      type="button"
                      className="btn btn--danger btn--small"
                      onClick={() => onUnblock(userKey)}
                      title="Remover bloqueio e voltar a exibir"
                    >
                      <Trash2 size={13} />
                      <span>Reexibir</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
