import type { FriendChannel, WatchTimeSnapshot } from "../../types/reciprocity";
import { ArrowLeft, Clock, MessageSquare, Award, ArrowUp, ArrowDown, Minimize2 } from "lucide-react";

interface FriendDetailsProps {
  friend: FriendChannel;
  snapshots: WatchTimeSnapshot[];
  rankings: any[]; // RankingResult[]
  onClose: () => void;
}

export function FriendDetails({
  friend,
  snapshots,
  rankings,
  onClose,
}: FriendDetailsProps) {
  // Filter and sort snapshots for this friend
  const friendSnaps = snapshots
    .filter((s) => s.friendChannelId === friend.id)
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

  const currentRankInfo = rankings.find((r) => r.friendChannelId === friend.id);

  // SVG Chart Helper
  const renderChart = (
    data: WatchTimeSnapshot[],
    valueKey: "watchTimeMinutes" | "messageCount",
    strokeColor: string,
    fillGradientId: string
  ) => {
    if (data.length < 2) {
      return (
        <div className="detail-chart-placeholder">
          <p>Dados históricos insuficientes</p>
          <span>Aguardando mais sincronizações para gerar o gráfico de tendência.</span>
        </div>
      );
    }

    const width = 500;
    const height = 150;
    const padding = 15;

    const times = data.map((d) => new Date(d.capturedAt).getTime());
    const values = data.map((d) => d[valueKey]);

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;

    const minValue = 0; // Start y axis from 0 for clear proportionality
    const maxValue = Math.max(...values, 10);
    const valueRange = maxValue - minValue || 1;

    const getX = (time: number) => padding + ((time - minTime) / timeRange) * (width - 2 * padding);
    const getY = (val: number) => height - padding - ((val - minValue) / valueRange) * (height - 2 * padding);

    const points = data.map((d) => {
      const x = getX(new Date(d.capturedAt).getTime());
      const y = getY(d[valueKey]);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathData = `M ${points.join(" L ")}`;
    
    // Create fill area path that goes down to the bottom
    const fillPathData = `${pathData} L ${getX(maxTime).toFixed(1)},${(height - padding).toFixed(1)} L ${getX(minTime).toFixed(1)},${(height - padding).toFixed(1)} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="detail-chart-svg">
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines (horizontal) */}
        <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="#2a3338" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={padding} y1={getY(maxValue / 2)} x2={width - padding} y2={getY(maxValue / 2)} stroke="#2a3338" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={padding} y1={getY(maxValue)} x2={width - padding} y2={getY(maxValue)} stroke="#2a3338" strokeWidth="1" strokeDasharray="4 4" />

        {/* Filled area */}
        <path d={fillPathData} fill={`url(#${fillGradientId})`} />

        {/* Line */}
        <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points (dots) */}
        {data.map((d, index) => (
          <circle
            key={d.id}
            cx={getX(new Date(d.capturedAt).getTime())}
            cy={getY(d[valueKey])}
            r="4"
            fill="#111417"
            stroke={strokeColor}
            strokeWidth="2"
          >
            <title>{`${new Date(d.capturedAt).toLocaleString()}: ${d[valueKey]}`}</title>
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
          <span className="platform-tag" data-platform={friend.platform}>
            {friend.platform}: {friend.username}
          </span>
        </div>
      </div>

      {/* Info summary */}
      <div className="friend-details-view__summary">
        <div>
          <h2>{friend.displayName}</h2>
          {friend.notes && <p className="notes-box">💡 {friend.notes}</p>}
        </div>

        {currentRankInfo && (
          <div className="stats-badges-row">
            <div className="stat-card">
              <Award size={20} className="stat-card__icon" style={{ color: "#e0b35a" }} />
              <div>
                <p>Posição</p>
                <strong>#{currentRankInfo.rank === 999 ? "-" : currentRankInfo.rank}</strong>
              </div>
            </div>

            <div className="stat-card">
              <Clock size={20} className="stat-card__icon" style={{ color: "#75e39b" }} />
              <div>
                <p>Watch Time</p>
                <strong>{currentRankInfo.watchTimeMinutes} min</strong>
              </div>
            </div>

            <div className="stat-card">
              <MessageSquare size={20} className="stat-card__icon" style={{ color: "#54b2e5" }} />
              <div>
                <p>Mensagens</p>
                <strong>{currentRankInfo.messageCount}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="friend-details-charts">
        <div className="chart-card">
          <div className="chart-card__header">
            <h4>Crescimento de Watch Time (Minutos)</h4>
            <span className="info">Tempo total assistido acumulado</span>
          </div>
          <div className="chart-container">
            {renderChart(friendSnaps, "watchTimeMinutes", "#75e39b", "watchTimeGrad")}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h4>Crescimento de Mensagens Enviadas</h4>
            <span className="info">Quantidade total de mensagens no chat</span>
          </div>
          <div className="chart-container">
            {renderChart(friendSnaps, "messageCount", "#54b2e5", "messagesGrad")}
          </div>
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="friend-details-history">
        <h4>Histórico de Atualizações Recentes</h4>
        {friendSnaps.length === 0 ? (
          <p className="empty-history">Nenhum snapshot registrado ainda.</p>
        ) : (
          <div className="table-responsive">
            <table className="reciprocity-table">
              <thead>
                <tr>
                  <th>Data/Hora da Captura</th>
                  <th>Watch Time Acumulado</th>
                  <th>Minutos Assistidos desde o início</th>
                  <th>Total Mensagens</th>
                  <th>Mensagens enviadas no período</th>
                </tr>
              </thead>
              <tbody>
                {[...friendSnaps].reverse().map((snap, idx, arr) => {
                  const date = new Date(snap.capturedAt).toLocaleString();
                  const prevSnap = arr[idx + 1]; // because array is reversed, idx + 1 is the older one

                  // Watch Time delta
                  const wtDelta = prevSnap ? snap.watchTimeMinutes - prevSnap.watchTimeMinutes : 0;
                  const wtDeltaStr = wtDelta > 0 ? ` (+${wtDelta} min)` : "";

                  // Messages delta
                  const msgDelta = prevSnap ? snap.messageCount - prevSnap.messageCount : 0;
                  const msgDeltaStr = msgDelta > 0 ? ` (+${msgDelta})` : "";

                  // Growth from start
                  const startSnap = friendSnaps[0];
                  const growthWT = snap.watchTimeMinutes - startSnap.watchTimeMinutes;
                  const growthMsg = snap.messageCount - startSnap.messageCount;

                  return (
                    <tr key={snap.id}>
                      <td>{date}</td>
                      <td>
                        <strong>{snap.watchTimeMinutes} min</strong>
                        {wtDeltaStr && <span className="delta-green">{wtDeltaStr}</span>}
                      </td>
                      <td>{growthWT} min</td>
                      <td>
                        <strong>{snap.messageCount}</strong>
                        {msgDeltaStr && <span className="delta-blue">{msgDeltaStr}</span>}
                      </td>
                      <td>{growthMsg}</td>
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
