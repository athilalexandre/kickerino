import { X, AlertCircle } from "lucide-react";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="account-overlay" onClick={onCancel} style={{ zIndex: 1000 }}>
      <div 
        className="account-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "420px" }}
      >
        <header className="account-modal__header">
          <div className="account-modal__title">
            <AlertCircle size={20} style={{ color: "#e0b35a" }} />
            <h2>{title}</h2>
          </div>
          <button className="account-modal__close-btn" onClick={onCancel} title="Fechar">
            <X size={20} />
          </button>
        </header>
        <div className="account-modal__content" style={{ gap: "16px", padding: "20px 24px" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#b8c7cc", lineHeight: "1.5" }}>
            {message}
          </p>
          <div className="account-modal__actions" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              className="account-modal__btn"
              onClick={onCancel}
              style={{ background: "#20262b", border: "1px solid #313d44", color: "#edf4f6" }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="account-modal__btn"
              onClick={onConfirm}
              style={{ background: "#a13b35", border: "1px solid #b84c45", color: "#ffeedf" }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
