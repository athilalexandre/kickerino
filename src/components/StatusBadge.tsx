import type { ChannelStatus } from "../types/channel";

const labels: Record<ChannelStatus, string> = {
  live: "LIVE",
  offline: "offline",
  unknown: "desconhecido",
  error: "erro",
};

export function StatusBadge({ status }: { status: ChannelStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{labels[status]}</span>;
}
