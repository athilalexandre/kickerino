import { X, LogOut, ExternalLink, UserCheck } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

type KickAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
  setKickLoginStatus: (status: "checking" | "connected" | "disconnected") => void;
};

export function KickAccountModal({
  isOpen,
  onClose,
  username,
  setKickLoginStatus,
}: KickAccountModalProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      setKickLoginStatus("checking");
      await invoke("logout_kick");
    } catch (error) {
      console.error("Falha ao deslogar da Kick:", error);
    } finally {
      setIsLoggingOut(false);
      onClose();
    }
  }

  async function handleOpenLoginWindow() {
    try {
      await invoke("open_login_window");
      onClose();
    } catch (error) {
      console.error("Falha ao abrir janela de login da Kick:", error);
    }
  }

  return (
    <div className="account-overlay" onClick={onClose}>
      <div className="account-modal" onClick={(e) => e.stopPropagation()}>
        <header className="account-modal__header">
          <div className="account-modal__title">
            <UserCheck size={22} className="account-modal__title-icon" />
            <h2>Sua Conta Kick</h2>
          </div>
          <button className="account-modal__close-btn" onClick={onClose} title="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className="account-modal__content">
          <div className="account-modal__profile-section">
            <div className="account-modal__avatar-container">
              <UserCheck size={36} className="account-modal__avatar-placeholder" />
            </div>
            <div className="account-modal__info">
              <h3>Conectado à Kick</h3>
              <p className="account-modal__username">
                {username ? `@${username}` : "Usuário Detectado"}
              </p>
            </div>
          </div>

          <div className="account-modal__actions">
            <button
              type="button"
              className="account-modal__btn account-modal__btn--primary"
              onClick={handleOpenLoginWindow}
            >
              <ExternalLink size={16} />
              <span>Abrir Janela do Kick</span>
            </button>

            <button
              type="button"
              className="account-modal__btn account-modal__btn--danger"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut size={16} />
              <span>{isLoggingOut ? "Deslogando..." : "Deslogar da Conta"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
