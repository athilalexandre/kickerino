import { Bell, Volume2 } from "lucide-react";
import type { AppSettings } from "../types/settings";

type SettingsPanelProps = {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
};

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <section className="settings-panel">
      <label className="toggle-row">
        <span>
          <Volume2 size={17} />
          Som
        </span>
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(event) =>
            onChange({ ...settings, soundEnabled: event.currentTarget.checked })
          }
        />
      </label>

      <label className="toggle-row">
        <span>
          <Bell size={17} />
          Notificacoes
        </span>
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
        <span>Duplo clique abre live</span>
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
      </label>
    </section>
  );
}
