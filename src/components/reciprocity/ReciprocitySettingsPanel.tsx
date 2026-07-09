import type React from "react";
import { useState } from "react";
import type { ReciprocitySettings } from "../../types/reciprocity";
import { Save, RotateCcw, Key, Eye, EyeOff, Trash2, CheckCircle2 } from "lucide-react";
import { defaultReciprocitySettings } from "../../services/reciprocityStorage";
import { ConfirmModal } from "../ConfirmModal";

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

  // API Key States
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isChangingKey, setIsChangingKey] = useState(!hasApiKey);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeySuccess, setApiKeySuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      pollingIntervalMinutes: Math.max(5, pollingInterval), // Minimum 5 mins
    });
    onClose();
  };

  const handleReset = () => {
    setPollingInterval(defaultReciprocitySettings.pollingIntervalMinutes);
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
    setShowDeleteConfirm(true);
  };

  return (
    <div className="reciprocity-settings-card">
      <div className="reciprocity-settings-card__header">
        <h3>Configurações de Reciprocidade</h3>
        <p>Ajuste as chaves de acesso e o tempo de atualização.</p>
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

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Excluir Chave API"
        message="Tem certeza que deseja excluir a chave API salva? Os próximos sincronismos falharão."
        onConfirm={async () => {
          try {
            await onDeleteApiKey();
            setIsChangingKey(true);
          } catch (err: any) {
            setApiKeyError(err.message || "Erro ao deletar a chave API.");
          } finally {
            setShowDeleteConfirm(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
}
