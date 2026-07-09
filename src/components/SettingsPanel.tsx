import { Bell, Bot, Volume2 } from "lucide-react";
import type { AppSettings } from "../types/settings";

type SettingsPanelProps = {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
};

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <section className="settings-panel">
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(event) =>
            onChange({ ...settings, soundEnabled: event.currentTarget.checked })
          }
        />
        <span>
          <Volume2 size={17} />
          Som
        </span>
      </label>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.notificationsEnabled}
          onChange={(event) =>
            onChange({
              ...settings,
              notificationsEnabled: event.currentTarget.checked,
            })
          }
        />
        <span>
          <Bell size={17} />
          Notificacoes
        </span>
      </label>

      <label className="field-row">
        <span>Intervalo</span>
        <select
          value={settings.checkIntervalSeconds}
          onChange={(event) =>
            onChange({
              ...settings,
              checkIntervalSeconds: Number(event.currentTarget.value),
            })
          }
        >
          <option value={30}>30s</option>
          <option value={60}>60s</option>
          <option value={120}>2min</option>
          <option value={300}>5min</option>
        </select>
      </label>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.openLiveOnDoubleClick}
          onChange={(event) =>
            onChange({
              ...settings,
              openLiveOnDoubleClick: event.currentTarget.checked,
            })
          }
        />
        <span>Duplo clique abre live</span>
      </label>

      {/* Robô de Apoio Settings */}
      <div style={{ gridColumn: "span 4", borderTop: "1px solid #28343a", margin: "8px 0" }} />

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.supportBotEnabled}
          onChange={(event) =>
            onChange({ ...settings, supportBotEnabled: event.currentTarget.checked })
          }
        />
        <span>
          <Bot size={17} />
          Robo de Apoio
        </span>
      </label>

      <label className="field-row">
        <span>Resolução</span>
        <select
          value={settings.supportPreferredQuality}
          onChange={(event) =>
            onChange({ ...settings, supportPreferredQuality: event.currentTarget.value })
          }
        >
          <option value="lowest">Menor disponivel</option>
          <option value="160p">160p</option>
          <option value="240p">240p</option>
          <option value="360p">360p</option>
          <option value="480p">480p</option>
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
          <option value="auto">Auto</option>
        </select>
      </label>

      <label className="field-row">
        <span>Intervalo Chat (min)</span>
        <input
          type="number"
          min={1}
          value={settings.supportIntervalMinutes}
          style={{
            maxWidth: "60px",
            height: "34px",
            padding: "0 8px",
            border: "1px solid #2a3338",
            borderRadius: "8px",
            color: "#edf4f6",
            background: "#101417",
            outline: "none",
          }}
          onChange={(event) =>
            onChange({
              ...settings,
              supportIntervalMinutes: Math.max(1, Number(event.currentTarget.value)),
            })
          }
        />
      </label>

      <div className="field-row" style={{ display: "none" }}>
        {/* Hidden but kept in settings object for script compat */}
        <input
          type="number"
          value={settings.supportQualityCheckSeconds}
          onChange={(event) =>
            onChange({ ...settings, supportQualityCheckSeconds: Number(event.currentTarget.value) })
          }
        />
      </div>

    </section>
  );
}

