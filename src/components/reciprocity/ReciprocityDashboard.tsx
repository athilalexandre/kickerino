import { useState } from "react";
import { useReciprocity } from "../../hooks/useReciprocity";
import { FriendManager } from "./FriendManager";
import { FriendDetails } from "./FriendDetails";
import { ReciprocitySettingsPanel } from "./ReciprocitySettingsPanel";
import {
  Users,
  Activity,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Settings,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Info,
  ChevronRight,
  TrendingDown,
  UserCheck,
} from "lucide-react";
import type { FriendChannel } from "../../types/reciprocity";

export function ReciprocityDashboard() {
  const {
    friends,
    snapshots,
    settings,
    rankings,
    isSyncing,
    syncError,
    selectedWindow,
    setSelectedWindow,
    addFriend,
    updateFriend,
    removeFriend,
    toggleFriendEnabled,
    updateSettings,
    syncWatchTime,
    hasApiKey,
    saveApiKey,
    deleteApiKey,
  } = useReciprocity();

  const [activeScreen, setActiveScreen] = useState<"ranking" | "manage" | "settings">("ranking");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // Overview calculations
  const totalTracked = friends.length;
  const activeCount = rankings.filter((r) => r.status === "Active").length;
  const droppingCount = rankings.filter((r) => r.status === "Dropping").length;
  const inactiveCount = rankings.filter((r) => r.status === "Inactive").length;

  const handleOpenDetails = (id: string) => {
    setSelectedFriendId(id);
  };

  const selectedFriend = friends.find((f) => f.id === selectedFriendId);

  // If viewing details of a friend, overlay or display it
  if (selectedFriendId && selectedFriend) {
    return (
      <FriendDetails
        friend={selectedFriend}
        snapshots={snapshots}
        rankings={rankings}
        onClose={() => setSelectedFriendId(null)}
      />
    );
  }

  if (activeScreen === "manage") {
    return (
      <FriendManager
        friends={friends}
        onAdd={addFriend}
        onUpdate={updateFriend}
        onRemove={removeFriend}
        onClose={() => setActiveScreen("ranking")}
      />
    );
  }

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
      {/* Top action bar */}
      <div className="reciprocity-dashboard__header">
        <div>
          <h2>Painel de Reciprocidade</h2>
          <p>Monitore quem está apoiando e interagindo na sua live.</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setActiveScreen("settings")}
            title="Configurar critérios de pontuação"
          >
            <Sliders size={16} />
            <span>Configurações</span>
          </button>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setActiveScreen("manage")}
          >
            <Users size={16} />
            <span>Gerenciar Amigos</span>
          </button>

          <button
            type="button"
            className="btn btn--success"
            disabled={isSyncing}
            onClick={() => void syncWatchTime()}
          >
            <RefreshCw size={16} className={isSyncing ? "spin" : ""} />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
          </button>
        </div>
      </div>

      {/* Sync Error Banner */}
      {syncError && (
        <div className="reciprocity-error-banner">
          <AlertTriangle size={20} className="icon" />
          <div>
            <strong>Erro de Sincronização:</strong>
            <p>{syncError}</p>
            <span className="helper">
              Certifique-se de configurar a variável de ambiente <code>MISSXSS_API_KEY</code> no
              seu sistema e reiniciar o aplicativo para aplicar as alterações.
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="reciprocity-summary-grid">
        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--blue">
            <Users size={22} />
          </div>
          <div className="summary-card__data">
            <span>Total Monitorados</span>
            <h3>{totalTracked}</h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--green">
            <UserCheck size={22} />
          </div>
          <div className="summary-card__data">
            <span>Amigos Ativos</span>
            <h3>{activeCount}</h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--warning">
            <TrendingDown size={22} />
          </div>
          <div className="summary-card__data">
            <span>Caindo</span>
            <h3>{droppingCount}</h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--danger">
            <Activity size={22} />
          </div>
          <div className="summary-card__data">
            <span>Inativos</span>
            <h3>{inactiveCount}</h3>
          </div>
        </div>
      </div>

      {/* Filtering and Information Bar */}
      <div className="reciprocity-filter-bar">
        <div className="window-filters">
          {(["24h", "7d", "30d", "all"] as const).map((win) => {
            const label =
              win === "24h"
                ? "24 Horas"
                : win === "7d"
                  ? "7 Dias (Padrão)"
                  : win === "30d"
                    ? "30 Dias"
                    : "Todo Período";
            return (
              <button
                key={win}
                type="button"
                className={`filter-tab ${selectedWindow === win ? "filter-tab--active" : ""}`}
                onClick={() => setSelectedWindow(win)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="info-badge">
          <Info size={14} />
          <span>Classificação atualiza a cada {settings.pollingIntervalMinutes} min</span>
        </div>
      </div>

      {/* Ranking Table */}
      {totalTracked === 0 ? (
        <div className="empty-state">
          <Sparkles size={40} style={{ color: "#75e39b" }} />
          <strong>Nenhum canal monitorado</strong>
          <span>
            Adicione canais de amigos no menu "Gerenciar Amigos" para começar a analisar watch time.
          </span>
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: "10px" }}
            onClick={() => setActiveScreen("manage")}
          >
            Adicionar Primeiro Canal
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="reciprocity-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Pos.</th>
                <th>Nome / Amigo</th>
                <th style={{ width: "120px" }}>Plataforma</th>
                <th style={{ width: "160px" }}>Username</th>
                <th>Watch Time</th>
                <th>Mensagens</th>
                <th>Pontuação</th>
                <th style={{ width: "70px" }}>Tend.</th>
                <th style={{ width: "140px" }}>Status</th>
                <th style={{ width: "120px" }}>Último Check</th>
                <th style={{ width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {rankings
                .sort((a, b) => {
                  if (a.status === "New" && b.status !== "New") return 1;
                  if (b.status === "New" && a.status !== "New") return -1;
                  return b.score - a.score;
                })
                .map((result, idx) => {
                  const hasData = result.status !== "New";
                  const rankDisplay = hasData ? `#${idx + 1}` : "-";

                  // Trend rendering
                  let trendIcon = <Minus size={16} className="trend-icon trend-icon--stable" />;
                  if (result.trendDirection === "up") {
                    trendIcon = <ArrowUp size={16} className="trend-icon trend-icon--up" />;
                  } else if (result.trendDirection === "down") {
                    trendIcon = <ArrowDown size={16} className="trend-icon trend-icon--down" />;
                  }

                  return (
                    <tr
                      key={result.friendChannelId}
                      className="reciprocity-row-clickable"
                      onClick={() => handleOpenDetails(result.friendChannelId)}
                      title="Clique para ver o gráfico e histórico de suporte"
                    >
                      <td>
                        <strong className="rank-position">{rankDisplay}</strong>
                      </td>
                      <td>
                        <div className="name-cell">
                          <strong>{result.displayName}</strong>
                          <ChevronRight size={14} className="hover-arrow" />
                        </div>
                      </td>
                      <td>
                        <span className="platform-pill" data-platform={result.platform}>
                          {result.platform}
                        </span>
                      </td>
                      <td>
                        <code className="username-code">{result.username}</code>
                      </td>
                      <td>
                        <strong>{result.watchTimeMinutes} min</strong>
                      </td>
                      <td>{result.messageCount}</td>
                      <td>
                        <span className="score-badge">{result.score} pts</span>
                      </td>
                      <td>{hasData ? trendIcon : "-"}</td>
                      <td>
                        <span className="status-pill" data-status={result.status}>
                          {result.status === "New" ? "Sem Dados" : result.status}
                        </span>
                      </td>
                      <td>
                        <span className="date-cell">
                          {new Date(result.lastChecked).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td>
                        <ChevronRight size={16} className="table-arrow-indicator" />
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
