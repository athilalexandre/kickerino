import { useState } from "react";
import { useReciprocity } from "../../hooks/useReciprocity";
import { ReciprocitySettingsPanel } from "./ReciprocitySettingsPanel";
import type { KickChannel } from "../../types/channel";
import {
  Sliders,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  UserCheck,
  UserX,
  ExternalLink,
} from "lucide-react";

interface ReciprocityDashboardProps {
  channels: KickChannel[];
  kickUsername: string | null;
  kickLoginStatus: "checking" | "connected" | "disconnected";
}

export function ReciprocityDashboard({
  channels,
  kickUsername,
  kickLoginStatus,
}: ReciprocityDashboardProps) {
  const {
    reciprocityData,
    settings,
    isSyncing,
    syncError,
    syncOne,
    syncAll,
    hasApiKey,
    saveApiKey,
    deleteApiKey,
    updateSettings,
  } = useReciprocity({ channels, kickUsername, kickLoginStatus });

  const [activeScreen, setActiveScreen] = useState<"ranking" | "settings">("ranking");

  // Summary Metrics
  const totalMonitored = reciprocityData.length;
  
  const reciprocalCount = reciprocityData.filter(
    (item) => item.chatted && (item.following || item.subscriber)
  ).length;

  const nonReciprocalCount = totalMonitored - reciprocalCount;

  if (activeScreen === "settings") {
    return (
      <ReciprocitySettingsPanel
        settings={settings}
        onSave={updateSettings}
        onClose={() => setActiveScreen("ranking")}
        hasApiKey={hasApiKey}
        onSaveApiKey={saveApiKey}
        onDeleteApiKey={deleteApiKey}
      />
    );
  }

  return (
    <div className="reciprocity-dashboard">
      {/* Header section */}
      <div className="reciprocity-dashboard__header">
        <div>
          <h2>Reciprocidade de Canais</h2>
          <p>
            Verifique se os canais que você apoia também apoiam você de volta.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setActiveScreen("settings")}
            title="Configurações e Chave API"
          >
            <Sliders size={16} />
            <span>Configurações</span>
          </button>

          <button
            type="button"
            className="btn btn--success"
            disabled={isSyncing || kickLoginStatus !== "connected" || !hasApiKey}
            onClick={() => void syncAll()}
          >
            <RefreshCw size={16} className={isSyncing ? "spin" : ""} />
            <span>{isSyncing ? "Verificando..." : "Verificar Todos"}</span>
          </button>
        </div>
      </div>

      {/* Login / API key warning or sync error */}
      {kickLoginStatus !== "connected" && (
        <div className="reciprocity-error-banner" style={{ borderLeftColor: "#dc5d57", background: "rgba(220, 93, 87, 0.1)" }}>
          <Info size={20} className="icon" style={{ color: "#dc5d57" }} />
          <div>
            <strong>Login da Kick Pendente:</strong>
            <p>Você precisa estar conectado na sua conta da Kick para verificar se os canais te seguem ou são subs.</p>
            <span className="helper">Clique no ícone de perfil no cabeçalho para fazer login na Kick.</span>
          </div>
        </div>
      )}

      {!hasApiKey && kickLoginStatus === "connected" && (
        <div className="reciprocity-error-banner" style={{ borderLeftColor: "#f0ad4e", background: "rgba(240, 173, 78, 0.1)" }}>
          <HelpCircle size={20} className="icon" style={{ color: "#f0ad4e" }} />
          <div>
            <strong>Chave API da MissXss Ausente:</strong>
            <p>A chave API é necessária para conferir se os canais já mandaram mensagem no seu chat.</p>
            <span className="helper">Vá em Configurações para salvar sua chave.</span>
          </div>
        </div>
      )}

      {syncError && (
        <div className="reciprocity-error-banner">
          <XCircle size={20} className="icon" />
          <div>
            <strong>Erro de Sincronização:</strong>
            <p>{syncError}</p>
          </div>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="reciprocity-summary-grid">
        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--blue">
            <Users size={22} />
          </div>
          <div className="summary-card__data">
            <span>Canais Monitorados</span>
            <h3>{totalMonitored}</h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--green">
            <UserCheck size={22} />
          </div>
          <div className="summary-card__data">
            <span>Recíprocos</span>
            <h3>{reciprocalCount}</h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--warning">
            <UserX size={22} />
          </div>
          <div className="summary-card__data">
            <span>Pendentes / Não Recíprocos</span>
            <h3>{nonReciprocalCount}</h3>
          </div>
        </div>
      </div>

      {/* Info Badge */}
      <div className="reciprocity-filter-bar" style={{ padding: "12px 16px" }}>
        <div className="info-badge" style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: "#8fa1a8", fontSize: "13px" }}>
          <Info size={16} style={{ color: "#75e39b", flexShrink: 0 }} />
          <span>
            <strong>Critério de Reciprocidade:</strong> O canal de apoio deve ter enviado pelo menos 1 mensagem no seu chat nos últimos 7 dias <strong>E</strong> ser seguidor ou sub do seu canal.
          </span>
        </div>
      </div>

      {/* Table Section */}
      {totalMonitored === 0 ? (
        <div className="empty-state">
          <UserX size={40} style={{ color: "#8fa1a8" }} />
          <strong>Nenhum canal no Apoio de Canais</strong>
          <span>
            Adicione canais na aba "Apoio de Canais" para que eles apareçam aqui para monitoramento.
          </span>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="reciprocity-table">
            <thead>
              <tr>
                <th>Canal</th>
                <th style={{ width: "120px", textAlign: "center" }}>Seguidor?</th>
                <th style={{ width: "120px", textAlign: "center" }}>Subscriber?</th>
                <th style={{ width: "160px", textAlign: "center" }}>Já Falou no Chat?</th>
                <th style={{ width: "140px", textAlign: "center" }}>Status</th>
                <th style={{ width: "180px" }}>Última Verificação</th>
                <th style={{ width: "100px", textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {reciprocityData.map((item) => {
                const isReciprocal = item.chatted && (item.following || item.subscriber);

                return (
                  <tr key={item.username}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.displayName}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              border: "1px solid #28343a",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "#28343a",
                              color: "#f6fafb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            {item.displayName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ color: "#f6fafb" }}>{item.displayName}</strong>
                          <a
                            href={`https://kick.com/${item.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px",
                              color: "#75e39b",
                              textDecoration: "none",
                              marginTop: "2px",
                            }}
                          >
                            <span>kick.com/{item.username}</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.lastChecked ? (
                        item.following ? (
                          <CheckCircle2 size={18} style={{ color: "#42c773" }} />
                        ) : (
                          <XCircle size={18} style={{ color: "#dc5d57" }} />
                        )
                      ) : (
                        <span style={{ color: "#8fa1a8", fontSize: "12px" }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.lastChecked ? (
                        item.subscriber ? (
                          <CheckCircle2 size={18} style={{ color: "#42c773" }} />
                        ) : (
                          <XCircle size={18} style={{ color: "#dc5d57" }} />
                        )
                      ) : (
                        <span style={{ color: "#8fa1a8", fontSize: "12px" }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.lastChecked ? (
                        item.chatted ? (
                          <CheckCircle2 size={18} style={{ color: "#42c773" }} />
                        ) : (
                          <XCircle size={18} style={{ color: "#dc5d57" }} />
                        )
                      ) : (
                        <span style={{ color: "#8fa1a8", fontSize: "12px" }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.lastChecked ? (
                        isReciprocal ? (
                          <span className="status-pill" data-status="Active" style={{ background: "rgba(66, 199, 115, 0.15)", color: "#42c773", padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                            Recíproco
                          </span>
                        ) : (
                          <span className="status-pill" data-status="Inactive" style={{ background: "rgba(220, 93, 87, 0.15)", color: "#dc5d57", padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                            Não Recíproco
                          </span>
                        )
                      ) : (
                        <span className="status-pill" data-status="New" style={{ background: "rgba(143, 161, 168, 0.15)", color: "#8fa1a8", padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                          Pendente
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "12px", color: "#8fa1a8" }}>
                      {item.lastChecked
                        ? new Date(item.lastChecked).toLocaleString()
                        : "Nunca verificado"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn btn--secondary btn--small"
                        disabled={isSyncing || kickLoginStatus !== "connected" || !hasApiKey}
                        onClick={() => void syncOne(item.username)}
                        style={{
                          height: "26px",
                          padding: "0 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                        }}
                      >
                        <RefreshCw size={12} />
                        <span>Verificar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
