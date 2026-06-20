import { useState } from "react";
import { useReciprocity } from "../../hooks/useReciprocity";
import { BlockedUserManager } from "./BlockedUserManager";
import { FriendDetails } from "./FriendDetails";
import { ReciprocitySettingsPanel } from "./ReciprocitySettingsPanel";
import {
  Users,
  Activity,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Info,
  ChevronRight,
  TrendingDown,
  UserCheck,
  EyeOff,
  Calendar,
} from "lucide-react";

export function ReciprocityDashboard() {
  const {
    blockedUsers,
    closedWeeks,
    currentWeekMondayStr,
    currentWeekData,
    settings,
    rankings,
    isSyncing,
    syncError,
    selectedMode,
    setSelectedMode,
    blockUser,
    unblockUser,
    updateSettings,
    syncWatchTime,
    hasApiKey,
    saveApiKey,
    deleteApiKey,
  } = useReciprocity();

  const [activeScreen, setActiveScreen] = useState<"ranking" | "manage" | "settings">("ranking");
  const [selectedViewer, setSelectedViewer] = useState<{ username: string; platform: any } | null>(null);

  // Overview calculations
  const totalTracked = rankings.length;
  const activeCount = rankings.filter((r) => r.status === "Active").length;
  const droppingCount = rankings.filter((r) => r.status === "Dropping").length;
  const blockedCount = blockedUsers.length;

  const handleOpenDetails = (username: string, platform: any) => {
    setSelectedViewer({ username, platform });
  };

  // If viewing details of a viewer, render it
  if (selectedViewer) {
    return (
      <FriendDetails
        username={selectedViewer.username}
        platform={selectedViewer.platform}
        closedWeeks={closedWeeks}
        currentWeekData={currentWeekData}
        rankings={rankings}
        settings={settings}
        onClose={() => setSelectedViewer(null)}
      />
    );
  }

  if (activeScreen === "manage") {
    return (
      <BlockedUserManager
        blockedUsers={blockedUsers}
        onUnblock={unblockUser}
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
          <p>Monitore quem está apoiando e interagindo na sua live através da MissXss.</p>
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
            className="btn btn--secondary"
            onClick={() => setActiveScreen("manage")}
            title="Ver canais ocultados"
          >
            <EyeOff size={16} />
            <span>Ocultados ({blockedCount})</span>
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
              Certifique-se de configurar a sua Chave API da MissXss no botão <strong>Configurações</strong> acima ou declare-a como variável de ambiente no seu sistema.
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
            <span>Total Espectadores</span>
            <h3>{totalTracked}</h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--green">
            <UserCheck size={22} />
          </div>
          <div className="summary-card__data">
            <span>Ativos (Esta Semana)</span>
            <h3>{activeCount}</h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--warning">
            <TrendingDown size={22} />
          </div>
          <div className="summary-card__data">
            <span>Caindo (Esta Semana)</span>
            <h3>{droppingCount}</h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__icon summary-card__icon--danger">
            <Activity size={22} />
          </div>
          <div className="summary-card__data">
            <span>Ocultados</span>
            <h3>{blockedCount}</h3>
          </div>
        </div>
      </div>

      {/* Filtering and Information Bar */}
      <div className="reciprocity-filter-bar">
        <div className="window-filters" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className={`filter-tab ${selectedMode === "week" ? "filter-tab--active" : ""}`}
            onClick={() => setSelectedMode("week")}
          >
            Esta Semana (Rank da Semana)
          </button>
          <button
            type="button"
            className={`filter-tab ${selectedMode === "eternal" ? "filter-tab--active" : ""}`}
            onClick={() => setSelectedMode("eternal")}
          >
            Ranking Eterno (Acumulado)
          </button>

          {closedWeeks.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px" }}>
              <Calendar size={14} style={{ color: "#8fa1a8" }} />
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                style={{
                  height: "30px",
                  background: "#151b1f",
                  border: "1px solid #2a3338",
                  borderRadius: "6px",
                  color: "#edf4f6",
                  fontSize: "12px",
                  padding: "0 6px",
                  outline: "none"
                }}
              >
                <option value="week" disabled>Semanas Fechadas...</option>
                {closedWeeks.map((cw) => (
                  <option key={cw.weekMonday} value={cw.weekMonday}>
                    Semana de {cw.weekMonday}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="info-badge">
          <Info size={14} />
          <span>Fórmula: {settings.minutesPerPoint} min = 1 ponto semanal</span>
        </div>
      </div>

      {/* Ranking Table */}
      {totalTracked === 0 ? (
        <div className="empty-state">
          <Sparkles size={40} style={{ color: "#75e39b" }} />
          <strong>Nenhum espectador encontrado</strong>
          <span>
            {hasApiKey ? "Clique em Sincronizar para buscar a lista de espectadores mais recentes no MissXss." : "Configure sua chave API nas Configurações para carregar os dados de watch time."}
          </span>
          {!hasApiKey && (
            <button
              type="button"
              className="btn btn--primary"
              style={{ marginTop: "10px" }}
              onClick={() => setActiveScreen("settings")}
            >
              Configurar Chave API
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="reciprocity-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Pos.</th>
                <th>Nome / Espectador</th>
                <th style={{ width: "120px" }}>Plataforma</th>
                <th style={{ width: "160px" }}>Username</th>
                <th>Watch Time</th>
                <th>Mensagens</th>
                <th>Pontos de Reciprocidade</th>
                {selectedMode !== "week" && selectedMode !== "eternal" ? null : (
                  <th style={{ width: "70px" }}>Tend.</th>
                )}
                <th style={{ width: "140px" }}>Status</th>
                <th style={{ width: "60px" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((result, idx) => {
                // Trend rendering
                let trendIcon = <Minus size={16} className="trend-icon trend-icon--stable" />;
                if (result.trendDirection === "up") {
                  trendIcon = <ArrowUp size={16} className="trend-icon trend-icon--up" />;
                } else if (result.trendDirection === "down") {
                  trendIcon = <ArrowDown size={16} className="trend-icon trend-icon--down" />;
                }

                const displayPoints = result.points === 1 ? "1 ponto" : `${result.points} pontos`;

                return (
                  <tr
                    key={`${result.platform}:${result.username}`}
                    className="reciprocity-row-clickable"
                    onClick={() => handleOpenDetails(result.username, result.platform)}
                    title="Clique para ver o histórico e gráficos deste espectador"
                  >
                    <td>
                      <strong className="rank-position">#{result.rank}</strong>
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
                      <span className="score-badge" style={{ fontSize: "14px" }}>{displayPoints}</span>
                    </td>
                    {selectedMode !== "week" && selectedMode !== "eternal" ? null : (
                      <td>{trendIcon}</td>
                    )}
                    <td>
                      <span className="status-pill" data-status={result.status}>
                        {result.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--danger btn--small"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening detail panel
                          if (confirm(`Deseja ocultar ${result.displayName} do ranking de reciprocidade?`)) {
                            blockUser(result.platform, result.username);
                          }
                        }}
                        style={{ padding: "0 8px", height: "28px" }}
                        title="Ocultar do ranking"
                      >
                        Ocultar
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
