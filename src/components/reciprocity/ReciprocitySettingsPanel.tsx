import type React from "react";
import { useState } from "react";
import type { ReciprocitySettings, MessageDampingType } from "../../types/reciprocity";
import { Save, RotateCcw, Key, Eye, EyeOff, Trash2, CheckCircle2 } from "lucide-react";
import { defaultReciprocitySettings } from "../../services/reciprocityStorage";

interface ReciprocitySettingsPanelProps {
  settings: ReciprocitySettings;
  onSave: (settings: ReciprocitySettings) => void;
  onClose: () => void;
  hasApiKey: boolean;
  onSaveApiKey: (key: string) => Promise<void>;
  onDeleteApiKey: () => Promise<void>;
}

export function ReciprocitySettingsPanel({
  settings,
  onSave,
  onClose,
  hasApiKey,
  onSaveApiKey,
  onDeleteApiKey,
}: ReciprocitySettingsPanelProps) {
  const [pollingInterval, setPollingInterval] = useState(settings.pollingIntervalMinutes);
  const [defaultWindow, setDefaultWindow] = useState(settings.defaultWindow);
  const [bonusWeight, setBonusWeight] = useState(settings.messageBonusWeight);
  const [dampingType, setDampingType] = useState<MessageDampingType>(settings.messageDampingType);
  const [activeThreshold, setActiveThreshold] = useState(settings.activeThresholdMinutes);
  const [droppingThreshold, setDroppingThreshold] = useState(settings.droppingThresholdMinutes);

  // API Key States
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isChangingKey, setIsChangingKey] = useState(!hasApiKey);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeySuccess, setApiKeySuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      pollingIntervalMinutes: Math.max(5, pollingInterval), // Minimum 5 mins
      defaultWindow,
      messageBonusWeight: Math.max(0, bonusWeight),
      messageDampingType: dampingType,
      activeThresholdMinutes: Math.max(1, activeThreshold),
      droppingThresholdMinutes: Math.max(0, droppingThreshold),
    });
    onClose();
  };

  const handleReset = () => {
    setPollingInterval(defaultReciprocitySettings.pollingIntervalMinutes);
    setDefaultWindow(defaultReciprocitySettings.defaultWindow);
    setBonusWeight(defaultReciprocitySettings.messageBonusWeight);
    setDampingType(defaultReciprocitySettings.messageDampingType);
    setActiveThreshold(defaultReciprocitySettings.activeThresholdMinutes);
    setDroppingThreshold(defaultReciprocitySettings.droppingThresholdMinutes);
  };

  const handleSaveApiKey = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setApiKeyError("Por favor, digite uma chave válida.");
      return;
    }

    setApiKeyError(null);
    setApiKeySuccess(false);

    try {
      await onSaveApiKey(apiKeyInput);
      setApiKeySuccess(true);
      setApiKeyInput("");
      setIsChangingKey(false);
      setTimeout(() => setApiKeySuccess(false), 3000);
    } catch (err: any) {
      setApiKeyError(err.message || "Erro ao salvar a chave API.");
    }
  };

  const handleDeleteApiKey = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm("Tem certeza que deseja excluir a chave API salva? Os próximos sincronismos falharão.")) {
      try {
        await onDeleteApiKey();
        setIsChangingKey(true);
      } catch (err: any) {
        setApiKeyError(err.message || "Erro ao deletar a chave API.");
      }
    }
  };

  return (
    <div className="reciprocity-settings-card">
      <div className="reciprocity-settings-card__header">
        <h3>Configurações de Reciprocidade</h3>
        <p>Ajuste as chaves de acesso, os critérios de pontuação e os prazos de inatividade.</p>
      </div>

      {/* API Key Management Section */}
      <div className="settings-api-key-section" style={{
        marginBottom: "20px",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #28343a",
        background: "rgba(17, 20, 23, 0.4)"
      }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#f6fafb", display: "flex", alignItems: "center", gap: "8px" }}>
          <Key size={16} style={{ color: "#75e39b" }} />
          Chave API MissXss
        </h4>

        {hasApiKey && !isChangingKey ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#75e39b", fontSize: "13px" }}>
              <CheckCircle2 size={16} />
              <span>Chave API salva e configurada no aplicativo.</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => setIsChangingKey(true)}
              >
                Alterar Chave
              </button>
              <button
                type="button"
                className="btn btn--danger btn--small"
                onClick={handleDeleteApiKey}
                title="Excluir Chave"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ margin: "0", fontSize: "12px", color: "#8fa1a8" }}>
              Insira abaixo sua chave de acesso gerada no painel da MissXss para permitir a sincronização automatizada dos canais:
            </p>
            <div style={{ display: "flex", gap: "8px", position: "relative" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="Cole sua Bearer API Key aqui..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  style={{ paddingRight: "38px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#8fa1a8"
                  }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                type="button"
                className="btn btn--success"
                onClick={handleSaveApiKey}
              >
                Salvar Chave
              </button>
              {hasApiKey && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setIsChangingKey(false);
                    setApiKeyError(null);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>

            {apiKeyError && (
              <span style={{ fontSize: "12px", color: "#dc5d57", marginTop: "4px" }}>⚠️ {apiKeyError}</span>
            )}
            {apiKeySuccess && (
              <span style={{ fontSize: "12px", color: "#75e39b", marginTop: "4px" }}>✓ Chave API salva com sucesso!</span>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="reciprocity-settings-card__form">
        <div className="settings-panel-grid">
          <div className="form-group">
            <label htmlFor="pollingInterval">Intervalo de Sincronização (minutos)</label>
            <input
              id="pollingInterval"
              type="number"
              min="5"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(parseInt(e.target.value) || 60)}
            />
            <span className="help-text">Frequência com que o app consulta a MissXss API.</span>
          </div>

          <div className="form-group">
            <label htmlFor="defaultWindow">Filtro de Período Padrão</label>
            <select
              id="defaultWindow"
              value={defaultWindow}
              onChange={(e) => setDefaultWindow(e.target.value as any)}
            >
              <option value="24h">Últimas 24 Horas</option>
              <option value="7d">Últimos 7 Dias</option>
              <option value="30d">Últimos 30 Dias</option>
              <option value="all">Todo o Período</option>
            </select>
            <span className="help-text">Período inicial carregado no painel.</span>
          </div>

          <div className="form-group">
            <label htmlFor="bonusWeight">Peso do Bônus de Chat (Multiplicador)</label>
            <input
              id="bonusWeight"
              type="number"
              step="0.5"
              min="0"
              value={bonusWeight}
              onChange={(e) => setBonusWeight(parseFloat(e.target.value) || 0)}
            />
            <span className="help-text">Multiplicador aplicado às mensagens amortecidas.</span>
          </div>

          <div className="form-group">
            <label htmlFor="dampingType">Fórmula de Amortecimento de Chat</label>
            <select
              id="dampingType"
              value={dampingType}
              onChange={(e) => setDampingType(e.target.value as MessageDampingType)}
            >
              <option value="none">Linear (Sem amortecimento - vulnerável a spam)</option>
              <option value="sqrt">Raiz Quadrada (Recomendado - protege contra spam)</option>
              <option value="capped">Limitado (Capped em 100 mensagens)</option>
            </select>
            <span className="help-text">Define como a contagem de chat é processada para a pontuação.</span>
          </div>

          <div className="form-group">
            <label htmlFor="activeThreshold">Limite de Minutos Assistidos "Ativo" (7 dias)</label>
            <input
              id="activeThreshold"
              type="number"
              min="1"
              value={activeThreshold}
              onChange={(e) => setActiveThreshold(parseInt(e.target.value) || 60)}
            />
            <span className="help-text">Minutos necessários nos últimos 7 dias para o status Ativo.</span>
          </div>

          <div className="form-group">
            <label htmlFor="droppingThreshold">Limite de Minutos Assistidos "Caindo" (7 dias)</label>
            <input
              id="droppingThreshold"
              type="number"
              min="0"
              value={droppingThreshold}
              onChange={(e) => setDroppingThreshold(parseInt(e.target.value) || 15)}
            />
            <span className="help-text">Abaixo disso o canal é considerado Inativo.</span>
          </div>
        </div>

        <div className="reciprocity-settings-card__actions" style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleReset}
            title="Redefinir para Padrão"
          >
            <RotateCcw size={16} />
            <span>Padrão</span>
          </button>

          <div className="right-actions">
            <button type="button" className="btn btn--link" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--success">
              <Save size={16} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
