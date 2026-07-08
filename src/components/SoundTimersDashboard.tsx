import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Play, 
  Volume2, 
  Upload, 
  Music, 
  Save, 
  X, 
  Edit2, 
  AlertCircle 
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { SoundTimer } from "../types/timer";
import { playSound } from "../services/sound";
import { ConfirmModal } from "./ConfirmModal";

interface SoundTimersDashboardProps {
  timers: SoundTimer[];
  addTimer: (timer: Omit<SoundTimer, "id" | "createdAt" | "isEnabled">) => void;
  deleteTimer: (id: string) => void;
  updateTimer: (id: string, updates: Partial<Omit<SoundTimer, "id" | "createdAt">>) => void;
}

export function SoundTimersDashboard({
  timers,
  addTimer,
  deleteTimer,
  updateTimer,
}: SoundTimersDashboardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [timerToDelete, setTimerToDelete] = useState<SoundTimer | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<"hourly" | "interval" | "hourly_minute" | "specific_time">("interval");
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [minuteOfHour, setMinuteOfHour] = useState(50);
  const [specificTime, setSpecificTime] = useState("12:00");
  const [volume, setVolume] = useState(70);
  const [soundFilePath, setSoundFilePath] = useState<string | undefined>(undefined);
  const [soundFileName, setSoundFileName] = useState<string | undefined>(undefined);

  // Ticker state to refresh countdowns every second
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const handle = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(handle);
  }, []);

  const resetForm = () => {
    setName("");
    setType("interval");
    setIntervalMinutes(15);
    setMinuteOfHour(50);
    setSpecificTime("12:00");
    setVolume(70);
    setSoundFilePath(undefined);
    setSoundFileName(undefined);
    setEditingTimerId(null);
    setIsFormOpen(false);
  };

  const handleEditClick = (timer: SoundTimer) => {
    setName(timer.name);
    setType(timer.type);
    setIntervalMinutes(timer.intervalMinutes);
    setMinuteOfHour(timer.minuteOfHour ?? 50);
    setSpecificTime(timer.specificTime ?? "12:00");
    setVolume(timer.volume);
    setSoundFilePath(timer.soundFilePath);
    setSoundFileName(timer.soundFileName);
    setEditingTimerId(timer.id);
    setIsFormOpen(true);
  };

  const handleSelectSoundFile = async () => {
    try {
      const selected = await invoke<[string, string] | null>("select_sound_file");
      if (selected) {
        const [path, name] = selected;
        setSoundFilePath(path);
        setSoundFileName(name);
      }
    } catch (err) {
      console.error("Erro ao selecionar arquivo de som:", err);
    }
  };

  const handleTestSound = () => {
    playSound(volume, soundFilePath);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const timerData = {
      name: name.trim(),
      type,
      intervalMinutes: type === "hourly" ? 60 : Math.max(1, intervalMinutes),
      minuteOfHour: type === "hourly_minute" ? minuteOfHour : undefined,
      specificTime: type === "specific_time" ? specificTime : undefined,
      volume,
      soundFilePath,
      soundFileName,
    };

    if (editingTimerId) {
      updateTimer(editingTimerId, timerData);
    } else {
      addTimer(timerData);
    }

    resetForm();
  };

  const getRemainingTimeStr = (t: SoundTimer) => {
    if (!t.isEnabled) return "Desativado";

    let nextRun = 0;
    if (t.type === "interval") {
      const intervalMs = t.intervalMinutes * 60 * 1000;
      nextRun = (t.lastTriggeredAt || t.createdAt) + intervalMs;
    } else if (t.type === "hourly") {
      // hourly: next hour start
      const currentDate = new Date(now);
      const nextHourDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        currentDate.getHours() + 1,
        0,
        0,
        0
      );
      nextRun = nextHourDate.getTime();
    } else if (t.type === "hourly_minute") {
      const targetMinute = t.minuteOfHour ?? 0;
      const currentDate = new Date(now);
      let nextRunDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        currentDate.getHours(),
        targetMinute,
        0,
        0
      );
      if (nextRunDate.getTime() <= now) {
        nextRunDate.setHours(nextRunDate.getHours() + 1);
      }
      nextRun = nextRunDate.getTime();
    } else if (t.type === "specific_time") {
      const [hoursStr, minutesStr] = (t.specificTime || "00:00").split(":");
      const targetHours = parseInt(hoursStr, 10) || 0;
      const targetMinutes = parseInt(minutesStr, 10) || 0;
      const currentDate = new Date(now);
      let nextRunDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        targetHours,
        targetMinutes,
        0,
        0
      );
      if (nextRunDate.getTime() <= now) {
        nextRunDate.setDate(nextRunDate.getDate() + 1);
      }
      nextRun = nextRunDate.getTime();
    }

    const diffMs = nextRun - now;
    if (diffMs <= 0) {
      return "Acionando...";
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || hours > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(" ");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #242b30",
        paddingBottom: "14px"
      }}>
        <div>
          <h2 style={{ margin: "0", fontSize: "20px", color: "#f6fafb", display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={22} style={{ color: "#75e39b" }} />
            Timers Sonoros
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#8fa1a8" }}>
            Crie lembretes com sons personalizados e notificações do Windows para não perder seus compromissos.
          </p>
        </div>
        {!isFormOpen && (
          <button 
            type="button" 
            className="btn btn--primary" 
            onClick={() => setIsFormOpen(true)}
          >
            <Plus size={16} />
            <span>Novo Timer</span>
          </button>
        )}
      </div>

      {/* Creation/Edition Form */}
      {isFormOpen && (
        <form onSubmit={handleSave} style={{
          background: "#151b1f",
          border: "1px solid #28343a",
          borderRadius: "8px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          animation: "fadeIn 200ms ease-out"
        }}>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", color: "#f6fafb" }}>
            {editingTimerId ? "Editar Timer" : "Criar Novo Timer"}
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Timer Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "#8fa1a8", fontWeight: "600" }}>Nome do Timer</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Beber Água, Alongamento"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  height: "38px",
                  background: "#101417",
                  border: "1px solid #2a3338",
                  borderRadius: "6px",
                  color: "#edf4f6",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </div>

            {/* Timer Type */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "#8fa1a8", fontWeight: "600" }}>Frequência/Tempo</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                style={{
                  height: "38px",
                  background: "#101417",
                  border: "1px solid #2a3338",
                  borderRadius: "6px",
                  color: "#edf4f6",
                  padding: "0 12px",
                  outline: "none",
                }}
              >
                <option value="interval">A cada X minutos</option>
                <option value="hourly">De hora em hora (no início da hora)</option>
                <option value="hourly_minute">De hora em hora (no minuto X)</option>
                <option value="specific_time">Horário específico diário (HH:MM)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Dynamic input depending on type */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "6px",
              opacity: type === "hourly" ? 0.4 : 1,
              pointerEvents: type === "hourly" ? "none" : "auto"
            }}>
              {type === "interval" && (
                <>
                  <label style={{ fontSize: "12px", color: "#8fa1a8", fontWeight: "600" }}>Minutos (intervalo)</label>
                  <input 
                    type="number" 
                    min={1}
                    required
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    style={{
                      height: "38px",
                      background: "#101417",
                      border: "1px solid #2a3338",
                      borderRadius: "6px",
                      color: "#edf4f6",
                      padding: "0 12px",
                      outline: "none",
                    }}
                  />
                </>
              )}
              {type === "hourly" && (
                <>
                  <label style={{ fontSize: "12px", color: "#8fa1a8", fontWeight: "600" }}>Minuto do Alerta</label>
                  <input 
                    type="text" 
                    disabled
                    value="0 (Início de cada hora)"
                    style={{
                      height: "38px",
                      background: "#101417",
                      border: "1px solid #2a3338",
                      borderRadius: "6px",
                      color: "#8fa1a8",
                      padding: "0 12px",
                      outline: "none",
                    }}
                  />
                </>
              )}
              {type === "hourly_minute" && (
                <>
                  <label style={{ fontSize: "12px", color: "#8fa1a8", fontWeight: "600" }}>Minuto da Hora (0 a 59)</label>
                  <input 
                    type="number" 
                    min={0}
                    max={59}
                    required
                    value={minuteOfHour}
                    onChange={(e) => setMinuteOfHour(Number(e.target.value))}
                    style={{
                      height: "38px",
                      background: "#101417",
                      border: "1px solid #2a3338",
                      borderRadius: "6px",
                      color: "#edf4f6",
                      padding: "0 12px",
                      outline: "none",
                    }}
                  />
                </>
              )}
              {type === "specific_time" && (
                <>
                  <label style={{ fontSize: "12px", color: "#8fa1a8", fontWeight: "600" }}>Horário do Alerta (HH:MM)</label>
                  <input 
                    type="time" 
                    required
                    value={specificTime}
                    onChange={(e) => setSpecificTime(e.target.value)}
                    style={{
                      height: "38px",
                      background: "#101417",
                      border: "1px solid #2a3338",
                      borderRadius: "6px",
                      color: "#edf4f6",
                      padding: "0 12px",
                      outline: "none",
                    }}
                  />
                </>
              )}
            </div>

            {/* Volume slider */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "#8fa1a8", fontWeight: "600", display: "flex", justifyContent: "space-between" }}>
                <span>Volume</span>
                <span>{volume}%</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "38px" }}>
                <Volume2 size={16} style={{ color: "#8fa1a8" }} />
                <input 
                  type="range" 
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: "#75e39b",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sound Alert Upload */}
          <div style={{ 
            border: "1px dashed #2a3338", 
            borderRadius: "6px", 
            padding: "16px",
            background: "#101417",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <label style={{ fontSize: "12px", color: "#f6fafb", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
              <Music size={15} style={{ color: "#75e39b" }} />
              Som do Alerta
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ display: "flex", gap: "6px", alignItems: "center" }}
                onClick={handleSelectSoundFile}
              >
                <Upload size={14} />
                <span>Anexar Som</span>
              </button>
              
              <div style={{ fontSize: "12px", color: "#8fa1a8", flex: 1, minWidth: "150px" }}>
                {soundFileName ? (
                  <span style={{ color: "#75e39b", display: "flex", alignItems: "center", gap: "4px" }}>
                    ✓ {soundFileName}
                  </span>
                ) : (
                  <span>Nenhum som anexado (usando som padrão)</span>
                )}
              </div>

              {soundFileName && (
                <button
                  type="button"
                  className="btn btn--danger"
                  style={{ height: "30px", padding: "0 10px" }}
                  onClick={() => {
                    setSoundFilePath(undefined);
                    setSoundFileName(undefined);
                  }}
                >
                  <X size={14} />
                  <span>Remover Som</span>
                </button>
              )}

              <button
                type="button"
                className="btn"
                style={{ height: "32px", padding: "0 12px" }}
                onClick={handleTestSound}
              >
                <Play size={13} />
                <span>Testar Som</span>
              </button>
            </div>
            <p style={{ margin: 0, fontSize: "11px", color: "#8fa1a8" }}>
              Associe um arquivo de som local (MP3, WAV, OGG, FLAC) do seu computador.
            </p>
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #28343a", paddingTop: "14px", marginTop: "4px" }}>
            <button type="button" className="btn btn--secondary" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              <Save size={14} />
              <span>Salvar Timer</span>
            </button>
          </div>
        </form>
      )}

      {/* Timers List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {timers.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
            border: "1px dashed #28343a",
            borderRadius: "8px",
            color: "#8fa1a8",
            textAlign: "center",
            background: "#13171a"
          }}>
            <Clock size={32} style={{ color: "#28343a", marginBottom: "12px" }} />
            <strong style={{ color: "#edf4f6" }}>Nenhum timer sonoro ativo</strong>
            <span style={{ fontSize: "12px", marginTop: "4px", maxWidth: "340px" }}>
              Crie lembretes de hora em hora ou de tempos em tempos para ajudar a manter seu foco ou saúde durante as lives.
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {timers.map((t) => (
              <div 
                key={t.id} 
                style={{
                  background: t.isEnabled ? "#151b1f" : "#121619",
                  border: "1px solid #28343a",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  opacity: t.isEnabled ? 1 : 0.7,
                  transition: "all 150ms ease"
                }}
              >
                {/* Timer Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: t.isEnabled ? "rgba(117, 227, 155, 0.1)" : "rgba(143, 161, 168, 0.1)",
                    display: "grid",
                    placeItems: "center",
                    color: t.isEnabled ? "#75e39b" : "#8fa1a8",
                    flexShrink: 0
                  }}>
                    <Clock size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: "14px", color: "#edf4f6", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {t.name}
                    </h4>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#8fa1a8" }}>
                      {t.type === "hourly"
                        ? "De hora em hora"
                        : t.type === "hourly_minute"
                        ? `De hora em hora (minuto ${t.minuteOfHour})`
                        : t.type === "specific_time"
                        ? `Horário diário (${t.specificTime})`
                        : `A cada ${t.intervalMinutes} minutos`}
                      <span style={{ margin: "0 6px" }}>•</span>
                      Volume: {t.volume}%
                      <span style={{ margin: "0 6px" }}>•</span>
                      Som: {t.soundFileName ? t.soundFileName : "Padrão"}
                    </p>
                  </div>
                </div>

                {/* Status Countdown */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "2px",
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: "11px", color: "#8fa1a8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Próximo Alerta
                  </span>
                  <span style={{ 
                    fontSize: "14px", 
                    fontFamily: "monospace", 
                    color: t.isEnabled ? "#75e39b" : "#8fa1a8", 
                    fontWeight: "bold" 
                  }}>
                    {getRemainingTimeStr(t)}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  {/* Toggle Switch */}
                  <label className="toggle-row" style={{ margin: 0, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
                    <input 
                      type="checkbox"
                      checked={t.isEnabled}
                      onChange={(e) => updateTimer(t.id, { isEnabled: e.target.checked })}
                    />
                  </label>

                  {/* Test Alert Button */}
                  <button 
                    type="button" 
                    className="icon-button"
                    title="Tocar Alerta"
                    onClick={() => playSound(t.volume, t.soundFilePath)}
                    style={{ border: "1px solid #28343a", color: "#8fa1a8" }}
                  >
                    <Play size={14} />
                  </button>

                  {/* Edit Button */}
                  <button 
                    type="button" 
                    className="icon-button"
                    title="Editar"
                    onClick={() => handleEditClick(t)}
                    style={{ border: "1px solid #28343a", color: "#8fa1a8" }}
                  >
                    <Edit2 size={14} />
                  </button>

                  {/* Delete Button */}
                  <button 
                    type="button" 
                    className="icon-button btn--danger"
                    title="Excluir"
                    onClick={() => setTimerToDelete(t)}
                    style={{ height: "38px", width: "38px" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={timerToDelete !== null}
        title="Excluir Timer"
        message={`Deseja mesmo excluir o timer "${timerToDelete?.name}"?`}
        onConfirm={() => {
          if (timerToDelete) {
            deleteTimer(timerToDelete.id);
            setTimerToDelete(null);
          }
        }}
        onCancel={() => setTimerToDelete(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
}
