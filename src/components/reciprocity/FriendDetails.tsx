import type { ClosedWeekRecord, ViewerStats, Platform } from "../../types/reciprocity";
import { ArrowLeft, Clock, MessageSquare, Award, TrendingUp, Sparkles } from "lucide-react";

interface FriendDetailsProps {
  username: string;
  platform: Platform;
  closedWeeks: ClosedWeekRecord[];
  currentWeekData: ViewerStats[];
  rankings: any[]; // RankingResult[]
  settings: any;
  onClose: () => void;
}

export function FriendDetails({
  username,
  platform,
  closedWeeks,
  currentWeekData,
  rankings,
  settings,
  onClose,
}: FriendDetailsProps) {
  const userKey = `${platform.toLowerCase()}:${username.toLowerCase()}`;
  const currentRankInfo = rankings.find(
    (r) => r.username.toLowerCase() === username.toLowerCase() && r.platform.toLowerCase() === platform.toLowerCase()
  );

  // 1. Gather all weekly records for this user
  const weeklyHistory: {
    weekMonday: string;
    points: number;
    watchTimeMinutes: number;
    messageCount: number;
  }[] = [];

  // Add closed weeks history
  for (const week of closedWeeks) {
    const record = week.viewerPoints[userKey];
    if (record) {
      weeklyHistory.push({
        weekMonday: week.weekMonday,
        points: record.points,
        watchTimeMinutes: record.watchTimeMinutes,
        messageCount: record.messageCount,
      });
    }
  }

  // Add current week (if they have stats)
  const currentStats = currentWeekData.find(
    (v) => v.username.toLowerCase() === username.toLowerCase() && v.platform.toLowerCase() === platform.toLowerCase()
  );
  if (currentStats) {
    const currentMonday = new Date();
    // get monday date string
    const currentDay = currentMonday.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    currentMonday.setDate(currentMonday.getDate() + distanceToMonday);
    const currentMondayStr = `${currentMonday.getFullYear()}-${String(
      currentMonday.getMonth() + 1
    ).padStart(2, "0")}-${String(currentMonday.getDate()).padStart(2, "0")}`;

    const currentPoints = Math.floor(currentStats.watchTimeMinutes / settings.minutesPerPoint);

    weeklyHistory.push({
      weekMonday: currentMondayStr + " (Atual)",
      points: currentPoints,
      watchTimeMinutes: currentStats.watchTimeMinutes,
      messageCount: currentStats.messageCount,
    });
  }

  // Sort history chronologically
  const sortedHistory = [...weeklyHistory].sort(
    (a, b) => new Date(a.weekMonday.split(" ")[0]).getTime() - new Date(b.weekMonday.split(" ")[0]).getTime()
  );

  // SVG Chart Helper
  const renderChart = (data: typeof sortedHistory) => {
    if (data.length < 2) {
      return (
        <div className="detail-chart-placeholder">
          <p>Histórico semanal insuficiente</p>
          <span>O gráfico de pontos acumulados será exibido assim que houver mais semanas fechadas.</span>
        </div>
      );
    }

    const width = 500;
    const height = 150;
    const padding = 20;

    const values = data.map((d) => d.points);
    const maxVal = Math.max(...values, 10);
    const minVal = 0;

    const getX = (idx: number) => padding + (idx / (data.length - 1)) * (width - 2 * padding);
    const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

    const points = data.map((d, idx) => `${getX(idx).toFixed(1)},${getY(d.points).toFixed(1)}`);
    const pathData = `M ${points.join(" L ")}`;
    const fillPathData = `${pathData} L ${getX(data.length - 1).toFixed(1)},${(height - padding).toFixed(
      1
    )} L ${getX(0).toFixed(1)},${(height - padding).toFixed(1)} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="detail-chart-svg">
        <defs>
          <linearGradient id="pointsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#75e39b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#75e39b" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="#2a3338" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={padding} y1={getY(maxVal / 2)} x2={width - padding} y2={getY(maxVal / 2)} stroke="#2a3338" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={padding} y1={getY(maxVal)} x2={width - padding} y2={getY(maxVal)} stroke="#2a3338" strokeWidth="1" strokeDasharray="4 4" />

        {/* Area */}
        <path d={fillPathData} fill="url(#pointsGrad)" />

        {/* Line */}
        <path d={pathData} fill="none" stroke="#75e39b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {data.map((d, idx) => (
          <circle
            key={idx}
            cx={getX(idx)}
            cy={getY(d.points)}
            r="4"
            fill="#111417"
            stroke="#75e39b"
            strokeWidth="2"
          >
            <title>{`Semana de ${d.weekMonday}: ${d.points} pontos`}</title>
          </circle>
        ))}
      </svg>
    );
  };

  return (
    <div className="friend-details-view">
      {/* Header bar */}
      <div className="friend-details-view__header">
        <button type="button" className="btn btn--link" onClick={onClose}>
          <ArrowLeft size={16} />
          <span>Voltar para Classificação</span>
        </button>

        <div className="header-meta">
          <span className="platform-pill" data-platform={platform}>
            {platform}
          </span>
        </div>
      </div>

      {/* Info summary */}
      <div className="friend-details-view__summary">
        <div>
          <h2 style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            {currentStats?.displayName || username}
            <span style={{ fontSize: "14px", color: "#8fa1a8", fontWeight: "normal" }}>({username})</span>
          </h2>
        </div>

        {currentRankInfo && (
          <div className="stats-badges-row">
            <div className="stat-card">
              <Award size={20} className="stat-card__icon" style={{ color: "#e0b35a" }} />
              <div>
                <p>Ranking Atual</p>
                <strong>#{currentRankInfo.rank}</strong>
              </div>
            </div>

            <div className="stat-card">
              <TrendingUp size={20} className="stat-card__icon" style={{ color: "#75e39b" }} />
              <div>
                <p>Pontos Acumulados</p>
                <strong>{currentRankInfo.points} pts</strong>
              </div>
            </div>

            <div className="stat-card">
              <Clock size={20} className="stat-card__icon" style={{ color: "#54b2e5" }} />
              <div>
                <p>Watch Time Total</p>
                <strong>{weeklyHistory.reduce((acc, curr) => acc + curr.watchTimeMinutes, 0)} min</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="friend-details-charts" style={{ gridTemplateColumns: "1fr" }}>
        <div className="chart-card">
          <div className="chart-card__header">
            <h4>Evolução de Pontos de Reciprocidade (Semanal)</h4>
            <span className="info">Pontos acumulados a cada fechamento de semana</span>
          </div>
          <div className="chart-container">
            {renderChart(sortedHistory)}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="friend-details-history">
        <h4>Histórico Semanal Detalhado</h4>
        {sortedHistory.length === 0 ? (
          <p className="empty-history">Nenhum registro semanal encontrado ainda.</p>
        ) : (
          <div className="table-responsive">
            <table className="reciprocity-table">
              <thead>
                <tr>
                  <th>Semana (Segunda-feira)</th>
                  <th>Watch Time Real</th>
                  <th>Total Mensagens</th>
                  <th>Pontos Adquiridos</th>
                </tr>
              </thead>
              <tbody>
                {[...sortedHistory].reverse().map((item, idx) => {
                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{item.weekMonday}</strong>
                      </td>
                      <td>{item.watchTimeMinutes} min ({Math.round((item.watchTimeMinutes / 60) * 10) / 10} horas)</td>
                      <td>{item.messageCount}</td>
                      <td>
                        <span className="score-badge" style={{ fontSize: "14px" }}>
                          +{item.points} {item.points === 1 ? "ponto" : "pontos"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
